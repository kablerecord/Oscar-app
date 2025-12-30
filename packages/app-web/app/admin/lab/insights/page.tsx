'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InsightData {
  id: string
  category: string
  title: string
  summary: string
  sampleSize: number
  sentiment: number
  confidence: number
  status: string
  actionTaken: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  NEW: { icon: Lightbulb, color: 'bg-blue-900/50 text-blue-400' },
  REVIEWING: { icon: Clock, color: 'bg-yellow-900/50 text-yellow-400' },
  ACTIONABLE: { icon: AlertCircle, color: 'bg-purple-900/50 text-purple-400' },
  IN_PROGRESS: { icon: Clock, color: 'bg-amber-900/50 text-amber-400' },
  RESOLVED: { icon: CheckCircle, color: 'bg-green-900/50 text-green-400' },
  WONT_FIX: { icon: CheckCircle, color: 'bg-gray-700 text-gray-400' },
}

export default function AdminInsightsPage() {
  const [insights, setInsights] = useState<InsightData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    fetchInsights()
  }, [filter])

  const fetchInsights = async () => {
    try {
      const url = filter
        ? `/api/admin/lab/insights?status=${filter}`
        : '/api/admin/lab/insights'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Insights</h1>
        <p className="text-gray-400">Aggregated feedback insights</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'NEW', 'REVIEWING', 'ACTIONABLE', 'IN_PROGRESS', 'RESOLVED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {insights.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No insights found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => {
            const config = STATUS_CONFIG[insight.status] || STATUS_CONFIG.NEW
            const Icon = config.icon
            return (
              <Card key={insight.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{insight.title}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {insight.category.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={config.color}>
                      {insight.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">{insight.summary}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>Sample: {insight.sampleSize}</span>
                    <span>
                      Sentiment: {insight.sentiment > 0 ? '+' : ''}
                      {(insight.sentiment * 100).toFixed(0)}%
                    </span>
                    <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {insight.actionTaken && (
                    <div className="mt-3 p-2 rounded bg-gray-900 text-sm text-gray-300">
                      <span className="text-gray-500">Action: </span>
                      {insight.actionTaken}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
