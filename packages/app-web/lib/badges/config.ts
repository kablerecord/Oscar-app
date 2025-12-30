// Badge configuration for OSQR
// Comprehensive achievement system to encourage valuable behaviors

import { UserBadge } from '@/components/layout/TopBar'

// =============================================================================
// BADGE DEFINITIONS
// =============================================================================

export const BADGES: Record<string, UserBadge & { requirement?: string }> = {
  // ---------------------------------------------------------------------------
  // EARLY ENGAGEMENT (Week 1-2)
  // ---------------------------------------------------------------------------
  'first-question': {
    id: 'first-question',
    name: 'First Steps',
    description: 'Asked your first question',
    requirement: 'Ask your first question',
    icon: '🌱',
    color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30',
  },
  'deep-thinker': {
    id: 'deep-thinker',
    name: 'Deep Thinker',
    description: 'Used Thoughtful mode 3 times',
    requirement: 'Use Thoughtful mode 3 times',
    icon: '🔮',
    color: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/30',
  },
  'contemplator': {
    id: 'contemplator',
    name: 'Contemplator',
    description: 'Used Contemplate mode',
    requirement: 'Use Contemplate mode once',
    icon: '🧘',
    color: 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20 ring-1 ring-indigo-500/30',
  },
  'first-upload': {
    id: 'first-upload',
    name: 'First Upload',
    description: 'Added your first document',
    requirement: 'Upload your first document to the Vault',
    icon: '📄',
    color: 'bg-gradient-to-br from-sky-500/20 to-cyan-500/20 ring-1 ring-sky-500/30',
  },

  // ---------------------------------------------------------------------------
  // HABIT FORMATION (Month 1-3)
  // ---------------------------------------------------------------------------
  'streak-7': {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7 active days (not consecutive)',
    requirement: 'Be active on 7 different days',
    icon: '🔥',
    color: 'bg-gradient-to-br from-orange-500/20 to-red-500/20 ring-1 ring-orange-500/30',
  },
  'monthly-regular': {
    id: 'monthly-regular',
    name: 'Monthly Regular',
    description: '15 active days in a month',
    requirement: 'Be active on 15 days in a single month',
    icon: '📆',
    color: 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 ring-1 ring-teal-500/30',
  },
  'power-month': {
    id: 'power-month',
    name: 'Power Month',
    description: '25+ active days in a month',
    requirement: 'Be active on 25+ days in a single month',
    icon: '⚡',
    color: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 ring-1 ring-yellow-500/30',
  },
  'profile-complete': {
    id: 'profile-complete',
    name: 'Identity Unlocked',
    description: 'Completed your profile',
    requirement: 'Fill out your profile information',
    icon: '🎯',
    color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-1 ring-blue-500/30',
  },

  // ---------------------------------------------------------------------------
  // DEPTH & QUALITY (Month 2-6)
  // ---------------------------------------------------------------------------
  'knowledge-builder': {
    id: 'knowledge-builder',
    name: 'Knowledge Builder',
    description: '25 documents indexed',
    requirement: 'Index 25 documents in your Vault',
    icon: '📚',
    color: 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/30',
  },
  'vault-master': {
    id: 'vault-master',
    name: 'Vault Master',
    description: '100 documents indexed',
    requirement: 'Index 100 documents in your Vault',
    icon: '🏛️',
    color: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 ring-1 ring-amber-500/30',
  },
  'deep-conversations': {
    id: 'deep-conversations',
    name: 'Deep Conversations',
    description: '10 conversations with 5+ exchanges',
    requirement: 'Have 10 conversations with 5+ back-and-forth exchanges',
    icon: '💬',
    color: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 ring-1 ring-pink-500/30',
  },
  'refiner': {
    id: 'refiner',
    name: 'Refiner',
    description: 'Used Refine/Fire 10 times',
    requirement: 'Use the Refine → Fire workflow 10 times',
    icon: '🔁',
    color: 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 ring-1 ring-orange-500/30',
  },

  // ---------------------------------------------------------------------------
  // MILESTONES (Month 3-12+)
  // ---------------------------------------------------------------------------
  'questions-100': {
    id: 'questions-100',
    name: 'Century Club',
    description: 'Asked 100 questions',
    requirement: 'Ask 100 questions',
    icon: '💯',
    color: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 ring-1 ring-purple-500/30',
  },
  'questions-1000': {
    id: 'questions-1000',
    name: 'Thousand Club',
    description: 'Asked 1,000 questions',
    requirement: 'Ask 1,000 questions',
    icon: '🎖️',
    color: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30',
  },
  'founding-member': {
    id: 'founding-member',
    name: 'Founding Member',
    description: 'Among the first 500 paid users',
    requirement: 'Be among the first 500 paid subscribers',
    icon: '⭐',
    color: 'bg-gradient-to-br from-yellow-400/30 to-amber-500/30 ring-1 ring-yellow-400/50',
  },
  'quarterly-quest': {
    id: 'quarterly-quest',
    name: 'Quarterly Quest',
    description: 'Active for 3 consecutive months',
    requirement: 'Stay active for 3 consecutive months',
    icon: '🗓️',
    color: 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 ring-1 ring-emerald-500/30',
  },
  'semester-scholar': {
    id: 'semester-scholar',
    name: 'Semester Scholar',
    description: 'Active for 6 consecutive months',
    requirement: 'Stay active for 6 consecutive months',
    icon: '📅',
    color: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-blue-500/30',
  },
  'year-one': {
    id: 'year-one',
    name: 'Year One',
    description: 'Active for 12 consecutive months',
    requirement: 'Stay active for 12 consecutive months',
    icon: '🏆',
    color: 'bg-gradient-to-br from-amber-400/30 to-yellow-500/30 ring-1 ring-amber-400/50',
  },

  // ---------------------------------------------------------------------------
  // COMMUNITY & GROWTH
  // ---------------------------------------------------------------------------
  'first-referral': {
    id: 'first-referral',
    name: 'First Referral',
    description: 'Referred your first friend',
    requirement: 'Refer a friend who signs up',
    icon: '🤝',
    color: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 ring-1 ring-pink-500/30',
  },
  'super-connector': {
    id: 'super-connector',
    name: 'Super Connector',
    description: '5 successful referrals',
    requirement: 'Have 5 referrals convert to paid users',
    icon: '🌟',
    color: 'bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 ring-1 ring-fuchsia-500/30',
  },
  'community-builder': {
    id: 'community-builder',
    name: 'Community Builder',
    description: '10 successful referrals',
    requirement: 'Have 10 referrals convert to paid users',
    icon: '💎',
    color: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/30',
  },

  // ---------------------------------------------------------------------------
  // FEATURE EXPLORATION
  // ---------------------------------------------------------------------------
  'explorer': {
    id: 'explorer',
    name: 'Explorer',
    description: 'Used 5 different features',
    requirement: 'Try 5 different features',
    icon: '🔍',
    color: 'bg-gradient-to-br from-cyan-500/20 to-teal-500/20 ring-1 ring-cyan-500/30',
  },
  'navigator': {
    id: 'navigator',
    name: 'Navigator',
    description: 'Discovered all core features',
    requirement: 'Use all 8 core features at least once',
    icon: '🧭',
    color: 'bg-gradient-to-br from-blue-500/20 to-sky-500/20 ring-1 ring-blue-500/30',
  },
  'creator': {
    id: 'creator',
    name: 'Creator',
    description: 'Created your first artifact',
    requirement: 'Create your first artifact (chart, image, etc.)',
    icon: '🎨',
    color: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 ring-1 ring-rose-500/30',
  },
}

