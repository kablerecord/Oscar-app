'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  MessageSquare,
  Target,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface OverviewData {
  members: {
    total: number
    byTier: { EXPLORER: number; CONTRIBUTOR: number; INSIDER: number }
    newThisWeek: number
    activeThisWeek: number
  }
  reactions: {
    total: number
    thisWeek: number
    byType: Record<string, number>
    positiveRate: number
  }
  challenges: {
    totalResponses: number
    thisWeek: number
    completionRate: number
  }
  deepDives: {
    totalResponses: number
    thisWeek: number
  }
  insights: {
    total: number
    actionable: number
    resolved: number
  }
  categoryHealth: {
    category: string
    sentiment: number
    volume: number
    trend: 'improving' | 'stable' | 'declining'
  }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  INTENT_UNDERSTANDING: 'Intent',
  RESPONSE_QUALITY: 'Quality',
  MODE_CALIBRATION: 'Modes',
  KNOWLEDGE_RETRIEVAL: 'Knowledge',
  PERSONALIZATION: 'Personal',
  CAPABILITY_GAP: 'Gaps',
}

export default function AdminLabOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/admin/lab/overview')
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error)
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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Failed to load data</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Oscar Lab</h1>
        <p className="text-gray-400 mt-1">Structured feedback dashboard</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Lab Members"
          value={data.members.total}
          subtitle={`${data.members.newThisWeek} new this week`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Reactions"
          value={data.reactions.total}
          subtitle={`${Math.round(data.reactions.positiveRate * 100)}% positive`}
          icon={MessageSquare}
          color="green"
        />
        <MetricCard
          title="Challenges"
          value={data.challenges.totalResponses}
          subtitle={`${data.challenges.thisWeek} this week`}
          icon={Target}
          color="purple"
        />
        <MetricCard
          title="Insights"
          value={data.insights.total}
          subtitle={`${data.insights.actionable} actionable`}
          icon={Lightbulb}
          color="amber"
        />
      </div>

      {/* Category Health & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Health */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Category Health</CardTitle>
            <CardDescription>Sentiment by feedback category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.categoryHealth.map((cat) => (
                <div key={cat.category} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-gray-400">
                    {CATEGORY_LABELS[cat.category] || cat.category}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          cat.sentiment > 0.3
                            ? 'bg-green-500'
                            : cat.sentiment > 0
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${((cat.sentiment + 1) / 2) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    {cat.trend === 'improving' && (
                      <TrendingUp className="h-4 w-4 text-green-400 inline" />
                    )}
                    {cat.trend === 'declining' && (
                      <TrendingDown className="h-4 w-4 text-red-400 inline" />
                    )}
                    {cat.trend === 'stable' && (
                      <Minus className="h-4 w-4 text-gray-400 inline" />
                    )}
                    <span className="text-xs text-gray-500 ml-1">
                      {cat.volume}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <QuickLink
                href="/admin/lab/challenges"
                title="Manage Challenges"
                subtitle={`${data.challenges.totalResponses} total responses`}
              />
              <QuickLink
                href="/admin/lab/insights"
                title="View Insights"
                subtitle={`${data.insights.actionable} need action`}
              />
              <QuickLink
                href="/admin/lab/members"
                title="Lab Members"
                subtitle={`${data.members.activeThisWeek} active this week`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Tiers */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Member Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <TierCard
              tier="Explorer"
              count={data.members.byTier.EXPLORER}
              total={data.members.total}
              color="blue"
            />
            <TierCard
              tier="Contributor"
              count={data.members.byTier.CONTRIBUTOR}
              total={data.members.total}
              color="purple"
            />
            <TierCard
              tier="Insider"
              count={data.members.byTier.INSIDER}
              total={data.members.total}
              color="amber"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  color: 'blue' | 'green' | 'purple' | 'amber'
}) {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    purple: 'from-purple-600 to-purple-800',
    amber: 'from-amber-600 to-amber-800',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className="text-white/60 text-xs mt-1">{subtitle}</p>
        </div>
        <Icon className="h-8 w-8 text-white/40" />
      </div>
    </div>
  )
}

function QuickLink({
  href,
  title,
  subtitle,
}: {
  href: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-600 transition-colors"
    >
      <div>
        <div className="text-white font-medium">{title}</div>
        <div className="text-sm text-gray-400">{subtitle}</div>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-500" />
    </Link>
  )
}

function TierCard({
  tier,
  count,
  total,
  color,
}: {
  tier: string
  count: number
  total: number
  color: 'blue' | 'purple' | 'amber'
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-700/50 text-blue-400',
    purple: 'bg-purple-900/30 border-purple-700/50 text-purple-400',
    amber: 'bg-amber-900/30 border-amber-700/50 text-amber-400',
  }

  return (
    <div className={`flex-1 p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-2xl font-bold text-white">{count}</div>
      <div className="text-sm">{tier}</div>
      <div className="text-xs text-gray-500">{percent}% of total</div>
    </div>
  )
}
