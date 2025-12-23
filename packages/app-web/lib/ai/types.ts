// Common types for AI providers

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIProviderConfig {
  apiKey: string
  model: string
}

export interface AIGenerateOptions {
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface AIProvider {
  name: string
  generate(options: AIGenerateOptions): Promise<string>
  generateStream?(options: AIGenerateOptions): AsyncIterable<string>
}

export type ProviderType = 'openai' | 'anthropic' | 'google' | 'xai' | 'groq'
