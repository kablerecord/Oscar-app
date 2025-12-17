'use client'

import { useState, useEffect } from 'react'
import { X, Minimize2, ChevronRight, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ProfileQuestion } from '@/lib/profile/questions'
import { getProgressMessage } from '@/lib/profile/questions'

interface ProfileQuestionModalProps {
  isOpen: boolean
  question: ProfileQuestion | null
  answeredCount: number
  totalQuestions: number
  onAnswer: (answer: string) => Promise<void>
  onSkip: () => void
  onClose: () => void
}

export function ProfileQuestionModal({
  isOpen,
  question,
  answeredCount,
  totalQuestions,
  onAnswer,
  onSkip,
  onClose,
}: ProfileQuestionModalProps) {
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Reset answer when question changes
  useEffect(() => {
    setAnswer('')
  }, [question?.id])

  if (!isOpen || !question) return null

  const progress = Math.round((answeredCount / totalQuestions) * 100)
  const progressMessage = getProgressMessage(answeredCount)

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAnswer(answer.trim())
      setAnswer('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setAnswer('')
    onSkip()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card
          className="w-64 cursor-pointer bg-gradient-to-r from-blue-50 to-purple-50 p-3 shadow-lg transition-all hover:shadow-xl dark:from-blue-950/20 dark:to-purple-950/20"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Building your profile...
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      </div>
    )
  }

  // Full modal view
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px]">
      <Card className="animate-in slide-in-from-bottom-4 border-2 border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-200 bg-gradient-to-r from-blue-500 to-purple-500 p-4 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-white" />
              <div>
                <h3 className="font-semibold text-white">Building Your Profile</h3>
                <p className="text-xs text-white/80">{progressMessage}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="cursor-pointer rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="cursor-pointer rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>
                {answeredCount} of {totalQuestions}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question content */}
        <div className="p-4">
          <div className="mb-3">
            <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {question.category}
            </span>
          </div>

          <p className="mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {question.question}
          </p>

          {question.type === 'text' ? (
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your answer..."
              rows={3}
              disabled={isSubmitting}
              className="mb-3 text-sm"
              autoFocus
            />
          ) : (
            // Multiple choice questions
            <div className="mb-3 space-y-2">
              {question.choices?.map((choice) => (
                <button
                  key={choice}
                  onClick={() => setAnswer(choice)}
                  disabled={isSubmitting}
                  className={`w-full rounded-lg border-2 p-3 text-left text-sm transition-all ${
                    answer === choice
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                      : 'border-neutral-200 bg-white hover:border-blue-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-600'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!answer.trim() || isSubmitting}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
          </div>

          {/* Hint */}
          <p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Press Enter to submit • OSQR will use this to personalize responses
          </p>
        </div>
      </Card>
    </div>
  )
}
