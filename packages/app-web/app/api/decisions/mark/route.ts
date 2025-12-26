import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

/**
 * POST /api/decisions/mark
 *
 * Marks a piece of text as a decision. Used by web, VS Code, and mobile clients.
 * Decisions are stored in PKV and can be retrieved for future reference.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to mark decisions' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { messageId, text, conversationId, source, tags, context } = body

    // Validate required fields
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Decision text is required' },
        { status: 400 }
      )
    }

    // Validate source
    const validSources = ['web', 'vscode', 'mobile']
    if (!source || !validSources.includes(source)) {
      return NextResponse.json(
        { error: 'Bad Request', message: `Source must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      )
    }

    // Get user's workspace (use first workspace for now)
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: 'Not Found', message: 'No workspace found for user' },
        { status: 404 }
      )
    }

    // Create the decision
    const decision = await prisma.decision.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        messageId: messageId || null,
        conversationId: conversationId || null,
        text: text.trim(),
        source,
        tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string') : [],
        context: context || null,
      },
    })

    return NextResponse.json({
      id: decision.id,
      createdAt: decision.createdAt.toISOString(),
      success: true,
    })
  } catch (error) {
    console.error('Error marking decision:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to mark decision' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/decisions/mark
 *
 * Retrieves recent decisions for the authenticated user.
 * Query params:
 *   - limit: number of decisions to return (default: 20, max: 100)
 *   - source: filter by source ('web' | 'vscode' | 'mobile')
 *   - tag: filter by tag
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view decisions' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limitParam = searchParams.get('limit')
    const source = searchParams.get('source')
    const tag = searchParams.get('tag')

    // Parse and validate limit
    let limit = 20
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100)
      }
    }

    // Build where clause
    const where: {
      userId: string
      source?: string
      tags?: { has: string }
    } = {
      userId: session.user.id,
    }

    if (source && ['web', 'vscode', 'mobile'].includes(source)) {
      where.source = source
    }

    if (tag) {
      where.tags = { has: tag }
    }

    // Fetch decisions
    const decisions = await prisma.decision.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        text: true,
        source: true,
        tags: true,
        messageId: true,
        conversationId: true,
        context: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      decisions,
      count: decisions.length,
    })
  } catch (error) {
    console.error('Error fetching decisions:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch decisions' },
      { status: 500 }
    )
  }
}
