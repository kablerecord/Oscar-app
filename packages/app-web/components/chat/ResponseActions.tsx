'use client'

import { useState } from 'react'
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Volume2,
  VolumeX,
  Check,
  Flag,
  Hash,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ResponseActionsProps {
  content: string
  messageId?: string
  workspaceId?: string
  // For admin features
  isAdmin?: boolean
  tokensUsed?: number
  // Feedback state (if already rated)
  initialFeedback?: 'good' | 'bad' | null
  onFeedback?: (type: 'good' | 'bad', messageId?: string) => void
  onFlag?: (messageId?: string) => void
}

export function ResponseActions({
  content,
  messageId,
  workspaceId,
  isAdmin = false,
  tokensUsed,
  initialFeedback = null,
  onFeedback,
  onFlag,
}: ResponseActionsProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(initialFeedback)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [flagged, setFlagged] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Read aloud using Web Speech API
  const handleReadAloud = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(content)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // Try to get a good voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(
      v => v.name.includes('Samantha') || v.name.includes('Google') || v.lang.startsWith('en')
    )
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  // Handle feedback (good/bad)
  const handleFeedback = async (type: 'good' | 'bad') => {
    if (feedback === type) {
      // Toggle off if already selected
      setFeedback(null)
      return
    }

    setFeedback(type)
    setIsSubmittingFeedback(true)

    try {
      // Save feedback to API
      if (messageId && workspaceId) {
        await fetch('/api/chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            workspaceId,
            feedback: type,
          }),
        })
      }

      // Callback for parent component
      onFeedback?.(type, messageId)
    } catch (err) {
      console.error('Failed to save feedback:', err)
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Handle flag for review (admin only)
  const handleFlag = async () => {
    setFlagged(!flagged)

    try {
      if (messageId && workspaceId) {
        await fetch('/api/chat/flag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            workspaceId,
            flagged: !flagged,
          }),
        })
      }

      onFlag?.(messageId)
    } catch (err) {
      console.error('Failed to flag message:', err)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 mt-2">
        {/* Copy Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs">{copied ? 'Copied!' : 'Copy'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Read Aloud Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReadAloud}
              className={`h-7 px-2 ${
                isSpeaking
                  ? 'text-blue-400 bg-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs">{isSpeaking ? 'Stop' : 'Read Aloud'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-700 mx-1" />

        {/* Good Response Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('good')}
              disabled={isSubmittingFeedback}
              className={`h-7 px-2 ${
                feedback === 'good'
                  ? 'text-green-400 bg-green-500/20'
                  : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
              }`}
            >
              {isSubmittingFeedback && feedback === 'good' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs">Good response</p>
          </TooltipContent>
        </Tooltip>

        {/* Bad Response Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleFeedback('bad')}
              disabled={isSubmittingFeedback}
              className={`h-7 px-2 ${
                feedback === 'bad'
                  ? 'text-red-400 bg-red-500/20'
                  : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
              }`}
            >
              {isSubmittingFeedback && feedback === 'bad' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs">Bad response</p>
          </TooltipContent>
        </Tooltip>

        {/* Admin-only buttons */}
        {isAdmin && (
          <>
            {/* Divider */}
            <div className="w-px h-4 bg-slate-700 mx-1" />

            {/* Token Count */}
            {tokensUsed !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-slate-800/50 rounded">
                    <Hash className="h-3 w-3" />
                    <span>{tokensUsed.toLocaleString()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
                  <p className="text-xs">Tokens used</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Flag for Review */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFlag}
                  className={`h-7 px-2 ${
                    flagged
                      ? 'text-amber-400 bg-amber-500/20'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
                <p className="text-xs">{flagged ? 'Flagged for review' : 'Flag for review'}</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
