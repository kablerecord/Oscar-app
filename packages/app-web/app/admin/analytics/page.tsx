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
  Legend,
} from 'recharts'

interface AnalyticsData {
  engagementTrends: {
    date: string
    activeUsers: number
    newUsers: number
    conversations: number
    messages: number
  }[]
  cognitiveProfiles: {
    profile: string
    count: number
    percentage: number
  }[]
  featureUsage: {
    feature: string
    usageCount: number
    uniqueUsers: number
    trend: string
  }[]
  responseModes: {
    mode: string
    count: number
    percentage: number
  }[]
  surpriseAggregates: {
    totalSurprises: number
    byDimension: { dimension: string; count: number }[]
    bySignificance: { significance: string; count: number }[]
    avgPerUser: number
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const PROFILE_COLORS: Record<string, string> = {
  analytical: '#3B82F6',
  strategic: '#10B981',
  creative: '#F59E0B',
  operational: '#8B5CF6',
  mixed: '#6B7280',
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/analytics?days=${days}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400 text-lg">Failed to load analytics</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Deep dive into platform metrics</p>
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

      {/* Active Users Over Time */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Daily Active Users</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.engagementTrends}>
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
              <Legend />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Active Users"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#10B981"
                strokeWidth={2}
                name="New Users"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Mode Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Response Mode Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.responseModes}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  nameKey="mode"
                  label={({ name, percent }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {data.responseModes.map((entry, index) => (
                    <Cell key={entry.mode} fill={COLORS[index % COLORS.length]} />
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
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {data.responseModes.map((mode, index) => (
              <div key={mode.mode} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-300 text-sm capitalize">{mode.mode}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive Profile Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">User Cognitive Profiles</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cognitiveProfiles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis
                  type="category"
                  dataKey="profile"
                  stroke="#9CA3AF"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" name="Users">
                  {data.cognitiveProfiles.map((entry) => (
                    <Cell
                      key={entry.profile}
                      fill={PROFILE_COLORS[entry.profile] || '#6B7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Feature Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.featureUsage.map((feature) => (
            <div
              key={feature.feature}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{feature.feature}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    feature.trend === 'up'
                      ? 'bg-green-900 text-green-400'
                      : feature.trend === 'down'
                      ? 'bg-red-900 text-red-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {feature.trend === 'up' ? '↑' : feature.trend === 'down' ? '↓' : '→'} {feature.trend}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                {feature.usageCount.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">
                {feature.uniqueUsers} unique users
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Surprise Delta Analysis */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          Surprise Delta Analysis
          <span className="text-gray-400 text-sm font-normal ml-2">
            (Pattern breaks detected)
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Surprises</div>
            <div className="text-2xl font-bold text-white">
              {data.surpriseAggregates.totalSurprises}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Avg Per User</div>
            <div className="text-2xl font-bold text-white">
              {data.surpriseAggregates.avgPerUser}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 col-span-2">
            <div className="text-gray-400 text-sm mb-2">By Significance</div>
            <div className="flex gap-2">
              {data.surpriseAggregates.bySignificance.map((sig) => (
                <span
                  key={sig.significance}
                  className={`px-3 py-1 rounded text-sm ${
                    sig.significance === 'high'
                      ? 'bg-red-900 text-red-400'
                      : sig.significance === 'medium'
                      ? 'bg-yellow-900 text-yellow-400'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {sig.significance}: {sig.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.surpriseAggregates.byDimension.slice(0, 6)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="dimension" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" name="Surprises" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Message Activity */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Message Activity</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.engagementTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric' })}
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
              <Bar dataKey="messages" fill="#3B82F6" name="Messages" />
              <Bar dataKey="conversations" fill="#10B981" name="Conversations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
