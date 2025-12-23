/**
 * Capability Ladder Assessment Questions
 *
 * These questions help determine a user's current capability level (0-12).
 * Based on the Fourth Generation Formula and psychological frameworks.
 */

export interface AssessmentQuestion {
  id: string
  question: string
  category: 'time_horizon' | 'identity_source' | 'failure_response' | 'problem_framing' | 'consistency' | 'leverage'
  options: AssessmentOption[]
}

export interface AssessmentOption {
  text: string
  levelRange: [number, number] // [min, max] level this answer indicates
  weight: number // How much this answer contributes (0-1)
}

export interface AssessmentResult {
  level: number
  stage: 'foundation' | 'operator' | 'creator' | 'architect'
  confidence: number // 0-1 how confident we are in this assessment
  breakdown: {
    category: string
    score: number
  }[]
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // TIME HORIZON - How far ahead do you think?
  {
    id: 'time_horizon_1',
    question: 'When you think about your life, how far ahead do you typically plan?',
    category: 'time_horizon',
    options: [
      { text: 'I mostly focus on today or this week', levelRange: [0, 2], weight: 1.0 },
      { text: 'I plan a few months ahead', levelRange: [3, 5], weight: 1.0 },
      { text: 'I think in terms of 1-3 years', levelRange: [5, 7], weight: 1.0 },
      { text: 'I plan 5-10 years out', levelRange: [7, 9], weight: 1.0 },
      { text: 'I think in decades and beyond my lifetime', levelRange: [10, 12], weight: 1.0 },
    ],
  },

  // IDENTITY SOURCE - Where does your sense of self come from?
  {
    id: 'identity_source_1',
    question: 'Where does your sense of who you are primarily come from?',
    category: 'identity_source',
    options: [
      { text: 'What others think of me and external validation', levelRange: [0, 2], weight: 1.0 },
      { text: 'My job title or current role', levelRange: [2, 4], weight: 1.0 },
      { text: 'My habits and daily actions', levelRange: [4, 6], weight: 1.0 },
      { text: 'My values and what I create', levelRange: [6, 9], weight: 1.0 },
      { text: 'My mission and the impact I want to have', levelRange: [9, 12], weight: 1.0 },
    ],
  },

  // FAILURE RESPONSE - How do you handle setbacks?
  {
    id: 'failure_response_1',
    question: 'When something you worked on fails, what is your typical response?',
    category: 'failure_response',
    options: [
      { text: 'I feel devastated and often give up', levelRange: [0, 1], weight: 1.0 },
      { text: 'I feel bad but eventually try again', levelRange: [2, 3], weight: 1.0 },
      { text: 'I try to learn from it and adjust my approach', levelRange: [4, 6], weight: 1.0 },
      { text: 'I see it as data and iterate quickly', levelRange: [7, 9], weight: 1.0 },
      { text: 'I expect failures and have systems to learn from them', levelRange: [9, 12], weight: 1.0 },
    ],
  },

  // PROBLEM FRAMING - How do you approach challenges?
  {
    id: 'problem_framing_1',
    question: 'When facing a challenge, how do you typically think about it?',
    category: 'problem_framing',
    options: [
      { text: '"How do I survive this?"', levelRange: [0, 2], weight: 1.0 },
      { text: '"How do I solve this problem?"', levelRange: [3, 5], weight: 1.0 },
      { text: '"What system would prevent this from happening again?"', levelRange: [6, 8], weight: 1.0 },
      { text: '"What platform or structure solves this for many people?"', levelRange: [9, 11], weight: 1.0 },
      { text: '"What institution or framework solves this for generations?"', levelRange: [11, 12], weight: 1.0 },
    ],
  },

  // CONSISTENCY - How reliable are your commitments?
  {
    id: 'consistency_1',
    question: 'How often do you follow through on commitments you make to yourself?',
    category: 'consistency',
    options: [
      { text: 'I rarely keep commitments to myself', levelRange: [0, 1], weight: 1.0 },
      { text: 'About half the time', levelRange: [2, 3], weight: 1.0 },
      { text: 'Most of the time when conditions are good', levelRange: [4, 5], weight: 1.0 },
      { text: 'Almost always, even when it is hard', levelRange: [6, 8], weight: 1.0 },
      { text: 'I have systems that make consistency automatic', levelRange: [8, 12], weight: 1.0 },
    ],
  },

  // LEVERAGE - How do you think about getting results?
  {
    id: 'leverage_1',
    question: 'When you want to accomplish something, what is your typical approach?',
    category: 'leverage',
    options: [
      { text: 'I do the work myself directly', levelRange: [0, 3], weight: 1.0 },
      { text: 'I work hard and try to be more efficient', levelRange: [3, 5], weight: 1.0 },
      { text: 'I look for tools and processes to multiply my effort', levelRange: [5, 7], weight: 1.0 },
      { text: 'I build teams and systems that work without me', levelRange: [7, 9], weight: 1.0 },
      { text: 'I create platforms where others build and benefit', levelRange: [9, 12], weight: 1.0 },
    ],
  },

