'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, ChevronRight, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DeepDiveListItem } from '@/lib/lab/types'

const CATEGORY_COLORS: Record<string, string> = {
  INTENT_UNDERSTANDING: 'bg-blue-900/30 text-blue-400',
  RESPONSE_QUALITY: 'bg-green-900/30 text-green-400',
  MODE_CALIBRATION: 'bg-purple-900/30 text-purple-400',
  KNOWLEDGE_RETRIEVAL: 'bg-amber-900/30 text-amber-400',
  PERSONALIZATION: 'bg-pink-900/30 text-pink-400',
  CAPABILITY_GAP: 'bg-red-900/30 text-red-400',
}

export function DeepDiveList() {
  const [deepDives, setDeepDives] = useState<{
    available: DeepDiveListItem[]
    completed: { formId: string; completedAt: string }[]
  }>({ available: [], completed: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeepDives()
  }, [])

  const fetchDeepDives = async () => {
    try {
      const response = await fetch('/api/lab/deep-dives')
      if (response.ok) {
        const data = await response.json()
        setDeepDives(data)
      }
    } catch (error) {
      console.error('Failed to fetch deep dives:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-gray-400 text-sm py-4">Loading deep dives...</div>
    )
  }

  if (deepDives.available.length === 0 && deepDives.completed.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4">
        No deep dives available yet. Check back soon!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deepDives.available.map((deepDive) => (
        <DeepDiveCard key={deepDive.id} deepDive={deepDive} />
      ))}
      {deepDives.completed.length > 0 && (
        <div className="pt-2 text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-400" />
          {deepDives.completed.length} deep dive
          {deepDives.completed.length !== 1 ? 's' : ''} completed
        </div>
      )}
    </div>
  )
}

function DeepDiveCard({ deepDive }: { deepDive: DeepDiveListItem }) {
  return (
    <Link
      href={`/lab/deep-dives/${deepDive.id}`}
      className="block p-4 rounded-lg border bg-gray-900 border-gray-700 hover:border-gray-600 hover:bg-gray-850 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white mb-1">{deepDive.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {deepDive.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge className={CATEGORY_COLORS[deepDive.category] || 'bg-gray-800'}>
              {deepDive.category.replace(/_/g, ' ').toLowerCase()}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {deepDive.estimatedMinutes} min
            </span>
            <span className="text-xs text-amber-400">
              +{deepDive.pointsReward} pts
            </span>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
      </div>
    </Link>
  )
}
