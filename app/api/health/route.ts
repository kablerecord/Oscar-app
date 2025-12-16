import { NextResponse } from 'next/server'

// Build version - update this with each significant deploy
const BUILD_VERSION = 'v1.0.0-onboarding-fix'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: BUILD_VERSION,
    timestamp: new Date().toISOString()
  })
}
