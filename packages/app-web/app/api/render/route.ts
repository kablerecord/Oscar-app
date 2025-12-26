/**
 * Render API - Handles artifact generation
 * This is the main entry point for render operations
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import {
  createArtifact,
  updateArtifactState,
  getMostRecentlyViewedArtifact,
} from '@/lib/render/service'
import {
  generateImage,
  refineImagePrompt,
} from '@/lib/render/image-generator'
import {
  generateChartSpec,
} from '@/lib/render/chart-generator'
import {
  detectRenderIntent,
  detectIterationIntent,
  extractRenderPrompt,
  inferImageSize,
  inferChartType,
} from '@/lib/render/intent-detection'
import { ArtifactType } from '@prisma/client'

// ============================================
// POST - Generate a new artifact or iterate on existing
// ============================================

const RenderRequestSchema = z.object({
  message: z.string().min(1),
  workspaceId: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  // For charts, data can be provided directly
  chartData: z.object({
    data: z.array(z.record(z.string(), z.unknown())),
    xKey: z.string().optional(),
    yKey: z.union([z.string(), z.array(z.string())]).optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session?.user?.email || 'dev@osqr.ai' },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { message, workspaceId, conversationId, messageId, chartData } = RenderRequestSchema.parse(body)

    // Detect render intent
    const intent = detectRenderIntent(message)

    if (!intent.detected) {
      // Check if this is an iteration request
      const iteration = detectIterationIntent(message)

      if (iteration.isIteration && conversationId) {
        // Find the artifact to iterate on
        const targetArtifact = await getMostRecentlyViewedArtifact(conversationId, user.id)

        if (!targetArtifact) {
          return NextResponse.json({
            error: 'No artifact found to update',
            message: "I don't see a recent render to update. Can you specify what you'd like me to change?",
          }, { status: 400 })
        }

        // Handle iteration based on artifact type
        if (targetArtifact.type === 'IMAGE') {
          type ImageSize = '1024x1024' | '1792x1024' | '1024x1792'
          type ImageStyle = 'vivid' | 'natural'
          const currentContent = targetArtifact.content as { prompt: string; size: ImageSize; style: ImageStyle }
          const refinedPrompt = refineImagePrompt(currentContent.prompt, message)
          const size: ImageSize = currentContent.size || '1024x1024'
          const style: ImageStyle = currentContent.style || 'vivid'

          // Create new artifact in RENDERING state
          const newArtifact = await createArtifact({
            userId: user.id,
            workspaceId,
            type: 'IMAGE' as ArtifactType,
            title: `Iteration: ${message.slice(0, 50)}`,
            content: {
              type: 'image' as const,
              prompt: refinedPrompt,
              model: 'dall-e-3' as const,
              size,
              imageUrl: '', // Will be filled after generation
              style,
            },
            conversationId,
            messageId,
            parentId: targetArtifact.id,
          })

          // Generate the image
          const result = await generateImage({
            prompt: refinedPrompt,
            size,
            style,
          })

          if (!result.success) {
            await updateArtifactState(newArtifact.id, 'ERROR', {
              errorCode: result.error.code,
              errorMessage: result.error.message,
              latencyMs: result.latencyMs,
            })

            return NextResponse.json({
              artifact: { ...newArtifact, state: 'ERROR' },
              error: result.error,
              message: result.error.message,
            })
          }

          // Update artifact with generated content
          const updatedArtifact = await prisma.artifact.update({
            where: { id: newArtifact.id },
            data: {
              content: result.content as object,
              state: 'COMPLETE_AWAITING_VIEW',
              latencyMs: result.latencyMs,
              provider: 'openai',
              model: 'dall-e-3',
            },
          })

          return NextResponse.json({
            artifact: updatedArtifact,
            renderComplete: true,
            message: 'Render complete. Would you like to see it?',
          })
        }

        // Chart iteration would go here
        return NextResponse.json({
          error: 'Iteration not supported for this artifact type yet',
        }, { status: 400 })
      }

      return NextResponse.json({
        detected: false,
        message: 'No render intent detected in this message.',
      })
    }

    // Extract the prompt from the message
    const prompt = extractRenderPrompt(message, intent)

    // Handle image generation
    if (intent.type === 'image') {
      const size = inferImageSize(prompt)

      // Create artifact in RENDERING state
      const artifact = await createArtifact({
        userId: user.id,
        workspaceId,
        type: 'IMAGE' as ArtifactType,
        title: prompt.slice(0, 100),
        content: {
          type: 'image',
          prompt,
          model: 'dall-e-3',
          size,
          imageUrl: '', // Will be filled after generation
          style: 'vivid',
        },
        conversationId,
        messageId,
      })

      // Generate the image
      const result = await generateImage({
        prompt,
        size,
        style: 'vivid',
      })

      if (!result.success) {
        await updateArtifactState(artifact.id, 'ERROR', {
          errorCode: result.error.code,
          errorMessage: result.error.message,
          latencyMs: result.latencyMs,
        })

        return NextResponse.json({
          artifact: { ...artifact, state: 'ERROR' },
          error: result.error,
          message: result.error.message,
        })
      }

      // Update artifact with generated content
      const updatedArtifact = await prisma.artifact.update({
        where: { id: artifact.id },
        data: {
          content: result.content as object,
          state: 'COMPLETE_AWAITING_VIEW',
          latencyMs: result.latencyMs,
          provider: 'openai',
          model: 'dall-e-3',
        },
      })

      return NextResponse.json({
        artifact: updatedArtifact,
        renderComplete: true,
        message: 'Render complete. Would you like to see it?',
      })
    }

    // Handle chart generation
    if (intent.type === 'chart') {
      if (!chartData?.data || chartData.data.length === 0) {
        return NextResponse.json({
          error: 'Chart data required',
          message: "I need some data to create a chart. Can you provide the data you'd like to visualize?",
        }, { status: 400 })
      }

      const chartType = inferChartType(message)
      const keys = Object.keys(chartData.data[0])

      // Infer x and y keys if not provided
      const xKey = chartData.xKey || keys[0]
      const yKey = chartData.yKey || keys.filter(k => k !== xKey && typeof chartData.data[0][k] === 'number')

      const result = generateChartSpec({
        chartType,
        xKey,
        yKey: yKey.length === 1 ? yKey[0] : yKey,
        data: chartData.data,
        showGrid: true,
      })

      if (!result.success) {
        return NextResponse.json({
          error: result.error,
          message: result.error.message,
        }, { status: 400 })
      }

      // Create artifact
      const artifact = await createArtifact({
        userId: user.id,
        workspaceId,
        type: 'CHART' as ArtifactType,
        title: result.content.title || 'Chart',
        content: result.content,
        conversationId,
        messageId,
      })

      // Charts are generated client-side, so mark as complete immediately
      const updatedArtifact = await prisma.artifact.update({
        where: { id: artifact.id },
        data: {
          state: 'COMPLETE_AWAITING_VIEW',
        },
      })

      return NextResponse.json({
        artifact: updatedArtifact,
        renderComplete: true,
        message: 'Render complete. Would you like to see it?',
      })
    }

    return NextResponse.json({
      error: 'Unknown render type',
    }, { status: 400 })
  } catch (error) {
    console.error('Render API error:', error)

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

// ============================================
// GET - Check render intent without generating
// ============================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const message = searchParams.get('message')

  if (!message) {
    return NextResponse.json({ error: 'message parameter required' }, { status: 400 })
  }

  const intent = detectRenderIntent(message)
  const iteration = detectIterationIntent(message)

  return NextResponse.json({
    intent,
    iteration,
  })
}
