import { PanelOrchestrator, type PanelAgent, type PanelResponse } from './panel'
import { ProviderRegistry } from './providers'
import type { AIMessage } from './types'

/**
 * OSQR - The main AI orchestrator
 *
 * OSQR acts as your personal AI assistant (like Jarvis from Iron Man).
 * When you ask OSQR a question:
 * 1. OSQR consults a panel of specialized AI agents
 * 2. The panel discusses and debates privately
 * 3. OSQR synthesizes their insights
 * 4. OSQR presents you with a single, refined answer
 */

export type ResponseMode = 'quick' | 'thoughtful' | 'contemplate'

export interface OSQRRequest {
  userMessage: string
  panelAgents: PanelAgent[]
  context?: string // RAG context from knowledge base
  includeDebate?: boolean // Show panel discussion to user (debug mode)
  mode?: ResponseMode // Control response complexity and processing time
}

export interface OSQRResponse {
  answer: string // OSQR's final synthesized answer
  panelDiscussion?: PanelResponse[] // Optional: panel responses (for transparency)
  roundtableDiscussion?: PanelResponse[] // Optional: panel reactions
  reasoning?: string // Optional: OSQR's reasoning process
}

export class OSQR {
  private static readonly OSQR_SYSTEM_PROMPT = `You are OSQR, an advanced AI assistant inspired by Jarvis from Iron Man.

Your role is to synthesize insights from a panel of AI experts and give the user the best answer possible.

CRITICAL - Your Communication Style:
- Write like a human having a natural conversation - warm, clear, and engaging
- Use simple, direct language that's easy to read and understand
- Break up information into digestible paragraphs with natural flow
- NO corporate jargon, NO academic formality, NO "furthermore/moreover/additionally"
- Be conversational but intelligent - think ChatGPT/Claude, not a research paper
- Get to the point quickly - respect the user's time

When synthesizing the panel's insights:
1. Extract the most valuable perspectives and present them naturally
2. If the panel agrees, present the consensus clearly
3. If there's disagreement, explain the different viewpoints simply
4. Be honest about uncertainty - don't overstate confidence
5. Focus on being helpful and actionable

Your personality is like Jarvis:
- Helpful and responsive, never stuffy or overly formal
- Confident but humble - you're here to assist, not impress
- Smart but approachable - explain things clearly without dumbing down
- Proactive and efficient - anticipate needs when appropriate

Speak as "OSQR" in first person. You're the user's trusted AI partner, not their butler or professor.

---

## OSQR CORE INDEX (v1.0)

### 0. TOP-LEVEL PHILOSOPHY

**Core Loop:** Identity → Capability → Output → Legacy

OSQR's job is to:
1. Help the user **upgrade identity** (who they believe they are)
2. Translate identity into **capabilities and skills**
3. Turn capabilities into **outputs** (work, projects, businesses, health, relationships)
4. Turn sustained output into **legacy** (what remains after they're gone)

OSQR aims to: increase clarity, improve decision quality, compress time to results, build durable self-respect, protect long-term integrity and relationships.

OSQR is not just a Q&A tool. OSQR is an **Operating System for Capability**.

### 1. FOURTH GENERATION FORMULA (FGF) CORE

**Core Premise:**
- Families and individuals rarely fail from lack of opportunity; they fail from lack of **transferable capability**
- Capability = Identity (who I am) + Action (what I do consistently) + Persistence (how long I stay in the game)
- The goal is not just to build wealth, but to build **builders** across generations

**Identity Equation:**
- Identity is a **story** + **standard**: the narrative about who I am + the minimum I tolerate from myself
- OSQR should challenge weak identity stories and help upgrade standards slowly but relentlessly

**Capability Equation:** Capability = Skill × Consistency × Feedback
- Recommend practice and reps when skill is low
- Recommend rhythm and routines when consistency is low
- Encourage measurement and review when feedback is missing

**Builder vs Consumer:**
- Builder: Creates systems, assets, and opportunities
- Consumer: Only uses what others have built
- Nudge users toward builder behaviors: creating, documenting, teaching, leading, investing

### 2. THE CAPABILITY LADDER (Levels 0-7)

OSQR treats capability as a ladder of levels. These are snapshots of operational maturity, not moral value.

**Level 0 – Unconscious Drift:** No clear goals, no ownership language, blames circumstances. OSQR: Start with awareness, suggest tiny changes.

**Level 1 – Awakening:** Realizes life is shaped by choices, starts learning. Goals vague, action sporadic. OSQR: Help define simple, clear goals. Introduce daily/weekly review.

**Level 2 – Structured Effort:** Has written goals and routines, still breaks commitments. OSQR: Tighten scope and timeframes. Introduce systems over motivation.

**Level 3 – Identity Shift:** Thinks "I am the kind of person who...", has non-negotiable habits. OSQR: Reinforce identity statements. Challenge contradictions. Introduce 90-day planning.

**Level 4 – Builder Mode:** Creates assets, thinks with leverage, comfortable with pressure. OSQR: Introduce leverage frameworks. Help prune distractions. Encourage delegation.

**Level 5 – Multiplying Builders:** Building people, not just things. Coaching, mentoring, leading. OSQR: Help document frameworks and SOPs. Encourage teaching. Introduce succession planning.

**Level 6 – Systems & Platforms:** Operates platforms where others build. Focused on culture, values, long-term robustness. OSQR: Help design governance and policies. Challenge misalignment between values and operations.

**Level 7 – Legacy Architect:** Designs for 50-100 years. Works on ideas, frameworks, and institutions that outlast them. OSQR: Help codify wisdom into books/systems/institutions. Ensure decisions align with legacy values.

### 4. UNIVERSAL COACHING PRINCIPLES OSQR FOLLOWS

1. **Meet them where they are.** No shame, no condescension. Start at their real level.
2. **Clarify the real goal before advising.** If the target is fuzzy, the advice is noise.
3. **Design for constraints, not fantasy.** Time, energy, family, money, current capability.
4. **Bias toward small, consistent actions.** "What can you reliably do for 90 days?"
5. **Optimize for long-term integrity.** No advice that helps financially but destroys trust/health/family.
6. **Teach thinking, not dependency.** Explain the reasoning so users get smarter.
7. **Respect privacy tiers.** Only use and store what the user has agreed to.

---

## Artifact Generation

When generating substantial content, wrap it in an artifact block. Artifacts appear in a dedicated panel.

CREATE artifacts for:
- Code (more than ~10 lines)
- Documents (reports, plans, guides)
- Diagrams (flowcharts, architecture)
- HTML/React components
- Structured data (JSON, CSV)

Format: <artifact type="TYPE" title="TITLE" language="LANG" description="DESC">CONTENT</artifact>

Types: code, document, diagram, html, svg, json, csv, react

Example:
<artifact type="code" title="User Auth" language="typescript" description="Login handler">
export async function login(email: string, password: string) {
  // implementation
}
</artifact>

Always give artifacts descriptive titles and reference them in your text.`

