/**
 * User Settings Service
 *
 * Manages user preferences stored in the UserSetting table.
 * Provides typed access to settings with defaults.
 */

import { prisma } from '@/lib/db/prisma'

// Available setting keys
export type SettingKey =
  | 'synthesizer_model'     // Which AI model synthesizes OSQR's responses
  | 'panel_composition'     // Custom panel agent configuration
  | 'response_style'        // concise | detailed | balanced
  | 'default_mode'          // quick | thoughtful | contemplate
  | 'theme'                 // light | dark | system
  | 'notifications'         // notification preferences

// Default values for all settings
export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  synthesizer_model: 'claude-opus-4-20250514', // Opus 4 - best reasoning for OSQR's voice
  panel_composition: {
    strategic: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    technical: { provider: 'openai', model: 'gpt-4o' },
    creative: { provider: 'anthropic', model: 'claude-opus-4-20250514' },
    practical: { provider: 'openai', model: 'gpt-4o' },
  },
  response_style: 'balanced',
  default_mode: 'thoughtful',
  theme: 'dark',
  notifications: { email: true, inApp: true },
}

// Synthesizer model options
export const SYNTHESIZER_OPTIONS = [
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4', provider: 'anthropic', description: 'Best reasoning, deepest insights (Default)' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic', description: 'Warm, nuanced, thoughtful' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai', description: 'Fast, precise, analytical' },
] as const

export type SynthesizerModel = typeof SYNTHESIZER_OPTIONS[number]['value']

/**
 * Get a single setting for a user
 */
export async function getUserSetting<T = unknown>(
  userId: string,
  key: SettingKey
): Promise<T> {
  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: { userId, key },
    },
  })

  if (!setting) {
    return SETTING_DEFAULTS[key] as T
  }

  return setting.value as T
}

/**
 * Get all settings for a user
 */
export async function getAllUserSettings(userId: string): Promise<Record<SettingKey, unknown>> {
  const settings = await prisma.userSetting.findMany({
    where: { userId },
  })

  // Start with defaults, then overlay user settings
  const result = { ...SETTING_DEFAULTS }
  for (const setting of settings) {
    if (setting.key in SETTING_DEFAULTS) {
      result[setting.key as SettingKey] = setting.value
    }
  }

  return result
}

/**
 * Set a single setting for a user
 */
export async function setUserSetting(
  userId: string,
  key: SettingKey,
  value: unknown
): Promise<void> {
  await prisma.userSetting.upsert({
    where: {
      userId_key: { userId, key },
    },
    update: { value: value as object },
    create: {
      userId,
      key,
      value: value as object,
    },
  })
}

/**
 * Set multiple settings at once
 */
export async function setUserSettings(
  userId: string,
  settings: Partial<Record<SettingKey, unknown>>
): Promise<void> {
  const operations = Object.entries(settings).map(([key, value]) =>
    prisma.userSetting.upsert({
      where: {
        userId_key: { userId, key },
      },
      update: { value: value as object },
      create: {
        userId,
        key,
        value: value as object,
      },
    })
  )

  await prisma.$transaction(operations)
}

/**
 * Delete a setting (revert to default)
 */
export async function deleteUserSetting(
  userId: string,
  key: SettingKey
): Promise<void> {
  await prisma.userSetting.delete({
    where: {
      userId_key: { userId, key },
    },
  }).catch(() => {
    // Ignore if setting doesn't exist
  })
}

/**
 * Get the user's preferred synthesizer model config
 * Returns provider + model for use with ProviderRegistry
 */
export async function getSynthesizerConfig(userId: string): Promise<{
  provider: 'anthropic' | 'openai'
  model: string
}> {
  const modelId = await getUserSetting<string>(userId, 'synthesizer_model')

  const option = SYNTHESIZER_OPTIONS.find(o => o.value === modelId)
  if (option) {
    return {
      provider: option.provider,
      model: option.value,
    }
  }

  // Fallback to Opus 4
  return {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
  }
}
