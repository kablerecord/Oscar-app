/**
 * Profile Question Bank
 *
 * Questions to learn about the user and improve OSQR's responses
 * Organized by category with priority levels
 */

export type QuestionCategory = 'personal' | 'goals' | 'preferences' | 'context'

export interface ProfileQuestion {
  id: string
  category: QuestionCategory
  question: string
  priority: number // 1 = highest priority, 10 = lowest
  type: 'text' | 'choice' // Future: support multiple choice
  choices?: string[] // For choice type questions
  isV1Essential?: boolean // Critical for V1 launch - minimum viable profile
}

/**
 * V1 Essential Questions (The Minimum Viable Profile)
 * These 3 questions give OSQR enough context to feel magical from Day 1
 * Used in quick onboarding flow
 */
export const V1_ESSENTIAL_QUESTIONS: ProfileQuestion[] = [
  {
    id: 'v1-working-on',
    category: 'goals',
    question: "What are you working on right now?",
    priority: 1,
    type: 'text',
    isV1Essential: true,
  },
  {
    id: 'v1-goal',
    category: 'goals',
    question: "What's your #1 goal right now?",
    priority: 1,
    type: 'text',
    isV1Essential: true,
  },
  {
    id: 'v1-constraint',
    category: 'context',
    question: "What's your biggest constraint or blocker?",
    priority: 1,
    type: 'text',
    isV1Essential: true,
  },
]

/**
 * Question bank - ordered by priority within each category
 */
