import { NextResponse } from 'next/server'
import { getFounderSpotStatus } from '@/lib/admin/platform-metrics'

/**
 * GET /api/founder-spots
 *
 * Public endpoint to get founder spot availability
 * Used on pricing page to show "only X spots left"
 */
export async function GET() {
  try {
    const status = await getFounderSpotStatus()

    return NextResponse.json({
      remainingSpots: status.remainingSpots,
      isFounderPeriod: status.isFounderPeriod,
      // Don't expose exact numbers to prevent gaming
      percentageFilled: status.percentageFilled,
    })
  } catch (error) {
    console.error('Error fetching founder spot status:', error)
    // Return safe defaults on error
    return NextResponse.json({
      remainingSpots: 500,
      isFounderPeriod: true,
      percentageFilled: 0,
    })
  }
}