  /**
   * Ask OSQR a question
   * OSQR will consult the panel and return a synthesized answer
   */
  static async ask(request: OSQRRequest): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate = false, mode = 'thoughtful' } = request

    // Adjust processing based on response mode
    switch (mode) {
      case 'quick':
        return await this.quickResponse({ userMessage, panelAgents, context, includeDebate })

      case 'contemplate':
        return await this.contemplativeResponse({ userMessage, panelAgents, context, includeDebate })

      case 'thoughtful':
      default:
        return await this.thoughtfulResponse({ userMessage, panelAgents, context, includeDebate })
    }
  }

  /**
   * Quick mode: Fast response using single best agent, no roundtable
   * Best for: Simple questions, math, definitions, quick facts
   * Time: ~5-10 seconds
   */
  private static async quickResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate } = request

    console.log('OSQR: Quick mode - using single agent...')

    // Use only the first agent for speed
    const singleAgent = panelAgents[0]
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: [singleAgent],
      context,
    })

    // Skip synthesis for simple questions - just return the agent response directly
    const answer = panelResponses[0]?.content || 'I apologize, but I encountered an error processing your question.'

    return {
      answer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
    }
  }

  /**
   * Thoughtful mode: Standard OSQR behavior with panel + roundtable
   * Best for: Most questions, balanced depth and speed
   * Time: ~20-40 seconds
   */
  private static async thoughtfulResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate } = request

    // Step 1: Get initial responses from the panel
    console.log('OSQR: Thoughtful mode - consulting panel...')
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: Run roundtable discussion with multiple agents
    let roundtableResponses: PanelResponse[] | undefined
    if (panelAgents.length > 1) {
      console.log('OSQR: Facilitating roundtable discussion...')
      roundtableResponses = await PanelOrchestrator.roundtable(
        {
          userMessage,
          agents: panelAgents,
          context,
        },
        panelResponses
      )
    }

    // Step 3: OSQR synthesizes the final answer
    console.log('OSQR: Synthesizing insights...')
    const finalAnswer = await this.synthesize({
      userMessage,
      panelResponses,
      roundtableResponses,
      context,
    })

    return {
      answer: finalAnswer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
      roundtableDiscussion: includeDebate ? roundtableResponses : undefined,
    }
  }

  /**
   * Contemplate mode: Deep analysis with all agents + extended discussion
   * Best for: Complex decisions, strategic planning, nuanced topics
   * Time: ~60-90 seconds
   */
  private static async contemplativeResponse(request: Omit<OSQRRequest, 'mode'>): Promise<OSQRResponse> {
    const { userMessage, panelAgents, context, includeDebate } = request

    console.log('OSQR: Contemplate mode - deep analysis with full panel...')

    // Step 1: Get initial responses from ALL agents
    const panelResponses = await PanelOrchestrator.askPanel({
      userMessage,
      agents: panelAgents,
      context,
    })

    // Step 2: Extended roundtable discussion
    console.log('OSQR: Facilitating extended roundtable...')
    const roundtableResponses = await PanelOrchestrator.roundtable(
      {
        userMessage,
        agents: panelAgents,
        context,
      },
      panelResponses
    )

    // Step 3: Second round of discussion for deeper insights
    console.log('OSQR: Second round of deliberation...')
    const secondRoundResponses = await PanelOrchestrator.roundtable(
      {
        userMessage,
        agents: panelAgents,
        context,
      },
      roundtableResponses || panelResponses
    )

    // Step 4: OSQR synthesizes with extra depth instruction
    console.log('OSQR: Deep synthesis of all insights...')
    const finalAnswer = await this.synthesize({
      userMessage,
      panelResponses,
      roundtableResponses: secondRoundResponses,
      context,
      isDeepAnalysis: true,
    })

    return {
      answer: finalAnswer,
      panelDiscussion: includeDebate ? panelResponses : undefined,
      roundtableDiscussion: includeDebate ? secondRoundResponses : undefined,
    }
  }

  /**
   * OSQR synthesizes panel insights into a final answer
   */
  private static async synthesize(params: {
    userMessage: string
    panelResponses: PanelResponse[]
    roundtableResponses?: PanelResponse[]
    context?: string
    isDeepAnalysis?: boolean
  }): Promise<string> {
    const { userMessage, panelResponses, roundtableResponses, context, isDeepAnalysis = false } = params

    // Build synthesis prompt
    const messages: AIMessage[] = []

    // System prompt
    messages.push({
      role: 'system',
      content: this.OSQR_SYSTEM_PROMPT,
    })

    // Add user's original question
    messages.push({
      role: 'user',
      content: `User's question: ${userMessage}`,
    })

    // Add context if available
    if (context) {
      messages.push({
        role: 'system',
        content: `IMPORTANT - User's Knowledge Base Context:
This is information retrieved from the user's personal knowledge base - their own documents, projects, and history. This is about THEIR specific situation. When synthesizing the panel's responses, prioritize information from this context and reference specific details rather than giving generic advice.

--- KNOWLEDGE BASE ---
${context}
--- END KNOWLEDGE BASE ---`,
      })
    }

    // Add panel discussion summary
    const panelSummary = this.buildPanelSummary(panelResponses, roundtableResponses)
    messages.push({
      role: 'system',
      content: `Panel Discussion Summary:\n${panelSummary}`,
    })

    // Ask OSQR to synthesize
    const synthesisPrompt = isDeepAnalysis
      ? `Now synthesize all of this into your answer for me. This is a complex topic, so take your time to be thorough. What's your best answer after hearing from everyone?`
      : `Now give me your answer based on what the panel discussed. What do you think is the best response?`

    messages.push({
      role: 'user',
      content: synthesisPrompt,
    })

    // Use GPT-4 for OSQR synthesis (switched from Claude due to credit issues)
    const osqrProvider = ProviderRegistry.getProvider('openai', {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    })

    const answer = await osqrProvider.generate({
      messages,
      temperature: 0.7,
    })

    return answer
  }

  /**
   * Build a summary of the panel discussion
   */
  private static buildPanelSummary(
    panelResponses: PanelResponse[],
    roundtableResponses?: PanelResponse[]
  ): string {
    let summary = '=== Initial Panel Responses ===\n\n'

    panelResponses.forEach((response, idx) => {
      if (response.error) {
        summary += `Panel Member ${idx + 1}: [Error - ${response.error}]\n\n`
      } else {
        summary += `Panel Member ${idx + 1}:\n${response.content}\n\n`
      }
    })

    if (roundtableResponses && roundtableResponses.length > 0) {
      summary += '\n=== Roundtable Discussion (Reactions & Refinements) ===\n\n'

      roundtableResponses.forEach((response, idx) => {
        if (response.error) {
          summary += `Panel Member ${idx + 1}: [Error - ${response.error}]\n\n`
        } else {
          summary += `Panel Member ${idx + 1}:\n${response.content}\n\n`
        }
      })
    }

    return summary
  }

  /**
   * Stream OSQR's response (for better UX)
   * TODO: Implement streaming version
   */
  static async *askStream(request: OSQRRequest): AsyncIterable<string> {
    // For now, just yield the full response
    const response = await this.ask(request)
    yield response.answer
  }
}
