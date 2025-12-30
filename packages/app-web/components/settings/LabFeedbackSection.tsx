'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Beaker, ArrowRight, Trophy, Target, CheckCircle2, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Storage keys for Lab prompts - shared with other components
const LAB_PROMPTS_DISABLED_KEY = 'osqr_lab_prompts_disabled'

interface LabMemberInfo {
  tier: string
  feedbackScore: number
  challengesCompleted: number
  streakDays: number
}

export function LabFeedbackSection() {
  const [isLabMember, setIsLabMember] = useState<boolean | null>(null)
  const [memberInfo, setMemberInfo] = useState<LabMemberInfo | null>(null)
  const [joining, setJoining] = useState(false)
  const [promptsDisabled, setPromptsDisabled] = useState(false)

  useEffect(() => {
    // Check if prompts are disabled
    const disabled = localStorage.getItem(LAB_PROMPTS_DISABLED_KEY) === 'true'
    setPromptsDisabled(disabled)

    const checkMembership = async () => {
      try {
        const response = await fetch('/api/lab/member')
        if (response.ok) {
          const data = await response.json()
          setIsLabMember(true)
          setMemberInfo(data.member)
        } else if (response.status === 404) {
          setIsLabMember(false)
        }
      } catch {
        setIsLabMember(false)
      }
    }

    checkMembership()
  }, [])

  const togglePrompts = () => {
    const newValue = !promptsDisabled
    setPromptsDisabled(newValue)
    if (newValue) {
      localStorage.setItem(LAB_PROMPTS_DISABLED_KEY, 'true')
    } else {
      localStorage.removeItem(LAB_PROMPTS_DISABLED_KEY)
    }
  }

  const handleJoin = async () => {
    setJoining(true)
    try {
      const response = await fetch('/api/lab/join', { method: 'POST' })
      if (response.ok) {
        // Refresh membership status
        const memberResponse = await fetch('/api/lab/member')
        if (memberResponse.ok) {
          const data = await memberResponse.json()
          setIsLabMember(true)
          setMemberInfo(data.member)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setJoining(false)
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'INSIDER': return 'text-amber-400'
      case 'CONTRIBUTOR': return 'text-purple-400'
      default: return 'text-blue-400'
    }
  }

  if (isLabMember === null) {
    return (
      <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Beaker className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Oscar Lab</h2>
            <p className="text-sm text-neutral-400">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Beaker className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Oscar Lab</h2>
            <p className="text-sm text-neutral-400">
              {isLabMember ? 'Help shape the future of OSQR' : 'Join our feedback program'}
            </p>
          </div>
        </div>
        {isLabMember && memberInfo && (
          <div className="text-right">
            <div className={`text-sm font-medium ${getTierColor(memberInfo.tier)}`}>
              {memberInfo.tier}
            </div>
            <div className="text-xs text-neutral-500">{memberInfo.feedbackScore} points</div>
          </div>
        )}
      </div>

      {isLabMember && memberInfo ? (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
              <Trophy className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-white">{memberInfo.feedbackScore}</div>
              <div className="text-xs text-neutral-500">Points</div>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
              <Target className="h-4 w-4 text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-white">{memberInfo.challengesCompleted}</div>
              <div className="text-xs text-neutral-500">Challenges</div>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3 text-center">
              <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto mb-1" />
              <div className="text-lg font-semibold text-white">{memberInfo.streakDays}</div>
              <div className="text-xs text-neutral-500">Day Streak</div>
            </div>
          </div>

          {/* Go to Lab Button */}
          <Link href="/lab">
            <Button
              variant="outline"
              className="w-full border-neutral-700 hover:bg-neutral-800 cursor-pointer"
            >
              Go to Oscar Lab
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-400">
            Join Oscar Lab to share feedback, complete challenges, and earn rewards.
            Your insights directly influence what we build next.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              {joining ? 'Joining...' : 'Join Oscar Lab'}
            </Button>
            <Link href="/lab">
              <Button variant="outline" className="border-neutral-700 hover:bg-neutral-800 cursor-pointer">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Disable prompts toggle */}
          <div className="pt-3 border-t border-neutral-800">
            <button
              onClick={togglePrompts}
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400 cursor-pointer"
            >
              <BellOff className="h-3 w-3" />
              {promptsDisabled ? 'Lab reminders disabled' : 'Stop showing Lab reminders'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
