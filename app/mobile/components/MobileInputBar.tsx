'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileInputBarProps {
  onSend: (message: string, inputType: 'text' | 'voice') => void
  disabled?: boolean
  isLoading?: boolean
}

/**
 * Mobile Input Bar Component
 *
 * Fixed to bottom of screen with:
 * - Text input field (expands with content, max 4 lines)
 * - Microphone button (left) - toggles speech recognition
 * - Send button (right) - disabled when empty
 */
export function MobileInputBar({ onSend, disabled = false, isLoading = false }: MobileInputBarProps) {
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSpeechSupported(!!SpeechRecognition)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled || isLoading) return

    onSend(trimmed, 'text')
    setInput('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleListening = () => {
    if (!speechSupported) return

    if (isListening) {
      // Stop listening
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    // Start listening
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')

      setInput(transcript)

      // If final result, auto-send
      if (event.results[event.results.length - 1].isFinal) {
        const trimmed = transcript.trim()
        if (trimmed) {
          onSend(trimmed, 'voice')
          setInput('')
        }
        setIsListening(false)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const canSend = input.trim().length > 0 && !disabled && !isLoading

  return (
    <div
      className="sticky bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 px-4 py-3"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-end gap-2">
        {/* Microphone button */}
        {speechSupported && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'shrink-0 w-10 h-10 rounded-full',
              isListening
                ? 'bg-purple-500 text-white'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            )}
            onClick={toggleListening}
            disabled={disabled}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </Button>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Message OSQR...'}
            disabled={disabled || isListening}
            rows={1}
            className={cn(
              'w-full px-4 py-2.5 rounded-2xl resize-none',
              'bg-slate-800 border border-slate-700',
              'text-slate-100 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
              'text-base leading-relaxed',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{
              minHeight: '44px',
              maxHeight: '120px',
            }}
          />

          {/* Listening indicator overlay */}
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-ping" />
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className={cn(
            'shrink-0 w-10 h-10 rounded-full',
            canSend
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          )}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  )
}

