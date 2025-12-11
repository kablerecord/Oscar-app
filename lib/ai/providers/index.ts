import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GoogleProvider } from './google'
import { XAIProvider } from './xai'
import type { AIProvider, ProviderType, AIProviderConfig } from '../types'

/**
 * Provider Registry
 * Manages AI provider instances and makes it easy to add new providers
 */
export class ProviderRegistry {
  private static providers: Map<string, AIProvider> = new Map()

  /**
   * Get or create a provider instance
   */
  static getProvider(type: ProviderType, config: AIProviderConfig): AIProvider {
    const key = `${type}:${config.model}`

    if (!this.providers.has(key)) {
      const provider = this.createProvider(type, config)
      this.providers.set(key, provider)
    }

    return this.providers.get(key)!
  }

  /**
   * Create a new provider instance
   */
  private static createProvider(type: ProviderType, config: AIProviderConfig): AIProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'google':
        return new GoogleProvider(config)
      case 'xai':
        return new XAIProvider(config)
      default:
        throw new Error(`Unknown provider type: ${type}`)
    }
  }

  /**
   * Clear all cached providers (useful for testing or key rotation)
   */
  static clearCache() {
    this.providers.clear()
  }
}

export { OpenAIProvider, AnthropicProvider, GoogleProvider, XAIProvider }
