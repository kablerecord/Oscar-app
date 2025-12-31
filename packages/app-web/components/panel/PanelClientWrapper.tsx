'use client'

import { useState, useCallback, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { RefineFireChat, type RefineFireChatHandle } from '@/components/oscar/RefineFireChat'
import type { HighlightTarget } from '@/components/layout/RightPanelBar'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsModal, SuggestShortcutModal } from '@/components/shortcuts/KeyboardShortcutsModal'
import { CeremonyCheck } from '@/lib/ceremony/CeremonyCheck'
import { ColdOpenOnboarding } from '@/components/onboarding/ColdOpenOnboarding'

interface PanelClientWrapperProps {
  user: {
    name: string
    email: string
  }
  workspaceName: string
  workspaceId: string
  capabilityLevel: number | null
  onboardingCompleted: boolean
  userTier: 'free' | 'pro' | 'master'
}

export function PanelClientWrapper({
  user,
  workspaceName,
  workspaceId,
  capabilityLevel,
  onboardingCompleted: initialOnboardingCompleted,
  userTier,
}: PanelClientWrapperProps) {
  const chatRef = useRef<RefineFireChatHandle>(null)
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget>(null)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false)

  // Cold open onboarding state
  const [showColdOpen, setShowColdOpen] = useState(!initialOnboardingCompleted)
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialOnboardingCompleted)
  const [onboardingData, setOnboardingData] = useState<{ name: string; workingOn: string } | null>(null)

  // Keyboard shortcuts
  const { shortcuts, showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts({
    workspaceId,
    onNewChat: () => {
      // Clear current chat and focus input
      if (chatRef.current) {
        chatRef.current.clearChat?.()
        chatRef.current.focusInput?.()
      }
    },
    onFocusInput: () => {
      if (chatRef.current) {
        chatRef.current.focusInput?.()
      }
    },
    onOpenShortcutsHelp: () => setShowShortcutsModal(true),
  })

  // Callback for MSCPanel's "Ask OSQR" button
  // Opens the OSQR bubble and shows the answer directly instead of pre-filling input
  const handleAskOSQR = useCallback((prompt: string) => {
    if (chatRef.current) {
      chatRef.current.askAndShowInBubble(prompt)
    }
  }, [])

  // Callback for Tips highlight feature
  const handleHighlightElement = useCallback((target: HighlightTarget) => {
    setHighlightTarget(target)
  }, [])

  // Handle cold open onboarding completion
  const handleColdOpenComplete = useCallback(async (data: { name: string; workingOn: string }) => {
    setOnboardingData(data)
    setShowColdOpen(false)
    setOnboardingCompleted(true)

    // Save to database
    try {
      await fetch('/api/workspace/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          completed: true,
          userName: data.name,
          workingOn: data.workingOn,
        }),
      })
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
    }
  }, [workspaceId])

  // Show cold open for new users
  if (showColdOpen) {
    return <ColdOpenOnboarding onComplete={handleColdOpenComplete} />
  }

  return (
    <CeremonyCheck>
      <MainLayout
        user={user}
        workspaceName={workspaceName}
        workspaceId={workspaceId}
        showMSC={true}
        capabilityLevel={capabilityLevel}
        onAskOSQR={handleAskOSQR}
        highlightTarget={highlightTarget}
        onHighlightElement={handleHighlightElement}
        pageTitle="The Panel"
        pageDescription="Ask OSQR anything — refined questions, expert answers"
        rightPanelExpanded={rightPanelExpanded}
        onRightPanelExpandedChange={setRightPanelExpanded}
      >
        <div data-highlight-id="panel-main" className="h-[calc(100vh-8rem)]">
          <RefineFireChat
            ref={chatRef}
            workspaceId={workspaceId}
            onboardingCompleted={initialOnboardingCompleted}
            justCompletedColdOpen={!initialOnboardingCompleted && onboardingCompleted}
            coldOpenData={onboardingData}
            userTier={userTier}
            onHighlightElement={handleHighlightElement}
          />
        </div>
      </MainLayout>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={shortcuts}
        onSuggestShortcut={() => {
          setShowShortcutsModal(false)
          setShowSuggestModal(true)
        }}
      />

      {/* Suggest Shortcut Modal */}
      <SuggestShortcutModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        userEmail={user.email}
      />
    </CeremonyCheck>
  )
}
