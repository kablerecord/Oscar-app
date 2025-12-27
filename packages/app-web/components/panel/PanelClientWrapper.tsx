'use client'

import { useState, useCallback, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { RefineFireChat, type RefineFireChatHandle } from '@/components/oscar/RefineFireChat'
import type { HighlightTarget } from '@/components/layout/RightPanelBar'
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsModal, SuggestShortcutModal } from '@/components/shortcuts/KeyboardShortcutsModal'
import { CeremonyCheck } from '@/lib/ceremony/CeremonyCheck'

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
  onboardingCompleted,
  userTier,
}: PanelClientWrapperProps) {
  const chatRef = useRef<RefineFireChatHandle>(null)
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget>(null)
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false)

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
            onboardingCompleted={onboardingCompleted}
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
