import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { sendPasswordResetEmail } from '@/lib/email/resend'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Delete any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: email.toLowerCase() },
      })

      // Create new token
      await prisma.passwordResetToken.create({
        data: {
          email: email.toLowerCase(),
          token,
          expiresAt,
        },
      })

      // Send email
      try {
        await sendPasswordResetEmail(email.toLowerCase(), token)
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError)
        // Don't expose email sending failures to user
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
