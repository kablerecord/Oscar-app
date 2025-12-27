import { NextRequest } from 'next/server'
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
import { updateIdentityFromConversation } from '@/lib/identity/dimensions'
import { trackConversation, getTILContext } from '@/lib/til'
import { runSecretaryCheck } from '@/lib/til/secretary-checklist'
import { isPlanningRequest } from '@/lib/til/planner'
import { isAuditRequest } from '@/lib/til/self-audit'
import { performSafetyCheck, processSafetyResponse, logSafetyEvent } from '@/lib/safety'
import { routeQuestion } from '@/lib/ai/model-router'
// getCachedContext and getVaultStats available for future fast-path optimization
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
import { shouldAskQuestion, formatElicitationQuestion } from '@/lib/uip/elicitation'

// @osqr/core Integration
import { checkInput, checkOutput, getDeclineMessage } from '@/lib/osqr/constitutional-wrapper'
import { shouldUseFastPath } from '@/lib/osqr/router-wrapper'
// quickRoute available for fast-path optimization
import { hasCommitmentSignals, extractCommitments } from '@/lib/osqr/temporal-wrapper'
import { featureFlags, throttleConfig } from '@/lib/osqr/config'

// Throttle & Cross-Project Memory
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
  findRelatedFromOtherProjects,
  storeMessageWithContext,
} from '@/lib/osqr/memory-wrapper'
import { hasFeature as hasTierFeature, type TierName } from '@/lib/tiers/config'

// Behavioral Intelligence Layer - Telemetry
import { getTelemetryCollector } from '@/lib/telemetry/TelemetryCollector'

const RequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  useKnowledge: z.boolean().default(true),
  includeDebate: z.boolean().default(false),
  mode: z.enum(['quick', 'thoughtful', 'contemplate', 'council']).default('thoughtful'),
  systemMode: z.boolean().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

/**
 * SSE Stream Format:
 *
 * event: metadata
 * data: { routing, contextSources, threadId, ... }
 *
 * event: text
 * data: { chunk: "Hello" }
 *
 * event: text
 * data: { chunk: " world" }
 *
 * event: done
 * data: { messageId, artifacts, tokensUsed }
 */

