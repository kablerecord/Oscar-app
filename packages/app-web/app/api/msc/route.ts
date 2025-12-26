import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'

// GET - Fetch all MSC items for a workspace
export async function GET(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const items = await prisma.mSCItem.findMany({
      where: { workspaceId },
      orderBy: [
        { isPinned: 'desc' },
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Group by category
    type MSCItem = (typeof items)[number]
    const grouped = {
      goals: items.filter((i: MSCItem) => i.category === 'goal'),
      projects: items.filter((i: MSCItem) => i.category === 'project'),
      ideas: items.filter((i: MSCItem) => i.category === 'idea'),
      principles: items.filter((i: MSCItem) => i.category === 'principle'),
      habits: items.filter((i: MSCItem) => i.category === 'habit'),
    }

    return NextResponse.json({ items, grouped })
  } catch (error) {
    console.error('MSC fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new MSC item
const CreateSchema = z.object({
  workspaceId: z.string(),
  category: z.string().min(1), // Allow any category string (including custom category IDs)
  content: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  isPinned: z.boolean().optional().default(false),
  status: z.enum(['active', 'in_progress', 'completed', 'archived']).optional().default('active'),
  dueDate: z.string().datetime().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, category, content, description, isPinned, status, dueDate } = CreateSchema.parse(body)

    // Get the next sort order for this category
    const lastItem = await prisma.mSCItem.findFirst({
      where: { workspaceId, category },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastItem?.sortOrder ?? -1) + 1

    const item = await prisma.mSCItem.create({
      data: {
        workspaceId,
        category,
        content,
        description,
        isPinned,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder,
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('MSC create error:', error)

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

// PATCH - Update an MSC item
const UpdateSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  isPinned: z.boolean().optional(),
  status: z.enum(['active', 'in_progress', 'completed', 'archived']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  sortOrder: z.number().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { id, dueDate, ...updates } = UpdateSchema.parse(body)

    // Handle dueDate conversion
    const data: Record<string, unknown> = { ...updates }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? new Date(dueDate) : null
    }

    const item = await prisma.mSCItem.update({
      where: { id },
      data,
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('MSC update error:', error)

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

// DELETE - Remove an MSC item
export async function DELETE(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.mSCItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('MSC delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
