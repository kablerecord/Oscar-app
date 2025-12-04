import { ProviderRegistry } from './providers'
import type { AIMessage, ProviderType } from './types'

export interface PanelAgent {
  id: string
  name: string
  provider: ProviderType
  modelName: string
  systemPrompt: string
}

export interface PanelRequest {
  userMessage: string
  agents: PanelAgent[]
  context?: string // RAG context or additional context
  previousMessages?: AIMessage[] // For roundtable mode
}

export interface PanelResponse {
  agentId: string
  content: string
  error?: string
}

/**
 * Panel orchestration - manages multi-agent conversations
 */
export class PanelOrchestrator {
  /**
   * Get responses from multiple agents in parallel
   */
  static async askPanel(request: PanelRequest): Promise<PanelResponse[]> {
    const { userMessage, agents, context } = request

    // Call all agents in parallel
    const promises = agents.map(async (agent) => {
      try {
        const provider = ProviderRegistry.getProvider(agent.provider, {
          apiKey: this.getApiKey(agent.provider),
          model: agent.modelName,
        })

        // Build messages
        const messages: AIMessage[] = []

        // Add system prompt (includes agent persona + optional context)
        const systemContent = context
          ? `${agent.systemPrompt}

IMPORTANT - Knowledge Base Context:
The following is retrieved from the user's personal knowledge base. This is information about THEIR specific situation, projects, and history. Use this context as the PRIMARY source for your response. Reference specific details from this context rather than giving generic advice.

--- KNOWLEDGE BASE ---
${context}
--- END KNOWLEDGE BASE ---

Base your response primarily on the knowledge base context above. If the context contains specific information relevant to the question, reference it directly.`
          : agent.systemPrompt

        messages.push({
          role: 'system',
          content: systemContent,
        })

        // Add user message
        messages.push({
          role: 'user',
          content: userMessage,
        })

        // Generate response
        const content = await provider.generate({ messages })

        return {
          agentId: agent.id,
          content,
        }
      } catch (error) {
        console.error(`Error with agent ${agent.name}:`, error)
        return {
          agentId: agent.id,
          content: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    return Promise.all(promises)
  }

  /**
   * Roundtable mode - agents react to each other's responses
   */
  static async roundtable(
    request: PanelRequest,
    initialResponses: PanelResponse[]
  ): Promise<PanelResponse[]> {
    const { userMessage, agents, context } = request

    // Build a summary of other agents' responses for each agent
    const responseSummary = initialResponses
      .map((r) => {
        const agent = agents.find((a) => a.id === r.agentId)
        return `${agent?.name}: ${r.content}`
      })
      .join('\n\n---\n\n')

    // Call all agents again with context from other responses
    const promises = agents.map(async (agent) => {
      try {
        const provider = ProviderRegistry.getProvider(agent.provider, {
          apiKey: this.getApiKey(agent.provider),
          model: agent.modelName,
        })

        // Build messages for roundtable
        const messages: AIMessage[] = []

        // System prompt
        const systemContent = context
          ? `${agent.systemPrompt}

IMPORTANT - Knowledge Base Context:
The following is retrieved from the user's personal knowledge base. This is information about THEIR specific situation, projects, and history. Reference specific details from this context.

--- KNOWLEDGE BASE ---
${context}
--- END KNOWLEDGE BASE ---`
          : agent.systemPrompt

        messages.push({
          role: 'system',
          content: systemContent,
        })

        // Original user message
        messages.push({
          role: 'user',
          content: userMessage,
        })

        // Agent's initial response
        const initialResponse = initialResponses.find((r) => r.agentId === agent.id)
        if (initialResponse) {
          messages.push({
            role: 'assistant',
            content: initialResponse.content,
          })
        }

        // Add other agents' responses as context
        messages.push({
          role: 'user',
          content: `The other panel members have also responded. Here are their thoughts:\n\n${responseSummary}\n\nPlease provide your reaction, commentary, or additional insights. Feel free to agree, disagree, or build upon what others have said.`,
        })

        // Generate roundtable response
        const content = await provider.generate({ messages })

        return {
          agentId: agent.id,
          content,
        }
      } catch (error) {
        console.error(`Error with agent ${agent.name} in roundtable:`, error)
        return {
          agentId: agent.id,
          content: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })

    return Promise.all(promises)
  }

  /**
   * Get API key from environment variables
   */
  private static getApiKey(provider: ProviderType): string {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || ''
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || ''
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }
}
