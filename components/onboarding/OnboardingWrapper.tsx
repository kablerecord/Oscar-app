'use client'

// DEPRECATED: The old modal-based onboarding is now replaced by the OSCAR bubble onboarding
// The OnboardingFlow modal is disabled - onboarding now flows through OSCARBubble component
// See: lib/onboarding/oscar-onboarding.ts and components/oscar/OSCARBubble.tsx

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
  // The new onboarding flows through the OSCAR bubble in RefineFireChat
  // This wrapper now just passes through children without showing the old modal
  return <>{children}</>
}
