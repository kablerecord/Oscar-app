import OpenAI from 'openai'
import type { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * Groq Provider
 *
 * Uses OpenAI-compatible API with Groq's ultra-fast inference.
 * Available models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
 */
export class GroqProvider implements AIProvider {
  name = 'groq'
  private client: OpenAI
  private model: string

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
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
      console.error('Groq API error:', error)
      throw new Error(`Groq generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      console.error('Groq streaming error:', error)
      throw new Error(`Groq streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
