import { NextRequest, NextResponse } from 'next/server'
import { OSQR, type OSQRRequest } from '@/lib/ai/oscar'
import { type PanelAgent } from '@/lib/ai/panel'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { checkRateLimit, recordRequest } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { parseArtifacts } from '@/lib/artifacts'
import { indexConversation, indexArtifact, indexInBackground } from '@/lib/knowledge/auto-index'
import { assembleContext, parseSystemMode } from '@/lib/context/auto-context'
import { extractMSCUpdates, mightContainMSCContent, formatSuggestionsForChat } from '@/lib/msc/auto-updater'
import { updateIdentityFromConversation } from '@/lib/identity/dimensions'
import { trackConversation, getTILContext } from '@/lib/til'
import { isPlanningRequest, extractPlanParams, generatePlan90, formatPlanForChat } from '@/lib/til/planner'
import { isAuditRequest, extractAuditParams, runSelfAudit, formatAuditForChat } from '@/lib/til/self-audit'
import { performSafetyCheck, processSafetyResponse, logSafetyEvent } from '@/lib/safety'

const RequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string(),
  useKnowledge: z.boolean().default(true),
  includeDebate: z.boolean().default(false), // Debug mode to see panel discussion
  mode: z.enum(['quick', 'thoughtful', 'contemplate']).default('thoughtful'), // Response complexity mode
  systemMode: z.boolean().optional(), // Explicit system mode (restrict to OSQR docs only)
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
    const { message: rawMessage, workspaceId, useKnowledge, includeDebate, mode, systemMode: explicitSystemMode } = RequestSchema.parse(body)

    // SYSTEM MODE: Check for /system prefix or explicit toggle
    // This restricts context to OSQR system docs only (architecture, roadmap, etc.)
    const { systemMode: detectedSystemMode, cleanMessage } = parseSystemMode(rawMessage)
    const systemMode = explicitSystemMode ?? detectedSystemMode
    const message = cleanMessage

    if (systemMode) {
      console.log('[OSQR] System Mode active - restricting to OSQR system docs')
    }

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

    // Fetch workspace to get capability level for GKVI context
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { capabilityLevel: true },
    })
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
    const panelAgents: PanelAgent[] = agents.map((agent) => ({
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
    const contextParts = [autoContext.context]
    if (tilContext) {
      contextParts.push(tilContext)
    }
    const context = contextParts.filter(Boolean).join('\n\n---\n\n') || undefined

    // Log what context sources were used
    if (process.env.NODE_ENV === 'development') {
      console.log('[OSQR] Auto-context sources:', autoContext.sources)
      if (tilContext) console.log('[OSQR] TIL context included')
    }

    // Ask OSQR with user's capability level for GKVI context
    const osqrRequest: OSQRRequest = {
      userMessage: message,
      panelAgents,
      context,
      includeDebate,
      mode,
      userLevel, // Pass capability level for level-aware GKVI context
    }

    const response = await OSQR.ask(osqrRequest)

    // ==========================================================================
    // SAFETY POST-PROCESSING: Wrap refusals and add disclaimers
    // ==========================================================================
    const safetyProcessed = processSafetyResponse(response.answer, message)
    const processedAnswer = safetyProcessed.content

    if (safetyProcessed.wasModified) {
      logSafetyEvent(
        safetyProcessed.content.includes("I can't help") ? 'refusal_wrapped' : 'disclaimer_added',
        { timestamp: new Date() }
      )
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
              workspaceId,
              messageId: osqrMessage.id,
              threadId: thread.id,
              type: artifact.type,
              title: artifact.title,
              content: artifact.content,
              language: artifact.language,
              description: artifact.description,
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
    })

    // Optionally save panel discussion for transparency/debugging
    if (includeDebate && response.panelDiscussion) {
      await Promise.all(
        response.panelDiscussion.map((panelResponse) =>
          prisma.chatMessage.create({
            data: {
              threadId: thread.id,
              role: 'assistant',
              agentId: panelResponse.agentId,
              provider: agents.find((a) => a.id === panelResponse.agentId)?.provider,
              content: panelResponse.content || `Error: ${panelResponse.error}`,
              metadata: {
                isPanelMember: true,
                phase: 'initial',
              },
            },
          })
        )
      )

      if (response.roundtableDiscussion) {
        await Promise.all(
          response.roundtableDiscussion.map((panelResponse) =>
            prisma.chatMessage.create({
              data: {
                threadId: thread.id,
                role: 'assistant',
                agentId: panelResponse.agentId,
                provider: agents.find((a) => a.id === panelResponse.agentId)?.provider,
                content: panelResponse.content || `Error: ${panelResponse.error}`,
                metadata: {
                  isPanelMember: true,
                  phase: 'roundtable',
                },
              },
            })
          )
        )
      }
    }

    return NextResponse.json(
      {
        answer: cleanAnswer,
        artifacts: artifacts.length > 0 ? artifacts : undefined,
        threadId: thread.id,
        panelDiscussion: response.panelDiscussion,
        roundtableDiscussion: response.roundtableDiscussion,
        // New routing metadata - "OSQR knows when to think"
        routing: response.routing,
        // J-2: Auto-context sources used
        contextSources: autoContext.sources,
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
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
