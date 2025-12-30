'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { InsightImpact, InsightStatus } from '@/lib/lab/types'

const STATUS_CONFIG: Record<InsightStatus, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  NEW: { icon: Lightbulb, color: 'text-blue-400', label: 'Discovered' },
  REVIEWING: { icon: Clock, color: 'text-yellow-400', label: 'Under Review' },
  ACTIONABLE: { icon: ArrowRight, color: 'text-purple-400', label: 'Taking Action' },
  IN_PROGRESS: { icon: Clock, color: 'text-amber-400', label: 'In Progress' },
  RESOLVED: { icon: CheckCircle, color: 'text-green-400', label: 'Implemented' },
  WONT_FIX: { icon: CheckCircle, color: 'text-gray-400', label: 'Noted' },
}

export function ImpactFeed() {
  const [impact, setImpact] = useState<{
    totalContributions: number
    insightsInfluenced: InsightImpact[]
    featuresInfluenced: string[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImpact()
  }, [])

  const fetchImpact = async () => {
    try {
      const response = await fetch('/api/lab/impact')
      if (response.ok) {
        const data = await response.json()
        setImpact(data)
      }
    } catch (error) {
      console.error('Failed to fetch impact:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-sm py-4">Loading...</div>
  }

  if (!impact || (impact.insightsInfluenced.length === 0 && impact.featuresInfluenced.length === 0)) {
    return (
      <div className="text-center py-6">
        <Lightbulb className="h-8 w-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">
          Your feedback will shape OSQR&apos;s future. Keep contributing!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {impact.insightsInfluenced.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Insights You Shaped
          </h4>
          {impact.insightsInfluenced.map((insight) => {
            const config = STATUS_CONFIG[insight.status]
            const Icon = config.icon
            return (
              <div
                key={insight.id}
                className="p-3 rounded-lg bg-gray-900/50 border border-gray-800"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{insight.title}</div>
                    <div className={`text-xs ${config.color}`}>{config.label}</div>
                    {insight.actionTaken && (
                      <div className="text-xs text-gray-500 mt-1">
                        {insight.actionTaken}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {impact.featuresInfluenced.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Features You Influenced
          </h4>
          {impact.featuresInfluenced.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-green-900/20 border border-green-800/50"
            >
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">{feature}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
