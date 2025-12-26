/**
 * Artifacts API - Individual artifact operations
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import {
  getArtifact,
  updateArtifactState,
  updateArtifactContent,
  markArtifactViewed,
  cancelArtifact,
} from '@/lib/render/service'
import { RenderState } from '@prisma/client'

// ============================================
// GET - Fetch single artifact
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const artifact = await getArtifact(id)

    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    // Verify ownership (skip in dev)
    if (!isDev && session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })

      if (artifact.userId !== user?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ artifact })
  } catch (error) {
    console.error('Artifact fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH - Update artifact
// ============================================

const UpdateArtifactSchema = z.object({
  state: z.enum([
    'IDLE',
    'RENDERING',
    'COMPLETE_AWAITING_VIEW',
    'VIEWING',
    'UPDATING',
    'ERROR',
    'CANCELLED',
  ]).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  markViewed: z.boolean().optional(),
  telemetry: z.object({
    latencyMs: z.number().optional(),
    attemptCount: z.number().optional(),
    errorCode: z.string().optional(),
    errorMessage: z.string().optional(),
  }).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const artifact = await getArtifact(id)
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    if (!isDev && session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })

      if (artifact.userId !== user?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const validated = UpdateArtifactSchema.parse(body)

    let updatedArtifact = artifact

    // Handle state update
    if (validated.state) {
      updatedArtifact = await updateArtifactState(
        id,
        validated.state as RenderState,
        validated.telemetry
      )
    }

    // Handle content update
    if (validated.content) {
      updatedArtifact = await updateArtifactContent(id, validated.content)
    }

    // Handle mark viewed
    if (validated.markViewed) {
      updatedArtifact = await markArtifactViewed(id)
    }

    return NextResponse.json({ artifact: updatedArtifact })
  } catch (error) {
    console.error('Artifact update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes('Invalid state transition')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - Cancel/delete artifact
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const artifact = await getArtifact(id)
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
    }

    if (!isDev && session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })

      if (artifact.userId !== user?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Cancel the artifact (don't hard delete - preserves audit trail)
    const cancelledArtifact = await cancelArtifact(id)

    return NextResponse.json({ artifact: cancelledArtifact })
  } catch (error) {
    console.error('Artifact delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
