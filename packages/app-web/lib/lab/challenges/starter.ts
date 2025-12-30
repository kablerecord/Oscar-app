import { ChallengeQuestion, FormSection } from '../types'

export interface StarterChallenge {
  title: string
  description: string
  category: 'INTENT_UNDERSTANDING' | 'MODE_CALIBRATION' | 'KNOWLEDGE_RETRIEVAL' | 'RESPONSE_QUALITY' | 'PERSONALIZATION' | 'CAPABILITY_GAP'
  promptToTry: string | null
  compareMode: boolean
  modesCompare: string[]
  questions: ChallengeQuestion[]
  estimatedMinutes: number
  pointsReward: number
}

export const starterChallenges: StarterChallenge[] = [
  {
    title: 'Your First Oscar Conversation',
    description: 'Have a conversation with Oscar and tell us how it felt.',
    category: 'INTENT_UNDERSTANDING',
    promptToTry:
      "Ask Oscar to help you think through a decision you're facing - could be work-related, a purchase, or any choice on your mind.",
    compareMode: false,
    modesCompare: [],
    questions: [
      {
        id: 'understood',
        type: 'rating',
        question: 'How well did Oscar understand what you were asking?',
        required: true,
      },
      {
        id: 'rephrase',
        type: 'choice',
        question: 'Did you have to rephrase your question?',
        options: [
          'No, Oscar got it first try',
          'Once',
          'Multiple times',
          "Oscar never quite got it",
        ],
        required: true,
      },
      {
        id: 'helpful',
        type: 'rating',
        question: 'How helpful was the response?',
        required: true,
      },
      {
        id: 'openFeedback',
        type: 'text',
        question: 'Anything else you noticed?',
        required: false,
      },
    ],
    estimatedMinutes: 5,
    pointsReward: 15,
  },
  {
    title: 'Compare: Quick vs Thoughtful Mode',
    description:
      'Try the same question in both modes and tell us which felt better.',
    category: 'MODE_CALIBRATION',
    promptToTry: 'What are the key differences between REST and GraphQL APIs?',
    compareMode: true,
    modesCompare: ['quick', 'thoughtful'],
    questions: [
      {
        id: 'preferred',
        type: 'comparison',
        question: 'Which response was more helpful?',
        options: [
          'Quick - fast and sufficient',
          'Thoughtful - worth the extra time',
          'About the same',
        ],
        required: true,
      },
      {
        id: 'wouldUseAgain',
        type: 'choice',
        question:
          'For this type of question, which mode would you use again?',
        options: ['Quick', 'Thoughtful', 'Depends on my mood/time'],
        required: true,
      },
      {
        id: 'thoughtfulValue',
        type: 'rating',
        question: 'Did Thoughtful mode add meaningful value over Quick?',
        required: true,
      },
      {
        id: 'notes',
        type: 'text',
        question: 'What differences did you notice?',
        required: false,
      },
    ],
    estimatedMinutes: 7,
    pointsReward: 20,
  },
  {
    title: 'Test Your Knowledge Vault',
    description:
      'Upload a document and see if Oscar can find relevant information from it.',
    category: 'KNOWLEDGE_RETRIEVAL',
    promptToTry: null,
    compareMode: false,
    modesCompare: [],
    questions: [
      {
        id: 'uploadedDoc',
        type: 'choice',
        question: 'What type of document did you upload?',
        options: [
          'Work document',
          'Personal notes',
          'Research/article',
          'Other',
        ],
        required: true,
      },
      {
        id: 'foundIt',
        type: 'choice',
        question:
          'When you asked about the document, did Oscar find the relevant information?',
        options: [
          'Yes, exactly what I expected',
          'Partially - found some but missed things',
          "No - didn't find the relevant parts",
          "Oscar didn't seem to use the document at all",
        ],
        required: true,
      },
      {
        id: 'accuracy',
        type: 'rating',
        question: 'How accurate was the information Oscar retrieved?',
        required: true,
      },
      {
        id: 'whatMissed',
        type: 'text',
        question: 'If Oscar missed something, what was it?',
        required: false,
      },
    ],
    estimatedMinutes: 10,
    pointsReward: 25,
  },
]

export interface StarterDeepDive {
  title: string
  description: string
  category: 'PERSONALIZATION'
  sections: FormSection[]
  estimatedMinutes: number
  pointsReward: number
}

export const starterDeepDives: StarterDeepDive[] = [
  {
    title: 'UIP Accuracy Review',
    description:
      "Help us understand how well Oscar knows you by reviewing its assumptions.",
    category: 'PERSONALIZATION',
    sections: [
      {
        id: 'communication',
        title: 'Communication Style',
        questions: [
          {
            id: 'style_accuracy',
            type: 'uip_accuracy',
            question: 'How accurate is this assessment?',
            context: 'Oscar thinks you prefer: [dynamically populated from UIP]',
            required: true,
          },
          {
            id: 'style_correction',
            type: 'text',
            question: 'What would be more accurate?',
            required: false,
          },
        ],
      },
      {
        id: 'expertise',
        title: 'Expertise Level',
        questions: [
          {
            id: 'expertise_accuracy',
            type: 'uip_accuracy',
            question: 'How accurate is this assessment?',
            context:
              'Oscar thinks your expertise in [primary domain] is: [level]',
            required: true,
          },
          {
            id: 'expertise_correction',
            type: 'text',
            question: 'What should Oscar know about your expertise?',
            required: false,
          },
        ],
      },
      {
        id: 'missing',
        title: "What's Missing",
        questions: [
          {
            id: 'missing_context',
            type: 'text',
            question:
              'What does Oscar NOT know about you that would help it give better responses?',
            required: true,
          },
          {
            id: 'wrong_assumptions',
            type: 'text',
            question:
              'Has Oscar made any wrong assumptions about you? What were they?',
            required: false,
          },
        ],
      },
    ],
    estimatedMinutes: 10,
    pointsReward: 50,
  },
]
