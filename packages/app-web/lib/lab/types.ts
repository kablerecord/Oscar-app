// Oscar Lab TypeScript Types

export type LabTier = 'EXPLORER' | 'CONTRIBUTOR' | 'INSIDER'

export type ReactionType =
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'MISSED_SOMETHING'
  | 'UNEXPECTED_GOOD'
  | 'WRONG_MODE'

export type FeedbackCategory =
  | 'INTENT_UNDERSTANDING'
  | 'RESPONSE_QUALITY'
  | 'MODE_CALIBRATION'
  | 'KNOWLEDGE_RETRIEVAL'
  | 'PERSONALIZATION'
  | 'CAPABILITY_GAP'

export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export type InsightStatus = 'NEW' | 'REVIEWING' | 'ACTIONABLE' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX'

export interface ChallengeQuestion {
  id: string
  type: 'rating' | 'choice' | 'text' | 'comparison'
  question: string
  options?: string[]
  required: boolean
}

export interface FormSection {
  id: string
  title: string
  description?: string
  questions: FormQuestion[]
}

export interface FormQuestion {
  id: string
  type: 'rating' | 'scale' | 'text' | 'choice' | 'uip_accuracy'
  question: string
  context?: string
  options?: string[]
  required: boolean
}

export interface LabMemberStats {
  tier: LabTier
  feedbackScore: number
  challengesCompleted: number
  streakDays: number
  rank?: number
}

export interface ImpactStats {
  totalContributions: number
  insightsInfluenced: number
  featuresInfluenced: string[]
}

// API Response Types

export interface LabMemberResponse {
  id: string
  tier: LabTier
  feedbackScore: number
  challengesCompleted: number
  streakDays: number
  joinedAt: string
  lastActiveAt: string | null
}

export interface LabMemberFullResponse {
  member: LabMemberResponse
  impact: {
    totalReactions: number
    challengesCompleted: number
    deepDivesSubmitted: number
    insightsInfluenced: number
  }
  preferences: {
    weeklyDigest: boolean
    challengeReminders: boolean
  }
}

export interface ChallengeListItem {
  id: string
  title: string
  description: string
  category: FeedbackCategory
  estimatedMinutes: number
  pointsReward: number
  compareMode: boolean
  prerequisiteCompleted: boolean
}

export interface ChallengeDetail {
  id: string
  title: string
  description: string
  category: FeedbackCategory
  promptToTry: string | null
  compareMode: boolean
  modesCompare: string[]
  questions: ChallengeQuestion[]
  estimatedMinutes: number
  pointsReward: number
}

export interface ChallengeResponseData {
  id: string
  challengeId: string
  answers: Record<string, unknown>
  preferredMode?: string
  comparisonNotes?: string
  threadId?: string
  timeSpentSeconds?: number
  createdAt: string
}

export interface DeepDiveListItem {
  id: string
  title: string
  description: string
  category: FeedbackCategory
  estimatedMinutes: number
  pointsReward: number
}

export interface DeepDiveDetail {
  id: string
  title: string
  description: string
  category: FeedbackCategory
  sections: FormSection[]
  estimatedMinutes: number
  pointsReward: number
}

export interface LeaderboardEntry {
  rank: number
  name: string
  tier: LabTier
  score: number
  streakDays: number
}

export interface InsightImpact {
  id: string
  title: string
  status: InsightStatus
  actionTaken?: string
}

// Scoring Constants
export const POINTS = {
  QUICK_REACTION: 1,
  QUICK_REACTION_WITH_COMMENT: 3,
  CHALLENGE_BASE: 10,
  DEEP_DIVE_BASE: 50,
} as const

export const TIER_THRESHOLDS = {
  CONTRIBUTOR: 5, // challenges completed
  INSIDER_PERCENTILE: 0.1, // top 10%
} as const