export async function POST(req: NextRequest) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Helper to send SSE events
  const sendEvent = async (event: string, data: object) => {
    await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const sendError = async (error: string, status: number = 500) => {
    await sendEvent('error', { error, status })
    await writer.close()
  }

  // Process the request in background
  ;(async () => {
    try {
      // 1. Auth check
      const isDev = process.env.NODE_ENV === 'development'
      const session = await getServerSession()

      let userId: string
      if (isDev && !session?.user?.email) {
        userId = 'dev-user'
      } else if (!session?.user?.email) {
        await sendError('Unauthorized', 401)
        return
      } else {
        userId = (session.user as { id?: string }).id || session.user.email
      }

      const ip = getClientIP(req)

      // 2. Rate limit check
      const rateLimitResult = await checkRateLimit({
        userId,
        ip,
        endpoint: 'oscar/ask-stream',
        tier: 'starter', // Conservative default - will be overridden by workspace tier
      })

      if (!rateLimitResult.allowed) {
        await sendError('Rate limit exceeded', 429)
        return
      }

      await recordRequest({ userId, ip, endpoint: 'oscar/ask-stream' })

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
          console.log('[Stream][UIP] Profile loaded - personalizing response (confidence:', uipContext.confidence.toFixed(2) + ')')
        }
      } catch (uipError) {
        console.error('[Stream][UIP] Error loading profile:', uipError)
        // Continue without UIP - it's non-blocking
      }

      const body = await req.json()
      const {
        message: rawMessage,
        workspaceId,
        projectId,
        conversationId,
        useKnowledge,
        includeDebate,
        mode,
        systemMode: explicitSystemMode,
        conversationHistory
      } = RequestSchema.parse(body)

      // 3. Throttle check
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { tier: true, capabilityLevel: true },
      })
      const userTier = (workspace?.tier || throttleConfig.defaultTier) as UserTier

      let throttleResult: { allowed: boolean; model: { id: string } | null; message: string; degraded: boolean } | null = null
      let budgetStatus: string | null = null

      if (featureFlags.enableThrottle) {
        const canQuery = canMakeQuery(userId, userTier)
        if (!canQuery) {
          const degradationMessage = getDegradationMessage(userId, userTier)
          await sendEvent('metadata', {
            throttled: true,
            budgetStatus: getBudgetStatusMessage(userId, userTier),
          })
          await sendEvent('text', { chunk: degradationMessage || "You've reached your daily query limit." })
          await sendEvent('done', {})
          await writer.close()
          return
        }

        budgetStatus = getBudgetStatusMessage(userId, userTier)
        const queryResult = await processThrottledQuery(userId, userTier, {
          query: rawMessage,
          estimatedTokens: Math.ceil(rawMessage.length / 4),
          requiresReasoning: mode === 'contemplate',
          isCodeGeneration: /\b(code|function|class|implement|write|create|build)\b/i.test(rawMessage),
        })
        throttleResult = queryResult

        if (!queryResult.allowed) {
          await sendEvent('metadata', { throttled: true, budgetStatus, degraded: queryResult.degraded })
          await sendEvent('text', { chunk: queryResult.message })
          await sendEvent('done', {})
          await writer.close()
          return
        }

        // ==========================================================================
        // MODE ACCESS ENFORCEMENT: Check tier-based mode restrictions
        // Starter: Quick only | Pro: Quick + Thoughtful | Master: All modes
        // ==========================================================================
        const tierName = (userTier === 'enterprise' ? 'master' : userTier) as TierName

        // Check thoughtful mode access (requires Pro or higher)
        if (mode === 'thoughtful' && !hasTierFeature(tierName, 'hasThoughtfulMode')) {
          await sendEvent('metadata', { featureLocked: true, feature: 'thoughtfulMode', suggestedMode: 'quick' })
          await sendEvent('text', { chunk: "Thoughtful mode uses multiple AI models for better answers. It's available on Pro and higher plans." })
          await sendEvent('done', {})
          await writer.close()
          return
        }

        // Check contemplate mode access (requires Master)
        if (mode === 'contemplate' && !hasTierFeature(tierName, 'hasContemplateMode')) {
          const suggestedMode = hasTierFeature(tierName, 'hasThoughtfulMode') ? 'thoughtful' : 'quick'
          await sendEvent('metadata', { featureLocked: true, feature: 'contemplateMode', suggestedMode })
          await sendEvent('text', { chunk: "Contemplate mode enables deep reasoning with extended thinking. It's available on Master plans." })
          await sendEvent('done', {})
          await writer.close()
          return
        }

        // Check council mode access (requires Master)
        if (mode === 'council' && !hasTierFeature(tierName, 'hasCouncilMode')) {
          const suggestedMode = hasTierFeature(tierName, 'hasThoughtfulMode') ? 'thoughtful' : 'quick'
          await sendEvent('metadata', { featureLocked: true, feature: 'councilMode', suggestedMode })
          await sendEvent('text', { chunk: "Council mode brings multiple AI models together for deliberation. It's available on Master plans." })
          await sendEvent('done', {})
          await writer.close()
          return
        }
      }

      // ==========================================================================
      // BIL: Track mode selection for behavioral learning
      // ==========================================================================
      try {
        const collector = getTelemetryCollector()
        await collector.trackModeSelected(
          userId,
          workspaceId,
          mode as 'quick' | 'thoughtful' | 'contemplate',
          false // wasAutoSuggested - not implemented yet
        )
      } catch (telemetryError) {
        // Non-blocking - continue without telemetry
        console.error('[Stream][BIL] Telemetry error:', telemetryError)
      }

      // 4. Parse system mode
      const { systemMode: detectedSystemMode, cleanMessage } = parseSystemMode(rawMessage)
      const systemMode = explicitSystemMode ?? detectedSystemMode
      const message = cleanMessage

      // 5. Constitutional input check
      if (featureFlags.enableConstitutionalValidation) {
        const constitutionalResult = await checkInput(message, userId, {
          sessionId: `session_${workspaceId}`,
        })

        if (!constitutionalResult.allowed) {
          const violations = constitutionalResult.violations ?? []
          await sendEvent('metadata', { blocked: true, reason: 'constitutional_violation' })
          await sendEvent('text', { chunk: getDeclineMessage(violations[0]?.type || 'content_policy') })
          await sendEvent('done', {})
          await writer.close()
          return
        }
      }

      // 6. Safety check
      const safetyResult = performSafetyCheck(message)
      if (!safetyResult.proceedWithNormalFlow) {
        logSafetyEvent('crisis_detected', {
          level: safetyResult.crisis.level,
          confidence: safetyResult.crisis.confidence,
        })

        const thread = await prisma.chatThread.create({
          data: { workspaceId, title: 'Support Conversation', mode: 'panel' },
        })

        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: 'assistant',
            provider: 'osqr-safety',
            content: safetyResult.interventionResponse || '',
            metadata: { safetyIntervention: true },
          },
        })

        await sendEvent('metadata', { threadId: thread.id, stored: false })
        await sendEvent('text', { chunk: safetyResult.interventionResponse || '' })
        await sendEvent('done', {})
        await writer.close()
        return
      }

      // 7. Check for special request types (planning, audit) - these don't stream
      if (isPlanningRequest(message) || isAuditRequest(message)) {
        // For these special modes, redirect to non-streaming endpoint
        await sendEvent('metadata', { redirect: '/api/oscar/ask', reason: 'special_mode' })
        await writer.close()
        return
      }

      // 8. Question routing and analysis
      const questionAnalysis = routeQuestion(message)
      const questionType = questionAnalysis.questionType
      const complexity = questionAnalysis.complexity

      // Determine effective mode (auto-routing)
      let autoRouted = false
      let autoRoutedReason = ''
      let effectiveMode: ResponseMode = mode

      // Downgrade to Quick mode for simple questions that don't need multi-model synthesis
      // Self-referential questions (about OSQR) ALWAYS use Quick mode - constitution is in the prompt
      const shouldDowngrade = (
        (mode === 'thoughtful' || mode === 'contemplate') &&
        (
          questionType === 'self_referential' || // Always quick for identity questions
          (complexity <= 2 && (questionType === 'factual' || questionType === 'conversational')) ||
          (systemMode && complexity <= 3)
        )
      )

      if (shouldDowngrade) {
        effectiveMode = 'quick'
        autoRouted = true
        if (questionType === 'self_referential') {
          autoRoutedReason = "Identity question - I know who I am!"
        } else if (systemMode) {
          autoRoutedReason = "Found the answer in indexed documentation."
        } else {
          autoRoutedReason = "Simple question - used Quick mode for faster response."
        }
      }

      const userLevel = workspace?.capabilityLevel ?? 0

      // 8b. Repeated question detection
      // If user asks the same question twice, offer to expand or repeat
      let isRepeatedQuestion = false
      let previousAnswer: string | null = null
      if (conversationHistory && conversationHistory.length >= 2) {
        // Check last few user messages for similarity
        const userMessages = conversationHistory.filter(m => m.role === 'user')
        const lastUserMessage = userMessages[userMessages.length - 1]?.content?.toLowerCase().trim()
        const currentMessage = message.toLowerCase().trim()

        // Simple similarity check - exact match or very close
        if (lastUserMessage && (
          lastUserMessage === currentMessage ||
          // Check if one contains the other (handles slight variations)
          (lastUserMessage.length > 10 && currentMessage.includes(lastUserMessage)) ||
          (currentMessage.length > 10 && lastUserMessage.includes(currentMessage))
        )) {
          isRepeatedQuestion = true
          // Get the previous answer
          const lastAssistantMessage = conversationHistory.filter(m => m.role === 'assistant').pop()
          previousAnswer = lastAssistantMessage?.content || null
        }
      }

      // Handle repeated questions - ask if user wants expansion or repetition
      if (isRepeatedQuestion && previousAnswer) {
        const thread = await prisma.chatThread.create({
          data: { workspaceId, title: message.slice(0, 100), mode: 'panel' },
        })

        await prisma.chatMessage.create({
          data: { threadId: thread.id, role: 'user', content: message },
        })

        const repeatResponse = `I notice you've asked this question again. Would you like me to expand on my previous answer, approach it from a different angle, or just repeat what I said? Let me know how I can help.`

        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            role: 'assistant',
            provider: 'osqr-system',
            content: repeatResponse,
            metadata: { isRepeatedQuestion: true },
          },
        })

        await sendEvent('metadata', {
          threadId: thread.id,
          routing: { questionType, complexity, autoRouted: true, autoRoutedReason: 'Repeated question detected', requestedMode: mode, effectiveMode: 'quick' },
          // Note: isRepeatedQuestion flag removed - the response text handles it naturally
        })
        await sendEvent('text', { chunk: repeatResponse })
        await sendEvent('done', { messageId: thread.id })
        await writer.close()
        return
      }

      // 9. Fetch agents
      const agents = await prisma.agent.findMany({
        where: { workspaceId, isActive: true },
        orderBy: { name: 'asc' },
      })

      if (agents.length === 0 && effectiveMode !== 'quick') {
        await sendError('No active agents found', 400)
        return
      }

      type AgentRow = (typeof agents)[number]
      const panelAgents: PanelAgent[] = agents.map((agent: AgentRow) => ({
        id: agent.id,
        name: agent.name,
        provider: agent.provider as 'openai' | 'anthropic',
        modelName: agent.modelName,
        systemPrompt: agent.systemPrompt,
      }))

      // 10. Assemble context - with timing for debugging
      const startContext = Date.now()

      // For Quick mode with simple questions, skip heavy context gathering
      const isSimpleQuestion = effectiveMode === 'quick' && complexity <= 2

      let autoContext: Awaited<ReturnType<typeof assembleContext>>
      let tilContext: string | null = null
      let crossSessionMemory: Awaited<ReturnType<typeof getCrossSessionMemory>>
      let memoryContext: string = ''

      if (isSimpleQuestion) {
        // Fast path: minimal context for simple questions
        console.log('[Stream] Fast path: skipping heavy context for simple question')
        autoContext = { context: '', sources: { identity: false, profile: false, msc: false, knowledge: false, threads: false, systemMode: false }, raw: {} }
        crossSessionMemory = { recentSummaries: [], accumulatedFacts: {}, hasMemory: false }
      } else {
        // Full context assembly for complex questions
        autoContext = await assembleContext(workspaceId, message, {
          includeProfile: true,
          includeMSC: true,
          includeKnowledge: useKnowledge,
          includeThreads: true,
          maxKnowledgeChunks: 5,
          maxThreads: 3,
          systemMode,
        })
        tilContext = await getTILContext(workspaceId, message)
        crossSessionMemory = await getCrossSessionMemory(workspaceId, 5)
        memoryContext = formatMemoryForPrompt(crossSessionMemory)
      }

      console.log(`[Stream] Context assembly took ${Date.now() - startContext}ms`)

      // Cross-project context
      let crossProjectContext: string | undefined
      if (featureFlags.enableCrossProjectMemory && projectId) {
        try {
          const relatedFromOtherProjects = await findRelatedFromOtherProjects(projectId, message, 5)
          if (relatedFromOtherProjects.length > 0) {
            const crossProjectLines = relatedFromOtherProjects.map(
              (m, i) => `${i + 1}. ${m.content} (from ${m.source})`
            )
            crossProjectContext = `## Related Context from Other Projects\n${crossProjectLines.join('\n')}`
          }
        } catch (e) {
          console.error('[Stream] Cross-project context error:', e)
        }
      }

      // ==========================================================================
      // UIP: Add personalization context to system prompt
      // ==========================================================================
      let uipContextString: string | undefined
      if (uipContext?.shouldPersonalize && uipContext.summary) {
        uipContextString = uipContext.summary

        // Add behavioral guidance based on UIP adapters
        if (uipContext.adapters.verbosityMultiplier < 0.8) {
          uipContextString += '\n\nGuidance: This user prefers concise, brief responses. Keep answers short and to the point.'
        } else if (uipContext.adapters.verbosityMultiplier > 1.3) {
          uipContextString += '\n\nGuidance: This user prefers detailed explanations. Provide thorough, comprehensive responses.'
        }

        if (uipContext.adapters.proactivityLevel > 0.7) {
          uipContextString += '\n\nGuidance: This user appreciates proactive suggestions. Feel free to offer additional insights and recommendations.'
        } else if (uipContext.adapters.proactivityLevel < 0.3) {
          uipContextString += '\n\nGuidance: This user prefers direct answers. Avoid unsolicited advice unless directly relevant.'
        }
      }

      const contextParts = [autoContext.context, tilContext, memoryContext, crossProjectContext, uipContextString].filter(Boolean)
      const context = contextParts.join('\n\n---\n\n') || undefined

      // Create thread for this conversation
      const startDb = Date.now()
      const thread = await prisma.chatThread.create({
        data: { workspaceId, title: message.slice(0, 100), mode: 'panel' },
      })

      // Save user message
      await prisma.chatMessage.create({
        data: { threadId: thread.id, role: 'user', content: message },
      })
      console.log(`[Stream] Thread + message creation took ${Date.now() - startDb}ms`)

      // 11. Send metadata before streaming starts
      // This tells the client: "pre-flight is done, text is coming"
      await sendEvent('metadata', {
        threadId: thread.id,
        routing: {
          questionType,
          complexity,
          autoRouted,
          autoRoutedReason,
          requestedMode: mode,
          effectiveMode,
        },
        contextSources: autoContext.sources,
        budgetStatus: budgetStatus || undefined,
        degraded: throttleResult?.degraded || false,
        usedCrossProjectContext: !!crossProjectContext,
        // UIP: Include personalization status
        uip: uipContext?.shouldPersonalize ? {
          personalized: true,
          confidence: uipContext.confidence,
          suggestedMode: uipContext.adapters.suggestedMode,
        } : undefined,
      })

      // 12. Stream the response
      const osqrRequest: OSQRRequest = {
        userMessage: message,
        panelAgents,
        context,
        includeDebate,
        mode: effectiveMode,
        userLevel,
      }

      let fullResponse = ''

      // Use the streaming method
      const startAI = Date.now()
      let firstChunkTime: number | null = null
      for await (const chunk of OSQR.askStream(osqrRequest)) {
        if (!firstChunkTime) {
          firstChunkTime = Date.now() - startAI
          console.log(`[Stream] First AI chunk received in ${firstChunkTime}ms`)
        }
        fullResponse += chunk
        await sendEvent('text', { chunk })
      }
      console.log(`[Stream] Total AI streaming took ${Date.now() - startAI}ms`)

      // 13. Post-process the response
      // Safety post-processing
      const safetyProcessed = processSafetyResponse(fullResponse, message)
      let processedAnswer = safetyProcessed.content

      if (safetyProcessed.wasModified) {
        logSafetyEvent(
          safetyProcessed.content.includes("I can't help") ? 'refusal_wrapped' : 'disclaimer_added',
          { timestamp: new Date() }
        )
      }

      // Constitutional output check
      if (featureFlags.enableConstitutionalValidation) {
        const outputValidation = await checkOutput(processedAnswer, message, userId)
        if (!outputValidation.allowed) {
          if (outputValidation.suggestedRevision) {
            processedAnswer = outputValidation.suggestedRevision
          } else {
            processedAnswer = getDeclineMessage('output_safety')
          }
        }
      }

      // Parse artifacts
      const parsedResponse = parseArtifacts(processedAnswer)
      const { text: cleanAnswer, artifacts } = parsedResponse

      // Save OSQR's response
      const osqrMessage = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          role: 'assistant',
          provider: 'mixed',
          content: cleanAnswer,
          metadata: {
            panelSize: panelAgents.length,
            usedKnowledge: useKnowledge && !!context,
            hasArtifacts: artifacts.length > 0,
            contextSources: autoContext.sources,
            streamed: true,
          },
        },
      })

      // Save artifacts
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

      // 14. Send elicitation question if applicable (before done event)
      if (elicitationQuestion) {
        // Send a separator and the elicitation question as additional text
        await sendEvent('text', { chunk: '\n\n---\n\n' })
        await sendEvent('text', { chunk: elicitationQuestion })
      }

      // 15. Send done event with final data
      await sendEvent('done', {
        messageId: osqrMessage.id,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        hasElicitation: !!elicitationQuestion,
      })

      await writer.close()

      // 15. Background tasks (don't block the response)
      indexInBackground(async () => {
        await indexConversation({
          workspaceId,
          threadId: thread.id,
          userMessage: message,
          osqrResponse: cleanAnswer,
        })

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

        if (mightContainMSCContent(message) || mightContainMSCContent(cleanAnswer)) {
          try {
            await extractMSCUpdates(workspaceId, message, cleanAnswer)
          } catch (e) {
            console.error('[MSC Auto-Update] Error:', e)
          }
        }

        try {
          await updateIdentityFromConversation(workspaceId, {
            userMessage: message,
            osqrResponse: cleanAnswer,
          })
        } catch (e) {
          console.error('[Identity Learning] Error:', e)
        }

        try {
          await trackConversation(workspaceId, message, cleanAnswer, { mode })
        } catch (e) {
          console.error('[TIL] Error:', e)
        }

        // Secretary Checklist: Detect commitments, deadlines, follow-ups, dependencies
        // Runs asynchronously - doesn't block the response
        try {
          const combinedMessage = `User: ${message}\n\nOSQR: ${cleanAnswer}`
          await runSecretaryCheck(workspaceId, combinedMessage, thread.id)
        } catch (e) {
          console.error('[Secretary] Error:', e)
        }

        const fullConversation = [
          ...(conversationHistory || []),
          { role: 'user' as const, content: message },
          { role: 'assistant' as const, content: cleanAnswer },
        ]
        if (fullConversation.length >= 3) {
          try {
            await saveConversationSummary({ workspaceId, threadId: thread.id, messages: fullConversation })
          } catch (e) {
            console.error('[Cross-Session Memory] Error:', e)
          }
        }

        if (featureFlags.enableTemporalIntelligence) {
          try {
            const userHasCommitments = hasCommitmentSignals(message)
            const aiHasCommitments = hasCommitmentSignals(cleanAnswer)
            if (userHasCommitments || aiHasCommitments) {
              const combinedText = `User: ${message}\n\nAssistant: ${cleanAnswer}`
              await extractCommitments(combinedText, {
                type: 'text',
                sourceId: thread.id,
                extractedAt: new Date(),
              })
            }
          } catch (e) {
            console.error('[Temporal] Error:', e)
          }
        }

        // UIP: Extract signals from conversation and process for profile learning
        try {
          const signals = extractSignalsFromMessage(message, thread.id, osqrMessage.id)
          if (signals.length > 0) {
            await processSignalsForUser(userId, signals)
            console.log(`[Stream][UIP] Processed ${signals.length} signals from conversation`)
          }
        } catch (e) {
          console.error('[Stream][UIP] Signal processing error:', e)
        }
      })

      // Record throttle usage
      if (featureFlags.enableThrottle && throttleResult?.model) {
        recordQueryUsage(userId, userTier, throttleResult.model.id)
      }

      // Store with cross-project context
      if (featureFlags.enableCrossProjectMemory && projectId) {
        storeMessageWithContext(thread.id, 'user', message, {
          projectId,
          conversationId: conversationId || thread.id,
          documentId: null,
          interface: 'web',
          timestamp: new Date(),
        })
        storeMessageWithContext(thread.id, 'assistant', cleanAnswer, {
          projectId,
          conversationId: conversationId || thread.id,
          documentId: null,
          interface: 'web',
          timestamp: new Date(),
        })
      }

    } catch (error) {
      console.error('[Stream] Error:', error)
      try {
        await sendEvent('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 500
        })
        await writer.close()
      } catch {
        // Writer may already be closed
      }
    }
  })()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
