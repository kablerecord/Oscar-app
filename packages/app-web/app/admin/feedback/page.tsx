'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface FeedbackData {
  summary: {
    total: number
    bySource: Record<string, number>
    bySentiment: Record<string, number>
    trainingMetrics: {
      buttonCount: number
      naturalLanguageCount: number
      ratio: string
      readyToRemoveButton: boolean
      goal: string
    }
  }
  chatFeedback: {
    total: number
    thumbsUp: number
    thumbsDown: number
    withComments: number
    recent: {
      id: string
      content: string
      feedback?: string
      comment?: string
      feedbackAt?: string
      commentAt?: string
      createdAt: string
      user?: { email?: string; name?: string }
    }[]
  }
  recentFeedback: {
    id: string
    source: string
    sentiment?: string
    rating?: number
    message?: string
    pageUrl?: string
    responseMode?: string
    createdAt: string
    user: { email?: string; name?: string }
  }[]
  trend: { date: string; count: number }[]
  timeRange: { days: number; since: string }
}

const SOURCE_COLORS: Record<string, string> = {
  BUTTON: '#3B82F6',
  NATURAL_LANGUAGE: '#10B981',
  RESPONSE_RATING: '#F59E0B',
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280',
}

export default function AdminFeedback() {
  const [data, setData] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/feedback?days=${days}`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.details || json.error || 'Failed to fetch')
        }
        setData(json)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Loading feedback data...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Failed to load feedback data</div>
          {error && <div className="text-red-300 text-sm">{error}</div>}
        </div>
      </div>
    )
  }

  // Prepare pie chart data
  const sourceData = Object.entries(data.summary.bySource).map(([source, count]) => ({
    name: source.replace('_', ' '),
    value: count,
    color: SOURCE_COLORS[source] || '#6B7280',
  }))

  const sentimentData = Object.entries(data.summary.bySentiment).map(([sentiment, count]) => ({
    name: sentiment,
    value: count,
    color: SENTIMENT_COLORS[sentiment] || '#6B7280',
  }))

  const { trainingMetrics } = data.summary

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Feedback Dashboard</h1>
          <p className="text-gray-400 mt-1">All feedback from across OSQR in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Time Range:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Feedback"
          value={data.summary.total}
          icon="💬"
          color="blue"
        />
        <MetricCard
          title="Thumbs Up"
          value={data.chatFeedback.thumbsUp}
          subtitle={`${data.chatFeedback.thumbsDown} thumbs down`}
          icon="👍"
          color="green"
        />
        <MetricCard
          title="With Comments"
          value={data.chatFeedback.withComments}
          subtitle="Detailed feedback"
          icon="📝"
          color="purple"
        />
        <MetricCard
          title="NL Ratio"
          value={trainingMetrics.ratio}
          subtitle={trainingMetrics.readyToRemoveButton ? '✅ Ready to remove button!' : 'Goal: 10.0'}
          icon={trainingMetrics.readyToRemoveButton ? '🎉' : '📊'}
          color={trainingMetrics.readyToRemoveButton ? 'green' : 'yellow'}
        />
      </div>

      {/* Training Metrics Banner */}
      <div className={`rounded-xl p-6 border ${
        trainingMetrics.readyToRemoveButton
          ? 'bg-green-900/20 border-green-700'
          : 'bg-blue-900/20 border-blue-700'
      }`}>
        <h2 className="text-xl font-semibold text-white mb-3">
          Natural Language Training Progress
        </h2>
        <p className="text-gray-300 mb-4">{trainingMetrics.goal}</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Button Feedback</div>
            <div className="text-2xl font-bold text-blue-400">{trainingMetrics.buttonCount}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Natural Language</div>
            <div className="text-2xl font-bold text-green-400">{trainingMetrics.naturalLanguageCount}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Ratio (NL:Button)</div>
            <div className="text-2xl font-bold text-white">{trainingMetrics.ratio}</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback by Source */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Feedback by Source</h2>
          <div className="h-64">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {sourceData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No feedback data yet
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {sourceData.map((source) => (
              <div key={source.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: source.color }}
                />
                <span className="text-gray-300 text-sm">{source.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback by Sentiment */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Feedback Sentiment</h2>
          <div className="h-64">
            {sentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    {sentimentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No sentiment data yet
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {sentimentData.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-gray-300 text-sm capitalize">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback Trend */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Daily Feedback Volume</h2>
        <div className="h-48">
          {data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#3B82F6" name="Feedback" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No trend data yet
            </div>
          )}
        </div>
      </div>

      {/* Chat Feedback with Comments */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Chat Feedback
          <span className="text-gray-400 text-sm font-normal ml-2">
            (Thumbs up/down & comments on responses)
          </span>
        </h2>

        {data.chatFeedback.recent.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.chatFeedback.recent.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg ${
                        item.feedback === 'good' ? '' : item.feedback === 'bad' ? '' : 'text-gray-400'
                      }`}
                    >
                      {item.feedback === 'good' ? '👍' : item.feedback === 'bad' ? '👎' : '💬'}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {item.user?.email || 'Unknown user'}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {item.comment && (
                  <div className="bg-gray-800 rounded-lg p-3 mb-2">
                    <p className="text-white text-sm">&ldquo;{item.comment}&rdquo;</p>
                  </div>
                )}
                {item.content && (
                  <p className="text-gray-400 text-sm italic line-clamp-2">
                    Response: {item.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No chat feedback yet
          </div>
        )}
      </div>

      {/* Recent Feedback Feed */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent UserFeedback
          <span className="text-gray-400 text-sm font-normal ml-2">
            (From feedback forms & natural language)
          </span>
        </h2>

        {data.recentFeedback.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.recentFeedback.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.source === 'BUTTON'
                          ? 'bg-blue-900 text-blue-400'
                          : item.source === 'NATURAL_LANGUAGE'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-yellow-900 text-yellow-400'
                      }`}
                    >
                      {item.source.replace('_', ' ')}
                    </span>
                    {item.sentiment && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.sentiment === 'positive'
                            ? 'bg-green-900/50 text-green-400'
                            : item.sentiment === 'negative'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    )}
                    {item.rating && (
                      <span className="text-yellow-400 text-sm">
                        {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {item.message && (
                  <p className="text-white text-sm mb-2">{item.message}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{item.user?.email || 'Unknown user'}</span>
                  {item.pageUrl && <span>from: {item.pageUrl}</span>}
                  {item.responseMode && <span>mode: {item.responseMode}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No feedback submissions yet
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: number | string
  subtitle?: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
}) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    purple: 'from-purple-600 to-purple-800',
    yellow: 'from-yellow-600 to-yellow-800',
    red: 'from-red-600 to-red-800',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  )
}
