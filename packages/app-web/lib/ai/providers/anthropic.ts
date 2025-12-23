import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIProviderConfig, AIGenerateOptions, AIMessage } from '../types'

export class AnthropicProvider implements AIProvider {
  name = 'anthropic'
  private client: Anthropic
  private model: string

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    })
    this.model = config.model
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    try {
      // Anthropic requires separating system messages from conversation messages
      const systemMessages = options.messages.filter((m) => m.role === 'system')
      const conversationMessages = options.messages.filter((m) => m.role !== 'system')

      const systemPrompt = systemMessages.map((m) => m.content).join('\n\n')

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system: systemPrompt || undefined,
        messages: conversationMessages.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
      })

      // Extract text content from response
      const textContent = response.content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('')

      return textContent
    } catch (error) {
      console.error('Anthropic API error:', error)
      throw new Error(`Anthropic generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(options: AIGenerateOptions): AsyncIterable<string> {
    try {
      const systemMessages = options.messages.filter((m) => m.role === 'system')
      const conversationMessages = options.messages.filter((m) => m.role !== 'system')

      const systemPrompt = systemMessages.map((m) => m.content).join('\n\n')

      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        system: systemPrompt || undefined,
        messages: conversationMessages.map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        })),
      })

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text
        }
      }
    } catch (error) {
      console.error('Anthropic streaming error:', error)
      throw new Error(`Anthropic streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
