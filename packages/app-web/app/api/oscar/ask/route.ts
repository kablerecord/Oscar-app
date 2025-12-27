import { NextRequest, NextResponse } from 'next/server'
import { OSQR, type OSQRRequest, type ResponseMode } from '@/lib/ai/oscar'
import { type PanelAgent } from '@/lib/ai/panel'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { checkRateLimit, recordRequest } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { parseArtifacts } from '@/lib/artifacts'
import { indexConversation, indexArtifact, indexInBackground } from '@/lib/knowledge/auto-index'
import { assembleContext, parseSystemMode } from '@/lib/context/auto-context'
import { extractMSCUpdates, mightContainMSCContent } from '@/lib/msc/auto-updater'
// formatSuggestionsForChat available for chat formatting
import { updateIdentityFromConversation } from '@/lib/identity/dimensions'
import { trackConversation, getTILContext } from '@/lib/til'
import { runSecretaryCheck } from '@/lib/til/secretary-checklist'
import { isPlanningRequest, extractPlanParams, generatePlan90, formatPlanForChat } from '@/lib/til/planner'
import { isAuditRequest, extractAuditParams, runSelfAudit, formatAuditForChat } from '@/lib/til/self-audit'
import { performSafetyCheck, processSafetyResponse, logSafetyEvent } from '@/lib/safety'
import { routeQuestion } from '@/lib/ai/model-router'
import { getCachedContext, getVaultStats } from '@/lib/context/prefetch'
import { isDevWorkspace, createTimer, analyzeQuestion, logAnalytics, type AnalyticsEvent } from '@/lib/analytics/dev-analytics'
import { getCrossSessionMemory, formatMemoryForPrompt, saveConversationSummary } from '@/lib/oscar/cross-session-memory'

// ==========================================================================
// UIP (User Intelligence Profile) Integration
// Mentorship-as-Code layer for adaptive AI behavior
// ==========================================================================
import {
  getUIPContext,
  processSignalsForUser,
  incrementSessionCount,
} from '@/lib/uip/service'
import { extractSignalsFromMessage } from '@/lib/uip/signal-processor'
import { shouldAskQuestion, formatElicitationQuestion, processElicitationResponse } from '@/lib/uip/elicitation'

// ==========================================================================
// @osqr/core Integration
// These imports connect oscar-app to the OSQR brain library
// ==========================================================================
import { checkInput, checkOutput, getDeclineMessage } from '@/lib/osqr/constitutional-wrapper'
import { quickRoute, shouldUseFastPath } from '@/lib/osqr/router-wrapper'
import { hasCommitmentSignals, extractCommitments } from '@/lib/osqr/temporal-wrapper'
import { persistDecisions } from '@/lib/decisions/persister'
import { featureFlags, throttleConfig } from '@/lib/osqr/config'

// New Phase 2 integrations: Throttle (I-10) & Cross-Project Memory (I-9)
import {
  canMakeQuery,
  getThrottleStatus,
  processThrottledQuery,
  getDegradationMessage,
  getBudgetStatusMessage,
  recordQueryUsage,
  hasFeatureAccess,
  type UserTier,
} from '@/lib/osqr'
import {
  getContextWithCrossProject,
  findRelatedFromOtherProjects,
  storeMessageWithContext,
} from '@/lib/osqr/memory-wrapper'
import { hasFeature as hasTierFeature, type TierName } from '@/lib/tiers/config'

const RequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string(),
  projectId: z.string().optional(), // Project context for cross-project memory (I-9)
  conversationId: z.string().optional(), // Conversation ID for memory tracking
  useKnowledge: z.boolean().default(true),
  includeDebate: z.boolean().default(false), // Debug mode to see panel discussion
  mode: z.enum(['quick', 'thoughtful', 'contemplate', 'council']).default('thoughtful'), // Response complexity mode
  systemMode: z.boolean().optional(), // Explicit system mode (restrict to OSQR docs only)
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(), // Previous messages for context continuity
})

// Helper to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

