'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Mobile Entry Point
 *
 * Redirects based on authentication state:
 * - Unauthenticated: Show sign-in page
 * - Authenticated + first visit: Show welcome screen
 * - Authenticated + returning: Go to thread
 */
export default function MobilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      // Not signed in - show sign-in page
      router.replace('/mobile/signin')
      return
    }

    // Check if user has seen welcome screen
    const hasSeenWelcome = localStorage.getItem('osqr-mobile-welcome-seen')

    if (hasSeenWelcome) {
      // Returning user - go to thread
      router.replace('/mobile/thread')
    } else {
      // First visit - show welcome
      router.replace('/mobile/welcome')
    }
  }, [session, status, router])

  // Loading state while checking auth
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse" />
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    </div>
  )
}
