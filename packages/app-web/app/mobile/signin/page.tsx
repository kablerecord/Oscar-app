'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Mobile Sign In Screen
 *
 * Simple authentication interface optimized for mobile.
 * Uses NextAuth for authentication with the same providers as the main app.
 */
export default function MobileSignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('email', {
        email: email.trim(),
        redirect: false,
        callbackUrl: '/mobile',
      })

      if (result?.error) {
        setError('Unable to sign in. Please try again.')
      } else if (result?.ok) {
        // Email sent - show confirmation
        setError(null)
        alert('Check your email for a sign-in link!')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signIn('google', { callbackUrl: '/mobile' })
    } catch {
      setError('Unable to sign in with Google.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      {/* OSQR Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <span className="text-white text-2xl font-bold">O</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-100">Sign in to OSQR</h1>
        <p className="text-slate-400 mt-2 text-center">
          Your AI thinking companion
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-sm mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Email Sign In */}
      <form onSubmit={handleEmailSignIn} className="w-full max-w-sm space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          className="w-full h-12 bg-purple-500 hover:bg-purple-600 text-white font-medium"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Continue'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="w-full max-w-sm flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-slate-500 text-sm">or</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* OAuth providers */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
      </div>

      {/* Sign up link */}
      <p className="mt-8 text-slate-500 text-sm text-center">
        Don&apos;t have an account?{' '}
        <a
          href="https://app.osqr.app/auth/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-400 hover:text-purple-300"
        >
          Sign up on web
        </a>
      </p>
    </div>
  )
}
