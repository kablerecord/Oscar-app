'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Types from @osqr/core design system
export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error'
export type VoiceOutputState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export type VoiceInputErrorType =
  | 'permission_denied'
  | 'not_supported'
  | 'network_error'
  | 'audio_capture_failed'
  | 'transcription_failed'
  | 'timeout'
  | 'unknown'

export interface VoiceInputError {
  type: VoiceInputErrorType
  message: string
  retryable: boolean
}

export type VoiceOption = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface VoiceInputProps {
  onTranscript: (text: string, duration?: number) => void
  onError?: (error: VoiceInputError) => void
  onStateChange?: (state: VoiceInputState) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  language?: string
  continuous?: boolean
  maxDuration?: number
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface VoiceOutputProps {
  text: string
  voice?: VoiceOption
  autoPlay?: boolean
  onComplete?: () => void
  onError?: (error: Error) => void
  onStateChange?: (state: VoiceOutputState) => void
  speed?: number
  showControls?: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Size mappings
const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

// Voice Input Component
export function VoiceInput({
  onTranscript,
  onError,
  onStateChange,
  onRecordingStart,
  onRecordingStop,
  language = 'en-US',
  continuous = false,
  maxDuration = 60,
  disabled = false,
  size = 'md',
  className,
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>('idle')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      onError?.({
        type: 'not_supported',
        message: 'Speech recognition is not supported in this browser',
        retryable: false,
      })
    }
  }, [onError])

  const updateState = useCallback((newState: VoiceInputState) => {
    setState(newState)
    onStateChange?.(newState)
  }, [onStateChange])

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.lang = language

    recognition.onstart = () => {
      updateState('listening')
      onRecordingStart?.()
    }

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1]
      if (result.isFinal) {
        onTranscript(result[0].transcript, undefined)
      }
    }

    recognition.onerror = (event) => {
      let errorType: VoiceInputErrorType = 'unknown'
      let message = 'An error occurred'
      let retryable = true

      switch (event.error) {
        case 'not-allowed':
          errorType = 'permission_denied'
          message = 'Microphone permission denied'
          retryable = false
          break
        case 'audio-capture':
          errorType = 'audio_capture_failed'
          message = 'Failed to capture audio'
          break
        case 'network':
          errorType = 'network_error'
          message = 'Network error during transcription'
          break
        case 'aborted':
          // User stopped, not an error
          return
      }

      updateState('error')
      onError?.({ type: errorType, message, retryable })
    }

    recognition.onend = () => {
      updateState('idle')
      onRecordingStop?.()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    recognitionRef.current = recognition
    recognition.start()

    // Set max duration timeout
    timeoutRef.current = setTimeout(() => {
      stopListening()
    }, maxDuration * 1000)
  }, [isSupported, disabled, continuous, language, maxDuration, onTranscript, onError, onRecordingStart, onRecordingStop, updateState])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    updateState('idle')
  }, [updateState])

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening()
    } else if (state === 'idle') {
      startListening()
    }
  }, [state, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getIcon = () => {
    switch (state) {
      case 'listening':
        return <Mic className={cn(iconSizes[size], 'text-white')} />
      case 'processing':
        return <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      case 'error':
        return <MicOff className={cn(iconSizes[size], 'text-red-400')} />
      default:
        return <Mic className={cn(iconSizes[size])} />
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening... Click to stop'
      case 'processing':
        return 'Processing your speech...'
      case 'error':
        return 'Voice input error. Click to retry'
      default:
        return 'Start voice input'
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleListening}
            disabled={disabled || state === 'processing'}
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-200',
              sizeClasses[size],
              state === 'listening' && 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30',
              state === 'processing' && 'bg-amber-500/20 text-amber-400',
              state === 'error' && 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
              state === 'idle' && 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            aria-label={getLabel()}
          >
            {getIcon()}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-800 border-slate-700">
          <p className="text-xs">{getLabel()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Voice Output Component
export function VoiceOutput({
  text,
  voice = 'nova',
  autoPlay = false,
  onComplete,
  onError,
  onStateChange,
  speed = 1.0,
  showControls = true,
  disabled = false,
  size = 'md',
  className,
}: VoiceOutputProps) {
  const [state, setState] = useState<VoiceOutputState>('idle')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const updateState = useCallback((newState: VoiceOutputState) => {
    setState(newState)
    onStateChange?.(newState)
  }, [onStateChange])

  const synthesize = useCallback(async () => {
    if (!text || disabled) return

    updateState('loading')

    try {
      const response = await fetch('/api/capabilities/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
      })

      if (!response.ok) {
        throw new Error('TTS synthesis failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      const audio = new Audio(url)
      audio.playbackRate = speed
      audioRef.current = audio

      audio.onplay = () => updateState('playing')
      audio.onpause = () => updateState('paused')
      audio.onended = () => {
        updateState('idle')
        onComplete?.()
      }
      audio.onerror = () => {
        updateState('error')
        onError?.(new Error('Audio playback failed'))
      }

      await audio.play()
    } catch (error) {
      updateState('error')
      onError?.(error instanceof Error ? error : new Error('TTS synthesis failed'))
    }
  }, [text, voice, speed, disabled, onComplete, onError, updateState])

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) {
      synthesize()
      return
    }

    if (state === 'playing') {
      audioRef.current.pause()
    } else if (state === 'paused') {
      audioRef.current.play()
    } else {
      synthesize()
    }
  }, [state, synthesize])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    updateState('idle')
  }, [updateState])

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && text) {
      synthesize()
    }
  }, [autoPlay, text, synthesize])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [audioUrl])

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
      case 'playing':
        return <Pause className={iconSizes[size]} />
      case 'paused':
        return <Play className={iconSizes[size]} />
      case 'error':
        return <VolumeX className={cn(iconSizes[size], 'text-red-400')} />
      default:
        return <Volume2 className={iconSizes[size]} />
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'loading':
        return 'Preparing audio...'
      case 'playing':
        return 'Pause audio'
      case 'paused':
        return 'Resume audio'
      case 'error':
        return 'Audio playback error. Click to retry'
      default:
        return 'Read aloud'
    }
  }

  if (!showControls) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={togglePlayback}
              disabled={disabled || !text}
              className={cn(
                'flex items-center justify-center rounded-full transition-all duration-200',
                sizeClasses[size],
                state === 'playing' && 'bg-green-500/20 text-green-400 ring-2 ring-green-500/30',
                state === 'loading' && 'bg-amber-500/20 text-amber-400',
                state === 'paused' && 'bg-blue-500/20 text-blue-400',
                state === 'error' && 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                state === 'idle' && 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300',
                (disabled || !text) && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={getLabel()}
            >
              {getIcon()}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-slate-800 border-slate-700">
            <p className="text-xs">{getLabel()}</p>
          </TooltipContent>
        </Tooltip>

        {state === 'playing' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={stop}
                className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300 transition-colors"
                aria-label="Stop audio"
              >
                <Square className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-800 border-slate-700">
              <p className="text-xs">Stop</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

// Audio Waveform Visualization (placeholder for future enhancement)
interface AudioWaveformProps {
  isPlaying?: boolean
  progress?: number
  className?: string
}

export function AudioWaveform({
  isPlaying = false,
  progress = 0,
  className,
}: AudioWaveformProps) {
  const bars = 12

  return (
    <div className={cn('flex items-center gap-0.5 h-4', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all duration-150',
            i / bars <= progress ? 'bg-blue-400' : 'bg-slate-600',
            isPlaying && 'animate-pulse'
          )}
          style={{
            height: `${Math.random() * 60 + 40}%`,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  )
}

// Type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
