'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.id) {
      // Fetch the user's workspace
      fetchWorkspace()
    }
  }, [status, session])

  const fetchWorkspace = async () => {
    try {
      const res = await fetch('/api/workspace')
      if (res.ok) {
        const data = await res.json()
        if (data.workspace) {
          // Check if onboarding is already completed
          if (data.workspace.onboardingCompleted) {
            router.push('/panel')
            return
          }
          setWorkspaceId(data.workspace.id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = async () => {
    // Mark onboarding as complete and redirect to panel
    router.push('/panel')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Setting up your workspace...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <OnboardingFlow
        isOpen={true}
        workspaceId={workspaceId}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}
