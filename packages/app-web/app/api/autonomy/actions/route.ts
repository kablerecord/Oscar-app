import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import {
  requestAction,
  confirmPendingAction,
  rejectPendingAction,
  checkActionPermission,
  classifyActionIntent,
} from '@/lib/autonomy/rails'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/config'

// Schema for action request
const ActionRequestSchema = z.object({
  actionId: z.string(),
  workspaceId: z.string(),
  params: z.record(z.string(), z.any()).optional(),
})

// Schema for confirming action
const ConfirmActionSchema = z.object({
  workspaceId: z.string(),
  confirmationId: z.string(),
  confirm: z.boolean(), // true = confirm, false = reject
})

// Schema for classifying intent
const ClassifyIntentSchema = z.object({
  responseText: z.string(),
})

/**
 * GET /api/autonomy/actions - Check permission for an action
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const actionId = searchParams.get('actionId')

    if (!workspaceId || !actionId) {
      return NextResponse.json({ error: 'workspaceId and actionId required' }, { status: 400 })
    }

    const permission = await checkActionPermission(workspaceId, actionId)

    return NextResponse.json({ permission })
  } catch (error) {
    console.error('Actions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/autonomy/actions - Request action execution OR confirm pending
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Check if this is a confirmation request
    if ('confirmationId' in body) {
      const params = ConfirmActionSchema.parse(body)

      // Verify workspace ownership
      if (!isDev && session?.user?.email) {
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: params.workspaceId,
            owner: { email: session.user.email },
          },
        })

        if (!workspace) {
          return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }
      }

      if (params.confirm) {
        const result = await confirmPendingAction(params.workspaceId, params.confirmationId)
        return NextResponse.json({ result })
      } else {
        await rejectPendingAction(params.workspaceId, params.confirmationId)
        return NextResponse.json({ success: true, rejected: true })
      }
    }

    // Regular action request
    const params = ActionRequestSchema.parse(body)

    // Verify workspace ownership
    if (!isDev && session?.user?.email) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: params.workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
    }

    const result = await requestAction({
      actionId: params.actionId,
      workspaceId: params.workspaceId,
      params: params.params,
      source: 'user',
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Actions POST error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/autonomy/actions - Classify action intent from response text
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const params = ClassifyIntentSchema.parse(body)

    const actions = classifyActionIntent(params.responseText)

    return NextResponse.json({ actions })
  } catch (error) {
    console.error('Actions PUT error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
