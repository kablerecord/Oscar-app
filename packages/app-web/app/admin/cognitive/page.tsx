'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface AnalyticsData {
  cognitiveProfiles: {
    profile: string
    count: number
    percentage: number
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

const PROFILE_COLORS: Record<string, string> = {
  analytical: '#3B82F6',
  strategic: '#10B981',
  creative: '#F59E0B',
  operational: '#8B5CF6',
  mixed: '#6B7280',
}

const MODE_COLORS = ['#3B82F6', '#10B981', '#F59E0B']

export default function AdminCognitive() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/analytics?days=30')
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
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Loading cognitive data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400 text-lg">Failed to load data</div>
      </div>
    )
  }

  // Prepare radar chart data
  const radarData = data.cognitiveProfiles.map((p) => ({
    subject: p.profile.charAt(0).toUpperCase() + p.profile.slice(1),
    A: p.percentage,
    fullMark: 100,
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Cognitive Profiles</h1>
        <p className="text-gray-400 mt-1">
          Aggregate analysis of user thinking patterns (content-free)
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl">🔒</span>
        <div>
          <div className="text-blue-300 font-medium">Privacy-Preserved Analytics</div>
          <div className="text-blue-300/70 text-sm">
            All data shown is aggregated and content-free. Individual user content is never exposed.
            These metrics show structural patterns only - how users interact, not what they say.
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Profiles"
          value={data.cognitiveProfiles.reduce((sum, p) => sum + p.count, 0).toString()}
          description="Users with cognitive data"
          icon="🧠"
        />
        <StatCard
          title="Dominant Type"
          value={data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile || 'N/A'}
          description="Most common profile"
          icon="📊"
          capitalize
        />
        <StatCard
          title="Pattern Breaks"
          value={data.surpriseAggregates.totalSurprises.toString()}
          description="Total surprise events"
          icon="⚡"
        />
        <StatCard
          title="Avg Surprises"
          value={data.surpriseAggregates.avgPerUser.toString()}
          description="Per user"
          icon="📈"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Distribution - Radar */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Distribution (Radar)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9CA3AF' }} />
                <Radar
                  name="Distribution"
                  dataKey="A"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response Mode Distribution */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Response Mode Preferences</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.responseModes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="mode"
                  label={({ name, percent }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {data.responseModes.map((entry, index) => (
                    <Cell key={entry.mode} fill={MODE_COLORS[index % MODE_COLORS.length]} />
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
        </div>
      </div>

      {/* Profile Type Details */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Profile Type Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {data.cognitiveProfiles.map((profile) => (
            <ProfileCard
              key={profile.profile}
              profile={profile.profile}
              count={profile.count}
              percentage={profile.percentage}
            />
          ))}
        </div>
      </div>

      {/* Surprise Patterns */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          Surprise Delta Patterns
          <span className="text-gray-400 text-sm font-normal ml-2">
            (When users break their typical patterns)
          </span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Dimension */}
          <div>
            <h3 className="text-gray-300 mb-4">By Dimension</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.surpriseAggregates.byDimension.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="dimension" stroke="#9CA3AF" width={120} />
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

          {/* By Significance */}
          <div>
            <h3 className="text-gray-300 mb-4">By Significance Level</h3>
            <div className="space-y-4">
              {data.surpriseAggregates.bySignificance.map((sig) => {
                const total = data.surpriseAggregates.totalSurprises || 1
                const percent = Math.round((sig.count / total) * 100)
                return (
                  <div key={sig.significance}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 capitalize">{sig.significance}</span>
                      <span className="text-gray-400">{sig.count} ({percent}%)</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          sig.significance === 'high'
                            ? 'bg-red-500'
                            : sig.significance === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Key Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            icon="🎯"
            title="Dominant Profile"
            description={`Most users (${
              data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.percentage || 0
            }%) are ${
              data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile || 'mixed'
            } type, indicating a preference for ${
              data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile === 'analytical'
                ? 'data-driven thinking'
                : data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile === 'strategic'
                ? 'long-term planning'
                : data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile === 'creative'
                ? 'innovative solutions'
                : data.cognitiveProfiles.sort((a, b) => b.count - a.count)[0]?.profile === 'operational'
                ? 'execution and action'
                : 'balanced approaches'
            }.`}
          />
          <InsightCard
            icon="⚡"
            title="Mode Preference"
            description={`${
              data.responseModes.sort((a, b) => b.count - a.count)[0]?.mode || 'quick'
            } mode is most used (${
              data.responseModes.sort((a, b) => b.count - a.count)[0]?.percentage || 0
            }%), suggesting users prefer ${
              data.responseModes.sort((a, b) => b.count - a.count)[0]?.mode === 'quick'
                ? 'fast, direct answers'
                : data.responseModes.sort((a, b) => b.count - a.count)[0]?.mode === 'thoughtful'
                ? 'balanced depth'
                : 'deep, comprehensive responses'
            }.`}
          />
          <InsightCard
            icon="📊"
            title="Pattern Breaks"
            description={`Average of ${data.surpriseAggregates.avgPerUser} surprise events per user indicates ${
              data.surpriseAggregates.avgPerUser > 5
                ? 'users are exploring different modes frequently'
                : data.surpriseAggregates.avgPerUser > 2
                ? 'moderate exploration of different approaches'
                : 'consistent, predictable behavior patterns'
            }.`}
          />
          <InsightCard
            icon="🔮"
            title="Opportunity"
            description={`The ${
              data.surpriseAggregates.byDimension[0]?.dimension || 'response_mode'
            } dimension shows the most pattern breaks, suggesting users may benefit from guidance in this area.`}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
  capitalize = false,
}: {
  title: string
  value: string
  description: string
  icon: string
  capitalize?: boolean
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className={`text-2xl font-bold text-white mt-1 ${capitalize ? 'capitalize' : ''}`}>
            {value}
          </p>
          <p className="text-gray-500 text-xs mt-1">{description}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}

function ProfileCard({
  profile,
  count,
  percentage,
}: {
  profile: string
  count: number
  percentage: number
}) {
  const descriptions: Record<string, string> = {
    analytical: 'Data-driven, detail-oriented',
    strategic: 'Big-picture, long-term thinking',
    creative: 'Innovative, outside-the-box',
    operational: 'Action-focused, execution',
    mixed: 'Balanced approach',
  }

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: `${PROFILE_COLORS[profile]}20`,
        borderColor: PROFILE_COLORS[profile],
      }}
    >
      <div className="text-white font-semibold capitalize mb-1">{profile}</div>
      <div className="text-3xl font-bold text-white">{count}</div>
      <div className="text-gray-400 text-sm">{percentage}%</div>
      <div className="text-gray-500 text-xs mt-2">{descriptions[profile]}</div>
    </div>
  )
}

function InsightCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-white font-medium">{title}</div>
          <div className="text-gray-400 text-sm mt-1">{description}</div>
        </div>
      </div>
    </div>
  )
}
