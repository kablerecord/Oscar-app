'use client'

/**
 * Ceremony Check Component
 *
 * Client-side component that checks if a ceremony is needed
 * and redirects to /ceremony if so. Add this to any page
 * that should trigger the ceremony check.
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CeremonyState } from './types'

interface CeremonyCheckProps {
  /** Children to render while checking/after check */
  children: React.ReactNode
}

/**
 * Checks if ceremony is needed and redirects if so.
 * This component should be placed in layout or page components
 * where you want to trigger the ceremony check.
 */
export function CeremonyCheck({ children }: CeremonyCheckProps) {
  const router = useRouter()
  const [checkComplete, setCheckComplete] = useState(false)

  useEffect(() => {
    const checkCeremony = async () => {
      try {
        const res = await fetch('/api/user/ceremony')
        if (!res.ok) {
          setCheckComplete(true)
          return
        }

        const state: CeremonyState = await res.json()

        if (state.shouldShowCeremony && state.ceremonyTier) {
          // Redirect to ceremony page
          router.replace('/ceremony')
          return
        }

        setCheckComplete(true)
      } catch (error) {
        // On error, just proceed without ceremony
        console.error('[CeremonyCheck] Error:', error)
        setCheckComplete(true)
      }
    }

    checkCeremony()
  }, [router])

  // Always render children - the redirect will happen if needed
  // This prevents a flash of blank content
  return <>{children}</>
}

export default CeremonyCheck
