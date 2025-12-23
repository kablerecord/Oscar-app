'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ASSESSMENT_QUESTIONS, type AssessmentQuestion, type AssessmentResult } from '@/lib/capability/assessment'
import { getLevelDetails } from '@/lib/capability/levels'
import { CapabilityBadge } from './CapabilityBadge'

interface CapabilityAssessmentProps {
  workspaceId: string
  onComplete?: (result: AssessmentResult) => void
  onSkip?: () => void
  questions?: AssessmentQuestion[] // Use subset for quick assessment
  className?: string
}

export function CapabilityAssessment({
  workspaceId,
  onComplete,
  onSkip,
  questions = ASSESSMENT_QUESTIONS,
  className,
}: CapabilityAssessmentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleSelect = (optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }))
  }

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Submit assessment
      await submitAssessment()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const submitAssessment = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/capability/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          answers,
          trigger: 'onboarding',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit assessment')
      }

      const data = await response.json()
      setResult(data.result)
      onComplete?.(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show results
  if (result) {
    const levelDetails = getLevelDetails(result.level)
    return (
      <Card className={cn('p-6 max-w-2xl mx-auto', className)}>
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Your Capability Level</h2>
            <p className="text-muted-foreground">
              Based on your responses, here is where you are on the Capability Ladder
            </p>
          </div>

          <div className="flex justify-center py-4">
            <CapabilityBadge level={result.level} size="lg" showStage />
          </div>

          {levelDetails && (
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
              <p className="font-medium">{levelDetails.description}</p>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Your identity pattern:</p>
                <p className="italic">&quot;{levelDetails.identityPattern}&quot;</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Key behaviors at this level:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {levelDetails.keyBehaviors.slice(0, 3).map((behavior, i) => (
                    <li key={i}>{behavior}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This assessment is just a starting point. OSQR will learn more about you over time
            and help you move up the ladder at your own pace.
          </p>

          <Button onClick={() => onComplete?.(result)} className="w-full">
            Continue
          </Button>
        </div>
      </Card>
    )
  }

  // Show questions
  return (
    <Card className={cn('p-6 max-w-2xl mx-auto', className)}>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            {currentQuestion.category.replace('_', ' ')}
          </p>
          <h3 className="text-xl font-medium">{currentQuestion.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = answers[currentQuestion.id] === idx
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={cn(
                  'w-full p-4 text-left rounded-lg border-2 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <span className={cn(
                  'text-sm',
                  isSelected && 'font-medium'
                )}>
                  {option.text}
                </span>
              </button>
            )
          })}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {currentIndex > 0 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          {onSkip && currentIndex === 0 && (
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={answers[currentQuestion.id] === undefined || isSubmitting}
            className="flex-1"
          >
            {isSubmitting
              ? 'Calculating...'
              : currentIndex === questions.length - 1
              ? 'See My Level'
              : 'Next'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
