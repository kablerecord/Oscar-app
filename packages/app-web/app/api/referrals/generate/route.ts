import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { generateReferralCode } from '@/lib/referrals/service'

/**
 * POST /api/referrals/generate
 * Generate a referral code for the current user (if they don't have one)
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const referralCode = await generateReferralCode(session.user.id)

    return NextResponse.json({ referralCode })
  } catch (error) {
    console.error('Failed to generate referral code:', error)
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    )
  }
}
