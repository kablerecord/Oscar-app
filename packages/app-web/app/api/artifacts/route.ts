/**
 * Artifacts API - Main CRUD routes
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import {
  createArtifact,
  getConversationArtifacts,
  getUserArtifacts,
} from '@/lib/render/service'
import { ArtifactType } from '@prisma/client'

// ============================================
// GET - Fetch artifacts
// ============================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userEmail = session?.user?.email || (isDev ? 'dev@osqr.ai' : undefined)
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId')
    const type = searchParams.get('type') as ArtifactType | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // If conversationId is provided, get artifacts for that conversation
    if (conversationId) {
      const artifacts = await getConversationArtifacts(conversationId, user.id)
      return NextResponse.json({ artifacts })
    }

    // Otherwise, get user's artifacts (for artifact library)
    const artifacts = await getUserArtifacts(user.id, {
      type: type || undefined,
      limit,
      offset,
    })

    return NextResponse.json({ artifacts })
  } catch (error) {
    console.error('Artifacts fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Create artifact
// ============================================

const ImageContentSchema = z.object({
  type: z.literal('image'),
  prompt: z.string().min(1).max(4000),
  revisedPrompt: z.string().optional(),
  model: z.literal('dall-e-3'),
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']),
  imageUrl: z.string().url(),
  style: z.enum(['vivid', 'natural']).optional(),
})

const ChartContentSchema = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['line', 'bar', 'area']),
  title: z.string().optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  xKey: z.string(),
  yKey: z.union([z.string(), z.array(z.string())]),
  data: z.array(z.record(z.string(), z.unknown())),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().optional(),
  showGrid: z.boolean().optional(),
})

const ContentSchema = z.discriminatedUnion('type', [
  ImageContentSchema,
  ChartContentSchema,
])

const CreateArtifactSchema = z.object({
  workspaceId: z.string().optional(),
  type: z.enum(['IMAGE', 'CHART']),
  title: z.string().optional(),
  content: ContentSchema,
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  parentId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user ID
    const userEmail = session?.user?.email || (isDev ? 'dev@osqr.ai' : undefined)
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const validated = CreateArtifactSchema.parse(body)

    const artifact = await createArtifact({
      userId: user.id,
      workspaceId: validated.workspaceId,
      type: validated.type as ArtifactType,
      title: validated.title,
      content: validated.content,
      conversationId: validated.conversationId,
      messageId: validated.messageId,
      parentId: validated.parentId,
    })

    return NextResponse.json({ artifact }, { status: 201 })
  } catch (error) {
    console.error('Artifact create error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
