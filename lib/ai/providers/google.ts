import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

export class GoogleProvider implements AIProvider {
  name = 'google'
  private client: GoogleGenerativeAI
  private model: string

  constructor(config: AIProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey)
    this.model = config.model
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model })

      // Extract system prompt if present
      const systemMessages = options.messages.filter((m) => m.role === 'system')
      const conversationMessages = options.messages.filter((m) => m.role !== 'system')
      const systemPrompt = systemMessages.map((m) => m.content).join('\n\n')

      // Build chat history for Gemini format
      const history = conversationMessages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Get the last message as the current prompt
      const lastMessage = conversationMessages[conversationMessages.length - 1]
      const currentPrompt = systemPrompt
        ? `${systemPrompt}\n\n${lastMessage.content}`
        : lastMessage.content

      // Start chat with history
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
        },
      })

      const result = await chat.sendMessage(currentPrompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Google AI error:', error)
      throw new Error(`Google generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(options: AIGenerateOptions): AsyncIterable<string> {
    try {
      const model = this.client.getGenerativeModel({ model: this.model })

      // Extract system prompt if present
      const systemMessages = options.messages.filter((m) => m.role === 'system')
      const conversationMessages = options.messages.filter((m) => m.role !== 'system')
      const systemPrompt = systemMessages.map((m) => m.content).join('\n\n')

      // Build chat history for Gemini format
      const history = conversationMessages.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Get the last message as the current prompt
      const lastMessage = conversationMessages[conversationMessages.length - 1]
      const currentPrompt = systemPrompt
        ? `${systemPrompt}\n\n${lastMessage.content}`
        : lastMessage.content

      // Start chat with history
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
        },
      })

      const result = await chat.sendMessageStream(currentPrompt)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          yield text
        }
      }
    } catch (error) {
      console.error('Google AI streaming error:', error)
      throw new Error(`Google streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
