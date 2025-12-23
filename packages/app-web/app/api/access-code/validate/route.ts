import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// CORS headers for cross-origin requests from marketing site
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://osqr.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Access code is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Look up the code (case-insensitive)
    const accessCode = await prisma.accessCode.findFirst({
      where: {
        code: {
          equals: code.toLowerCase().trim(),
          mode: 'insensitive',
        },
      },
    })

    if (!accessCode) {
      return NextResponse.json(
        { valid: false, error: 'Invalid access code' },
        { status: 404, headers: corsHeaders }
      )
    }

    if (accessCode.useCount >= accessCode.maxUses) {
      return NextResponse.json(
        { valid: false, error: 'This access code has reached its usage limit' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Code is valid and has uses remaining
    return NextResponse.json({
      valid: true,
      code: accessCode.code,
      usesRemaining: accessCode.maxUses - accessCode.useCount,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error('Access code validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate access code' },
      { status: 500, headers: corsHeaders }
    )
  }
}
