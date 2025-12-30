'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

// For local development, use localhost:3001. In production, use the custom domain
const APP_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : 'https://app.osqr.app'

// Valid early access codes - fallback if API is unavailable
// These should match codes in the oscar-app database
const VALID_ACCESS_CODES = [
  'osqr-alpha-2024',  // General alpha access
  'osqr-jesse',       // Jesse
  'osqr-mom',         // Mom
  'osqr-alpha',       // Legacy alpha code
]

export function Hero() {
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChecking(true)
    setAccessError('')

    try {
      // Validate the code against the server
      const res = await fetch(`${APP_URL}/api/access-code/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.toLowerCase().trim() }),
      })

      const data = await res.json()

      if (data.valid) {
        // Success - redirect to the app with the code
        window.location.href = `${APP_URL}/signup?early_access=true&code=${encodeURIComponent(accessCode.toLowerCase().trim())}`
      } else {
        setAccessError(data.error || 'Invalid access code. Please check with whoever gave you the code.')
        setIsChecking(false)
      }
    } catch (_error) {
      // Fallback to client-side check if API fails
      if (VALID_ACCESS_CODES.includes(accessCode.toLowerCase().trim())) {
        window.location.href = `${APP_URL}/signup?early_access=true&code=${encodeURIComponent(accessCode.toLowerCase().trim())}`
      } else {
        setAccessError('Unable to validate code. Please try again.')
        setIsChecking(false)
      }
    }
  }

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6">
            <span className="gradient-text">I multiply what you can do</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-400 mb-10">
            I&apos;m Oscar. I synthesize insights across multiple AI models to amplify your thinking—not replace it. You bring direction, I multiply momentum.
          </p>

          {/* CTA Buttons */}
          <div id="waitlist" className="mx-auto max-w-md">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`${APP_URL}/signup`}>
                <Button size="lg" className="w-full sm:w-auto px-8">
                  Meet Oscar
                </Button>
              </a>
              <button
                onClick={() => setShowAccessModal(true)}
                className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4 decoration-slate-600 hover:decoration-white"
              >
                Have an access code?
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              90-day money-back guarantee. If OSQR doesn&apos;t help you think better, full refund.
            </p>
          </div>

          {/* Early Access Modal */}
          {showAccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
              <div className="relative w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 p-8 shadow-2xl">
                {/* Close button */}
                <button
                  onClick={() => {
                    setShowAccessModal(false)
                    setAccessCode('')
                    setAccessError('')
                  }}
                  className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Modal content */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-4">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Early Access</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Enter your access code to skip the waitlist
                  </p>
                </div>

                <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                  {accessError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                      {accessError}
                    </div>
                  )}

                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value)
                      setAccessError('')
                    }}
                    placeholder="Enter access code"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-wider"
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!accessCode.trim() || isChecking}
                  >
                    {isChecking ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Checking...
                      </span>
                    ) : (
                      'Access OSQR'
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-xs text-slate-500 text-center">
                  Don&apos;t have a code? <a href={`${APP_URL}/signup`} className="text-blue-400 hover:text-blue-300">Sign up here</a>
                </p>
              </div>
            </div>
          )}

          {/* Social proof placeholder */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-slate-500">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Multi-model AI panel</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Personal knowledge vault</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">Refine → Fire system</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