export async function POST(req: NextRequest) {
  try {
    // 1. Check authentication (bypass in development)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    let userId: string
    if (isDev && !session?.user?.email) {
      // Dev bypass - use a test user ID
      userId = 'dev-user'
      console.log('[DEV] Auth bypassed - using dev-user')
    } else if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    } else {
      userId = (session.user as { id?: string }).id || session.user.email
    }

    const ip = getClientIP(req)

    // 2. Check rate limits
    const rateLimitResult = await checkRateLimit({
      userId,
      ip,
      endpoint: 'oscar/ask',
      tier: 'pro', // TODO: Get user's actual tier from database
    })

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: rateLimitResult.reason === 'daily_limit'
            ? "You've reached your daily limit. Try again tomorrow or upgrade for more."
            : 'Too many requests. Please wait a moment.',
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      )
    }

    // 3. Record this request for tracking
    await recordRequest({ userId, ip, endpoint: 'oscar/ask' })

    const body = await req.json()
    const { message: rawMessage, workspaceId, projectId, conversationId, useKnowledge, includeDebate, mode, systemMode: explicitSystemMode, conversationHistory } = RequestSchema.parse(body)

    // ==========================================================================
    // UIP: Get User Intelligence Profile for adaptive behavior
    // This personalizes responses based on learned user preferences
    // ==========================================================================
    let uipContext: Awaited<ReturnType<typeof getUIPContext>> | null = null
    let elicitationQuestion: string | null = null

    try {
      // Get UIP context for this user
      uipContext = await getUIPContext(userId)

      // Check if we should ask an elicitation question (phases 2-4)
      const elicitationDecision = await shouldAskQuestion(userId)
      if (elicitationDecision.shouldAsk && elicitationDecision.question) {
        elicitationQuestion = formatElicitationQuestion(elicitationDecision.question)
      }

      if (uipContext.shouldPersonalize) {
        console.log('[UIP] Profile loaded - personalizing response (confidence:', uipContext.confidence.toFixed(2) + ')')
      }
    } catch (uipError) {
      console.error('[UIP] Error loading profile:', uipError)
      // Continue without UIP - it's non-blocking
    }

    // ==========================================================================
    // THROTTLE CHECK (I-10): Check query budget before processing
    // This manages daily query limits and graceful degradation
    // ==========================================================================
    // Get user tier from workspace (default to config value)
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { tier: true, capabilityLevel: true },
    })
    const userTier = (workspace?.tier || throttleConfig.defaultTier) as UserTier

    let throttleResult: { allowed: boolean; model: { id: string } | null; message: string; degraded: boolean } | null = null
    let budgetStatus: string | null = null

    if (featureFlags.enableThrottle) {
      // Check if user can make a query
      const canQuery = canMakeQuery(userId, userTier)

      if (!canQuery) {
        const degradationMessage = getDegradationMessage(userId, userTier)
        return NextResponse.json({
          answer: degradationMessage || "You've reached your daily query limit. Please try again tomorrow or upgrade your plan for more queries.",
          throttled: true,
          budgetStatus: getBudgetStatusMessage(userId, userTier),
          upgradeAvailable: userTier !== 'enterprise',
        })
      }

      // Get budget status for response headers
      budgetStatus = getBudgetStatusMessage(userId, userTier)

      // Process through throttle to get model selection
      const queryResult = await processThrottledQuery(userId, userTier, {
        query: rawMessage,
        estimatedTokens: Math.ceil(rawMessage.length / 4),
        requiresReasoning: mode === 'contemplate',
        isCodeGeneration: /\b(code|function|class|implement|write|create|build)\b/i.test(rawMessage),
      })
      throttleResult = queryResult

      if (!queryResult.allowed) {
        return NextResponse.json({
          answer: queryResult.message,
          throttled: true,
          budgetStatus,
          degraded: queryResult.degraded,
        })
      }

      // ==========================================================================
      // MODE ACCESS ENFORCEMENT: Check tier-based mode restrictions
      // Starter: Quick only | Pro: Quick + Thoughtful | Master: All modes
      // ==========================================================================
      const tierName = (userTier === 'enterprise' ? 'master' : userTier) as TierName

      // Check thoughtful mode access (requires Pro or higher)
      if (mode === 'thoughtful' && !hasTierFeature(tierName, 'hasThoughtfulMode')) {
        return NextResponse.json({
          answer: "Thoughtful mode uses multiple AI models for better answers. It's available on Pro and higher plans. Would you like me to answer in Quick mode instead?",
          featureLocked: true,
          feature: 'thoughtfulMode',
          currentTier: userTier,
          suggestedMode: 'quick',
        })
      }

      // Check contemplate mode access (requires Master)
      if (mode === 'contemplate' && !hasTierFeature(tierName, 'hasContemplateMode')) {
        return NextResponse.json({
          answer: "Contemplate mode enables deep reasoning with extended thinking. It's available on Master plans. Would you like me to answer in Thoughtful mode instead?",
          featureLocked: true,
          feature: 'contemplateMode',
          currentTier: userTier,
          suggestedMode: hasTierFeature(tierName, 'hasThoughtfulMode') ? 'thoughtful' : 'quick',
        })
      }

      // Check council mode access (requires Master)
      if (mode === 'council' && !hasTierFeature(tierName, 'hasCouncilMode')) {
        return NextResponse.json({
          answer: "Council mode brings multiple AI models together for deliberation on complex questions. It's available on Master plans. Would you like me to answer in a different mode?",
          featureLocked: true,
          feature: 'councilMode',
          currentTier: userTier,
          suggestedMode: hasTierFeature(tierName, 'hasThoughtfulMode') ? 'thoughtful' : 'quick',
        })
      }

      if (featureFlags.logThrottleDecisions) {
        console.log(`[OSQR Throttle] User ${userId} (${userTier}): ${budgetStatus}`)
      }
    }

    // SYSTEM MODE: Check for /system prefix or explicit toggle
    // This restricts context to OSQR system docs only (architecture, roadmap, etc.)
    const { systemMode: detectedSystemMode, cleanMessage } = parseSystemMode(rawMessage)
    const systemMode = explicitSystemMode ?? detectedSystemMode
    const message = cleanMessage

    if (systemMode) {
      console.log('[OSQR] System Mode active - restricting to OSQR system docs')
    }

    // ==========================================================================
    // CONSTITUTIONAL VALIDATION (I-1): Check input against safety rules
    // This is the first line of defense from @osqr/core
    // ==========================================================================
    if (featureFlags.enableConstitutionalValidation) {
      const constitutionalResult = await checkInput(message, userId, {
        sessionId: `session_${workspaceId}`,
      })

      if (!constitutionalResult.allowed) {
        const violations = constitutionalResult.violations ?? []
        console.log('[OSQR Constitutional] Input blocked:', violations.length, 'violations')
        return NextResponse.json({
          answer: getDeclineMessage(violations[0]?.type || 'content_policy'),
          blocked: true,
          reason: 'constitutional_violation',
        })
      }
    }

    // ==========================================================================
    // RENDER INTENT DETECTION: Check if user wants to create visual content
    // Handles "/render", "draw me", "visualize", "make a chart" etc.
    // ==========================================================================
    const { detectRenderIntent, detectIterationIntent } = await import('@/lib/render/intent-detection')
    const renderIntent = detectRenderIntent(message)
    const iterationIntent = detectIterationIntent(message)

    if (renderIntent.detected) {
      // User wants to create a new render (image or chart)
      return NextResponse.json({
        answer: "Rendering... I'll create that for you.",
        renderIntent: {
          type: renderIntent.type,
          prompt: message,
        },
        renderPending: true,
        // Frontend will call /api/render to actually generate
      })
    }

    if (iterationIntent.isIteration && conversationId) {
      // User wants to modify a recent render ("make it blue", "add more data")
      return NextResponse.json({
        answer: "Updating the render...",
        iterationIntent: {
          modification: message,
          conversationId,
        },
        renderPending: true,
        // Frontend will call /api/render with conversationId to iterate
      })
    }

    // ==========================================================================
    // OSQR ROUTER (I-2): Get routing recommendation from @osqr/core
    // This supplements the existing routeQuestion with OSQR's classification
    // ==========================================================================
    let osqrRouting: { tier: string; model: string; shouldUseFastPath: boolean } | null = null
    if (featureFlags.enableSmartRouting) {
      const routeResult = quickRoute(message)
      osqrRouting = {
        tier: routeResult.tier,
        model: routeResult.model,
        shouldUseFastPath: shouldUseFastPath(message),
      }
      console.log('[OSQR Router] Classification:', osqrRouting.tier, '→', osqrRouting.model)
    }

    // ==========================================================================
    // ULTRA-FAST PATH: For quick mode with simple questions, skip everything
    // This gives sub-3-second responses for basic questions
    // ==========================================================================
    const questionAnalysis = routeQuestion(message)
    const questionType = questionAnalysis.questionType
    const complexity = questionAnalysis.complexity

    // FAST PATH: Quick mode with smart vault access
    // This is the sweet spot: vault context when relevant + speed
    if (mode === 'quick') {
      // Start timing for dev analytics
      const timer = createTimer()
      const questionStats = analyzeQuestion(message)
      let cacheHit = false

      // Detect if this question is likely about the user's vault/documents
      // vs a general question (math, facts, coding, etc.)
      const vaultPatterns = /\b(vault|document|file|upload|my\s+(data|info|project|work|notes|content)|indexed|knowledge\s*base|how\s+many\s+(docs?|documents?|files?|chunks?))\b/i
      const metaPatterns = /\b(osqr|about\s+me|my\s+profile|settings?)\b/i
      const isLikelyVaultQuestion = vaultPatterns.test(message) || metaPatterns.test(message)

      // Detect if asking specifically about vault stats (counts, numbers)
      const vaultStatsPattern = /\b(how\s+many|count|number\s+of|total)\b.*\b(files?|docs?|documents?|chunks?|items?|vault|indexed)\b/i
      const isVaultStatsQuestion = vaultStatsPattern.test(message)

      // Skip vault search for obvious non-vault questions
      const isObviouslyGeneral = (
        questionType === 'conversational' && complexity <= 1 && !isLikelyVaultQuestion
      ) || /^\s*\d+\s*[\+\-\*\/x×]\s*\d+\s*$/.test(message) // pure math

      console.log(`[OSQR] FAST PATH: Single AI (${questionType}, complexity: ${complexity}, vaultSearch: ${!isObviouslyGeneral}, vaultStats: ${isVaultStatsQuestion})`)

      let autoContext: { context?: string; sources?: { identity: boolean; profile: boolean; msc: boolean; knowledge: boolean; threads: boolean; systemMode: boolean } } = {}
      let vaultStats: { documentCount: number; chunkCount: number } | null = null

      // If asking about vault stats, try prefetch cache first (instant), fall back to DB
      if (isVaultStatsQuestion) {
        // Try the prefetch cache first (populated when user opened chat)
        const cachedContext = getCachedContext(workspaceId)
        const cachedStats = getVaultStats(cachedContext)

        if (cachedStats) {
          vaultStats = cachedStats
          cacheHit = true
          console.log(`[OSQR] Vault stats from CACHE: ${cachedStats.documentCount} documents, ${cachedStats.chunkCount} chunks`)
        } else {
          // Cache miss - fall back to database query
          const [docCount, chunkCount] = await Promise.all([
            prisma.document.count({ where: { workspaceId } }),
            prisma.documentChunk.count({ where: { document: { workspaceId } } }),
          ])
          vaultStats = { documentCount: docCount, chunkCount: chunkCount }
          console.log(`[OSQR] Vault stats from DB: ${docCount} documents, ${chunkCount} chunks`)
        }
      }

      // Only search vault if question might be relevant (and not just asking for stats)
      if (!isObviouslyGeneral && !isVaultStatsQuestion) {
        const { assembleContext } = await import('@/lib/context/auto-context')
        autoContext = await assembleContext(workspaceId, message, {
          includeProfile: true,
          includeMSC: false, // Skip for speed
          includeKnowledge: true, // Search vault for relevant questions
          includeThreads: false, // Skip for speed
          maxKnowledgeChunks: 3, // Limit for speed
          systemMode,
        })
      }

      // Direct Claude call with vault context
      const { ProviderRegistry } = await import('@/lib/ai/providers')
      const provider = ProviderRegistry.getProvider('anthropic', {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-sonnet-4-20250514',
      })

      // Fetch cross-session memory (past conversations)
      const crossSessionMemory = await getCrossSessionMemory(workspaceId, 5)
      const memoryContext = formatMemoryForPrompt(crossSessionMemory)

      // Build system prompt based on whether we have vault context
      let systemPrompt = `You are OSQR, a friendly and thoughtful AI assistant. Be warm and personable while still being helpful and direct.

Guidelines:
- Be conversational and approachable, like a knowledgeable friend
- Give clear, useful answers without unnecessary padding
- If the question is ambiguous, make a reasonable interpretation and answer (don't just ask for clarification unless truly needed)
- Show genuine interest in helping
- Avoid robotic or overly formal language
- Don't explain your reasoning process or why you're answering a certain way
- When you know things about the user from past conversations, naturally reference that knowledge when relevant (but don't be creepy about it)`

      // UIP: Add personalization from User Intelligence Profile
      if (uipContext?.shouldPersonalize && uipContext.summary) {
        systemPrompt += `\n\n${uipContext.summary}`

        // Apply UIP adapters to behavior
        if (uipContext.adapters.verbosityMultiplier < 0.8) {
          systemPrompt += '\n- Keep responses concise and to-the-point (user prefers brevity).'
        } else if (uipContext.adapters.verbosityMultiplier > 1.3) {
          systemPrompt += '\n- Provide thorough explanations (user prefers detailed responses).'
        }

        if (uipContext.adapters.proactivityLevel > 0.7) {
          systemPrompt += '\n- Be proactive in offering suggestions and next steps.'
        } else if (uipContext.adapters.proactivityLevel < 0.3) {
          systemPrompt += '\n- Wait for the user to ask before offering additional suggestions.'
        }
      }

      // Add cross-session memory context
      if (memoryContext) {
        systemPrompt += `\n\n${memoryContext}`
      }

      if (vaultStats) {
        systemPrompt += `\n\nVault Statistics for this user:\n- Documents: ${vaultStats.documentCount}\n- Chunks (searchable pieces): ${vaultStats.chunkCount}\n\nUse these numbers to answer the user's question about their vault.`
      } else if (autoContext.context) {
        systemPrompt += '\n\nYou have access to the user\'s knowledge base. When answering questions about their documents/vault, reference specific information from the context provided.'
      } else if (isLikelyVaultQuestion) {
        // They asked about vault but we didn't find anything
        systemPrompt += '\n\nThe user is asking about their vault/documents. If you don\'t have specific information from their knowledge base, let them know you searched but didn\'t find relevant matches, and suggest they check what\'s been indexed.'
      }

      // Build messages with context
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        {
          role: 'system',
          content: systemPrompt
        },
      ]

      // Add vault context if available
      if (autoContext.context) {
        messages.push({
          role: 'system',
          content: `User's Knowledge Base Context:\n${autoContext.context}`,
        })
      }

      // Add conversation history for context continuity
      if (conversationHistory && conversationHistory.length > 0) {
        // Limit to last 10 messages to avoid token bloat
        const recentHistory = conversationHistory.slice(-10)
        for (const msg of recentHistory) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }

      messages.push({ role: 'user', content: message })

      const answer = await provider.generate({
        messages,
        temperature: 0.3,
      })

      // Minimal database operations - create thread + messages in parallel
      const [thread] = await Promise.all([
        prisma.chatThread.create({
          data: {
            workspaceId,
            title: message.slice(0, 100),
            mode: 'panel',
          },
        }),
      ])

      // Save messages
      const [, assistantMessage] = await Promise.all([
        prisma.chatMessage.create({
          data: { threadId: thread.id, role: 'user', content: message },
        }),
        prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: 'assistant',
            provider: 'anthropic',
            content: answer,
            metadata: {
              fastPath: true,
              usedKnowledge: !!autoContext.context,
              contextSources: autoContext.sources,
            },
          },
        }),
      ])

      // Save conversation summary for cross-session memory (async, don't wait)
      // Build the full conversation including this exchange
      const fullConversation = [
        ...(conversationHistory || []),
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: answer },
      ]
      // Only summarize if conversation is substantial (3+ messages)
      if (fullConversation.length >= 3) {
        saveConversationSummary({
          workspaceId,
          threadId: thread.id,
          messages: fullConversation,
        }).catch(err => console.error('[Cross-Session Memory] Save error:', err))
      }

      // UIP: Extract signals and process for profile learning
      // This runs async so it doesn't slow down the response
      try {
        const signals = extractSignalsFromMessage(message, thread.id, assistantMessage.id)
        if (signals.length > 0) {
          processSignalsForUser(userId, signals).catch(err =>
            console.error('[UIP] Signal processing error:', err)
          )
        }
      } catch (signalError) {
        console.error('[UIP] Signal extraction error:', signalError)
      }

      // Log analytics for dev workspaces (Joe's account)
      // This collects data to optimize the prefetch system
      // See docs/TODO-ANALYTICS-REVIEW.md and lib/analytics/dev-analytics.ts
      if (isDevWorkspace(workspaceId)) {
        timer.mark('complete')
        const analyticsEvent: AnalyticsEvent = {
          totalDurationMs: timer.elapsed(),
          questionType,
          complexity,
          wordCount: questionStats.wordCount,
          hasVaultKeywords: questionStats.hasVaultKeywords,
          hasMSCKeywords: questionStats.hasMSCKeywords,
          requestedMode: 'quick',
          effectiveMode: 'quick',
          wasAutoRouted: false,
          fastPath: true,
          cacheHit,
          cacheSource: cacheHit ? 'prefetch' : 'none',
          usedKnowledge: !!autoContext.context,
          usedMSC: false,
          usedProfile: false,
          knowledgeChunksReturned: 0,
          responseWordCount: answer.split(/\s+/).length,
          hasArtifacts: false,
        }
        // Don't await - fire and forget
        logAnalytics(workspaceId, thread.id, assistantMessage.id, analyticsEvent)
      }

      // Build final response with optional elicitation question
      let finalAnswer = answer
      if (elicitationQuestion) {
        finalAnswer = `${answer}\n\n---\n\n${elicitationQuestion}`
      }

      return NextResponse.json({
        answer: finalAnswer,
        threadId: thread.id,
        routing: {
          questionType,
          modelUsed: { provider: 'anthropic', model: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
          confidence: questionAnalysis.confidence,
          shouldSuggestAltOpinion: false,
          fastPath: true,
          complexity,
        },
        contextSources: autoContext.sources,
        // UIP: Include personalization metadata
        uip: uipContext?.shouldPersonalize ? {
          personalized: true,
          confidence: uipContext.confidence,
          suggestedMode: uipContext.adapters.suggestedMode,
        } : undefined,
        elicitationPending: !!elicitationQuestion,
      })
    }

    // ==========================================================================
    // STANDARD PATH: Full processing for complex questions
    // ==========================================================================

    // Track if we auto-routed to a different mode
    let autoRouted = false
    let autoRoutedReason = ''
    let effectiveMode: ResponseMode = mode

    // Auto-downgrade conditions:
    // 1. User selected thoughtful/contemplate but complexity is low (1-2)
    // 2. Question is factual/conversational type
    // 3. System mode is active (OSQR docs can be answered from indexed files)
    const shouldDowngrade = (
      (mode === 'thoughtful' || mode === 'contemplate') &&
      (
        (complexity <= 2 && (questionType === 'factual' || questionType === 'conversational')) ||
        (systemMode && complexity <= 3) // OSQR questions can usually be answered from docs
      )
    )

    if (shouldDowngrade) {
      effectiveMode = 'quick'
      autoRouted = true

      if (systemMode) {
        autoRoutedReason = "I found the answer in my indexed documentation, so I used Quick mode instead of consulting the full panel."
      } else if (questionType === 'factual') {
        autoRoutedReason = "This looked like a straightforward factual question, so I used Quick mode to get you a faster answer."
      } else {
        autoRoutedReason = "This seemed like a simple question, so I used Quick mode instead of the full panel discussion."
      }

      console.log(`[OSQR] Auto-routed: ${mode} → ${effectiveMode} (${questionType}, complexity: ${complexity})`)
    }

    // NOTE: Auto-upgrade for quick mode is now handled in the FAST PATH above.
    // Quick mode requests always go through the fast path, so this code path
    // only handles 'thoughtful' and 'contemplate' modes.

    // ==========================================================================
    // SAFETY CHECK: Detect crisis signals BEFORE any processing
    // ==========================================================================
    const safetyResult = performSafetyCheck(message)

    if (!safetyResult.proceedWithNormalFlow) {
      // Crisis detected - return empathetic response immediately
      // DO NOT store this message (privacy protection)
      console.log('[OSQR] Safety intervention triggered - crisis level:', safetyResult.crisis.level)

      // Log safety event (metadata only, never content)
      logSafetyEvent('crisis_detected', {
        level: safetyResult.crisis.level,
        confidence: safetyResult.crisis.confidence,
      })

      // Create a thread but mark it specially (for continuity if user responds)
      const thread = await prisma.chatThread.create({
        data: {
          workspaceId,
          title: 'Support Conversation',
          mode: 'panel',
        },
      })

      // DO NOT save the user's message content (crisis content never stored)
      // Only save OSQR's supportive response
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          provider: 'osqr-safety',
          content: safetyResult.interventionResponse || '',
          metadata: {
            safetyIntervention: true,
            // Never store: crisis level, signals, or any identifying info
          },
        },
      })

      return NextResponse.json({
        answer: safetyResult.interventionResponse,
        threadId: thread.id,
        // Don't include routing info for safety responses
        stored: false, // Signal to client that user message was not stored
      })
    }

    // TIL-PLANNER: Check if this is a 90-day planning request
    if (isPlanningRequest(message)) {
      console.log('[OSQR] Detected planning request, routing to TIL Planner')

      const planParams = extractPlanParams(message)
      const plan = await generatePlan90({
        workspaceId,
        mode: planParams.mode || 'realistic',
        targetRevenue: planParams.targetRevenue,
        targetLaunchDate: planParams.targetLaunchDate,
      })

      const formattedPlan = formatPlanForChat(plan)

      // Save as a thread
      const thread = await prisma.chatThread.create({
        data: {
          workspaceId,
          title: `90-Day Plan (${plan.metadata.mode})`,
          mode: 'panel',
        },
      })

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'user',
          content: message,
        },
      })

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          provider: 'mixed',
          content: formattedPlan,
          metadata: {
            isPlan90: true,
            planMode: plan.metadata.mode,
            confidence: plan.metadata.confidenceScore,
            dataPoints: plan.metadata.dataPoints,
          },
        },
      })

      return NextResponse.json({
        answer: formattedPlan,
        threadId: thread.id,
        routing: {
          type: 'plan90',
          mode: plan.metadata.mode,
          confidence: plan.metadata.confidenceScore,
        },
        plan, // Include raw plan for UI rendering
      })
    }

    // SELF-AUDIT: Check if this is a self-audit request (/audit, "audit yourself", etc.)
    if (isAuditRequest(message)) {
      console.log('[OSQR] Detected self-audit request, routing to Self-Audit System')

      const auditParams = extractAuditParams(message)
      const report = await runSelfAudit({
        workspaceId,
        auditType: auditParams.auditType || 'comprehensive',
        focusArea: auditParams.focusArea,
      })

      const formattedReport = formatAuditForChat(report)

      // Save as a thread
      const thread = await prisma.chatThread.create({
        data: {
          workspaceId,
          title: `Self-Audit (${report.metadata.auditType})`,
          mode: 'panel',
        },
      })

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'user',
          content: message,
        },
      })

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          provider: 'mixed',
          content: formattedReport,
          metadata: {
            isAudit: true,
            auditType: report.metadata.auditType,
            score: report.score,
            findingsCount: report.findings.length,
            systemDocsUsed: report.metadata.systemDocsUsed,
          },
        },
      })

      return NextResponse.json({
        answer: formattedReport,
        threadId: thread.id,
        routing: {
          type: 'self-audit',
          auditType: report.metadata.auditType,
          score: report.score,
        },
        report, // Include raw report for UI rendering
      })
    }

    // Use the workspace data already fetched for throttle (includes capabilityLevel)
    const userLevel = workspace?.capabilityLevel ?? 0

    // Fetch active agents from database
    const agents = await prisma.agent.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'No active agents found. Please configure agents first.' },
        { status: 400 }
      )
    }

    // Transform to panel agents
    type AgentRow = (typeof agents)[number]
    const panelAgents: PanelAgent[] = agents.map((agent: AgentRow) => ({
      id: agent.id,
      name: agent.name,
      provider: agent.provider as 'openai' | 'anthropic',
      modelName: agent.modelName,
      systemPrompt: agent.systemPrompt,
    }))

    // AUTO-CONTEXT (J-2): Assemble all relevant context automatically
    // Includes: profile, MSC (goals/projects), knowledge search, recent threads
    // In system mode, restricts to OSQR system docs only (skips user-specific context)
    const autoContext = await assembleContext(workspaceId, message, {
      includeProfile: true,
      includeMSC: true,
      includeKnowledge: useKnowledge,
      includeThreads: true,
      maxKnowledgeChunks: 5,
      maxThreads: 3,
      systemMode, // Restrict to OSQR docs only when active
    })

    // J-1 TIL: Add temporal intelligence insights to context
    const tilContext = await getTILContext(workspaceId, message)

    // Cross-session memory: Add context from past conversations
    const crossSessionMemory = await getCrossSessionMemory(workspaceId, 5)
    const memoryContext = formatMemoryForPrompt(crossSessionMemory)

    // ==========================================================================
    // CROSS-PROJECT MEMORY (I-9): Search across all projects for relevant context
    // This enables Oscar to surface connections between different projects
    // ==========================================================================
    let crossProjectContext: string | undefined
    if (featureFlags.enableCrossProjectMemory && projectId) {
      try {
        // Find related memories from other projects
        const relatedFromOtherProjects = await findRelatedFromOtherProjects(
          projectId,
          message,
          5 // Limit to 5 related items
        )

        if (relatedFromOtherProjects.length > 0) {
          const crossProjectLines = relatedFromOtherProjects.map(
            (m, i) => `${i + 1}. ${m.content} (from ${m.source})`
          )
          crossProjectContext = `## Related Context from Other Projects\n${crossProjectLines.join('\n')}`

          if (process.env.NODE_ENV === 'development') {
            console.log(`[OSQR Cross-Project] Found ${relatedFromOtherProjects.length} related items from other projects`)
          }
        }
      } catch (crossProjectError) {
        console.error('[OSQR Cross-Project] Error fetching cross-project context:', crossProjectError)
      }
    }

    const contextParts = [autoContext.context]
    if (tilContext) {
      contextParts.push(tilContext)
    }
    if (memoryContext) {
      contextParts.push(memoryContext)
    }
    if (crossProjectContext) {
      contextParts.push(crossProjectContext)
    }
    // UIP: Add personalization context from User Intelligence Profile
    if (uipContext?.shouldPersonalize && uipContext.summary) {
      contextParts.push(uipContext.summary)
    }
    const context = contextParts.filter(Boolean).join('\n\n---\n\n') || undefined

    // Log what context sources were used
    if (process.env.NODE_ENV === 'development') {
      console.log('[OSQR] Auto-context sources:', autoContext.sources)
      if (tilContext) console.log('[OSQR] TIL context included')
      if (crossProjectContext) console.log('[OSQR] Cross-project context included')
      if (uipContext?.shouldPersonalize) console.log('[OSQR] UIP personalization active (confidence:', uipContext.confidence.toFixed(2) + ')')
    }

    // Ask OSQR with user's capability level for GKVI context
    // Use effectiveMode (may be auto-routed from original mode)
    const osqrRequest: OSQRRequest = {
      userMessage: message,
      panelAgents,
      context,
      includeDebate,
      mode: effectiveMode, // Use effective mode (may be auto-routed)
      userLevel, // Pass capability level for level-aware GKVI context
    }

    const response = await OSQR.ask(osqrRequest)

    // ==========================================================================
    // SAFETY POST-PROCESSING: Wrap refusals and add disclaimers
    // ==========================================================================
    const safetyProcessed = processSafetyResponse(response.answer, message)
    let processedAnswer = safetyProcessed.content

    if (safetyProcessed.wasModified) {
      logSafetyEvent(
        safetyProcessed.content.includes("I can't help") ? 'refusal_wrapped' : 'disclaimer_added',
        { timestamp: new Date() }
      )
    }

    // ==========================================================================
    // CONSTITUTIONAL OUTPUT VALIDATION (I-1): Check AI response before sending
    // Second layer of defense - ensures AI output meets safety standards
    // ==========================================================================
    if (featureFlags.enableConstitutionalValidation) {
      const outputValidation = await checkOutput(processedAnswer, message, userId)

      if (!outputValidation.allowed) {
        const violations = outputValidation.violations ?? []
        console.log('[OSQR Constitutional] Output blocked:', violations.length, 'violations')
        // Use the suggested revision if available, otherwise use decline message
        if (outputValidation.suggestedRevision) {
          processedAnswer = outputValidation.suggestedRevision
          console.log('[OSQR Constitutional] Using suggested revision')
        } else {
          processedAnswer = getDeclineMessage('output_safety')
        }
      }
    }

    // Parse artifacts from OSQR's response
    const parsedResponse = parseArtifacts(processedAnswer)
    const { text: cleanAnswer, artifacts } = parsedResponse

    // Save conversation to database
    const thread = await prisma.chatThread.create({
      data: {
        workspaceId,
        title: message.slice(0, 100),
        mode: 'panel',
      },
    })

    // Save user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        content: message,
      },
    })

    // Save OSQR's response
    const osqrMessage = await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'assistant',
        provider: 'mixed', // OSQR synthesizes from multiple providers
        content: cleanAnswer,
        metadata: {
          panelSize: panelAgents.length,
          hadDebate: !!response.panelDiscussion,
          usedKnowledge: useKnowledge && !!context,
          hasArtifacts: artifacts.length > 0,
          // J-2: Track auto-context sources
          contextSources: autoContext.sources,
        },
      },
    })

    // Save artifacts to database if any were generated
    if (artifacts.length > 0) {
      await Promise.all(
        artifacts.map((artifact) =>
          prisma.artifact.create({
            data: {
              userId,
              workspaceId,
              messageId: osqrMessage.id,
              conversationId: thread.id,
              type: artifact.type as 'CODE' | 'DOCUMENT' | 'DIAGRAM' | 'HTML' | 'SVG' | 'JSON' | 'CSV' | 'REACT' | 'IMAGE' | 'CHART',
              title: artifact.title,
              content: { text: artifact.content, language: artifact.language, description: artifact.description },
              version: 1,
            },
          })
        )
      )
    }

    // AUTO-INDEX: Index conversation and artifacts for semantic search
    // This runs in background so it doesn't slow down the response
    indexInBackground(async () => {
      // Index the conversation
      await indexConversation({
        workspaceId,
        threadId: thread.id,
        userMessage: message,
        osqrResponse: cleanAnswer,
      })

      // Index any artifacts that were generated
      for (const artifact of artifacts) {
        await indexArtifact({
          workspaceId,
          artifactId: `${thread.id}-${artifact.title}`,
          title: artifact.title,
          content: artifact.content,
          type: artifact.type,
          description: artifact.description,
        })
      }

      // J-8: MSC Auto-Update - Extract goals/projects/ideas from conversation
      // Only run extraction if conversation might contain MSC-relevant content
      if (mightContainMSCContent(message) || mightContainMSCContent(cleanAnswer)) {
        try {
          const mscResult = await extractMSCUpdates(workspaceId, message, cleanAnswer)
          if (mscResult.extractions.length > 0) {
            console.log('[MSC Auto-Update] Found extractions:', mscResult.extractions.length)
            // For now, just log - we'll add UI for suggestions later
            // In future: store suggestions for user review
          }
        } catch (error) {
          console.error('[MSC Auto-Update] Extraction error:', error)
        }
      }

      // J-7: Identity Learning - Update identity dimensions from conversation
      try {
        await updateIdentityFromConversation(workspaceId, {
          userMessage: message,
          osqrResponse: cleanAnswer,
        })
      } catch (error) {
        console.error('[Identity Learning] Update error:', error)
      }

      // J-1: TIL Session Tracking - Track conversation for temporal intelligence
      // Now includes cognitive profiling with 50+ behavioral dimensions
      try {
        await trackConversation(workspaceId, message, cleanAnswer, {
          mode, // Track which response mode was used
        })
      } catch (error) {
        console.error('[TIL] Session tracking error:', error)
      }

      // Secretary Checklist: Detect commitments, deadlines, follow-ups, dependencies
      // Runs asynchronously - doesn't block the response
      try {
        const combinedMessage = `User: ${message}\n\nOSQR: ${cleanAnswer}`
        await runSecretaryCheck(workspaceId, combinedMessage, thread.id)
      } catch (error) {
        console.error('[Secretary] Detection error:', error)
      }

      // Cross-session memory: Save conversation summary for future recall
      try {
        const fullConversation = [
          ...(conversationHistory || []),
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: cleanAnswer },
        ]
        // Only summarize if conversation is substantial (3+ messages)
        if (fullConversation.length >= 3) {
          await saveConversationSummary({
            workspaceId,
            threadId: thread.id,
            messages: fullConversation,
          })
        }
      } catch (error) {
        console.error('[Cross-Session Memory] Save error:', error)
      }

      // I-6: TEMPORAL INTELLIGENCE - Extract commitments from conversation
      // This tracks promises, deadlines, and follow-ups mentioned in chat
      if (featureFlags.enableTemporalIntelligence) {
        try {
          // Check both user message and AI response for commitment signals
          const userHasCommitments = hasCommitmentSignals(message)
          const aiHasCommitments = hasCommitmentSignals(cleanAnswer)

          if (userHasCommitments || aiHasCommitments) {
            const combinedText = `User: ${message}\n\nAssistant: ${cleanAnswer}`
            const commitments = await extractCommitments(combinedText, {
              type: 'text', // 'text' is a valid CommitmentSourceType for chat conversations
              sourceId: thread.id,
              extractedAt: new Date(),
            })

            if (commitments.length > 0) {
              // Persist commitments to Decision table for morning digest and tracking
              const { persisted, ids } = await persistDecisions({
                workspaceId,
                userId,
                threadId: thread.id,
                commitments,
                source: 'web',
              })

              if (persisted > 0) {
                console.log(`[OSQR Temporal] Persisted ${persisted} decisions:`, ids)
              }
            }
          }
        } catch (error) {
          console.error('[OSQR Temporal] Extraction error:', error)
        }
      }

      // UIP: Extract signals from conversation and process for profile learning
      try {
        const signals = extractSignalsFromMessage(message, thread.id, osqrMessage.id)
        if (signals.length > 0) {
          await processSignalsForUser(userId, signals)
          console.log(`[UIP] Processed ${signals.length} signals from conversation`)
        }
      } catch (error) {
        console.error('[UIP] Signal processing error:', error)
      }
    })

    // Optionally save panel discussion for transparency/debugging
    // Only save if we have real agents (not quick mode's synthetic 'osqr-quick' agent)
    if (includeDebate && response.panelDiscussion) {
      await Promise.all(
        response.panelDiscussion.map((panelResponse) => {
          // Only include agentId if it's a real agent from the database
          const realAgent = agents.find((a: AgentRow) => a.id === panelResponse.agentId)
          return prisma.chatMessage.create({
            data: {
              threadId: thread.id,
              role: 'assistant',
              // Only set agentId if it's a real database agent (not 'osqr-quick' etc)
              agentId: realAgent ? panelResponse.agentId : undefined,
              provider: realAgent?.provider,
              content: panelResponse.content || `Error: ${panelResponse.error}`,
              metadata: {
                isPanelMember: true,
                phase: 'initial',
                // Store synthetic agent info in metadata for display purposes
                syntheticAgentId: realAgent ? undefined : panelResponse.agentId,
              },
            },
          })
        })
      )

      if (response.roundtableDiscussion) {
        await Promise.all(
          response.roundtableDiscussion.map((panelResponse) => {
            const realAgent = agents.find((a: AgentRow) => a.id === panelResponse.agentId)
            return prisma.chatMessage.create({
              data: {
                threadId: thread.id,
                role: 'assistant',
                agentId: realAgent ? panelResponse.agentId : undefined,
                provider: realAgent?.provider,
                content: panelResponse.content || `Error: ${panelResponse.error}`,
                metadata: {
                  isPanelMember: true,
                  phase: 'roundtable',
                  syntheticAgentId: realAgent ? undefined : panelResponse.agentId,
                },
              },
            })
          })
        )
      }
    }

    // ==========================================================================
    // THROTTLE: Record query usage after successful response
    // ==========================================================================
    if (featureFlags.enableThrottle && throttleResult?.model) {
      recordQueryUsage(userId, userTier, throttleResult.model.id)
    }

    // Store message with cross-project context if enabled
    if (featureFlags.enableCrossProjectMemory && projectId) {
      storeMessageWithContext(
        thread.id,
        'user',
        message,
        {
          projectId,
          conversationId: conversationId || thread.id,
          documentId: null,
          interface: 'web',
          timestamp: new Date(),
        }
      )
      storeMessageWithContext(
        thread.id,
        'assistant',
        cleanAnswer,
        {
          projectId,
          conversationId: conversationId || thread.id,
          documentId: null,
          interface: 'web',
          timestamp: new Date(),
        }
      )
    }

    // Build final response with optional elicitation question
    let finalAnswer = cleanAnswer
    if (elicitationQuestion) {
      finalAnswer = `${cleanAnswer}\n\n---\n\n${elicitationQuestion}`
    }

    return NextResponse.json(
      {
        answer: finalAnswer,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        threadId: thread.id,
        panelDiscussion: response.panelDiscussion,
        roundtableDiscussion: response.roundtableDiscussion,
        // New routing metadata - "OSQR knows when to think"
        routing: {
          ...response.routing,
          // Auto-routing info for UI notification
          autoRouted,
          autoRoutedReason,
          requestedMode: mode,
          effectiveMode,
          questionType,
          complexity,
          // I-2: @osqr/core routing recommendation
          osqrRouting: osqrRouting || undefined,
        },
        // J-2: Auto-context sources used
        contextSources: autoContext.sources,
        // I-10: Throttle/budget status
        budgetStatus: budgetStatus || undefined,
        degraded: throttleResult?.degraded || false,
        // I-9: Cross-project context indicator
        usedCrossProjectContext: !!crossProjectContext,
        // UIP: Include personalization metadata
        uip: uipContext?.shouldPersonalize ? {
          personalized: true,
          confidence: uipContext.confidence,
          suggestedMode: uipContext.adapters.suggestedMode,
        } : undefined,
        elicitationPending: !!elicitationQuestion,
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          // Add budget status header for UI
          ...(budgetStatus ? { 'X-Budget-Status': budgetStatus } : {}),
        },
      }
    )
  } catch (error) {
    console.error('OSQR ask error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
