/**
 * Global Cache Seeding (Phase 8)
 *
 * Seeds the answer cache with OSQR-specific questions that every user asks.
 * These are pre-computed answers to reduce latency and token cost.
 *
 * Run this script once during deployment, then monitor hit rates.
 * Review at V1.9 checkpoint to adjust based on actual usage.
 *
 * @see docs/builds/DEPTH_AWARE_INTELLIGENCE_BUILD.md
 */

import { prisma } from '../db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '../ai/embeddings'
import { createHash } from 'crypto'

// =============================================================================
// TYPES
// =============================================================================

interface GlobalQuestion {
  question: string
  answer: string
  category: string
  tier: 1 | 2 | 3
}

// =============================================================================
// GLOBAL QUESTIONS (25 Core Questions)
// =============================================================================

const GLOBAL_QUESTIONS: GlobalQuestion[] = [
  // Tier 1: Core Product (Seed First)
  {
    tier: 1,
    category: 'Identity',
    question: 'What is OSQR?',
    answer: `OSQR (Operating System for Quantum Reasoning) is an AI mentorship platform that orchestrates multiple AI models to give you richer, more thoughtful answers than any single AI can provide.

Unlike ChatGPT or Claude used alone, OSQR routes your questions to the best model for the task, synthesizes perspectives from multiple AIs, and remembers what works for you over time. Think of it as having a council of AI advisors working together on your behalf.

Key capabilities:
- **Multi-model synthesis**: Thoughtful and Council modes consult multiple AI models
- **Personal Knowledge Vault**: Upload your documents for personalized answers
- **Adaptive mentorship**: OSQR learns your preferences and adapts its approach
- **Four thinking modes**: Quick, Thoughtful, Contemplate, and Council for different needs`,
  },
  {
    tier: 1,
    category: 'Capabilities',
    question: 'What can you help me with?',
    answer: `I can help you with a wide range of thinking and reasoning tasks:

**Strategic Thinking**
- Making difficult decisions with multiple factors
- Analyzing complex situations from different angles
- Thinking through consequences and implications

**Creative Work**
- Writing, editing, and refining ideas
- Brainstorming and exploring possibilities
- Developing concepts and strategies

**Learning & Research**
- Understanding complex topics
- Synthesizing information from your documents
- Exploring questions you're wrestling with

**Personal Development**
- Clarifying goals and priorities
- Working through challenges
- Developing frameworks for thinking

The more context you give me (through conversation or your Knowledge Vault), the more personalized and useful my help becomes.`,
  },
  {
    tier: 1,
    category: 'Differentiation',
    question: 'How is OSQR different from ChatGPT?',
    answer: `OSQR and ChatGPT serve different purposes:

**ChatGPT**: One AI model answering questions directly. Fast, capable, but limited to a single perspective.

**OSQR**: An orchestration layer that coordinates multiple AI models (including GPT-4) to give you richer answers.

Key differences:
1. **Multi-model synthesis**: Thoughtful mode consults 3+ AI models and synthesizes their perspectives
2. **Personal Knowledge Vault**: Upload your documents for personalized answers grounded in your context
3. **Adaptive mentorship**: OSQR learns how you think and adapts over time
4. **Depth control**: Choose your thinking mode based on how important the question is

Think of ChatGPT as talking to one advisor. OSQR is like having a council of advisors who confer before giving you a considered answer.`,
  },
  {
    tier: 1,
    category: 'Modes',
    question: 'What are the different modes?',
    answer: `OSQR has four thinking modes, each designed for different needs:

**Quick Mode** ⚡ (2-8 seconds)
Fast answers for simple questions. Uses one AI model. Perfect for factual queries or when you need speed.

**Thoughtful Mode** 💭 (20-40 seconds)
Consults 3 diverse AI models, then synthesizes their perspectives. Best for important decisions or complex questions.

**Contemplate Mode** 🧘 (60-90 seconds)
Deep thinking with 4 models plus roundtable discussion. For life decisions, strategy, or when you really need to think something through.

**Council Mode** 👥 (90-120 seconds)
Full council deliberation with structured debate. Reserved for your most important questions. Includes dissenting views and minority opinions.

Choose your mode based on how important the question is. Most questions work great in Thoughtful mode.`,
  },
  {
    tier: 1,
    category: 'Modes',
    question: "What's the difference between Quick and Thoughtful?",
    answer: `**Quick Mode** ⚡
- Uses a single AI model (Claude Sonnet)
- Response in 2-8 seconds
- Best for: Factual questions, simple tasks, when speed matters
- Example: "What year was the Eiffel Tower built?"

**Thoughtful Mode** 💭
- Consults 3 different AI models in parallel
- Synthesizes their perspectives into one answer
- Response in 20-40 seconds
- Best for: Important decisions, complex questions, when you want depth
- Example: "Should I accept this job offer? Here's my situation..."

The trade-off is speed vs. depth. Quick gives you a fast, good answer. Thoughtful gives you a considered answer that incorporates multiple AI perspectives.

Most users use Thoughtful as their default for anything that matters.`,
  },
  {
    tier: 1,
    category: 'Modes',
    question: 'What is Contemplate mode?',
    answer: `**Contemplate Mode** 🧘 is for deep thinking on important questions.

How it works:
1. Your question goes to 4 different AI models
2. Each model provides its perspective
3. Models engage in a roundtable discussion (2 rounds)
4. A synthesis model integrates everything into a final answer

Takes 60-90 seconds, but gives you:
- Multiple perspectives explored thoroughly
- Points of agreement and disagreement identified
- Deeper reasoning than any single model can provide
- Cited sources from your Knowledge Vault (if relevant)

Best for:
- Life decisions (career changes, relationships, big moves)
- Strategic planning
- Complex personal situations
- Questions you've been wrestling with

Save this mode for questions that really matter. It uses more resources but delivers proportionally deeper insight.`,
  },
  {
    tier: 1,
    category: 'Modes',
    question: 'What is Council mode?',
    answer: `**Council Mode** 👥 is OSQR's most thorough thinking mode, reserved for your most important questions.

How it works:
1. 5+ AI models receive your question
2. Each deliberates independently
3. Models engage in structured debate
4. Dissenting views are explicitly preserved
5. A synthesis model creates the final answer with minority opinions included

Takes 90-120 seconds and delivers:
- The most comprehensive analysis possible
- Explicit areas of disagreement between models
- Minority opinions that might be important
- Full reasoning chain visible
- All relevant documents from your vault included

Best for:
- Major life decisions
- High-stakes business strategy
- When you need to see all sides of an issue
- Questions where being wrong is costly

Council mode costs more in tokens but gives you the deepest thinking OSQR can provide.`,
  },
  {
    tier: 1,
    category: 'PKV',
    question: 'How do I upload documents?',
    answer: `To upload documents to your Personal Knowledge Vault:

1. Click the **Vault** icon in the sidebar (📁)
2. Click **Upload** or drag files into the upload area
3. Wait for processing (OSQR indexes and summarizes automatically)
4. Your documents are now available for personalized answers

**Supported formats**: PDF, Word (.docx), text files, markdown

**What happens after upload**:
- OSQR creates searchable chunks from your document
- Generates a summary and topic tags
- Indexes for semantic search
- Makes content available for relevant questions

**Tips**:
- Upload documents related to projects or decisions you're working on
- The more context you provide, the more personalized answers become
- You can organize documents into folders
- Delete anytime—your data stays under your control`,
  },
  {
    tier: 1,
    category: 'PKV',
    question: 'What is my vault / knowledge vault?',
    answer: `Your **Personal Knowledge Vault (PKV)** is your private document library that OSQR can reference to give you personalized answers.

**What it is**:
- A secure place to store documents relevant to your life and work
- Automatically indexed and searchable
- Only accessible to you—never shared with other users

**How it helps**:
When you ask a question, OSQR checks if any of your documents are relevant. If so, it incorporates that context into its answer.

Example: If you upload your resume and ask "What should I highlight in my cover letter?", OSQR can reference your actual experience.

**What to upload**:
- Project documents and notes
- Strategy docs and plans
- Personal writing and reflections
- Research materials
- Anything you want OSQR to know about

Your vault makes OSQR's answers truly personalized to your situation.`,
  },
  {
    tier: 1,
    category: 'PKV',
    question: 'Can you search my documents?',
    answer: `Yes! OSQR can search your Personal Knowledge Vault to find relevant information.

**How it works**:
- In Thoughtful, Contemplate, and Council modes, OSQR automatically checks if your documents are relevant to your question
- If relevant documents exist, I'll either:
  - Search them automatically (Contemplate/Council)
  - Ask if you'd like me to search them (Thoughtful)

**You can also explicitly ask**:
- "What do my documents say about X?"
- "Search my vault for Y"
- "Review my notes on Z"

**In Quick mode**:
Document search is skipped for speed. Use Thoughtful or higher if you want vault-informed answers.

**Privacy note**:
Your documents are never shared with other users. Search results only include your own uploads.`,
  },

  // Tier 2: Account & Pricing
  {
    tier: 2,
    category: 'Pricing',
    question: "What's included in Pro?",
    answer: `**Pro Plan** - $99/month (or $79/month billed yearly)

Includes:
- **Unlimited Quick mode** queries
- **200 Thoughtful mode** queries per month
- **20 Contemplate mode** queries per month
- **5GB Knowledge Vault** storage
- **Priority support**

Best for: Regular users who want deeper thinking capabilities without needing Council mode.

**Founder pricing**: Early users (first 500) lock in current rates forever, even as prices increase.

Pro gives you the full OSQR experience for most use cases. Upgrade to Master if you need Council mode or more Contemplate queries.`,
  },
  {
    tier: 2,
    category: 'Pricing',
    question: "What's included in Master?",
    answer: `**Master Plan** - $249/month (or $199/month billed yearly)

Includes:
- **Unlimited Quick mode** queries
- **Unlimited Thoughtful mode** queries
- **100 Contemplate mode** queries per month
- **20 Council mode** queries per month
- **20GB Knowledge Vault** storage
- **Priority support**
- **Early access** to new features

Best for: Power users, executives, and anyone making high-stakes decisions regularly.

**Founder pricing**: Early users (first 500) lock in current rates forever.

Master unlocks the full depth of OSQR, including Council mode for your most important questions.`,
  },
  {
    tier: 2,
    category: 'Account',
    question: 'How do I upgrade my plan?',
    answer: `To upgrade your plan:

1. Go to **Settings** (gear icon) or click your profile
2. Select **Subscription** or **Billing**
3. Choose your new plan (Pro or Master)
4. Complete payment through Stripe

**What happens when you upgrade**:
- New limits take effect immediately
- You're charged the prorated difference for the current billing period
- Higher mode access unlocks instantly

**Founder pricing**:
If you're in the first 500 paid users, you lock in current rates forever—even when we raise prices later.

Need help? Reach out through the feedback option or email support.`,
  },
  {
    tier: 2,
    category: 'Pricing',
    question: 'Is there a free trial?',
    answer: `Currently, OSQR offers a **limited free tier** rather than a time-limited trial:

**Free includes**:
- 10 Quick mode queries per day
- 3 Thoughtful mode queries per week
- Basic vault storage (100MB)

This lets you experience OSQR before committing, without the pressure of a trial deadline.

**Why no traditional trial?**
OSQR's value grows over time as it learns your preferences and you build your Knowledge Vault. A 7-day trial doesn't show the full picture.

The free tier lets you test the core experience. When you're ready for deeper thinking and more queries, upgrade to Pro or Master.

**Founder pricing**: Early paid users (first 500) lock in current rates forever.`,
  },
  {
    tier: 2,
    category: 'Pricing',
    question: 'What is founder pricing?',
    answer: `**Founder pricing** is our way of rewarding early believers in OSQR.

**How it works**:
- The first 500 paid users get current prices locked in forever
- When we raise prices (planned: $149 for Pro, $349 for Master), founders keep their original rate
- Applies as long as you maintain an active subscription

**Current founder prices**:
- Pro: $99/month (future: $149)
- Master: $249/month (future: $349)

**Why we do this**:
Early users take a bet on us. We want to reward that trust with permanent savings.

**How to get it**:
Simply subscribe while spots remain. You'll be automatically marked as a founder.

Check the pricing page to see how many founder spots are left.`,
  },
  {
    tier: 2,
    category: 'Account',
    question: 'How do I cancel my subscription?',
    answer: `To cancel your subscription:

1. Go to **Settings** → **Subscription** or **Billing**
2. Click **Manage Subscription**
3. Select **Cancel Subscription**
4. Confirm cancellation

**What happens when you cancel**:
- You keep access until the end of your current billing period
- Your Knowledge Vault documents are preserved for 30 days
- After 30 days, documents are permanently deleted
- You can resubscribe anytime

**Before you cancel**:
If there's something we could do better, we'd love to hear from you. Use the feedback option to let us know.

**Note**: If you have founder pricing and cancel, you may lose your locked-in rate if you resubscribe later.`,
  },
  {
    tier: 2,
    category: 'Privacy',
    question: 'Is my data private?',
    answer: `Yes, your data privacy is fundamental to OSQR.

**Your conversations**:
- Stored encrypted and only accessible to you
- Never used to train AI models
- Never shared with other users
- Deleted when you delete them

**Your Knowledge Vault**:
- Your documents are yours alone
- Encrypted at rest and in transit
- Never accessible to other users
- Never used for anything except answering YOUR questions

**What we collect**:
- Usage patterns (which modes you use, session length) for improving the product
- Anonymized, aggregated analytics
- You can opt out of analytics in settings

**What we never do**:
- Sell your data
- Share your content with third parties
- Use your documents to train models
- Access your vault without your explicit action

Your privacy is not just a feature—it's a foundational principle.`,
  },

  // Tier 3: Features & Usage
  {
    tier: 3,
    category: 'Usage',
    question: 'How do I start a new conversation?',
    answer: `To start a new conversation:

**Option 1**: Click the **New Chat** button (+ icon) in the sidebar

**Option 2**: Use the keyboard shortcut:
- Mac: ⌘ + N
- Windows: Ctrl + N

**Option 3**: Just type in the input box if you're on the home screen

**Tips**:
- Each conversation maintains its own context
- You can have multiple conversations going
- Conversations are saved automatically
- Use descriptive first messages to help you find conversations later

**Continuing previous conversations**:
Click any conversation in the sidebar to continue where you left off. OSQR remembers the full context.`,
  },
  {
    tier: 3,
    category: 'Memory',
    question: 'Can you remember things about me?',
    answer: `Yes! OSQR builds a User Intelligence Profile (UIP) that helps personalize your experience over time.

**What I remember**:
- Your communication preferences (detail level, tone)
- Topics you frequently discuss
- Decision-making patterns
- Expertise areas and knowledge gaps
- What approaches work well for you

**How it works**:
- I learn from our conversations naturally
- No explicit "save this" needed
- Insights improve over time

**You control it**:
- View what I've learned: Settings → User Profile
- Delete specific insights anytime
- Clear all learned preferences if you prefer a fresh start
- Choose your privacy tier (how much learning happens)

**Explicit memory**:
You can also tell me directly: "Remember that I prefer detailed explanations" or "Remember I'm working on Project X"

This isn't just conversation history—it's adaptive mentorship that gets better at helping you specifically.`,
  },
  {
    tier: 3,
    category: 'Framework',
    question: 'What is the capability ladder?',
    answer: `The **Capability Ladder** is a framework for understanding what OSQR can do at different levels.

**Level 1: Retrieve** (Current)
- Access and synthesize information
- Search your Knowledge Vault
- Provide analysis and recommendations

**Level 2: Reason** (Current)
- Multi-model synthesis
- Complex problem decomposition
- Strategic thinking across domains

**Level 3: Render** (V1.5)
- Generate images and visualizations
- Create charts from your data
- Produce visible artifacts

**Level 4: Execute** (Future)
- Take actions on your behalf
- Integrate with external tools
- Automate workflows

Each level builds on the previous. We're expanding capabilities thoughtfully, with consent gates at each level to ensure you're always in control.

Currently, OSQR operates primarily at Levels 1-2, with Level 3 (Render) rolling out now.`,
  },
  {
    tier: 3,
    category: 'Support',
    question: 'How do I give feedback?',
    answer: `We love feedback! Here's how to share:

**In-app feedback**:
- Click the **Feedback** button (usually in the bottom corner or menu)
- Rate responses with 👍 or 👎
- Add comments to explain your rating

**Feature requests or bugs**:
- Use the feedback form to describe what you'd like or what went wrong
- Include as much detail as possible
- Screenshots help if something looks wrong

**What happens with feedback**:
- Every piece of feedback is read by the team
- Common requests influence our roadmap
- Bug reports are prioritized for fixes

**Response ratings** help us understand:
- Which answers were helpful
- Where OSQR could do better
- What topics need improvement

Your feedback directly shapes how OSQR evolves. Thank you for taking the time to share it.`,
  },
  {
    tier: 3,
    category: 'Features',
    question: 'Can you generate images?',
    answer: `Yes! OSQR can generate images using DALL-E 3.

**How to request an image**:
- "Generate an image of..."
- "Create a visual showing..."
- "Draw me a..."
- Use /render command

**What happens**:
1. I'll confirm what you want and start generating
2. When ready, I'll ask "Would you like to see it?"
3. You confirm, and the image appears
4. You can request refinements: "Make it more colorful"

**Best for**:
- Concept visualization
- Creative exploration
- Visual brainstorming
- Illustrations for ideas

**Limitations**:
- No photorealistic faces of real people
- May take 15-30 seconds to generate
- Counted toward your tier's limits

Image generation is part of OSQR's "Render" capability—turning ideas into visible artifacts.`,
  },
  {
    tier: 3,
    category: 'Features',
    question: 'Can you search the web?',
    answer: `OSQR has web search capabilities for finding current information.

**When web search is used**:
- Questions about recent events
- Requests for current data
- When you explicitly ask: "Search the web for..."

**How it works**:
- OSQR searches relevant sources
- Synthesizes findings into your answer
- Cites sources so you can verify

**Note**:
By default, OSQR prefers to reason from its training knowledge and your vault documents. Web search is triggered when:
- Information is clearly time-sensitive
- You explicitly request current data
- Your vault doesn't have relevant context

**Privacy**:
Web searches are made on your behalf. Your personal data isn't included in search queries.

For most questions, OSQR's knowledge and your vault provide better, more contextual answers than web search.`,
  },
  {
    tier: 3,
    category: 'Technical',
    question: 'What AI models do you use?',
    answer: `OSQR orchestrates multiple leading AI models:

**Primary Models**:
- **Claude** (Anthropic): Opus 4, Sonnet 4, Haiku - Known for reasoning and nuance
- **GPT-4o** (OpenAI): Strong general capability
- **Gemini** (Google): Good at synthesis and analysis
- **Grok** (xAI): Different perspective, sometimes contrarian

**How models are selected**:
- **Quick mode**: Claude Sonnet (fast, capable)
- **Thoughtful**: 3 models selected for diversity
- **Contemplate**: 4 models + roundtable
- **Council**: 5+ models with structured debate

**Why multiple models?**
Different models have different strengths and biases. By synthesizing multiple perspectives, OSQR gives you richer answers than any single model.

**Transparency**:
In higher modes, you can see which models contributed to your answer in the response metadata.`,
  },
  {
    tier: 3,
    category: 'Data',
    question: 'How do I export my conversations?',
    answer: `To export your conversations:

1. Go to **Settings** → **Data**
2. Select **Export Conversations**
3. Choose format (JSON or Markdown)
4. Select which conversations to export (all or specific ones)
5. Click **Export** and download your file

**What's included**:
- All messages (yours and OSQR's)
- Timestamps
- Mode used for each response
- Metadata (if JSON format)

**Your Knowledge Vault**:
Documents can be downloaded individually from the Vault interface, or exported in bulk from Settings → Data.

**Why export?**
- Keep a personal backup
- Move to another tool
- Review past conversations
- Data portability is your right

OSQR believes your data belongs to you. Export anytime, no questions asked.`,
  },
]

