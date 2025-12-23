import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
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
          to: ['info@osqr.app'],
          reply_to: email,
          subject: `OSQR Contact: ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <h3>Message:</h3>
            <p>${message.replace(/\n/g, '<br />')}</p>
          `,
        }),
      })

      if (!res.ok) {
        console.error('Resend error:', await res.text())
        // Don't fail the request - still return success to user
      }
    } else {
      // Log to console if no Resend API key (for development)
      console.log('Contact Form Submission:', { name, email, message, timestamp: new Date().toISOString() })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
