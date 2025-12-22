'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Mobile Welcome Screen
 *
 * Shows only on first visit after sign-in.
 * Tapping anywhere proceeds to the thread.
 */
export default function MobileWelcomePage() {
  const router = useRouter()

  const handleContinue = () => {
    // Mark welcome as seen
    localStorage.setItem('osqr-mobile-welcome-seen', 'true')
    router.replace('/mobile/thread')
  }

  // Handle tap/click anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleContinue()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 cursor-pointer select-none"
      onClick={handleContinue}
      role="button"
      tabIndex={0}
      aria-label="Tap to continue"
    >
      {/* OSQR Logo with subtle animation */}
      <div className="relative mb-12">
        {/* Glow effect */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-purple-500/20 blur-xl animate-pulse" />

        {/* Main logo */}
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
          <span className="text-white text-5xl font-bold">O</span>
        </div>
      </div>

      {/* Greeting */}
      <h1 className="text-3xl font-semibold text-slate-100 mb-4 text-center">
        Hi, I&apos;m OSQR.
      </h1>
      <p className="text-lg text-slate-400 text-center mb-16">
        Let&apos;s do some thinking together.
      </p>

      {/* Tap hint */}
      <p className="text-sm text-slate-500 animate-pulse">
        Tap anywhere to continue
      </p>
    </div>
  )
}
