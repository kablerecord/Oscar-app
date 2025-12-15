'use client'

import { useEffect, useState } from 'react'

interface UserMetrics {
  userId: string
  email: string
  createdAt: string
  lastActiveAt: string | null
  workspaceCount: number
  conversationCount: number
  messageCount: number
  avgMessagesPerConversation: number
  mscItemCount: number
  documentCount: number
  engagementScore: number
  retentionDays: number
}

interface UsersData {
  users: UserMetrics[]
  total: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export default function AdminUsers() {
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'lastActive' | 'messageCount' | 'created'>('lastActive')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(page * limit),
          sortBy,
          sortOrder,
        })
        const res = await fetch(`/api/admin/users?${params}`)
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
  }, [sortBy, sortOrder, page])

  const handleSort = (field: 'lastActive' | 'messageCount' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(0)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">
            {data ? `${data.total} total users` : 'Loading...'}
          </p>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value as any)}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600"
          >
            <option value="lastActive">Last Active</option>
            <option value="messageCount">Message Count</option>
            <option value="created">Join Date</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 hover:bg-gray-600"
          >
            {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left p-4 text-gray-400 font-medium">User</th>
              <th className="text-center p-4 text-gray-400 font-medium">Engagement</th>
              <th className="text-center p-4 text-gray-400 font-medium">Messages</th>
              <th className="text-center p-4 text-gray-400 font-medium">Conversations</th>
              <th className="text-center p-4 text-gray-400 font-medium">MSC Items</th>
              <th className="text-center p-4 text-gray-400 font-medium">Documents</th>
              <th className="text-center p-4 text-gray-400 font-medium">Retention</th>
              <th className="text-right p-4 text-gray-400 font-medium">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Loading users...
                </td>
              </tr>
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              data?.users.map((user) => (
                <tr key={user.userId} className="hover:bg-gray-750">
                  <td className="p-4">
                    <div>
                      <div className="text-white font-medium">{user.email}</div>
                      <div className="text-gray-500 text-xs">
                        Joined {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${getEngagementColor(user.engagementScore)}`}>
                      {user.engagementScore}%
                    </span>
                  </td>
                  <td className="p-4 text-center text-white">
                    {user.messageCount.toLocaleString()}
                  </td>
                  <td className="p-4 text-center text-white">
                    {user.conversationCount}
                  </td>
                  <td className="p-4 text-center text-white">
                    {user.mscItemCount}
                  </td>
                  <td className="p-4 text-center text-white">
                    {user.documentCount}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`${user.retentionDays > 7 ? 'text-green-400' : 'text-gray-400'}`}>
                      {user.retentionDays} days
                    </span>
                  </td>
                  <td className="p-4 text-right text-gray-400 text-sm">
                    {formatDate(user.lastActiveAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.total)} of {data.total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.pagination.hasMore}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {data && data.users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SummaryCard
            title="Avg Engagement"
            value={`${Math.round(data.users.reduce((sum, u) => sum + u.engagementScore, 0) / data.users.length)}%`}
          />
          <SummaryCard
            title="Avg Messages/User"
            value={Math.round(data.users.reduce((sum, u) => sum + u.messageCount, 0) / data.users.length).toString()}
          />
          <SummaryCard
            title="Avg Retention"
            value={`${Math.round(data.users.reduce((sum, u) => sum + u.retentionDays, 0) / data.users.length)} days`}
          />
          <SummaryCard
            title="Active Today"
            value={data.users.filter(u => {
              if (!u.lastActiveAt) return false
              const lastActive = new Date(u.lastActiveAt)
              const today = new Date()
              return lastActive.toDateString() === today.toDateString()
            }).length.toString()}
          />
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-gray-400 text-sm">{title}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
  )
}
