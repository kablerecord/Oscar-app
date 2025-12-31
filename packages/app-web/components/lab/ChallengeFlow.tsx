'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChallengeQuestion } from './ChallengeQuestion'
import { ChallengeDetail, ChallengeQuestion as QuestionType } from '@/lib/lab/types'

interface ChallengeFlowProps {
  challengeId: string
}

type Step = 'intro' | 'task' | 'questions' | 'complete'

export function ChallengeFlow({ challengeId }: ChallengeFlowProps) {
  const router = useRouter()
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    pointsEarned: number
    newScore: number
    newTier?: string
  } | null>(null)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    fetchChallenge()
  }, [challengeId])

  const fetchChallenge = async () => {
    try {
      const response = await fetch(`/api/lab/challenges/${challengeId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.userResponse) {
          // Already completed
          setResult({ pointsEarned: 0, newScore: 0 })
          setStep('complete')
        }
        setChallenge(data.challenge)
      }
    } catch (error) {
      console.error('Failed to fetch challenge:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!challenge) return

    setSubmitting(true)
    try {
      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000)
      const response = await fetch(`/api/lab/challenges/${challengeId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          timeSpentSeconds,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setStep('complete')
      }
    } catch (error) {
      console.error('Failed to submit challenge:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const questions = (challenge?.questions as QuestionType[]) || []
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const canProceed =
    currentQuestion &&
    (!currentQuestion.required ||
      answers[currentQuestion.id] !== undefined)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading challenge...</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Challenge not found</div>
      </div>
    )
  }

  // Introduction step
  if (step === 'intro') {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">{challenge.title}</CardTitle>
          <CardDescription>{challenge.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>~{challenge.estimatedMinutes} minutes</span>
            <span className="text-amber-400">+{challenge.pointsReward} points</span>
          </div>

          {challenge.compareMode && (
            <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50 text-sm text-purple-300">
              This is a comparison challenge. You&apos;ll try the same task in{' '}
              {challenge.modesCompare.join(' and ')} modes.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/lab')}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep(challenge.promptToTry ? 'task' : 'questions')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Start Challenge
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Task step (if there's a prompt to try)
  if (step === 'task' && challenge.promptToTry) {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Try This</CardTitle>
          <CardDescription>
            Complete this task before answering the questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <p className="text-white">{challenge.promptToTry}</p>
          </div>

          <Button
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-700"
            onClick={() => window.open('/', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Chat in New Tab
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('intro')}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => setStep('questions')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              I&apos;ve Tried It - Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Questions step
  if (step === 'questions' && currentQuestion) {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">{challenge.title}</CardTitle>
            <span className="text-sm text-gray-400">
              {currentQuestionIndex + 1} / {questions.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ChallengeQuestion
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
          />

          <div className="flex gap-3">
            {currentQuestionIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                className="border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLastQuestion) {
                  handleSubmit()
                } else {
                  setCurrentQuestionIndex((i) => i + 1)
                }
              }}
              disabled={!canProceed || submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {submitting
                ? 'Submitting...'
                : isLastQuestion
                ? 'Submit'
                : 'Next'}
              {!isLastQuestion && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Complete step
  if (step === 'complete') {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Challenge Complete!
            </h2>
            <p className="text-gray-400">
              Thanks for your feedback. It helps make OSQR better.
            </p>
          </div>

          {result && result.pointsEarned > 0 && (
            <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700/50">
              <div className="text-3xl font-bold text-amber-400">
                +{result.pointsEarned}
              </div>
              <div className="text-sm text-amber-300/70">points earned</div>
              {result.newTier && (
                <div className="mt-2 text-green-400 font-medium">
                  You&apos;ve been promoted to {result.newTier}!
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => router.push('/lab')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Back to Lab
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
