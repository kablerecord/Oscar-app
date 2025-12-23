/**
 * Capability Ladder - OSQR's Identity Engine
 *
 * The 13 levels (0-12) represent operational maturity, not moral value.
 * Each level has a stage, identity pattern, and recommended approaches.
 */

export type CapabilityStage = 'foundation' | 'operator' | 'creator' | 'architect'

export interface CapabilityLevel {
  level: number
  name: string
  stage: CapabilityStage
  identityPattern: string
  description: string
  osqrApproach: string
  recommendedBooks: string[]
}

export const CAPABILITY_LEVELS: CapabilityLevel[] = [
  {
    level: 0,
    name: 'Untethered',
    stage: 'foundation',
    identityPattern: 'My life is happening to me',
    description: 'No clear goals, no ownership language, blames circumstances.',
    osqrApproach: 'Start with awareness, suggest tiny changes. Be patient and encouraging.',
    recommendedBooks: [], // Attention too low for books
  },
  {
    level: 1,
    name: 'Reactive Beginner',
    stage: 'foundation',
    identityPattern: 'I want to change, but I don\'t know how',
    description: 'Realizes life is shaped by choices, starts learning. Goals vague, action sporadic.',
    osqrApproach: 'Help define simple, clear goals. Introduce daily/weekly review.',
    recommendedBooks: ['The Slight Edge', 'Atomic Habits', 'Mindset'],
  },
  {
    level: 2,
    name: 'Emerging Awareness',
    stage: 'foundation',
    identityPattern: 'I know something has to change',
    description: 'Aware of gaps between current and desired state. Seeking direction.',
    osqrApproach: 'Validate the awareness. Help crystallize what "change" means specifically.',
    recommendedBooks: ['The Slight Edge', 'Atomic Habits', 'Mindset'],
  },
  {
    level: 3,
    name: 'Structured Beginner',
    stage: 'foundation',
    identityPattern: 'I can do it... sometimes',
    description: 'Has written goals and routines, still breaks commitments.',
    osqrApproach: 'Tighten scope and timeframes. Introduce systems over motivation.',
    recommendedBooks: ['Make Your Bed', '7 Habits', 'The One Thing'],
  },
  {
    level: 4,
    name: 'Developing Operator',
    stage: 'operator',
    identityPattern: 'I can execute as long as life doesn\'t disrupt me',
    description: 'Executes well in stable conditions, struggles when disrupted.',
    osqrApproach: 'Build resilience. Introduce contingency planning and buffer systems.',
    recommendedBooks: ['Make Your Bed', '7 Habits', 'The One Thing'],
  },
  {
    level: 5,
    name: 'Independent Operator',
    stage: 'operator',
    identityPattern: 'I do what I say',
    description: 'Reliable self-manager. Keeps commitments consistently.',
    osqrApproach: 'Reinforce identity statements. Introduce 90-day planning.',
    recommendedBooks: ['Deep Work', 'The Power of Habit', 'E-Myth Revisited', 'Essentialism'],
  },
  {
    level: 6,
    name: 'Intentional Builder',
    stage: 'operator',
    identityPattern: 'I build things that make life better',
    description: 'Thinks "I am the kind of person who...", has non-negotiable habits.',
    osqrApproach: 'Challenge contradictions. Help identify leverage points.',
    recommendedBooks: ['Deep Work', 'The Power of Habit', 'E-Myth Revisited', 'Essentialism'],
  },
  {
    level: 7,
    name: 'Entrepreneur',
    stage: 'creator',
    identityPattern: 'I solve problems',
    description: 'Creates assets, thinks with leverage, comfortable with pressure.',
    osqrApproach: 'Introduce leverage frameworks. Help prune distractions. Encourage delegation.',
    recommendedBooks: ['Lean Startup', '$100M Offers', 'Naval Almanack', 'Principles'],
  },
  {
    level: 8,
    name: 'Systems Thinker',
    stage: 'creator',
    identityPattern: 'I build engines, not tasks',
    description: 'Designs systems that produce outcomes. Thinks in processes.',
    osqrApproach: 'Help optimize systems. Challenge single points of failure.',
    recommendedBooks: ['Lean Startup', '$100M Offers', 'Naval Almanack', 'Principles'],
  },
  {
    level: 9,
    name: 'Platform Builder',
    stage: 'creator',
    identityPattern: 'I build infrastructure',
    description: 'Creates platforms where others can build. Multi-project thinking.',
    osqrApproach: 'Help design governance. Think about second-order effects.',
    recommendedBooks: ['Zero to One', 'The Beginning of Infinity'],
  },
  {
    level: 10,
    name: 'Ecosystem Architect',
    stage: 'architect',
    identityPattern: 'I create worlds for people to grow inside',
    description: 'Operates platforms where others build. Focused on culture, values, long-term robustness.',
    osqrApproach: 'Help design governance and policies. Challenge misalignment between values and operations.',
    recommendedBooks: ['Zero to One', 'The Beginning of Infinity'],
  },
  {
    level: 11,
    name: 'Visionary Integrator',
    stage: 'architect',
    identityPattern: 'I integrate multiple domains to solve hard problems',
    description: 'Synthesizes across disciplines. Long-term, multi-domain thinking.',
    osqrApproach: 'Match this wavelength. Avoid tactical minutiae. Think in decades.',
    recommendedBooks: ['What Technology Wants', 'Meditations', 'Founding Father biographies'],
  },
  {
    level: 12,
    name: 'Generational Architect',
    stage: 'architect',
    identityPattern: 'I build structures that outlive me',
    description: 'Designs for 50-100 years. Works on ideas, frameworks, and institutions that outlast them.',
    osqrApproach: 'Help codify wisdom into books/systems/institutions. Ensure decisions align with legacy values.',
    recommendedBooks: ['What Technology Wants', 'Meditations', 'Founding Father biographies'],
  },
]