// =============================================================================
// BADGE CATEGORIES (for grouping in UI)
// =============================================================================

export const BADGE_CATEGORIES = {
  'early-engagement': {
    name: 'Getting Started',
    description: 'First steps with OSQR',
    badges: ['first-question', 'deep-thinker', 'contemplator', 'first-upload'],
  },
  'habit-formation': {
    name: 'Building Habits',
    description: 'Consistent usage patterns',
    badges: ['streak-7', 'monthly-regular', 'power-month', 'profile-complete'],
  },
  'depth-quality': {
    name: 'Going Deep',
    description: 'Quality engagement',
    badges: ['knowledge-builder', 'vault-master', 'deep-conversations', 'refiner'],
  },
  'milestones': {
    name: 'Milestones',
    description: 'Long-term achievements',
    badges: ['questions-100', 'questions-1000', 'founding-member', 'quarterly-quest', 'semester-scholar', 'year-one'],
  },
  'community': {
    name: 'Community',
    description: 'Growing the community',
    badges: ['first-referral', 'super-connector', 'community-builder'],
  },
  'exploration': {
    name: 'Feature Explorer',
    description: 'Discovering OSQR',
    badges: ['explorer', 'navigator', 'creator'],
  },
}

// =============================================================================
// STATS INTERFACE
// =============================================================================

export interface UserStats {
  // Basic counts
  totalQuestions: number
  documentsIndexed: number

  // Profile
  profileComplete: boolean

  // Activity patterns
  totalActiveDays: number
  activeDaysThisMonth: number
  consecutiveMonthsActive: number

