import { POINTS, TIER_THRESHOLDS } from './types'

/**
 * Calculate points for a quick reaction
 */
export function calculateReactionPoints(hasComment: boolean): number {
  return hasComment ? POINTS.QUICK_REACTION_WITH_COMMENT : POINTS.QUICK_REACTION
}

/**
 * Calculate points for completing a challenge
 */
export function calculateChallengePoints(basePoints: number): number {
  return basePoints
}

/**
 * Calculate points for completing a deep dive
 */
export function calculateDeepDivePoints(basePoints: number): number {
  return basePoints
}

/**
 * Calculate streak bonus (future enhancement)
 */
export function calculateStreakBonus(streakDays: number): number {
  // 10% bonus per 7 days of streak, max 50%
  const weekStreak = Math.floor(streakDays / 7)
  const bonusPercent = Math.min(weekStreak * 10, 50)
  return bonusPercent
}

/**
 * Check if a streak should be reset based on last activity
 */
export function shouldResetStreak(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return true

  const now = new Date()
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceActive > 1 // Reset if more than 1 day inactive
}

/**
 * Calculate new streak days based on activity
 */
export function calculateStreak(lastActiveAt: Date | null, currentStreak: number): number {
  if (shouldResetStreak(lastActiveAt)) {
    return 1 // Start new streak
  }

  const now = new Date()
  const lastActive = new Date(lastActiveAt!)

  // Check if last activity was yesterday (new day = increment streak)
  const isNewDay = now.toDateString() !== lastActive.toDateString()

  return isNewDay ? currentStreak + 1 : currentStreak
}

/**
 * Check tier eligibility based on challenges completed
 */
export function checkContributorEligibility(challengesCompleted: number): boolean {
  return challengesCompleted >= TIER_THRESHOLDS.CONTRIBUTOR
}

/**
 * Check if user is in top percentile for Insider tier
 */
export async function checkInsiderEligibility(
  memberScore: number,
  getAllScores: () => Promise<number[]>
): Promise<boolean> {
  const scores = await getAllScores()
  if (scores.length === 0) return false

  const sortedScores = [...scores].sort((a, b) => b - a)
  const topPercentileIndex = Math.floor(scores.length * TIER_THRESHOLDS.INSIDER_PERCENTILE)
  const threshold = sortedScores[topPercentileIndex] || sortedScores[0]

  return memberScore >= threshold
}

/**
 * Calculate thoughtfulness score for a challenge response
 * Based on response length, time spent, and completeness
 */
export function calculateThoughtfulness(
  answers: Record<string, unknown>,
  timeSpentSeconds: number | null,
  expectedMinutes: number
): number {
  let score = 50 // Base score

  // Time factor: bonus for taking reasonable time
  if (timeSpentSeconds) {
    const expectedSeconds = expectedMinutes * 60
    const timeRatio = timeSpentSeconds / expectedSeconds

    if (timeRatio >= 0.5 && timeRatio <= 2) {
      score += 20 // Good time spent
    } else if (timeRatio > 2) {
      score += 10 // Took longer, might be thoughtful
    }
  }

  // Completeness factor
  const answerCount = Object.keys(answers).length
  const answerValues = Object.values(answers)
  const textAnswers = answerValues.filter(
    (v) => typeof v === 'string' && v.length > 0
  )

  // Bonus for text answers with substance
  const substantiveTextAnswers = textAnswers.filter(
    (v) => (v as string).length > 50
  )
  score += Math.min(substantiveTextAnswers.length * 10, 30)

  return Math.min(score, 100)
}