  // OWNERSHIP - How do you view your circumstances?
  {
    id: 'ownership_1',
    question: 'When things go wrong in your life, who or what is usually responsible?',
    category: 'identity_source',
    options: [
      { text: 'Usually circumstances or other people', levelRange: [0, 1], weight: 0.8 },
      { text: 'Sometimes me, sometimes external factors', levelRange: [2, 3], weight: 0.8 },
      { text: 'I take responsibility but acknowledge constraints', levelRange: [4, 6], weight: 0.8 },
      { text: 'I always own my results, good or bad', levelRange: [6, 9], weight: 0.8 },
      { text: 'I own my results and design systems to improve them', levelRange: [9, 12], weight: 0.8 },
    ],
  },

  // GOALS - How clear and structured are your goals?
  {
    id: 'goals_1',
    question: 'How would you describe your goals right now?',
    category: 'time_horizon',
    options: [
      { text: 'I do not really have clear goals', levelRange: [0, 1], weight: 0.8 },
      { text: 'I have vague ideas of what I want', levelRange: [1, 3], weight: 0.8 },
      { text: 'I have written goals I review sometimes', levelRange: [3, 5], weight: 0.8 },
      { text: 'I have clear goals with milestones I track', levelRange: [5, 8], weight: 0.8 },
      { text: 'I have a multi-year vision with quarterly objectives', levelRange: [8, 12], weight: 0.8 },
    ],
  },

  // BUILDER VS CONSUMER - What do you create?
  {
    id: 'builder_1',
    question: 'In the past year, which best describes you?',
    category: 'leverage',
    options: [
      { text: 'I mostly consumed content and used what others built', levelRange: [0, 2], weight: 0.8 },
      { text: 'I created a few things for myself', levelRange: [2, 4], weight: 0.8 },
      { text: 'I built things that help me be more effective', levelRange: [4, 6], weight: 0.8 },
      { text: 'I created things that others use or benefit from', levelRange: [6, 9], weight: 0.8 },
      { text: 'I built platforms or systems that enable others to create', levelRange: [9, 12], weight: 0.8 },
    ],
  },

  // IDENTITY STATEMENT - "I am the kind of person who..."
  {
    id: 'identity_statement_1',
    question: 'Complete this sentence: "I am the kind of person who..."',
    category: 'identity_source',
    options: [
      { text: '...tries their best (sometimes)', levelRange: [0, 2], weight: 0.9 },
      { text: '...is working on getting better', levelRange: [2, 4], weight: 0.9 },
      { text: '...follows through on commitments', levelRange: [4, 6], weight: 0.9 },
      { text: '...creates value and solves problems', levelRange: [6, 9], weight: 0.9 },
      { text: '...builds things that outlast me', levelRange: [9, 12], weight: 0.9 },
    ],
  },
]

/**
 * Calculate capability level from assessment answers
 */
export function calculateLevel(answers: Record<string, number>): AssessmentResult {
  const categoryScores: Record<string, { total: number; weight: number }> = {}

  let totalWeightedScore = 0
  let totalWeight = 0

  for (const question of ASSESSMENT_QUESTIONS) {
    const answerIndex = answers[question.id]
    if (answerIndex === undefined) continue

    const option = question.options[answerIndex]
    if (!option) continue

    // Calculate the midpoint of the level range as the score
    const midpoint = (option.levelRange[0] + option.levelRange[1]) / 2
    const weightedScore = midpoint * option.weight

    totalWeightedScore += weightedScore
    totalWeight += option.weight

    // Track by category
    if (!categoryScores[question.category]) {
      categoryScores[question.category] = { total: 0, weight: 0 }
    }
    categoryScores[question.category].total += weightedScore
    categoryScores[question.category].weight += option.weight
  }

  // Calculate final level (rounded to nearest integer)
  const level = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0

  // Determine stage
  let stage: 'foundation' | 'operator' | 'creator' | 'architect'
  if (level <= 3) stage = 'foundation'
  else if (level <= 6) stage = 'operator'
  else if (level <= 9) stage = 'creator'
  else stage = 'architect'

  // Calculate confidence based on how many questions were answered
  const answeredCount = Object.keys(answers).length
  const confidence = answeredCount / ASSESSMENT_QUESTIONS.length

  // Build breakdown
  const breakdown = Object.entries(categoryScores).map(([category, scores]) => ({
    category,
    score: scores.weight > 0 ? Math.round(scores.total / scores.weight) : 0,
  }))

  return {
    level: Math.max(0, Math.min(12, level)), // Clamp to 0-12
    stage,
    confidence,
    breakdown,
  }
}

/**
 * Get a subset of questions for quick assessment
 */
export function getQuickAssessment(): AssessmentQuestion[] {
  // Return one question from each category for a quick 6-question assessment
  const categories = ['time_horizon', 'identity_source', 'failure_response', 'problem_framing', 'consistency', 'leverage']
  return categories.map((cat) => ASSESSMENT_QUESTIONS.find((q) => q.category === cat)!).filter(Boolean)
}

/**
 * Get all questions for full assessment
 */
export function getFullAssessment(): AssessmentQuestion[] {
  return ASSESSMENT_QUESTIONS
}
