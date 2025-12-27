'use client'

/**
 * Ceremony Page
 *
 * Plays the tier upgrade ceremony animation. Handles:
 * - Authentication check (redirects to login if not authenticated)
 * - Query param overrides for testing (?force=1, ?tier=pro, ?tier=master)
 * - Ceremony state check (redirects to app if no ceremony needed)
 * - Animation playback and completion marking
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 * @see docs/builds/TIER_CEREMONY_BUILD_PLAN.md
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CeremonyAnimation } from '@/lib/ceremony/CeremonyAnimation'
import { useCeremony } from '@/lib/ceremony/useCeremony'
import { CeremonyTier } from '@/lib/ceremony/types'

function CeremonyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status: sessionStatus } = useSession()

  // Parse query params for testing overrides
  const forceParam = searchParams.get('force') === '1'
  const tierParam = searchParams.get('tier') as CeremonyTier | null

  // Validate tier param
  const validTierParam =
    tierParam && ['pro', 'master'].includes(tierParam) ? tierParam : null

  const {
    shouldShowCeremony,
    ceremonyTier,
    isLoading,
    error,
    markCeremonyComplete,
    wasInterrupted,
  } = useCeremony({
    force: forceParam,
    forceTier: validTierParam || undefined,
  })

  const [animationComplete, setAnimationComplete] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.replace('/login')
    }
  }, [sessionStatus, router])

  // Redirect to app if no ceremony needed (and not forcing)
  useEffect(() => {
    if (isLoading || sessionStatus === 'loading') return
    if (!shouldShowCeremony && !forceParam) {
      router.replace('/panel')
    }
  }, [isLoading, shouldShowCeremony, forceParam, router, sessionStatus])

  // Handle animation complete
  const handleComplete = async () => {
    setAnimationComplete(true)

    // Mark ceremony as seen in database (skip for force mode if tier is overridden)
    if (!forceParam || !validTierParam) {
      await markCeremonyComplete()
    }

    // Redirect to main app
    setTimeout(() => {
      router.replace('/panel')
    }, 100)
  }

  // Handle interrupted ceremony (refreshed during animation)
  useEffect(() => {
    if (wasInterrupted && !animationComplete) {
      // Skip animation, mark as complete, and redirect
      const handleInterrupted = async () => {
        await markCeremonyComplete()
        router.replace('/panel')
      }
      handleInterrupted()
    }
  }, [wasInterrupted, animationComplete, markCeremonyComplete, router])

  // Show loading state
  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  // Handle error
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-sm opacity-60">Something went wrong</p>
          <button
            onClick={() => router.replace('/panel')}
            className="mt-4 text-sm underline opacity-60 hover:opacity-100"
          >
            Continue to app
          </button>
        </div>
      </div>
    )
  }

  // Determine which tier to show
  const tierToShow = forceParam && validTierParam ? validTierParam : ceremonyTier

  // If no tier to show, show black screen briefly before redirect
  if (!tierToShow) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <span className="sr-only">Redirecting...</span>
      </div>
    )
  }

  return (
    <CeremonyAnimation tier={tierToShow} onComplete={handleComplete} />
  )
}

export default function CeremonyPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <span className="sr-only">Loading...</span>
        </div>
      }
    >
      <CeremonyContent />
    </Suspense>
  )
}
