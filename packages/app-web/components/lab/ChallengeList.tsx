'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ChallengeListItem } from '@/lib/lab/types'

const CATEGORY_COLORS: Record<string, string> = {
  INTENT_UNDERSTANDING: 'bg-blue-900/30 text-blue-400',
  RESPONSE_QUALITY: 'bg-green-900/30 text-green-400',
  MODE_CALIBRATION: 'bg-purple-900/30 text-purple-400',
  KNOWLEDGE_RETRIEVAL: 'bg-amber-900/30 text-amber-400',
  PERSONALIZATION: 'bg-pink-900/30 text-pink-400',
  CAPABILITY_GAP: 'bg-red-900/30 text-red-400',
}

export function ChallengeList() {
  const [challenges, setChallenges] = useState<{
    active: ChallengeListItem[]
    completed: { challengeId: string; completedAt: string }[]
  }>({ active: [], completed: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/lab/challenges')
      if (response.ok) {
        const data = await response.json()
        setChallenges(data)
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-gray-400 text-sm py-4">Loading challenges...</div>
    )
  }

  if (challenges.active.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4">
        No active challenges available. Check back soon!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {challenges.active.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}
      {challenges.completed.length > 0 && (
        <div className="pt-2 text-xs text-gray-500">
          {challenges.completed.length} challenge
          {challenges.completed.length !== 1 ? 's' : ''} completed
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ challenge }: { challenge: ChallengeListItem }) {
  const isLocked = !challenge.prerequisiteCompleted

  return (
    <Link
      href={isLocked ? '#' : `/lab/challenges/${challenge.id}`}
      className={`block p-4 rounded-lg border transition-colors ${
        isLocked
          ? 'bg-gray-900/50 border-gray-800 cursor-not-allowed'
          : 'bg-gray-900 border-gray-700 hover:border-gray-600 hover:bg-gray-850'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium ${isLocked ? 'text-gray-500' : 'text-white'}`}>
              {challenge.title}
            </h3>
            {isLocked && <Lock className="h-3 w-3 text-gray-500" />}
          </div>
          <p className={`text-sm line-clamp-2 ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>
            {challenge.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={CATEGORY_COLORS[challenge.category] || 'bg-gray-800'}>
              {challenge.category.replace(/_/g, ' ').toLowerCase()}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {challenge.estimatedMinutes} min
            </span>
            <span className="text-xs text-amber-400">
              +{challenge.pointsReward} pts
            </span>
            {challenge.compareMode && (
              <Badge variant="outline" className="text-xs border-purple-700 text-purple-400">
                Compare
              </Badge>
            )}
          </div>
        </div>
        {!isLocked && (
          <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
        )}
      </div>
    </Link>
  )
}
