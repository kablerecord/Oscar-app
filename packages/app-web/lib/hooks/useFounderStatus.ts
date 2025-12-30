'use client'

import { useState, useEffect } from 'react'

interface FounderStatus {
  spotsRemaining: number
  isFounderPeriodActive: boolean
  percentageFilled: number
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch and track founder spot availability
 * Used on pricing page to show "X of 500 founder spots remaining"
 */
export function useFounderStatus(): FounderStatus {
  const [status, setStatus] = useState<FounderStatus>({
    spotsRemaining: 500,
    isFounderPeriodActive: true,
    percentageFilled: 0,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/founder-spots')
        if (!res.ok) throw new Error('Failed to fetch founder status')

        const data = await res.json()
        setStatus({
          spotsRemaining: data.remainingSpots,
          isFounderPeriodActive: data.isFounderPeriod,
          percentageFilled: data.percentageFilled,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        console.error('Error fetching founder status:', err)
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    }

    fetchStatus()

    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return status
}
