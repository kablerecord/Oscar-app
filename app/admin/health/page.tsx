'use client'

import { useEffect, useState } from 'react'

interface HealthData {
  overallScore: number
  components: {
    name: string
    status: 'healthy' | 'degraded' | 'down'
    latencyMs?: number
    errorRate?: number
  }[]
  recentErrors: {
    timestamp: string
    type: string
    count: number
  }[]
}

export default function AdminHealth() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/admin/health')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'degraded':
        return 'bg-yellow-500'
      case 'down':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-900/30 border-green-700'
      case 'degraded':
        return 'bg-yellow-900/30 border-yellow-700'
      case 'down':
        return 'bg-red-900/30 border-red-700'
      default:
        return 'bg-gray-900/30 border-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 text-lg">Checking system health...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400 text-lg">Failed to load health status</div>
      </div>
    )
  }

  const healthyCount = data.components.filter(c => c.status === 'healthy').length
  const totalCount = data.components.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Health</h1>
          <p className="text-gray-400 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Refresh Now
        </button>
      </div>

      {/* Overall Health Score */}
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Overall Health Score</h2>
            <p className="text-gray-400">
              {healthyCount} of {totalCount} components healthy
            </p>
          </div>
          <div className="text-right">
            <div
              className={`text-6xl font-bold ${
                data.overallScore >= 90
                  ? 'text-green-400'
                  : data.overallScore >= 70
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              {data.overallScore}%
            </div>
            <div className="text-gray-400 mt-1">
              {data.overallScore >= 90
                ? 'All systems operational'
                : data.overallScore >= 70
                ? 'Minor issues detected'
                : 'Critical issues detected'}
            </div>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mt-6 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              data.overallScore >= 90
                ? 'bg-green-500'
                : data.overallScore >= 70
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${data.overallScore}%` }}
          />
        </div>
      </div>

      {/* Component Status */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">System Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.components.map((component) => (
            <div
              key={component.name}
              className={`rounded-lg p-6 border ${getStatusBgColor(component.status)}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-3 h-3 rounded-full ${getStatusColor(component.status)}`} />
                <span className="text-white font-semibold">{component.name}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={`capitalize ${
                      component.status === 'healthy'
                        ? 'text-green-400'
                        : component.status === 'degraded'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {component.status}
                  </span>
                </div>

                {component.latencyMs !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Latency</span>
                    <span
                      className={
                        component.latencyMs < 100
                          ? 'text-green-400'
                          : component.latencyMs < 500
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {component.latencyMs}ms
                    </span>
                  </div>
                )}

                {component.errorRate !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Error Rate</span>
                    <span
                      className={
                        component.errorRate < 0.01
                          ? 'text-green-400'
                          : component.errorRate < 0.05
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {(component.errorRate * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status History (Placeholder) */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Uptime History</h2>
        <div className="flex gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-8 bg-green-500 rounded"
              title={`Day ${30 - i}: 100% uptime`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-gray-400 text-sm">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Errors</h2>
        {data.recentErrors.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No recent errors - all systems running smoothly
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentErrors.map((error, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800 rounded-lg"
              >
                <div>
                  <span className="text-red-400 font-medium">{error.type}</span>
                  <span className="text-gray-400 ml-4 text-sm">
                    {new Date(error.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className="text-red-400">{error.count} occurrences</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-left transition-colors">
          <div className="text-2xl mb-2">🔄</div>
          <div className="text-white font-medium">Clear Cache</div>
          <div className="text-gray-400 text-sm">Flush application caches</div>
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-left transition-colors">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-white font-medium">View Logs</div>
          <div className="text-gray-400 text-sm">Access system logs</div>
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 text-left transition-colors">
          <div className="text-2xl mb-2">🔔</div>
          <div className="text-white font-medium">Alert Settings</div>
          <div className="text-gray-400 text-sm">Configure notifications</div>
        </button>
      </div>
    </div>
  )
}
