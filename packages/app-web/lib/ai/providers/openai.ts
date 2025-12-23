import OpenAI from 'openai'
import type { AIProvider, AIProviderConfig, AIGenerateOptions, AIMessage } from '../types'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private client: OpenAI
  private model: string

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    })
    this.model = config.model
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.7,
        stream: false,
      })

      return response.choices[0]?.message?.content ?? ''
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(options: AIGenerateOptions): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: options.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.7,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('OpenAI streaming error:', error)
      throw new Error(`OpenAI streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
