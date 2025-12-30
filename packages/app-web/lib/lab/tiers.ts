import { prisma } from '@/lib/db/prisma'
import { LabTier, TIER_THRESHOLDS } from './types'

interface LabMemberData {
  id: string
  tier: string
  feedbackScore: number
  challengesCompleted: number
}

interface TierProgressionResult {
  newTier: LabTier
  promoted: boolean
}

/**
 * Check if a member should be promoted to a higher tier
 */
export async function checkTierProgression(
  member: LabMemberData
): Promise<TierProgressionResult | null> {
  const currentTier = member.tier as LabTier

  // Already at highest tier
  if (currentTier === 'INSIDER') {
    return null
  }

  // Check for Contributor promotion (from Explorer)
  if (currentTier === 'EXPLORER') {
    if (member.challengesCompleted >= TIER_THRESHOLDS.CONTRIBUTOR) {
      await prisma.labMember.update({
        where: { id: member.id },
        data: { tier: 'CONTRIBUTOR' },
      })
      return { newTier: 'CONTRIBUTOR', promoted: true }
    }
  }

  // Check for Insider promotion (from Contributor)
  if (currentTier === 'CONTRIBUTOR') {
    const isTopPercentile = await checkInsiderEligibility(member.feedbackScore)
    if (isTopPercentile) {
      await prisma.labMember.update({
        where: { id: member.id },
        data: { tier: 'INSIDER' },
      })
      return { newTier: 'INSIDER', promoted: true }
    }
  }

  return null
}

/**
 * Check if user is in top percentile for Insider tier
 */
async function checkInsiderEligibility(memberScore: number): Promise<boolean> {
  const scores = await prisma.labMember.findMany({
    where: { tier: { in: ['CONTRIBUTOR', 'INSIDER'] } },
    select: { feedbackScore: true },
  })

  if (scores.length < 5) {
    // Need minimum members before applying percentile rule
    return false
  }

  const sortedScores = scores.map((s) => s.feedbackScore).sort((a, b) => b - a)
  const topPercentileIndex = Math.floor(
    scores.length * TIER_THRESHOLDS.INSIDER_PERCENTILE
  )
  const threshold = sortedScores[topPercentileIndex] || sortedScores[0]

  return memberScore >= threshold
}

/**
 * Get tier display information
 */
export function getTierInfo(tier: LabTier): {
  name: string
  description: string
  color: string
  icon: string
  perks: string[]
} {
  switch (tier) {
    case 'EXPLORER':
      return {
        name: 'Explorer',
        description: 'Just getting started',
        color: 'text-blue-400',
        icon: '🔭',
        perks: ['Access to all challenges', 'Basic leaderboard visibility'],
      }
    case 'CONTRIBUTOR':
      return {
        name: 'Contributor',
        description: '5+ challenges completed',
        color: 'text-purple-400',
        icon: '🚀',
        perks: [
          'All Explorer perks',
          'Early feature previews',
          'Contributor badge',
        ],
      }
    case 'INSIDER':
      return {
        name: 'Insider',
        description: 'Top 10% contributors',
        color: 'text-amber-400',
        icon: '⭐',
        perks: [
          'All Contributor perks',
          'Direct line to founder',
          'Feature requests prioritized',
          'Insider badge',
        ],
      }
  }
}

/**
 * Get progress towards next tier
 */
export function getTierProgress(
  currentTier: LabTier,
  challengesCompleted: number,
  feedbackScore: number
): {
  nextTier: LabTier | null
  progressPercent: number
  requirement: string
} {
  switch (currentTier) {
    case 'EXPLORER':
      return {
        nextTier: 'CONTRIBUTOR',
        progressPercent: Math.min(
          (challengesCompleted / TIER_THRESHOLDS.CONTRIBUTOR) * 100,
          100
        ),
        requirement: `Complete ${TIER_THRESHOLDS.CONTRIBUTOR} challenges`,
      }
    case 'CONTRIBUTOR':
      // Can't easily calculate percentile progress without all scores
      return {
        nextTier: 'INSIDER',
        progressPercent: 0, // Would need to calculate based on current percentile
        requirement: 'Reach top 10% of contributors',
      }
    case 'INSIDER':
      return {
        nextTier: null,
        progressPercent: 100,
        requirement: 'Highest tier reached!',
      }
  }
}
