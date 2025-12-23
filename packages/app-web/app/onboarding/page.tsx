'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Onboarding Page - Now redirects to /panel
 *
 * The onboarding experience is now handled by the OSQR bubble within the panel.
 * This page simply redirects users to /panel where the bubble will guide them
 * through the onboarding conversation.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // For authenticated users (or in dev mode), redirect to panel
    // The OSQR bubble will handle onboarding there
    if (status === 'authenticated') {
      router.push('/panel')
    }
  }, [status, router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-white text-lg mb-2">Setting things up...</div>
        <div className="text-slate-400 text-sm">You'll meet OSQR in just a moment</div>
      </div>
    </div>
  )
}
