'use client'

import { useState } from 'react'
import { OnboardingFlow } from './OnboardingFlow'

interface OnboardingWrapperProps {
  workspaceId: string
  initialOnboardingCompleted: boolean
  children: React.ReactNode
}

interface OnboardingData {
  name: string
  workingOn: string
  frustration: string
  uploadedFile?: {
    name: string
    summary: string
    suggestedQuestions: string[]
  }
  firstQuestion?: string
  firstAnswer?: string
  panelDebate?: {
    gptResponse: string
    claudeResponse: string
    synthesis: string
  }
}

export function OnboardingWrapper({
  workspaceId,
  initialOnboardingCompleted,
  children,
}: OnboardingWrapperProps) {
  const [showOnboarding, setShowOnboarding] = useState(!initialOnboardingCompleted)
  const [isCompleted, setIsCompleted] = useState(initialOnboardingCompleted)

  const handleOnboardingComplete = async (onboardingData: OnboardingData) => {
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          onboardingData,
        }),
      })

      if (response.ok) {
        setIsCompleted(true)
        setShowOnboarding(false)
      } else {
        console.error('Failed to save onboarding data')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
    }
  }

  return (
    <>
      {children}
      <OnboardingFlow
        isOpen={showOnboarding && !isCompleted}
        workspaceId={workspaceId}
        onComplete={handleOnboardingComplete}
      />
    </>
  )
}
