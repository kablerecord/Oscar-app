import { NextRequest, NextResponse } from 'next/server'
import { validateReferralCode } from '@/lib/referrals/service'

/**
 * GET /api/referrals/validate?code={code}
 * Validate a referral code (for signup flow)
 * This endpoint is public (no auth required)
 */
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'No referral code provided' },
        { status: 400 }
      )
    }

    const result = await validateReferralCode(code)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to validate referral code:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate referral code' },
      { status: 500 }
    )
  }
}
