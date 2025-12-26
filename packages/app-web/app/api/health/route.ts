import { NextResponse } from 'next/server'

// Build version - update this with each significant deploy
const BUILD_VERSION = 'v1.3.1-cron-debug'

export async function GET() {
  const cronSecretSet = !!process.env.CRON_SECRET
  const cronSecretLength = process.env.CRON_SECRET?.length ?? 0
  const cronSecretFirst4 = process.env.CRON_SECRET?.slice(0, 4) ?? 'N/A'

  return NextResponse.json({
    status: 'ok',
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
    debug: {
      cronSecretSet,
      cronSecretLength,
      cronSecretFirst4,
    }
  })
}
