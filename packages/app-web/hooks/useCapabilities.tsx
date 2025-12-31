'use client'

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react'
import type { CapabilityBarState, CapabilityType } from '@/components/oscar/CapabilityBar'
import type { CapabilityResponse } from '@/app/api/capabilities/route'
import type { UploadResponse, UploadedFile } from '@/app/api/capabilities/upload/route'
import type { TranscribeResponse } from '@/app/api/capabilities/transcribe/route'
import {
  useCapabilityPreferences,
  type CapabilityPreferences as FullCapabilityPreferences,
} from '@/hooks/useCapabilityPreferences'

// Re-export the full preferences type
export type { FullCapabilityPreferences }

// Storage key for persisting capability preferences (legacy)
const STORAGE_KEY = 'osqr-capability-preferences'

// Legacy preferences interface (kept for backward compatibility)
export interface CapabilityPreferences {
  defaultMode: 'auto' | 'explicit'
  favoriteCapabilities: CapabilityType[]
  confirmExpensive: boolean // Confirm before using high-cost capabilities
}

const DEFAULT_PREFERENCES: CapabilityPreferences = {
  defaultMode: 'auto',
  favoriteCapabilities: [],
  confirmExpensive: true,
}

// Attachment type for files ready to be processed
export interface Attachment {
  id: string
  name: string
  type: 'image' | 'document' | 'audio'
  url: string
  mimeType: string
  size: number
  uploading?: boolean
  error?: string
}

export interface UseCapabilitiesReturn {
  state: CapabilityBarState
  setState: (state: CapabilityBarState) => void
  preferences: CapabilityPreferences
  setPreferences: (prefs: Partial<CapabilityPreferences>) => void
  // Full preferences from useCapabilityPreferences hook
  fullPreferences: FullCapabilityPreferences
  isCapabilityDisabled: (id: CapabilityType) => boolean
  toggleCapability: (id: CapabilityType) => void
  resetToAuto: () => void
  isCapabilityEnabled: (id: CapabilityType) => boolean
  // API methods
  processQuery: (query: string, workspaceId: string, attachments?: Attachment[], conversationHistory?: { role: 'user' | 'assistant'; content: string }[]) => Promise<CapabilityResponse>
  uploadAttachments: (files: File[]) => Promise<Attachment[]>
  transcribeAudio: (audioData: string, language?: string) => Promise<TranscribeResponse>
  synthesizeSpeech: (text: string, voice?: string, speed?: number) => Promise<Blob>
  // Loading states
  isProcessing: boolean
  isUploading: boolean
  isTranscribing: boolean
  isSynthesizing: boolean
}