// =============================================================================
// SEEDING FUNCTIONS
// =============================================================================

/**
 * Hash a question for exact-match lookup
 */
function hashQuestion(question: string): string {
  const normalized = question.toLowerCase().trim()
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Seed a single global cache entry
 */
async function seedQuestion(entry: GlobalQuestion): Promise<string | null> {
  try {
    const questionHash = hashQuestion(entry.question)

    // Check if already exists
    const existing = await prisma.answerCache.findFirst({
      where: {
        scope: 'GLOBAL',
        questionHash,
      },
    })

    if (existing) {
      console.log(`[GlobalCache] Skipping (exists): ${entry.question.slice(0, 40)}...`)
      return existing.id
    }

    // Generate embedding for similar-match
    const embedding = await generateEmbedding(entry.question)
    const embeddingStr = formatEmbeddingForPostgres(embedding)

    // Insert new entry
    const result = await prisma.$executeRaw`
      INSERT INTO "AnswerCache" (
        "id",
        "scope",
        "questionHash",
        "questionText",
        "questionEmbedding",
        "answerText",
        "confidenceScore",
        "createdAt",
        "lastUsedAt",
        "lastValidatedAt",
        "isValid",
        "hitCount"
      ) VALUES (
        ${`global_${questionHash.slice(0, 16)}`},
        'GLOBAL'::"AnswerCacheScope",
        ${questionHash},
        ${entry.question},
        ${embeddingStr}::vector,
        ${entry.answer},
        1.0,
        NOW(),
        NOW(),
        NOW(),
        true,
        0
      )
    `

    console.log(`[GlobalCache] Seeded: ${entry.question.slice(0, 40)}...`)
    return `global_${questionHash.slice(0, 16)}`
  } catch (error) {
    console.error(`[GlobalCache] Failed to seed: ${entry.question.slice(0, 40)}...`, error)
    return null
  }
}

/**
 * Seed all global cache questions
 */
export async function seedGlobalCache(): Promise<{
  seeded: number
  skipped: number
  failed: number
  total: number
}> {
  console.log('[GlobalCache] Starting global cache seeding...')

  const results = {
    seeded: 0,
    skipped: 0,
    failed: 0,
    total: GLOBAL_QUESTIONS.length,
  }

  // Seed Tier 1 first (most important)
  const tier1 = GLOBAL_QUESTIONS.filter(q => q.tier === 1)
  const tier2 = GLOBAL_QUESTIONS.filter(q => q.tier === 2)
  const tier3 = GLOBAL_QUESTIONS.filter(q => q.tier === 3)

  for (const tier of [tier1, tier2, tier3]) {
    for (const question of tier) {
      const id = await seedQuestion(question)
      if (id) {
        // Check if it was newly seeded or already existed
        const entry = await prisma.answerCache.findUnique({
          where: { id },
          select: { hitCount: true },
        })
        if (entry && entry.hitCount === 0) {
          results.seeded++
        } else {
          results.skipped++
        }
      } else {
        results.failed++
      }
    }
  }

  console.log(`[GlobalCache] Seeding complete:`)
  console.log(`  - Seeded: ${results.seeded}`)
  console.log(`  - Skipped (existed): ${results.skipped}`)
  console.log(`  - Failed: ${results.failed}`)
  console.log(`  - Total: ${results.total}`)

  return results
}

/**
 * Get global cache statistics
 */
export async function getGlobalCacheStats(): Promise<{
  totalEntries: number
  totalHits: number
  avgHitCount: number
  topQuestions: Array<{ question: string; hits: number }>
  noHitQuestions: Array<{ question: string; daysSinceCreated: number }>
}> {
  const entries = await prisma.answerCache.findMany({
    where: { scope: 'GLOBAL', isValid: true },
    select: {
      questionText: true,
      hitCount: true,
      createdAt: true,
    },
    orderBy: { hitCount: 'desc' },
  })

  const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0)
  const avgHitCount = entries.length > 0 ? totalHits / entries.length : 0

  const topQuestions = entries
    .slice(0, 10)
    .map(e => ({ question: e.questionText, hits: e.hitCount }))

  const noHitQuestions = entries
    .filter(e => e.hitCount === 0)
    .map(e => ({
      question: e.questionText,
      daysSinceCreated: Math.floor(
        (Date.now() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

  return {
    totalEntries: entries.length,
    totalHits,
    avgHitCount: Math.round(avgHitCount * 100) / 100,
    topQuestions,
    noHitQuestions,
  }
}

/**
 * Review global cache for V1.9 checkpoint
 * Returns recommendations for cache adjustments
 */
export async function reviewGlobalCache(): Promise<{
  recommendations: Array<{
    action: 'REMOVE' | 'REVISE' | 'KEEP'
    question: string
    reason: string
  }>
}> {
  const entries = await prisma.answerCache.findMany({
    where: { scope: 'GLOBAL', isValid: true },
    select: {
      questionText: true,
      hitCount: true,
      acceptanceRate: true,
      lastHitAt: true,
      createdAt: true,
    },
  })

  const recommendations: Array<{
    action: 'REMOVE' | 'REVISE' | 'KEEP'
    question: string
    reason: string
  }> = []

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  for (const entry of entries) {
    const daysSinceCreated = Math.floor(
      (now.getTime() - entry.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Eviction criteria from spec
    if (daysSinceCreated >= 30 && entry.hitCount < 5) {
      recommendations.push({
        action: 'REMOVE',
        question: entry.questionText,
        reason: `Only ${entry.hitCount} hits after 30+ days (threshold: 5)`,
      })
    } else if (entry.acceptanceRate !== null && entry.acceptanceRate < 0.5) {
      recommendations.push({
        action: 'REVISE',
        question: entry.questionText,
        reason: `Low acceptance rate: ${Math.round(entry.acceptanceRate * 100)}% (threshold: 50%)`,
      })
    } else if (!entry.lastHitAt || entry.lastHitAt < sixtyDaysAgo) {
      recommendations.push({
        action: 'REMOVE',
        question: entry.questionText,
        reason: 'No hits in 60+ days',
      })
    } else {
      recommendations.push({
        action: 'KEEP',
        question: entry.questionText,
        reason: `${entry.hitCount} hits, performing well`,
      })
    }
  }

  return { recommendations }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { GLOBAL_QUESTIONS }
