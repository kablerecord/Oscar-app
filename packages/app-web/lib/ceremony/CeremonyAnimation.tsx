'use client'

/**
 * Tier Upgrade Ceremony Animation
 *
 * A premium ceremony that plays once per tier when users upgrade to Pro or Master.
 *
 * The effect:
 * 1. Black screen
 * 2. Spotlight sweeps across - letters are ONLY visible where the light is hitting
 *    (like a flashlight scanning across in a dark room)
 * 3. Letters appear as light arrives, disappear after it passes
 * 4. After sweep completes, OSQR is revealed in full with dramatic lighting
 * 5. Tier name fades in to 100% opacity over ~1 second
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 */

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CeremonyAnimationProps,
  CeremonyPhase,
  getTimingForTier,
  getTotalDuration,
} from './types'

export function CeremonyAnimation({
  tier,
  onComplete,
}: CeremonyAnimationProps) {
  const [phase, setPhase] = useState<CeremonyPhase>('black')
  const [shimmerProgress, setShimmerProgress] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const completedRef = useRef(false)
  const animationFrameRef = useRef<number>()
  const shimmerStartRef = useRef<number>(0)

  const timing = getTimingForTier(tier)
  const tierDisplayName = tier === 'master' ? 'Master.' : 'Pro.'

  // Animate shimmer progress smoothly using requestAnimationFrame
  useEffect(() => {
    if (phase !== 'shimmer') return

    shimmerStartRef.current = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - shimmerStartRef.current
      const progress = Math.min(elapsed / timing.shimmer, 1)
      setShimmerProgress(progress)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [phase, timing.shimmer])

  useEffect(() => {
    if (completedRef.current) return

    if (prefersReducedMotion) {
      setPhase('tier_name')
      setShimmerProgress(1)
      const timer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete()
        }
      }, 1500)
      return () => clearTimeout(timer)
    }

    const timers: NodeJS.Timeout[] = []

    // Phase 1 → 3: Black → Shimmer
    timers.push(
      setTimeout(() => setPhase('shimmer'), timing.black)
    )

    // Phase 3 → 4: Shimmer → Beat (OSQR fully revealed)
    timers.push(
      setTimeout(
        () => setPhase('beat'),
        timing.black + timing.shimmer
      )
    )

    // Phase 4 → 5: Beat → Tier name
    timers.push(
      setTimeout(
        () => setPhase('tier_name'),
        timing.black + timing.shimmer + timing.beat
      )
    )

    // Phase 5 → 6: Tier name → Fade out
    timers.push(
      setTimeout(
        () => setPhase('fade_out'),
        timing.black + timing.shimmer + timing.beat + timing.tierName
      )
    )

    // Phase 6 → Complete
    timers.push(
      setTimeout(() => {
        setPhase('complete')
        if (!completedRef.current) {
          completedRef.current = true
          onComplete()
        }
      }, getTotalDuration(tier))
    )

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [tier, timing, onComplete, prefersReducedMotion])

  // Calculate spotlight position as percentage of text container width
  // The mask is relative to the element, not the viewport
  // Start at -20% (before O) and end at 120% (after R) to hide edges
  const spotlightPosition = shimmerProgress * 140 - 20 // -20% to 120% of text width
  const spotlightWidth = 12 // Width in percentage points

  const shimmerComplete = phase === 'beat' || phase === 'tier_name' || phase === 'fade_out'

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000000' }}
      initial={{ opacity: 1 }}
      animate={{
        opacity: phase === 'complete' ? 0 : 1,
      }}
      transition={{ duration: timing.fadeOut / 1000 }}
      aria-live="polite"
      role="status"
    >
      {/* Accessibility announcement */}
      <span className="sr-only">
        {phase === 'tier_name' ? `${tier} unlocked` : 'Loading...'}
      </span>

      {/* OSQR Wordmark */}
      <AnimatePresence>
        {phase !== 'complete' && phase !== 'black' && (
          <motion.div
            className="relative select-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'fade_out' ? 0 : 1,
            }}
            transition={{
              duration: phase === 'fade_out' ? timing.fadeOut / 1000 : 0.1,
            }}
          >
            {/* Background glow - only visible after shimmer */}
            {shimmerComplete && (
              <motion.div
                className="absolute inset-0 blur-3xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 60%)',
                  transform: 'scale(2.5)',
                }}
              />
            )}

            {/* Single OSQR text element - mask changes but element stays in place */}
            <div
              className="relative"
              style={{
                // Apply mask during shimmer phase, remove after
                maskImage: phase === 'shimmer'
                  ? `linear-gradient(90deg,
                      transparent 0%,
                      transparent ${spotlightPosition - spotlightWidth * 2}%,
                      rgba(255,255,255,0.03) ${spotlightPosition - spotlightWidth * 1.5}%,
                      rgba(255,255,255,0.1) ${spotlightPosition - spotlightWidth}%,
                      rgba(255,255,255,0.3) ${spotlightPosition - spotlightWidth * 0.5}%,
                      rgba(255,255,255,0.7) ${spotlightPosition - spotlightWidth * 0.2}%,
                      white ${spotlightPosition}%,
                      rgba(255,255,255,0.7) ${spotlightPosition + spotlightWidth * 0.2}%,
                      rgba(255,255,255,0.3) ${spotlightPosition + spotlightWidth * 0.5}%,
                      rgba(255,255,255,0.1) ${spotlightPosition + spotlightWidth}%,
                      rgba(255,255,255,0.03) ${spotlightPosition + spotlightWidth * 1.5}%,
                      transparent ${spotlightPosition + spotlightWidth * 2}%,
                      transparent 100%)`
                  : 'none',
                WebkitMaskImage: phase === 'shimmer'
                  ? `linear-gradient(90deg,
                      transparent 0%,
                      transparent ${spotlightPosition - spotlightWidth * 2}%,
                      rgba(255,255,255,0.03) ${spotlightPosition - spotlightWidth * 1.5}%,
                      rgba(255,255,255,0.1) ${spotlightPosition - spotlightWidth}%,
                      rgba(255,255,255,0.3) ${spotlightPosition - spotlightWidth * 0.5}%,
                      rgba(255,255,255,0.7) ${spotlightPosition - spotlightWidth * 0.2}%,
                      white ${spotlightPosition}%,
                      rgba(255,255,255,0.7) ${spotlightPosition + spotlightWidth * 0.2}%,
                      rgba(255,255,255,0.3) ${spotlightPosition + spotlightWidth * 0.5}%,
                      rgba(255,255,255,0.1) ${spotlightPosition + spotlightWidth}%,
                      rgba(255,255,255,0.03) ${spotlightPosition + spotlightWidth * 1.5}%,
                      transparent ${spotlightPosition + spotlightWidth * 2}%,
                      transparent 100%)`
                  : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(80px, 22vw, 220px)',
                  letterSpacing: '0.04em',
                  color: 'white',
                  textShadow: `
                    0 0 60px rgba(255,255,255,0.5),
                    0 0 120px rgba(255,255,255,0.25),
                    0 1px 0 rgba(255,255,255,0.1),
                    0 2px 4px rgba(0,0,0,1),
                    0 4px 8px rgba(0,0,0,0.95),
                    0 8px 16px rgba(0,0,0,0.8),
                    0 16px 32px rgba(0,0,0,0.6),
                    0 32px 64px rgba(0,0,0,0.4),
                    0 64px 128px rgba(0,0,0,0.2)
                  `,
                }}
              >
                OSQR
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tier Name - always present, just hidden until tier_name phase */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === 'tier_name' ? 1 : phase === 'fade_out' ? 0 : 0,
        }}
        transition={{
          duration: 1,
          ease: 'easeOut',
        }}
      >
        <span
          style={{
            fontFamily: '"SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: 'clamp(28px, 6vw, 56px)',
            letterSpacing: '0.2em',
            color: 'white',
            textShadow: '0 2px 20px rgba(255,255,255,0.3)',
          }}
        >
          {tierDisplayName}
        </span>
      </motion.div>
    </motion.div>
  )
}

export default CeremonyAnimation
