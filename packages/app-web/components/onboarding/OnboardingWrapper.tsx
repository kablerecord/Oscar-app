'use client'

interface OnboardingWrapperProps {
  workspaceId: string
  initialOnboardingCompleted: boolean
  children: React.ReactNode
}

export function OnboardingWrapper({
  workspaceId,
  initialOnboardingCompleted,
  children,
}: OnboardingWrapperProps) {
  // Onboarding is handled by the OSQR bubble in RefineFireChat
  // This wrapper passes through children - the bubble checks onboarding status
  return <>{children}</>
}
