import { NextRequest, NextResponse } from 'next/server'

// NOTE: Enterprise features documented in docs/enterprise/
// See ENTERPRISE_INTEGRATION_STATUS.md for full context
// Multi-user support is documented but not built (V1.5+ scope)

interface EnterpriseInquiry {
  name: string
  email: string
  company?: string
  teamSize?: string
  message: string
}

export async function POST(req: NextRequest) {
  try {
    const body: EnterpriseInquiry = await req.json()

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // For now, log the inquiry and send an email notification
    // In production, you'd want to:
    // 1. Store in database
    // 2. Send email via Resend/SendGrid
    // 3. Maybe notify via Slack

    console.log('Enterprise inquiry received:', {
      name: body.name,
      email: body.email,
      company: body.company || 'Not provided',
      teamSize: body.teamSize || 'Not provided',
      message: body.message,
      timestamp: new Date().toISOString(),
    })

    // Send email notification if Resend is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: 'OSQR <noreply@osqr.co>',
          to: process.env.ENTERPRISE_NOTIFY_EMAIL || 'kable@osqr.co',
          subject: `Enterprise Inquiry: ${body.company || body.name}`,
          html: `
            <h2>New Enterprise Inquiry</h2>
            <p><strong>Name:</strong> ${body.name}</p>
            <p><strong>Email:</strong> ${body.email}</p>
            <p><strong>Company:</strong> ${body.company || 'Not provided'}</p>
            <p><strong>Team Size:</strong> ${body.teamSize || 'Not provided'}</p>
            <h3>Message:</h3>
            <p>${body.message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              Received at ${new Date().toISOString()}
            </p>
          `,
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Enterprise inquiry error:', error)
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    )
  }
}
