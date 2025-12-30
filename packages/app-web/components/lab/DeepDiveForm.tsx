'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormQuestion } from './FormQuestion'
import { DeepDiveDetail, FormSection } from '@/lib/lab/types'

interface DeepDiveFormProps {
  formId: string
}

type Step = 'intro' | 'sections' | 'complete'

export function DeepDiveFormComponent({ formId }: DeepDiveFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<DeepDiveDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    pointsEarned: number
    newScore: number
  } | null>(null)

  useEffect(() => {
    fetchForm()
  }, [formId])

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/lab/deep-dives/${formId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.userResponse) {
          setResult({ pointsEarned: 0, newScore: 0 })
          setStep('complete')
        }
        setForm(data.form)
      }
    } catch (error) {
      console.error('Failed to fetch form:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (!form) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/lab/deep-dives/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setStep('complete')
      }
    } catch (error) {
      console.error('Failed to submit deep dive:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const sections = (form?.sections as FormSection[]) || []
  const currentSection = sections[currentSectionIndex]
  const isLastSection = currentSectionIndex === sections.length - 1

  // Check if all required questions in current section are answered
  const canProceed =
    currentSection?.questions.every(
      (q) => !q.required || answers[q.id] !== undefined
    ) ?? true

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Deep dive not found</div>
      </div>
    )
  }

  // Introduction step
  if (step === 'intro') {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">{form.title}</CardTitle>
          <CardDescription>{form.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>~{form.estimatedMinutes} minutes</span>
            <span className="text-amber-400">+{form.pointsReward} points</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Sections:</h4>
            <ul className="space-y-1">
              {sections.map((section, i) => (
                <li key={section.id} className="text-sm text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                    {i + 1}
                  </span>
                  {section.title}
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={() => setStep('sections')}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Start Deep Dive
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Sections step
  if (step === 'sections' && currentSection) {
    return (
      <Card className="bg-gray-800 border-gray-700 max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{currentSection.title}</CardTitle>
              {currentSection.description && (
                <CardDescription>{currentSection.description}</CardDescription>
              )}
            </div>
            <span className="text-sm text-gray-400">
              Section {currentSectionIndex + 1} / {sections.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection.questions.map((question) => (
            <FormQuestion
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => handleAnswer(question.id, value)}
            />
          ))}

          <div className="flex gap-3">
            {currentSectionIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentSectionIndex((i) => i - 1)}
                className="border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLastSection) {
                  handleSubmit()
                } else {
                  setCurrentSectionIndex((i) => i + 1)
                }
              }}
              disabled={!canProceed || submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {submitting
                ? 'Submitting...'
                : isLastSection
                ? 'Submit'
                : 'Next Section'}
              {!isLastSection && <ArrowRight className="ml-2 h-4 w-4" />}
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
              Deep Dive Complete!
            </h2>
            <p className="text-gray-400">
              Your detailed feedback is incredibly valuable. Thank you!
            </p>
          </div>

          {result && result.pointsEarned > 0 && (
            <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700/50">
              <div className="text-3xl font-bold text-amber-400">
                +{result.pointsEarned}
              </div>
              <div className="text-sm text-amber-300/70">points earned</div>
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
