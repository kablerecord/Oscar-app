import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import {
  getWorkspacePermissions,
  grantPermission,
  revokePermission,
  getDefaultPermissions,
  getActionCatalog,
  type ActionCategory,
  type PermissionLevel,
} from '@/lib/autonomy/rails'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/config'

// Schema for granting permissions
const GrantPermissionSchema = z.object({
  workspaceId: z.string(),
  category: z.enum([
    'read',
    'analyze',
    'suggest-msc',
    'modify-msc',
    'email',
    'calendar',
    'file-write',
    'integration',
    'background-task',
  ]),
  level: z.enum(['none', 'ask', 'auto', 'silent']),
  expiresInHours: z.number().optional(),
})

/**
 * GET /api/autonomy/permissions - Get permissions for a workspace
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

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    // Verify workspace ownership
    if (!isDev && session?.user?.email) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
    }

    const [permissions, defaults, catalog] = await Promise.all([
      getWorkspacePermissions(workspaceId),
      Promise.resolve(getDefaultPermissions()),
      Promise.resolve(getActionCatalog()),
    ])

    return NextResponse.json({
      permissions,
      defaults,
      actions: catalog,
    })
  } catch (error) {
    console.error('Permissions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/autonomy/permissions - Grant a permission
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const params = GrantPermissionSchema.parse(body)

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

    await grantPermission(
      params.workspaceId,
      params.category as ActionCategory,
      params.level as PermissionLevel,
      params.expiresInHours
    )

    const updated = await getWorkspacePermissions(params.workspaceId)

    return NextResponse.json({
      success: true,
      permissions: updated,
    })
  } catch (error) {
    console.error('Permissions POST error:', error)

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
 * DELETE /api/autonomy/permissions - Revoke a permission
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDev = process.env.NODE_ENV === 'development'

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const category = searchParams.get('category') as ActionCategory

    if (!workspaceId || !category) {
      return NextResponse.json({ error: 'workspaceId and category required' }, { status: 400 })
    }

    // Verify workspace ownership
    if (!isDev && session?.user?.email) {
      const workspace = await prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          owner: { email: session.user.email },
        },
      })

      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
    }

    await revokePermission(workspaceId, category)

    const updated = await getWorkspacePermissions(workspaceId)

    return NextResponse.json({
      success: true,
      permissions: updated,
    })
  } catch (error) {
    console.error('Permissions DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