  // Mode usage
  thoughtfulModeUses: number
  contemplateModeUses: number

  // Conversation depth
  deepConversations: number // Conversations with 5+ exchanges
  refineFireUses: number

  // Referrals
  convertedReferrals: number

  // Features
  featuresUsed: string[]
  artifactsCreated: number

  // Founding member status
  isFoundingMember: boolean

  // Account age
  accountCreatedAt: Date
  firstPaidAt?: Date
}

// =============================================================================
// BADGE EVALUATION
// =============================================================================

// Get a user's active badge based on their stats (priority order)
export function getActiveBadge(stats: UserStats): UserBadge | null {
  const earned = getAllEarnedBadges(stats)

  // Priority order - show the most impressive badge
  const priorityOrder = [
    'year-one',
    'semester-scholar',
    'quarterly-quest',
    'founding-member',
    'community-builder',
    'super-connector',
    'vault-master',
    'questions-1000',
    'power-month',
    'navigator',
    'monthly-regular',
    'deep-conversations',
    'questions-100',
    'knowledge-builder',
    'refiner',
    'streak-7',
    'creator',
    'first-referral',
    'contemplator',
    'deep-thinker',
    'explorer',
    'profile-complete',
    'first-upload',
    'first-question',
  ]

  for (const badgeId of priorityOrder) {
    const badge = earned.find(b => b.id === badgeId)
    if (badge) return badge
  }

  return null
}

// Get all badges a user has earned
export function getAllEarnedBadges(stats: UserStats): UserBadge[] {
  const earned: UserBadge[] = []

  // Early Engagement
  if (stats.totalQuestions >= 1) {
    earned.push(BADGES['first-question'])
  }
  if (stats.thoughtfulModeUses >= 3) {
    earned.push(BADGES['deep-thinker'])
  }
  if (stats.contemplateModeUses >= 1) {
    earned.push(BADGES['contemplator'])
  }
  if (stats.documentsIndexed >= 1) {
    earned.push(BADGES['first-upload'])
  }

  // Habit Formation
  if (stats.totalActiveDays >= 7) {
    earned.push(BADGES['streak-7'])
  }
  if (stats.activeDaysThisMonth >= 15) {
    earned.push(BADGES['monthly-regular'])
  }
  if (stats.activeDaysThisMonth >= 25) {
    earned.push(BADGES['power-month'])
  }
  if (stats.profileComplete) {
    earned.push(BADGES['profile-complete'])
  }

  // Depth & Quality
  if (stats.documentsIndexed >= 25) {
    earned.push(BADGES['knowledge-builder'])
  }
  if (stats.documentsIndexed >= 100) {
    earned.push(BADGES['vault-master'])
  }
  if (stats.deepConversations >= 10) {
    earned.push(BADGES['deep-conversations'])
  }
  if (stats.refineFireUses >= 10) {
    earned.push(BADGES['refiner'])
  }

  // Milestones
  if (stats.totalQuestions >= 100) {
    earned.push(BADGES['questions-100'])
  }
  if (stats.totalQuestions >= 1000) {
    earned.push(BADGES['questions-1000'])
  }
  if (stats.isFoundingMember) {
    earned.push(BADGES['founding-member'])
  }
  if (stats.consecutiveMonthsActive >= 3) {
    earned.push(BADGES['quarterly-quest'])
  }
  if (stats.consecutiveMonthsActive >= 6) {
    earned.push(BADGES['semester-scholar'])
  }
  if (stats.consecutiveMonthsActive >= 12) {
    earned.push(BADGES['year-one'])
  }

  // Community & Growth
  if (stats.convertedReferrals >= 1) {
    earned.push(BADGES['first-referral'])
  }
  if (stats.convertedReferrals >= 5) {
    earned.push(BADGES['super-connector'])
  }
  if (stats.convertedReferrals >= 10) {
    earned.push(BADGES['community-builder'])
  }

  // Feature Exploration
  const featuresUsed = stats.featuresUsed || []
  if (featuresUsed.length >= 5) {
    earned.push(BADGES['explorer'])
  }
  if (featuresUsed.length >= 8) {
    earned.push(BADGES['navigator'])
  }
  if ((stats.artifactsCreated || 0) >= 1) {
    earned.push(BADGES['creator'])
  }

  return earned
}

// Get all badge IDs for display
export function getAllBadgeIds(): string[] {
  return Object.keys(BADGES)
}

// Core features for Navigator badge
export const CORE_FEATURES = [
  'quick_mode',
  'thoughtful_mode',
  'contemplate_mode',
  'vault',
  'refine_fire',
  'artifacts',
  'profile',
  'msc',
]