export function useCapabilities(): UseCapabilitiesReturn {
  const [state, setStateInternal] = useState<CapabilityBarState>({
    mode: 'auto',
    enabledCapabilities: [],
  })

  const [preferences, setPreferencesInternal] = useState<CapabilityPreferences>(DEFAULT_PREFERENCES)

  // Full capability preferences from the dedicated hook
  const {
    preferences: fullPreferences,
    isCapabilityDisabled,
  } = useCapabilityPreferences()

  // Loading states for API operations
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)

  // Load legacy preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CapabilityPreferences
        setPreferencesInternal(prev => ({ ...prev, ...parsed }))
      }
    } catch {
      // Ignore parsing errors
    }
  }, [])

  // Save preferences to localStorage
  const setPreferences = useCallback((prefs: Partial<CapabilityPreferences>) => {
    setPreferencesInternal(prev => {
      const newPrefs = { ...prev, ...prefs }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
      } catch {
        // Ignore storage errors
      }
      return newPrefs
    })
  }, [])

  const setState = useCallback((newState: CapabilityBarState) => {
    setStateInternal(newState)
  }, [])

  const toggleCapability = useCallback((id: CapabilityType) => {
    if (id === 'auto') {
      setStateInternal({
        mode: 'auto',
        enabledCapabilities: [],
      })
      return
    }

    setStateInternal(prev => {
      const isEnabled = prev.enabledCapabilities.includes(id)
      const newEnabled = isEnabled
        ? prev.enabledCapabilities.filter(c => c !== id)
        : [...prev.enabledCapabilities, id]

      return {
        mode: newEnabled.length === 0 ? 'auto' : 'explicit',
        enabledCapabilities: newEnabled,
      }
    })
  }, [])

  const resetToAuto = useCallback(() => {
    setStateInternal({
      mode: 'auto',
      enabledCapabilities: [],
    })
  }, [])

  const isCapabilityEnabled = useCallback((id: CapabilityType) => {
    if (id === 'auto') {
      return state.mode === 'auto'
    }
    return state.enabledCapabilities.includes(id)
  }, [state])

  // Process a query with the capabilities API
  const processQuery = useCallback(async (
    query: string,
    workspaceId: string,
    attachments?: Attachment[],
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<CapabilityResponse> => {
    setIsProcessing(true)
    try {
      // Filter out disabled capabilities from the enabled list
      const filteredCapabilities = state.enabledCapabilities.filter(
        cap => !fullPreferences.disabledCapabilities.includes(cap)
      )

      // Build the enhanced capabilities state
      const enhancedState: CapabilityBarState & { disabledCapabilities?: CapabilityType[] } = {
        mode: fullPreferences.autoCapabilities ? 'auto' : state.mode,
        enabledCapabilities: filteredCapabilities,
        disabledCapabilities: fullPreferences.disabledCapabilities,
      }

      const response = await fetch('/api/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          workspaceId,
          capabilities: enhancedState,
          attachments: attachments?.map(a => ({
            type: a.type,
            url: a.url,
            name: a.name,
            mimeType: a.mimeType,
          })),
          conversationHistory,
          // Include preferences for the API to use
          preferences: {
            confirmExpensiveOps: fullPreferences.confirmExpensiveOps,
            expensiveThreshold: fullPreferences.expensiveThreshold,
            voiceSettings: fullPreferences.voiceSettings,
            researchSettings: fullPreferences.researchSettings,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Processing failed')
      }

      return await response.json()
    } finally {
      setIsProcessing(false)
    }
  }, [state, fullPreferences])

  // Upload files for processing
  const uploadAttachments = useCallback(async (files: File[]): Promise<Attachment[]> => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))

      const response = await fetch('/api/capabilities/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data: UploadResponse = await response.json()
      return data.files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        url: f.url,
        mimeType: f.mimeType,
        size: f.size,
      }))
    } finally {
      setIsUploading(false)
    }
  }, [])

  // Transcribe audio to text
  const transcribeAudio = useCallback(async (
    audioData: string,
    language?: string
  ): Promise<TranscribeResponse> => {
    setIsTranscribing(true)
    try {
      const response = await fetch('/api/capabilities/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioData, language }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transcription failed')
      }

      return await response.json()
    } finally {
      setIsTranscribing(false)
    }
  }, [])

  // Synthesize speech from text
  const synthesizeSpeech = useCallback(async (
    text: string,
    voice?: string,
    speed: number = 1.0
  ): Promise<Blob> => {
    setIsSynthesizing(true)
    try {
      // Use the configured voice preference if not specified
      const voiceToUse = voice || fullPreferences.voiceSettings.outputVoice

      const response = await fetch('/api/capabilities/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceToUse, speed }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Speech synthesis failed')
      }

      return await response.blob()
    } finally {
      setIsSynthesizing(false)
    }
  }, [fullPreferences.voiceSettings.outputVoice])

  return {
    state,
    setState,
    preferences,
    setPreferences,
    // Full preferences from useCapabilityPreferences
    fullPreferences,
    isCapabilityDisabled,
    toggleCapability,
    resetToAuto,
    isCapabilityEnabled,
    // API methods
    processQuery,
    uploadAttachments,
    transcribeAudio,
    synthesizeSpeech,
    // Loading states
    isProcessing,
    isUploading,
    isTranscribing,
    isSynthesizing,
  }
}

// Context for sharing capability state across components
type CapabilityContextType = UseCapabilitiesReturn

const CapabilityContext = createContext<CapabilityContextType | undefined>(undefined)

export function CapabilityProvider({ children }: { children: ReactNode }) {
  const capabilities = useCapabilities()

  return (
    <CapabilityContext.Provider value={capabilities}>
      {children}
    </CapabilityContext.Provider>
  )
}

export function useCapabilityContext() {
  const context = useContext(CapabilityContext)
  if (context === undefined) {
    throw new Error('useCapabilityContext must be used within a CapabilityProvider')
  }
  return context
}
