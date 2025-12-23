'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface OverviewData {
  overview: {
    totalUsers: number
    activeUsersToday: number
    activeUsersWeek: number
    activeUsersMonth: number
    totalWorkspaces: number
    totalConversations: number
    totalMessages: number
    avgMessagesPerUser: number
    platformHealthScore: number
  }
  trends: {
    date: string
    activeUsers: number
    newUsers: number
    conversations: number
    messages: number
  }[]
  health: {
    overallScore: number
    components: { name: string; status: string; latencyMs?: number }[]
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/overview')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400 text-lg">{error || 'No data available'}</div>
      </div>
    )
  }

  const { overview, trends, health } = data

  // Prepare pie chart data for active users
  const activeUsersPie = [
    { name: 'Active Today', value: overview.activeUsersToday },
    { name: 'Active Week', value: overview.activeUsersWeek - overview.activeUsersToday },
    { name: 'Inactive', value: overview.totalUsers - overview.activeUsersWeek },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Overview</h1>
        <p className="text-gray-400 mt-1">Real-time metrics and analytics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview.totalUsers}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Active Today"
          value={overview.activeUsersToday}
          subtitle={`${Math.round((overview.activeUsersToday / overview.totalUsers) * 100)}% of total`}
          icon="🟢"
          color="green"
        />
        <MetricCard
          title="Total Conversations"
          value={overview.totalConversations}
          icon="💬"
          color="purple"
        />
        <MetricCard
          title="Platform Health"
          value={`${overview.platformHealthScore}%`}
          icon={overview.platformHealthScore > 80 ? '💚' : overview.platformHealthScore > 50 ? '💛' : '❤️'}
          color={overview.platformHealthScore > 80 ? 'green' : overview.platformHealthScore > 50 ? 'yellow' : 'red'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Engagement Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorMessages)"
                  name="Messages"
                />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Conversations"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Users Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">User Activity Distribution</h2>
          <div className="h-64 flex items-center justify-center">
            {activeUsersPie.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeUsersPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#9CA3AF' }}
                  >
                    {activeUsersPie.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
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
              <div className="text-gray-400">No user data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* New Users Trend */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">New User Signups</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
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
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#F59E0B"
                strokeWidth={2}
                name="New Users"
                dot={{ fill: '#F59E0B', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">System Components</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {health.components.map((component) => (
            <div
              key={component.name}
              className={`p-4 rounded-lg border ${
                component.status === 'healthy'
                  ? 'bg-green-900/20 border-green-700'
                  : component.status === 'degraded'
                  ? 'bg-yellow-900/20 border-yellow-700'
                  : 'bg-red-900/20 border-red-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    component.status === 'healthy'
                      ? 'bg-green-500'
                      : component.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-white font-medium">{component.name}</span>
              </div>
              {component.latencyMs && (
                <div className="text-gray-400 text-sm mt-1">
                  {component.latencyMs}ms latency
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Messages"
          value={overview.totalMessages.toLocaleString()}
          description="All-time messages sent"
        />
        <StatCard
          title="Avg Messages/User"
          value={overview.avgMessagesPerUser.toFixed(1)}
          description="Average engagement"
        />
        <StatCard
          title="Active This Week"
          value={String(overview.activeUsersWeek)}
          description={`${Math.round((overview.activeUsersWeek / overview.totalUsers) * 100)}% retention`}
        />
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

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{description}</p>
    </div>
  )
}
