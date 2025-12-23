import type { AIProvider, AIProviderConfig, AIGenerateOptions } from '../types'

/**
 * xAI (Grok) Provider
 *
 * xAI uses an OpenAI-compatible API, so we can use fetch with the same format.
 * API Docs: https://docs.x.ai/api
 */
export class XAIProvider implements AIProvider {
  name = 'xai'
  private apiKey: string
  private model: string
  private baseUrl = 'https://api.x.ai/v1'

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey
    this.model = config.model
  }

  async generate(options: AIGenerateOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: options.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`xAI API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content ?? ''
    } catch (error) {
      console.error('xAI API error:', error)
      throw new Error(`xAI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStream(options: AIGenerateOptions): AsyncIterable<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: options.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`xAI API error: ${response.status} - ${error}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content
              if (content) {
                yield content
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('xAI streaming error:', error)
      throw new Error(`xAI streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