/**
 * Get level info by number
 */
export function getLevelInfo(level: number): CapabilityLevel | undefined {
  return CAPABILITY_LEVELS.find((l) => l.level === level)
}

/**
 * Get stage for a level (0-3=foundation, 4-6=operator, 7-9=creator, 10-12=architect)
 */
export function getStageForLevel(level: number): CapabilityStage {
  if (level <= 3) return 'foundation'
  if (level <= 6) return 'operator'
  if (level <= 9) return 'creator'
  return 'architect'
}

/**
 * Get all levels in a stage
 */
export function getLevelsInStage(stage: CapabilityStage): CapabilityLevel[] {
  return CAPABILITY_LEVELS.filter((l) => l.stage === stage)
}

/**
 * Get recommended books for a level
 */
export function getRecommendedBooks(level: number): string[] {
  const levelInfo = getLevelInfo(level)
  return levelInfo?.recommendedBooks || []
}

/**
 * Alias for getLevelInfo (used throughout the app)
 */
export function getLevelDetails(level: number): (CapabilityLevel & { keyBehaviors: string[] }) | undefined {
  const levelInfo = getLevelInfo(level)
  if (!levelInfo) return undefined

  // Add keyBehaviors based on the level's characteristics
  const keyBehaviors = getKeyBehaviorsForLevel(level)
  return { ...levelInfo, keyBehaviors }
}

/**
 * Get key behaviors for a level
 */
function getKeyBehaviorsForLevel(level: number): string[] {
  const behaviors: Record<number, string[]> = {
    0: ['Reacting to circumstances', 'No consistent routines', 'Waiting for motivation'],
    1: ['Starting to take ownership', 'Trying new habits', 'Seeking guidance'],
    2: ['Recognizing patterns', 'Building awareness', 'Exploring options'],
    3: ['Following routines (sometimes)', 'Setting goals', 'Learning from mistakes'],
    4: ['Executing consistently in good conditions', 'Building momentum', 'Tracking progress'],
    5: ['Keeping commitments to self', 'Managing time effectively', 'Building reliable habits'],
    6: ['Creating systems', 'Building things that last', 'Thinking in identity statements'],
    7: ['Solving problems for others', 'Creating value', 'Comfortable with uncertainty'],
    8: ['Designing processes', 'Thinking in systems', 'Automating outcomes'],
    9: ['Building platforms', 'Enabling others', 'Multi-project management'],
    10: ['Creating ecosystems', 'Shaping culture', 'Long-term thinking'],
    11: ['Integrating domains', 'Synthesizing ideas', 'Multi-decade planning'],
    12: ['Building for generations', 'Institutionalizing wisdom', 'Legacy thinking'],
  }
  return behaviors[level] || []
}

/**
 * Get stage info
 */
export interface StageInfo {
  name: string
  description: string
  levelRange: [number, number]
}

const STAGE_INFO: Record<CapabilityStage, StageInfo> = {
  foundation: {
    name: 'Foundation',
    description: 'Building basic habits and self-awareness',
    levelRange: [0, 3],
  },
  operator: {
    name: 'Operator',
    description: 'Reliable execution and self-management',
    levelRange: [4, 6],
  },
  creator: {
    name: 'Creator',
    description: 'Building systems and creating value',
    levelRange: [7, 9],
  },
  architect: {
    name: 'Architect',
    description: 'Designing platforms and institutions',
    levelRange: [10, 12],
  },
}

export function getStageInfo(stage: CapabilityStage): StageInfo {
  return STAGE_INFO[stage]
}

/**
 * Get next level info for progression
 */
export function getNextLevelInfo(currentLevel: number): CapabilityLevel | undefined {
  if (currentLevel >= 12) return undefined
  return getLevelInfo(currentLevel + 1)
}
