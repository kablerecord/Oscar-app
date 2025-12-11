import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import {
  routeQuestion,
  detectQuestionType,
  estimateComplexity,
  type QuestionType,
  type RoutingDecision,
} from '@/lib/ai/model-router'

const RequestSchema = z.object({
  question: z.string().min(1),
  selectedMode: z.enum(['quick', 'thoughtful', 'contemplate']),
})

const CLASSIFIER_PROMPT = `You are OSQR's question classifier. Your job is to evaluate a user's question and determine if it matches the complexity level they've selected.

CRITICAL: Be ruthless about identifying simple questions. If someone asks basic math, definitions, simple facts, or yes/no questions - these are ALWAYS score 0-2 total. Do NOT overthink or find hidden complexity where there is none.

Examples of SIMPLE questions (score 0-2, recommend "quick"):
- "What is 2+2?" "What is 2 times 2?" "2x2?" → Score 0
- "What is the capital of France?" → Score 1
- "Define photosynthesis" → Score 1
- "What color is the sky?" → Score 0
- "How do you spell 'necessary'?" → Score 0

Score the question on 4 axes (0-3 each):

1. **Clarity** (0-3)
   - 0: Extremely vague, could mean anything
   - 1: Somewhat vague, missing key details
   - 2: Mostly clear, minor gaps
   - 3: Crystal clear, specific and actionable

2. **Intent Depth** (0-3)
   - 0: Simple fact lookup, math, yes/no, definition
   - 1: Straightforward how-to or explanation
   - 2: Requires synthesis or comparison
   - 3: Requires judgment, tradeoffs, or multi-dimensional thinking

3. **Knowledge Requirement** (0-3)
   - 0: Common knowledge or basic facts
   - 1: Domain-specific but straightforward
   - 2: Requires cross-referencing or context
   - 3: Requires deep expertise or personal context

4. **Consequence Weight** (0-3)
   - 0: Trivial, no real stakes (most questions!)
   - 1: Minor decision
   - 2: Meaningful decision with some impact
   - 3: High-stakes decision with significant consequences

**Total Score Interpretation:**
- 0-3: SIMPLE → ALWAYS recommend "quick" mode
- 4-6: Medium → could benefit from refinement
- 7-12: Complex → ready for Thoughtful/Contemplate

**Mode Matching:**
- Quick mode: Best for scores 0-5
- Thoughtful mode: Best for scores 6-9
- Contemplate mode: Best for scores 9-12

If the user selected a mode that's overkill for their question, suggest Quick mode. Be direct about it.

Respond with ONLY this JSON structure:
{
  "scores": {
    "clarity": <0-3>,
    "intentDepth": <0-3>,
    "knowledgeRequirement": <0-3>,
    "consequenceWeight": <0-3>
  },
  "totalScore": <0-12>,
  "recommendation": "<quick|refine|fire>",
  "reasoning": "<1 sentence explaining the recommendation>",
  "refinedVersions": {
    "precision": "<A more specific version of the question - only if recommendation is 'refine'>",
    "bigPicture": "<A broader strategic version - only if recommendation is 'refine'>"
  }
}`

export async function POST(req: NextRequest) {
  try {
    // Check authentication (bypass in development)
    const isDev = process.env.NODE_ENV === 'development'
    const session = await getServerSession()

    if (!isDev && !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { question, selectedMode } = RequestSchema.parse(body)

    // Use Claude Haiku for fast, cheap classification
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Question: "${question}"
Selected mode: ${selectedMode}

Classify this question and provide your assessment as JSON.`,
        },
      ],
      system: CLASSIFIER_PROMPT,
    })

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from classifier')
    }

    // Parse the JSON response
    let classification
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse classifier response:', parseError)
      // Default to allowing the request through
      classification = {
        scores: { clarity: 2, intentDepth: 2, knowledgeRequirement: 2, consequenceWeight: 2 },
        totalScore: 8,
        recommendation: 'fire',
        reasoning: 'Unable to classify, proceeding with selected mode.',
        refinedVersions: null,
      }
    }

    // Apply mode-specific logic
    let finalRecommendation = classification.recommendation

    // If user selected Quick, always let them through
    if (selectedMode === 'quick') {
      finalRecommendation = 'fire'
      classification.reasoning = 'Quick mode selected - proceeding immediately.'
    }

    // AGGRESSIVE: If score is 0-3, ALWAYS recommend quick regardless of what user selected
    if (classification.totalScore <= 3) {
      finalRecommendation = 'quick'
      classification.reasoning = 'This is a simple question - answering directly.'
    }
    // If score is high enough for selected mode, fire
    else if (selectedMode === 'thoughtful' && classification.totalScore >= 6) {
      finalRecommendation = 'fire'
    }
    else if (selectedMode === 'contemplate' && classification.totalScore >= 9) {
      finalRecommendation = 'fire'
    }

    // For Contemplate with lower scores, suggest Thoughtful instead
    if (selectedMode === 'contemplate' && classification.totalScore < 9 && classification.totalScore >= 6) {
      finalRecommendation = 'suggest_thoughtful'
      classification.reasoning = `This question would get a great answer in Thoughtful mode. Contemplate mode is best for high-stakes decisions.`
    }

    // Get the model routing decision for Quick mode
    // This tells us which model to use based on question type
    const routingDecision = routeQuestion(question)

    return NextResponse.json({
      question,
      selectedMode,
      ...classification,
      recommendation: finalRecommendation,
      // New routing fields - "OSQR knows when to think"
      routing: {
        questionType: routingDecision.questionType,
        complexity: routingDecision.complexity,
        recommendedModel: routingDecision.recommendedModel,
        alternativeModels: routingDecision.alternativeModels,
        modeSuggestion: routingDecision.modeSuggestion,
        confidence: routingDecision.confidence,
        shouldSuggestAltOpinion: routingDecision.shouldSuggestAltOpinion,
      },
    })
  } catch (error) {
    console.error('OSQR classify error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
