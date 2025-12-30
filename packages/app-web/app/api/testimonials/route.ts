/**
 * Testimonials API
 *
 * POST - Submit a testimonial
 * GET - Check if user has already submitted a testimonial
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, displayName, role } = body

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Testimonial content is required' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Testimonial must be under 1000 characters' },
        { status: 400 }
      )
    }

    // Check if user already has a pending or approved testimonial
    const existing = await prisma.testimonial.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already submitted a testimonial' },
        { status: 400 }
      )
    }

    // Create testimonial
    const testimonial = await prisma.testimonial.create({
      data: {
        userId: session.user.id,
        content: content.trim(),
        displayName: displayName?.trim() || null,
        role: role?.trim() || null,
        status: 'PENDING',
      },
    })

    console.log('[Testimonial Submitted]', {
      userId: session.user.id,
      testimonialId: testimonial.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      testimonialId: testimonial.id,
    })
  } catch (error) {
    console.error('[Testimonials API] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to submit testimonial' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has submitted a testimonial
    const testimonial = await prisma.testimonial.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        content: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      hasSubmitted: !!testimonial,
      testimonial: testimonial || null,
    })
  } catch (error) {
    console.error('[Testimonials API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonial status' },
      { status: 500 }
    )
  }
}
