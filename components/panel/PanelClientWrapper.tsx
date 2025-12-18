'use client'

import { useState, useCallback, useRef } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { RefineFireChat, type RefineFireChatHandle } from '@/components/oscar/RefineFireChat'

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

  // Callback for MSCPanel's "Ask OSQR" button
  // Opens the OSQR bubble and shows the answer directly instead of pre-filling input
  const handleAskOSQR = useCallback((prompt: string) => {
    if (chatRef.current) {
      chatRef.current.askAndShowInBubble(prompt)
    }
  }, [])

  return (
    <MainLayout
      user={user}
      workspaceName={workspaceName}
      workspaceId={workspaceId}
      showMSC={true}
      capabilityLevel={capabilityLevel}
      onAskOSQR={handleAskOSQR}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            The Panel
          </h1>
          <p className="mt-2 text-slate-300">
            Ask OSQR anything. Your question gets refined, then sent to a panel of AI experts for the best answer.
          </p>
        </div>

        <RefineFireChat
          ref={chatRef}
          workspaceId={workspaceId}
          onboardingCompleted={onboardingCompleted}
          userTier={userTier}
        />
      </div>
    </MainLayout>
  )
}
