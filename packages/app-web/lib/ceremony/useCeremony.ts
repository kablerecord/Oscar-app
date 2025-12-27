'use client'

/**
 * Ceremony Hook
 *
 * Manages ceremony state and gating logic. Handles:
 * - Checking if ceremony is needed on mount
 * - localStorage guard for refresh glitch prevention
 * - Calling POST API when ceremony completes
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 */

import { useState, useEffect, useCallback } from 'react'
import { CeremonyState, CeremonyTier, CeremonySeen } from './types'

const CEREMONY_ACTIVE_KEY = 'osqr_ceremony_active'
const CEREMONY_TIER_KEY = 'osqr_ceremony_tier'

interface UseCeremonyResult {
  /** Current ceremony state from API */
  ceremonyState: CeremonyState | null
  /** Whether ceremony should be shown */
  shouldShowCeremony: boolean
  /** Which tier ceremony to show */
  ceremonyTier: CeremonyTier | null
  /** Whether we're still loading state */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Mark ceremony as complete (call after animation finishes) */
  markCeremonyComplete: () => Promise<void>
  /** Was ceremony interrupted by refresh? Skip animation, show final state */
  wasInterrupted: boolean
}

interface UseCeremonyOptions {
  /** Force show ceremony (for testing) */
  force?: boolean
  /** Override tier (for testing) */
  forceTier?: CeremonyTier
  /** Skip fetch (for SSR) */
  skipFetch?: boolean
}

export function useCeremony(options: UseCeremonyOptions = {}): UseCeremonyResult {
  const { force = false, forceTier, skipFetch = false } = options

  const [ceremonyState, setCeremonyState] = useState<CeremonyState | null>(null)
  const [isLoading, setIsLoading] = useState(!skipFetch)
  const [error, setError] = useState<string | null>(null)
  const [wasInterrupted, setWasInterrupted] = useState(false)

  // Check for refresh glitch on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const wasActive = localStorage.getItem(CEREMONY_ACTIVE_KEY) === '1'
    if (wasActive) {
      // Ceremony was active when page was refreshed
      // Skip animation, show final state briefly
      setWasInterrupted(true)
    }
  }, [])

  // Fetch ceremony state on mount
  useEffect(() => {
    if (skipFetch) return

    const fetchState = async () => {
      try {
        const res = await fetch('/api/user/ceremony')
        if (!res.ok) {
          throw new Error(`Failed to fetch ceremony state: ${res.status}`)
        }
        const data: CeremonyState = await res.json()
        setCeremonyState(data)
      } catch (err) {
        console.error('[useCeremony] Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchState()
  }, [skipFetch])

  // Set localStorage guard when ceremony starts
  const setCeremonyActive = useCallback((tier: CeremonyTier) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(CEREMONY_ACTIVE_KEY, '1')
    localStorage.setItem(CEREMONY_TIER_KEY, tier)
  }, [])

  // Clear localStorage guard when ceremony ends
  const clearCeremonyActive = useCallback(() => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(CEREMONY_ACTIVE_KEY)
    localStorage.removeItem(CEREMONY_TIER_KEY)
  }, [])

  // Mark ceremony as complete in database
  const markCeremonyComplete = useCallback(async () => {
    // Clear the localStorage guard first
    clearCeremonyActive()

    // Determine which tier to mark
    const tierToMark = forceTier || ceremonyState?.ceremonyTier
    if (!tierToMark) return

    try {
      const res = await fetch('/api/user/ceremony', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierToMark }),
      })

      if (!res.ok) {
        throw new Error(`Failed to mark ceremony as seen: ${res.status}`)
      }

      // Update local state
      if (ceremonyState) {
        const updatedSeen: CeremonySeen = {
          ...ceremonyState.ceremonySeen,
          [tierToMark]: true,
        }
        setCeremonyState({
          ...ceremonyState,
          ceremonySeen: updatedSeen,
          shouldShowCeremony: false,
          ceremonyTier: null,
        })
      }
    } catch (err) {
      console.error('[useCeremony] Mark complete error:', err)
      // Still clear the guard even if API fails
    }
  }, [ceremonyState, forceTier, clearCeremonyActive])

  // Calculate what to show
  let shouldShowCeremony = false
  let ceremonyTier: CeremonyTier | null = null

  if (force && forceTier) {
    // Testing mode: force show specific tier
    shouldShowCeremony = true
    ceremonyTier = forceTier
  } else if (ceremonyState) {
    shouldShowCeremony = ceremonyState.shouldShowCeremony
    ceremonyTier = ceremonyState.ceremonyTier
  }

  // Set the localStorage guard when we determine ceremony should show
  useEffect(() => {
    if (shouldShowCeremony && ceremonyTier && !wasInterrupted) {
      setCeremonyActive(ceremonyTier)
    }
  }, [shouldShowCeremony, ceremonyTier, wasInterrupted, setCeremonyActive])

  return {
    ceremonyState,
    shouldShowCeremony,
    ceremonyTier,
    isLoading,
    error,
    markCeremonyComplete,
    wasInterrupted,
  }
}

export default useCeremony
