'use client'

import { useState, useCallback, useEffect } from 'react'
import type { CapabilityType } from '@/components/oscar/CapabilityBar'

// Storage key for capability preferences
const STORAGE_KEY = 'osqr-capability-prefs'

// Voice options available for TTS
export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// Research depth options
export type ResearchDepth = 'quick' | 'standard' | 'comprehensive'

/**
 * Voice settings for input/output
 */
export interface VoiceSettings {
  outputVoice: VoiceOption
  autoPlayResponses: boolean
  inputLanguage: string
}

/**
 * Research settings for deep research capability
 */
export interface ResearchSettings {
  defaultDepth: ResearchDepth
  useCouncil: boolean // Multi-model synthesis
}

/**
 * Complete capability preferences
 */
export interface CapabilityPreferences {
  // Auto-detect capabilities
  autoCapabilities: boolean

  // Cost controls
  confirmExpensiveOps: boolean
  expensiveThreshold: number // dollars

  // Voice settings
  voiceSettings: VoiceSettings

  // Research settings
  researchSettings: ResearchSettings

  // Disabled capabilities (user never wants)
  disabledCapabilities: CapabilityType[]
}

/**
 * Default preference values
 */
export const DEFAULT_CAPABILITY_PREFERENCES: CapabilityPreferences = {
  autoCapabilities: true,
  confirmExpensiveOps: true,
  expensiveThreshold: 0.10,
  voiceSettings: {
    outputVoice: 'nova',
    autoPlayResponses: false,
    inputLanguage: 'en',
  },
  researchSettings: {
    defaultDepth: 'standard',
    useCouncil: false,
  },
  disabledCapabilities: [],
}

/**
 * Voice option metadata for UI
 */
export const VOICE_OPTIONS: { value: VoiceOption; label: string; description: string }[] = [
  { value: 'alloy', label: 'Alloy', description: 'Neutral and balanced' },
  { value: 'echo', label: 'Echo', description: 'Warm and conversational' },
  { value: 'fable', label: 'Fable', description: 'Expressive and dramatic' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { value: 'nova', label: 'Nova', description: 'Friendly and upbeat' },
  { value: 'shimmer', label: 'Shimmer', description: 'Clear and professional' },
]

/**
 * Research depth metadata for UI
 */
export const RESEARCH_DEPTH_OPTIONS: { value: ResearchDepth; label: string; description: string }[] = [
  { value: 'quick', label: 'Quick', description: '3 sources, fastest results' },
  { value: 'standard', label: 'Standard', description: '5-7 sources, balanced depth' },
  { value: 'comprehensive', label: 'Comprehensive', description: '10+ sources, thorough analysis' },
]

/**
 * Capability metadata for the disabled capabilities UI
 */
export const CAPABILITY_OPTIONS: { id: CapabilityType; label: string; description: string }[] = [
  { id: 'web_search', label: 'Web Search', description: 'Search the internet for current information' },
  { id: 'code_execution', label: 'Code Execution', description: 'Run Python code and analyze data' },
  { id: 'image_generation', label: 'Image Generation', description: 'Create images with DALL-E' },
  { id: 'vision_analysis', label: 'Vision Analysis', description: 'Analyze and describe images' },
  { id: 'deep_research', label: 'Deep Research', description: 'Multi-source research reports' },
  { id: 'voice_input', label: 'Voice Input', description: 'Speak your questions' },
  { id: 'voice_output', label: 'Voice Output', description: 'Listen to responses' },
]

/**
 * Hook return type
 */
export interface UseCapabilityPreferencesReturn {
  preferences: CapabilityPreferences
  isLoaded: boolean

  // Update methods
  setAutoCapabilities: (enabled: boolean) => void
  setConfirmExpensiveOps: (enabled: boolean) => void
  setExpensiveThreshold: (threshold: number) => void
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void
  setResearchSettings: (settings: Partial<ResearchSettings>) => void
  toggleDisabledCapability: (capability: CapabilityType) => void
  setDisabledCapabilities: (capabilities: CapabilityType[]) => void

  // Utility methods
  isCapabilityDisabled: (capability: CapabilityType) => boolean
  resetToDefaults: () => void
}

/**
 * Hook for managing capability preferences
 * Persists to localStorage and syncs across tabs
 */
export function useCapabilityPreferences(): UseCapabilityPreferencesReturn {
  const [preferences, setPreferences] = useState<CapabilityPreferences>(DEFAULT_CAPABILITY_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to handle new fields
        setPreferences(prev => ({
          ...DEFAULT_CAPABILITY_PREFERENCES,
          ...parsed,
          voiceSettings: { ...DEFAULT_CAPABILITY_PREFERENCES.voiceSettings, ...parsed.voiceSettings },
          researchSettings: { ...DEFAULT_CAPABILITY_PREFERENCES.researchSettings, ...parsed.researchSettings },
        }))
      }
    } catch {
      // Ignore parsing errors, use defaults
    }
    setIsLoaded(true)
  }, [])

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setPreferences(prev => ({
            ...DEFAULT_CAPABILITY_PREFERENCES,
            ...parsed,
            voiceSettings: { ...DEFAULT_CAPABILITY_PREFERENCES.voiceSettings, ...parsed.voiceSettings },
            researchSettings: { ...DEFAULT_CAPABILITY_PREFERENCES.researchSettings, ...parsed.researchSettings },
          }))
        } catch {
          // Ignore parsing errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Persist to localStorage
  const persist = useCallback((newPrefs: CapabilityPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
      // Dispatch event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify(newPrefs),
      }))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Update methods
  const setAutoCapabilities = useCallback((enabled: boolean) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, autoCapabilities: enabled }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const setConfirmExpensiveOps = useCallback((enabled: boolean) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, confirmExpensiveOps: enabled }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const setExpensiveThreshold = useCallback((threshold: number) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, expensiveThreshold: threshold }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const setVoiceSettings = useCallback((settings: Partial<VoiceSettings>) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        voiceSettings: { ...prev.voiceSettings, ...settings },
      }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const setResearchSettings = useCallback((settings: Partial<ResearchSettings>) => {
    setPreferences(prev => {
      const newPrefs = {
        ...prev,
        researchSettings: { ...prev.researchSettings, ...settings },
      }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const toggleDisabledCapability = useCallback((capability: CapabilityType) => {
    setPreferences(prev => {
      const isDisabled = prev.disabledCapabilities.includes(capability)
      const newDisabled = isDisabled
        ? prev.disabledCapabilities.filter(c => c !== capability)
        : [...prev.disabledCapabilities, capability]
      const newPrefs = { ...prev, disabledCapabilities: newDisabled }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  const setDisabledCapabilities = useCallback((capabilities: CapabilityType[]) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, disabledCapabilities: capabilities }
      persist(newPrefs)
      return newPrefs
    })
  }, [persist])

  // Utility methods
  const isCapabilityDisabled = useCallback((capability: CapabilityType) => {
    return preferences.disabledCapabilities.includes(capability)
  }, [preferences.disabledCapabilities])

  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_CAPABILITY_PREFERENCES)
    persist(DEFAULT_CAPABILITY_PREFERENCES)
  }, [persist])

  return {
    preferences,
    isLoaded,
    setAutoCapabilities,
    setConfirmExpensiveOps,
    setExpensiveThreshold,
    setVoiceSettings,
    setResearchSettings,
    toggleDisabledCapability,
    setDisabledCapabilities,
    isCapabilityDisabled,
    resetToDefaults,
  }
}
