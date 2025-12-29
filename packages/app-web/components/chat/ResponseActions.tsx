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
  MessageSquare,
  X,
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
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentSubmitted, setCommentSubmitted] = useState(false)

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

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!comment.trim()) return

    setIsSubmittingComment(true)

    try {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          workspaceId,
          feedback: feedback || undefined,
          comment: comment.trim(),
        }),
      })

      setCommentSubmitted(true)
      setTimeout(() => {
        setShowCommentForm(false)
        setComment('')
        setCommentSubmitted(false)
      }, 1500)
    } catch (err) {
      console.error('Failed to submit comment:', err)
    } finally {
      setIsSubmittingComment(false)
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

        {/* Comment Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommentForm(!showCommentForm)}
              className={`h-7 px-2 ${
                showCommentForm || commentSubmitted
                  ? 'text-cyan-400 bg-cyan-500/20'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              {commentSubmitted ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs">{commentSubmitted ? 'Comment sent!' : 'Add a comment'}</p>
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

      {/* Inline Comment Form */}
      {showCommentForm && (
        <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg animate-in slide-in-from-top-1 fade-in duration-200">
          <div className="flex items-start gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's wrong with this response? How could it be better?"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={isSubmittingComment || !comment.trim()}
                className="h-8 px-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
              >
                {isSubmittingComment ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCommentForm(false)
                  setComment('')
                }}
                className="h-8 px-3 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Your feedback helps improve OSQR's responses.
          </p>
        </div>
      )}
    </TooltipProvider>
  )
}