export const QUESTION_BANK: ProfileQuestion[] = [
  // ===== PERSONAL (High Priority) =====
  {
    id: 'personal-name',
    category: 'personal',
    question: "What's your first name? (So OSQR can address you personally)",
    priority: 1,
    type: 'text',
  },
  {
    id: 'personal-industry',
    category: 'personal',
    question: 'What industry or field do you work in?',
    priority: 1,
    type: 'text',
  },
  {
    id: 'personal-role',
    category: 'personal',
    question: "What's your current role or position?",
    priority: 2,
    type: 'text',
  },
  {
    id: 'personal-experience',
    category: 'personal',
    question: 'How many years of professional experience do you have?',
    priority: 3,
    type: 'text',
  },
  {
    id: 'personal-location',
    category: 'personal',
    question: 'Where are you based? (City/Country)',
    priority: 4,
    type: 'text',
  },

  // ===== GOALS (High Priority) =====
  {
    id: 'goals-primary',
    category: 'goals',
    question: "What's your main goal or biggest priority right now?",
    priority: 1,
    type: 'text',
  },
  {
    id: 'goals-building',
    category: 'goals',
    question: 'What are you trying to build or create?',
    priority: 1,
    type: 'text',
  },
  {
    id: 'goals-challenge',
    category: 'goals',
    question: "What's your biggest challenge or obstacle right now?",
    priority: 2,
    type: 'text',
  },
  {
    id: 'goals-timeline',
    category: 'goals',
    question: "What's your timeline for achieving your main goal?",
    priority: 3,
    type: 'text',
  },
  {
    id: 'goals-success',
    category: 'goals',
    question: 'What would success look like for you in 6 months?',
    priority: 3,
    type: 'text',
  },

  // ===== CONTEXT (Medium Priority) =====
  {
    id: 'context-project',
    category: 'context',
    question: 'What project(s) are you currently working on?',
    priority: 2,
    type: 'text',
  },
  {
    id: 'context-audience',
    category: 'context',
    question: 'Who is your target audience or who do you serve?',
    priority: 2,
    type: 'text',
  },
  {
    id: 'context-company',
    category: 'context',
    question: 'Are you working solo, at a company, or building a business?',
    priority: 3,
    type: 'text',
  },
  {
    id: 'context-team',
    category: 'context',
    question: 'Do you work with a team? If so, how large?',
    priority: 4,
    type: 'text',
  },
  {
    id: 'context-skills',
    category: 'context',
    question: 'What are your core skills or areas of expertise?',
    priority: 3,
    type: 'text',
  },
  {
    id: 'context-learning',
    category: 'context',
    question: 'What are you currently learning or trying to improve?',
    priority: 4,
    type: 'text',
  },
  {
    id: 'context-tools',
    category: 'context',
    question: 'What tools or platforms do you use regularly?',
    priority: 5,
    type: 'text',
  },

  // ===== PREFERENCES (Lower Priority) =====
  {
    id: 'prefs-learning-style',
    category: 'preferences',
    question: 'How do you prefer to learn? (Examples, step-by-step, concepts, etc.)',
    priority: 3,
    type: 'text',
  },
  {
    id: 'prefs-detail-level',
    category: 'preferences',
    question: 'Do you prefer concise answers or detailed explanations?',
    priority: 4,
    type: 'choice',
    choices: ['Concise', 'Balanced', 'Detailed'],
  },
  {
    id: 'prefs-tone',
    category: 'preferences',
    question: 'What tone do you prefer? (Casual, professional, technical, etc.)',
    priority: 4,
    type: 'text',
  },
  {
    id: 'prefs-examples',
    category: 'preferences',
    question: 'Do you like seeing examples and analogies in explanations?',
    priority: 5,
    type: 'choice',
    choices: ['Yes, lots of examples', 'Some examples', 'Just give me the facts'],
  },

  // ===== MORE PERSONAL =====
  {
    id: 'personal-motivation',
    category: 'personal',
    question: 'What motivates you most in your work?',
    priority: 4,
    type: 'text',
  },
  {
    id: 'personal-values',
    category: 'personal',
    question: 'What values are most important to you?',
    priority: 5,
    type: 'text',
  },
  {
    id: 'personal-strengths',
    category: 'personal',
    question: "What do people say you're best at?",
    priority: 5,
    type: 'text',
  },

  // ===== MORE GOALS =====
  {
    id: 'goals-long-term',
    category: 'goals',
    question: "What's your long-term vision (2-5 years)?",
    priority: 4,
    type: 'text',
  },
  {
    id: 'goals-impact',
    category: 'goals',
    question: 'What impact do you want to make in the world?',
    priority: 5,
    type: 'text',
  },
  {
    id: 'goals-avoid',
    category: 'goals',
    question: 'What do you want to avoid or stop doing?',
    priority: 5,
    type: 'text',
  },

  // ===== MORE CONTEXT =====
  {
    id: 'context-stage',
    category: 'context',
    question: 'What stage is your project/business in? (Idea, MVP, growth, etc.)',
    priority: 4,
    type: 'text',
  },
  {
    id: 'context-resources',
    category: 'context',
    question: 'What resources do you have access to? (Budget, team, expertise)',
    priority: 5,
    type: 'text',
  },
  {
    id: 'context-constraints',
    category: 'context',
    question: 'What constraints or limitations are you working with?',
    priority: 5,
    type: 'text',
  },
]

/**
 * Get next unanswered question
 * Returns questions in priority order
 */
export function getNextQuestion(answeredQuestionIds: string[]): ProfileQuestion | null {
  const answeredSet = new Set(answeredQuestionIds)

  // Sort by priority (lower number = higher priority)
  const sorted = [...QUESTION_BANK].sort((a, b) => a.priority - b.priority)

  // Find first unanswered question
  const next = sorted.find(q => !answeredSet.has(q.id))

  return next || null
}

/**
 * Get total number of questions
 */
export function getTotalQuestions(): number {
  return QUESTION_BANK.length
}

/**
 * Get progress (percentage)
 */
export function getProgress(answeredCount: number): number {
  return Math.round((answeredCount / getTotalQuestions()) * 100)
}

/**
 * Get motivational message based on progress
 */
export function getProgressMessage(answeredCount: number): string {
  const progress = getProgress(answeredCount)

  if (answeredCount === 0) return "Let's get to know you!"
  if (progress < 10) return "Great start! 🎯"
  if (progress < 25) return "You're doing great! 🚀"
  if (progress < 50) return "Halfway there! 💪"
  if (progress < 75) return "Almost done! 🌟"
  if (progress < 90) return "So close! 🎉"
  if (progress < 100) return "Final stretch! 🏁"
  return "Profile complete! 🎊"
}
