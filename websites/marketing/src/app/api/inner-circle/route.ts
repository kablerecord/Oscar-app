import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email notification using Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'OSQR <onboarding@resend.dev>',
          to: ['kablerecord@gmail.com'],
          subject: 'OSQR Inner Circle Inquiry',
          html: `
            <h2>New Inner Circle Inquiry</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <p>This person is interested in learning more about OSQR Inner Circle.</p>
          `,
        }),
      })

      if (!res.ok) {
        console.error('Resend error:', await res.text())
        // Don't fail the request - still return success to user
      }
    } else {
      // Log to console if no Resend API key (for development)
      console.log('Inner Circle Inquiry:', { name, email, timestamp: new Date().toISOString() })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inner Circle API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
