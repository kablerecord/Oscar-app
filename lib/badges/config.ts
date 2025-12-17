// Badge configuration for OSQR
// Expand this as you add more badges

import { UserBadge } from '@/components/layout/TopBar'

// Badge definitions - add new badges here
export const BADGES: Record<string, UserBadge> = {
  'first-question': {
    id: 'first-question',
    name: 'First Steps',
    description: 'Asked your first question',
    icon: '🌱',
    color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 ring-1 ring-green-500/30',
  },
  // Future badges - uncomment and expand as needed
  // 'streak-7': {
  //   id: 'streak-7',
  //   name: 'Week Warrior',
  //   description: '7 day streak!',
  //   icon: '🔥',
  //   color: 'bg-gradient-to-br from-orange-500/20 to-red-500/20 ring-1 ring-orange-500/30',
  // },
  // 'streak-30': {
  //   id: 'streak-30',
  //   name: 'Monthly Master',
  //   description: '30 day streak!',
  //   icon: '⚡',
  //   color: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 ring-1 ring-yellow-500/30',
  // },
  // 'questions-100': {
  //   id: 'questions-100',
  //   name: 'Century Club',
  //   description: 'Asked 100 questions',
  //   icon: '💯',
  //   color: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 ring-1 ring-purple-500/30',
  // },
  // 'profile-complete': {
  //   id: 'profile-complete',
  //   name: 'Identity Unlocked',
  //   description: 'Completed your profile',
  //   icon: '🎯',
  //   color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 ring-1 ring-blue-500/30',
  // },
  // 'vault-indexed': {
  //   id: 'vault-indexed',
  //   name: 'Knowledge Keeper',
  //   description: 'Indexed documents to your vault',
  //   icon: '📚',
  //   color: 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-indigo-500/30',
  // },
}

// Get a user's active badge based on their stats
// For now, everyone who has asked at least one question gets "First Steps"
export function getActiveBadge(stats: {
  totalQuestions?: number
  streak?: number
  profileComplete?: boolean
  documentsIndexed?: number
}): UserBadge | null {
  // Return first-question badge if they've asked at least 1 question
  if (stats.totalQuestions && stats.totalQuestions >= 1) {
    return BADGES['first-question']
  }

  // Future logic for more badges:
  // if (stats.streak && stats.streak >= 30) return BADGES['streak-30']
  // if (stats.streak && stats.streak >= 7) return BADGES['streak-7']
  // if (stats.totalQuestions && stats.totalQuestions >= 100) return BADGES['questions-100']
  // if (stats.profileComplete) return BADGES['profile-complete']
  // if (stats.documentsIndexed && stats.documentsIndexed >= 1) return BADGES['vault-indexed']

  return null
}
