/**
 * Admin Testimonials API
 *
 * GET - Fetch all testimonials grouped by status
 * PATCH - Update testimonial status (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

const ADMIN_EMAILS = ['admin@osqr.ai', 'kablerecord@gmail.com']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all testimonials with user info
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Get unique user IDs and fetch their info
    const userIds = [...new Set(testimonials.map(t => t.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    // Group by status
    const pending = testimonials
      .filter(t => t.status === 'PENDING')
      .map(t => ({
        ...t,
        user: userMap.get(t.userId) || null,
      }))

    const approved = testimonials
      .filter(t => t.status === 'APPROVED')
      .map(t => ({
        ...t,
        user: userMap.get(t.userId) || null,
      }))

    const rejected = testimonials
      .filter(t => t.status === 'REJECTED')
      .map(t => ({
        ...t,
        user: userMap.get(t.userId) || null,
      }))

    return NextResponse.json({
      summary: {
        total: testimonials.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      },
      pending,
      approved,
      rejected,
    })
  } catch (error) {
    console.error('[Admin Testimonials API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { testimonialId, status } = body

    if (!testimonialId) {
      return NextResponse.json(
        { error: 'Testimonial ID is required' },
        { status: 400 }
      )
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be PENDING, APPROVED, or REJECTED.' },
        { status: 400 }
      )
    }

    // Update testimonial status
    const testimonial = await prisma.testimonial.update({
      where: { id: testimonialId },
      data: { status },
    })

    console.log('[Testimonial Status Updated]', {
      testimonialId,
      newStatus: status,
      adminEmail: session.user.email,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      testimonial,
    })
  } catch (error) {
    console.error('[Admin Testimonials API] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update testimonial' },
      { status: 500 }
    )
  }
}
