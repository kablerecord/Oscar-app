import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Fetch all answers for this workspace
    const answers = await prisma.profileAnswer.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({ answers })
  } catch (error) {
    console.error('Error fetching profile answers:', error)

    return NextResponse.json(
      { error: 'Failed to fetch answers', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
