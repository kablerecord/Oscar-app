import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors when RESEND_API_KEY isn't set
let resend: Resend | null = null
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'OSQR <noreply@osqr.ai>'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Reset your OSQR password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155;">
            <h1 style="font-size: 24px; font-weight: bold; color: #ffffff; margin: 0 0 24px 0; text-align: center;">OSQR</h1>

            <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px 0;">
              You requested to reset your password. Click the button below to create a new password.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #94a3b8; margin: 24px 0 0 0;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;">

            <p style="font-size: 12px; color: #64748b; margin: 0; text-align: center;">
              If the button doesn't work, copy and paste this link:<br>
              <a href="${resetUrl}" style="color: #60a5fa; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
OSQR - Password Reset

You requested to reset your password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    `.trim(),
  })

  if (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send email')
  }

  return data
}
