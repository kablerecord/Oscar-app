/**
 * Referral System Service
 *
 * Handles referral code generation, validation, and bonus calculation.
 *
 * Reward Structure:
 * - 5% permanent token bonus per successful referral (referred user becomes paid)
 * - Capped at 50% total bonus (10 successful referrals)
 * - Bonus applies to monthly token limit
 */

import { prisma } from '@/lib/db/prisma'
import { ReferralStatus } from '@prisma/client'

// Constants
export const REFERRAL_BONUS_PERCENT = 5 // 5% per successful referral
export const MAX_REFERRAL_BONUS_PERCENT = 50 // Cap at 50%

/**
 * Generate a unique referral code for a user
 * Format: OSQR-{random6chars}
 */
export async function generateReferralCode(userId: string): Promise<string> {
  // Check if user already has a code
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })

  if (user?.referralCode) {
    return user.referralCode
  }

  // Generate a unique code
  let code: string
  let isUnique = false

  while (!isUnique) {
    const randomPart = generateRandomString(6).toUpperCase()
    code = `OSQR-${randomPart}`

    // Check if code already exists
    const existing = await prisma.user.findFirst({
      where: { referralCode: code },
    })

    if (!existing) {
      isUnique = true
    }
  }

  // Save the code to the user
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code! },
  })

  return code!
}

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like 0/O, 1/I/L
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Validate a referral code and return the referrer
 */
export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  referrerId?: string
  referrerName?: string
  error?: string
}> {
  if (!code) {
    return { valid: false, error: 'No referral code provided' }
  }

  const normalizedCode = code.toUpperCase().trim()

  const referrer = await prisma.user.findFirst({
    where: { referralCode: normalizedCode },
    select: { id: true, name: true, email: true },
  })

  if (!referrer) {
    return { valid: false, error: 'Invalid referral code' }
  }

  return {
    valid: true,
    referrerId: referrer.id,
    referrerName: referrer.name || referrer.email?.split('@')[0] || 'Someone',
  }
}

/**
 * Create a referral record when a new user signs up with a referral code.
 * DROPBOX-STYLE: Both the referrer AND the referred user get 5% bonus!
 * - Referred user gets 5% immediately on signup
 * - Referrer gets 5% when the referred user becomes a paying customer
 */
export async function createReferral(
  referrerId: string,
  referredId: string,
  referralCode: string
): Promise<void> {
  // Check if user was already referred (should be unique)
  const existing = await prisma.referral.findUnique({
    where: { referredId },
  })

  if (existing) {
    console.log(`User ${referredId} was already referred, skipping`)
    return
  }

  // Create referral record AND give the referred user their 5% bonus immediately
  await prisma.$transaction([
    prisma.referral.create({
      data: {
        referrerId,
        referredId,
        referralCode: referralCode.toUpperCase().trim(),
        status: ReferralStatus.PENDING,
      },
    }),
    // Give the referred user their 5% welcome bonus immediately
    prisma.user.update({
      where: { id: referredId },
      data: {
        referralBonusPercent: REFERRAL_BONUS_PERCENT, // 5% bonus for being referred
      },
    }),
  ])

  console.log(`[Referral] User ${referredId} signed up with referral code. Got ${REFERRAL_BONUS_PERCENT}% welcome bonus.`)
}

/**
 * Convert a referral when the referred user becomes a paying customer
 * This applies the 5% bonus to the referrer
 */
export async function convertReferral(referredUserId: string): Promise<{
  converted: boolean
  referrerId?: string
  newBonusPercent?: number
}> {
  // Find the referral record
  const referral = await prisma.referral.findUnique({
    where: { referredId: referredUserId },
    include: { referrer: true },
  })

  if (!referral) {
    return { converted: false }
  }

  if (referral.status === ReferralStatus.CONVERTED) {
    // Already converted
    return { converted: true, referrerId: referral.referrerId }
  }

  // Calculate new bonus (capped at 50%)
  const currentBonus = referral.referrer.referralBonusPercent || 0
  const newBonus = Math.min(currentBonus + REFERRAL_BONUS_PERCENT, MAX_REFERRAL_BONUS_PERCENT)

  // Update referral status and apply bonus
  await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.CONVERTED,
        convertedAt: new Date(),
        bonusApplied: true,
      },
    }),
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { referralBonusPercent: newBonus },
    }),
  ])

  return {
    converted: true,
    referrerId: referral.referrerId,
    newBonusPercent: newBonus,
  }
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(userId: string): Promise<{
  referralCode: string | null
  totalReferrals: number
  pendingReferrals: number
  convertedReferrals: number
  expiredReferrals: number
  currentBonusPercent: number
  maxBonusPercent: number
  effectiveTokenBonus: number // The multiplier (e.g., 1.15 for 15% bonus)
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      referralBonusPercent: true,
      referralsMade: {
        select: {
          status: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const referrals = user.referralsMade || []
  const pending = referrals.filter(r => r.status === ReferralStatus.PENDING).length
  const converted = referrals.filter(r => r.status === ReferralStatus.CONVERTED).length
  const expired = referrals.filter(r => r.status === ReferralStatus.EXPIRED).length

  return {
    referralCode: user.referralCode,
    totalReferrals: referrals.length,
    pendingReferrals: pending,
    convertedReferrals: converted,
    expiredReferrals: expired,
    currentBonusPercent: user.referralBonusPercent || 0,
    maxBonusPercent: MAX_REFERRAL_BONUS_PERCENT,
    effectiveTokenBonus: 1 + (user.referralBonusPercent || 0) / 100,
  }
}

/**
 * Get referral list for a user (for display in settings)
 */
export async function getReferralList(userId: string): Promise<{
  referrals: Array<{
    id: string
    status: ReferralStatus
    createdAt: Date
    convertedAt: Date | null
  }>
}> {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      convertedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return { referrals }
}

/**
 * Mark expired referrals (referrals that haven't converted after 90 days)
 * This should be run as a cron job
 */
export async function markExpiredReferrals(): Promise<number> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const result = await prisma.referral.updateMany({
    where: {
      status: ReferralStatus.PENDING,
      createdAt: { lt: ninetyDaysAgo },
    },
    data: {
      status: ReferralStatus.EXPIRED,
    },
  })

  return result.count
}

/**
 * Handle user upgrade to paid tier.
 * This should be called when:
 * - A Stripe webhook confirms payment
 * - An admin manually upgrades a user
 * - Any other payment flow completes
 *
 * It converts any pending referral for this user and applies the bonus to the referrer.
 */
export async function handleUserUpgrade(userId: string): Promise<{
  referralConverted: boolean
  referrerId?: string
  newReferrerBonus?: number
}> {
  const result = await convertReferral(userId)

  if (result.converted && result.referrerId) {
    console.log(
      `[Referral] User ${userId} upgraded to paid. ` +
      `Referrer ${result.referrerId} now has ${result.newBonusPercent}% bonus.`
    )
    return {
      referralConverted: true,
      referrerId: result.referrerId,
      newReferrerBonus: result.newBonusPercent,
    }
  }

  return { referralConverted: false }
}
