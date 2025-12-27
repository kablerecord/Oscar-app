import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzeKnowledgeGaps, canPerformGapAnalysis } from '@/lib/knowledge/gap-analysis'
import { parseGapIntent } from '@/lib/ai/intent-handlers/gap-intent'

const QuerySchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  userId: z.string().optional(),
  topN: z.coerce.number().min(1).max(10).optional(),
  forceRefresh: z.coerce.boolean().optional(),
  query: z.string().optional(), // Natural language query for intent parsing
})

/**
 * GET /api/knowledge/gaps
 * Analyze knowledge gaps for a workspace
 *
 * Query Parameters:
 * - workspaceId: Required. The workspace to analyze.
 * - userId: Optional. User ID for UIP-based goal extraction.
 * - topN: Optional. Limit to top N gaps (1-10).
 * - forceRefresh: Optional. Force cache refresh.
 * - query: Optional. Natural language query to parse for intent context.
 *
 * Response:
 * {
 *   success: true,
 *   data: GapAnalysisResult
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const params = QuerySchema.parse({
      workspaceId: searchParams.get('workspaceId'),
      userId: searchParams.get('userId'),
      topN: searchParams.get('topN'),
      forceRefresh: searchParams.get('forceRefresh'),
      query: searchParams.get('query'),
    })

    const { workspaceId, userId, topN, forceRefresh, query } = params

    // Parse query for intent context if provided
    let effectiveTopN = topN
    if (query) {
      const intentContext = parseGapIntent(query)
      if (intentContext.topN && !topN) {
        effectiveTopN = intentContext.topN
      }
    }

    // Check if gap analysis can be performed
    const canAnalyze = await canPerformGapAnalysis(workspaceId, userId)
    if (!canAnalyze.canAnalyze) {
      return NextResponse.json({
        success: true,
        data: {
          gaps: [],
          strengths: [],
          summary: canAnalyze.reason,
          analyzedAt: new Date(),
          documentCount: 0,
          goalCount: 0,
          hasGoals: canAnalyze.hasGoals,
          hasDocs: canAnalyze.hasDocs,
        },
        meta: {
          canAnalyze: false,
          reason: canAnalyze.reason,
        },
      })
    }

    // Perform gap analysis
    const result = await analyzeKnowledgeGaps(workspaceId, {
      userId,
      topN: effectiveTopN,
      forceRefresh,
    })

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        canAnalyze: true,
        cached: !forceRefresh,
        topN: effectiveTopN,
      },
    })
  } catch (error) {
    console.error('[GapsAPI] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameters',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/knowledge/gaps
 * Analyze gaps with a natural language query
 *
 * Request Body:
 * {
 *   workspaceId: string,
 *   userId?: string,
 *   query: string  // Natural language like "What am I missing about marketing?"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const BodySchema = z.object({
      workspaceId: z.string().min(1),
      userId: z.string().optional(),
      query: z.string().min(1),
    })

    const { workspaceId, userId, query } = BodySchema.parse(body)

    // Parse intent from query
    const intentContext = parseGapIntent(query)

    if (!intentContext.isGapQuery) {
      return NextResponse.json({
        success: false,
        error: 'Not a gap analysis query',
        hint: 'Try asking something like "What am I missing?" or "What should I learn next?"',
      }, { status: 400 })
    }

    // Check if gap analysis can be performed
    const canAnalyze = await canPerformGapAnalysis(workspaceId, userId)
    if (!canAnalyze.canAnalyze) {
      return NextResponse.json({
        success: true,
        data: {
          gaps: [],
          strengths: [],
          summary: canAnalyze.reason,
          analyzedAt: new Date(),
          documentCount: 0,
          goalCount: 0,
          hasGoals: canAnalyze.hasGoals,
          hasDocs: canAnalyze.hasDocs,
        },
        meta: {
          canAnalyze: false,
          reason: canAnalyze.reason,
          intent: intentContext,
        },
      })
    }

    // Perform gap analysis
    const result = await analyzeKnowledgeGaps(workspaceId, {
      userId,
      topN: intentContext.topN,
    })

    // If domain-specific, filter results
    let filteredResult = result
    if (intentContext.scope === 'domain-specific' && intentContext.specificDomain) {
      const domainGap = result.gaps.find(g => g.domain === intentContext.specificDomain)
      filteredResult = {
        ...result,
        gaps: domainGap ? [domainGap] : [],
        summary: domainGap
          ? `For ${intentContext.specificDomain.split('/')[1]}: ${domainGap.reason}\n\nSuggested topics:\n${domainGap.suggestions.map(s => `• ${s}`).join('\n')}`
          : `You don't have a significant gap in ${intentContext.specificDomain.split('/')[1]} based on your current goals.`,
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredResult,
      meta: {
        canAnalyze: true,
        intent: intentContext,
      },
    })
  } catch (error) {
    console.error('[GapsAPI POST] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
