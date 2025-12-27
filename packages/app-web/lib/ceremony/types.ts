/**
 * Tier Upgrade Ceremony Types
 *
 * @see docs/features/TIER_CEREMONY_SPEC.md
 * @see docs/builds/TIER_CEREMONY_BUILD_PLAN.md
 *
 * Premium "crossing the threshold" ceremony that plays once per tier
 * when a user upgrades to Pro or Master.
 */

/** Subscription tiers that support ceremonies */
export type CeremonyTier = 'pro' | 'master'

/** All subscription tiers */
export type Tier = 'lite' | 'pro' | 'master'

/** Tracks which tier ceremonies have been seen (stored in User.ceremonySeen) */
export interface CeremonySeen {
  pro?: boolean
  master?: boolean
}

/** Full ceremony state returned from API */
export interface CeremonyState {
  /** User's current subscription tier */
  tier: Tier
  /** Which ceremonies have been seen */
  ceremonySeen: CeremonySeen
  /** Whether a ceremony should be shown */
  shouldShowCeremony: boolean
  /** Which tier's ceremony to show (null if none) */
  ceremonyTier: CeremonyTier | null
}

/** Props for the ceremony animation component */
export interface CeremonyAnimationProps {
  /** Which tier ceremony to play */
  tier: CeremonyTier
  /** Callback when animation completes */
  onComplete: () => void
}

/** Timeline phase identifiers for animation sequencing */
export type CeremonyPhase =
  | 'black'
  | 'mark_fade'
  | 'shimmer'
  | 'beat'
  | 'tier_name'
  | 'fade_out'
  | 'complete'

/** Animation timing configuration (in milliseconds) */
export interface CeremonyTiming {
  /** Phase 1: Pure black screen */
  black: number
  /** Phase 2: OSQR wordmark fades in (dim) */
  markFade: number
  /** Phase 3: Gradient sweep left → right */
  shimmer: number
  /** Phase 4: Brief darkness/settle */
  beat: number
  /** Phase 5: Tier name appears */
  tierName: number
  /** Phase 6: Ceremony dissolves to app */
  fadeOut: number
}

/** Default timing for Pro tier (~7.5 seconds total) */
export const PRO_TIMING: CeremonyTiming = {
  black: 500,        // Pause in darkness
  markFade: 0,       // No pre-fade - shimmer reveals
  shimmer: 4000,     // 4 second OSQR reveal sweep
  beat: 1000,        // 1 second pause before tier name
  tierName: 1000,    // Tier name fade in
  fadeOut: 1000,     // Dissolve to app
}

/** Timing for Master tier (~8 seconds total - even slower, more gravitas) */
export const MASTER_TIMING: CeremonyTiming = {
  black: 600,        // Longer darkness
  markFade: 0,       // No pre-fade - shimmer reveals
  shimmer: 4000,     // 4 second OSQR reveal sweep
  beat: 1000,        // 1 second pause before tier name
  tierName: 1000,    // Tier name fade in
  fadeOut: 1200,     // Slightly longer dissolve for Master
}

/** Get timing configuration for a tier */
export function getTimingForTier(tier: CeremonyTier): CeremonyTiming {
  return tier === 'master' ? MASTER_TIMING : PRO_TIMING
}

/** Calculate total duration for a tier's ceremony */
export function getTotalDuration(tier: CeremonyTier): number {
  const timing = getTimingForTier(tier)
  return (
    timing.black +
    timing.markFade +
    timing.shimmer +
    timing.beat +
    timing.tierName +
    timing.fadeOut
  )
}

/** Tier hierarchy for determining if ceremony should show */
export const TIER_HIERARCHY: Record<Tier, number> = {
  lite: 1,
  pro: 2,
  master: 3,
}

/**
 * Determine if a ceremony should be shown for a user's tier upgrade
 *
 * Logic:
 * - User must be on a paid tier (pro or master)
 * - That tier's ceremony must not have been seen
 * - For Pro: show if user is on Pro and hasn't seen Pro ceremony
 * - For Master: show if user is on Master and hasn't seen Master ceremony
 */
export function shouldShowCeremony(
  currentTier: Tier,
  ceremonySeen: CeremonySeen
): { shouldShow: boolean; ceremonyTier: CeremonyTier | null } {
  // Lite tier doesn't have a ceremony (yet)
  if (currentTier === 'lite') {
    return { shouldShow: false, ceremonyTier: null }
  }

  // Check if user is on Master and hasn't seen Master ceremony
  if (currentTier === 'master' && !ceremonySeen.master) {
    return { shouldShow: true, ceremonyTier: 'master' }
  }

  // Check if user is on Pro and hasn't seen Pro ceremony
  if (currentTier === 'pro' && !ceremonySeen.pro) {
    return { shouldShow: true, ceremonyTier: 'pro' }
  }

  return { shouldShow: false, ceremonyTier: null }
}
