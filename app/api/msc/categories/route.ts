import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'

// GET - Fetch all custom categories for a workspace
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

    const categories = await prisma.mSCCategory.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('MSC categories fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new custom category
const CreateCategorySchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(50),
  icon: z.string().optional().default('folder'),
  color: z.string().optional().default('text-gray-600'),
})

export async function POST(req: NextRequest) {
  try {
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, name, icon, color } = CreateCategorySchema.parse(body)

    // Get the next sort order
    const lastCategory = await prisma.mSCCategory.findFirst({
      where: { workspaceId },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (lastCategory?.sortOrder ?? -1) + 1

    const category = await prisma.mSCCategory.create({
      data: {
        workspaceId,
        name,
        icon,
        color,
        sortOrder,
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('MSC category create error:', error)

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

// PATCH - Update a custom category
const UpdateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
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
    const { id, ...updates } = UpdateCategorySchema.parse(body)

    const category = await prisma.mSCCategory.update({
      where: { id },
      data: updates,
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error('MSC category update error:', error)

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

// DELETE - Remove a custom category
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

    // First, delete all items in this category or move them to 'idea'
    await prisma.mSCItem.updateMany({
      where: { category: id },
      data: { category: 'idea' },
    })

    await prisma.mSCCategory.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('MSC category delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
