'use client'

import { useState, useEffect } from 'react'
import { Users, Trophy, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MemberData {
  id: string
  tier: string
  feedbackScore: number
  challengesCompleted: number
  streakDays: number
  joinedAt: string
  lastActiveAt: string | null
  user: {
    email: string
    name: string | null
  }
  activity: {
    reactions: number
    challenges: number
    deepDives: number
  }
}

const TIER_COLORS: Record<string, string> = {
  EXPLORER: 'bg-blue-900/50 text-blue-400',
  CONTRIBUTOR: 'bg-purple-900/50 text-purple-400',
  INSIDER: 'bg-amber-900/50 text-amber-400',
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberData[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<string>('')

  useEffect(() => {
    fetchMembers()
  }, [tierFilter])

  const fetchMembers = async () => {
    try {
      const url = tierFilter
        ? `/api/admin/lab/members?tier=${tierFilter}`
        : '/api/admin/lab/members'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
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
        <h1 className="text-2xl font-bold text-white">Lab Members</h1>
        <p className="text-gray-400">Manage lab members</p>
      </div>

      {/* Tier Filters */}
      <div className="flex gap-2">
        {['', 'EXPLORER', 'CONTRIBUTOR', 'INSIDER'].map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              tierFilter === tier
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tier || 'All'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">{members.length}</div>
                <div className="text-sm text-gray-400">Total Members</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {members.filter((m) => m.tier === 'INSIDER').length}
                </div>
                <div className="text-sm text-gray-400">Insiders</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-400" />
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.max(...members.map((m) => m.streakDays), 0)}
                </div>
                <div className="text-sm text-gray-400">Longest Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 text-sm font-medium py-3 px-2">User</th>
                  <th className="text-left text-gray-400 text-sm font-medium py-3 px-2">Tier</th>
                  <th className="text-right text-gray-400 text-sm font-medium py-3 px-2">Score</th>
                  <th className="text-right text-gray-400 text-sm font-medium py-3 px-2">Activity</th>
                  <th className="text-right text-gray-400 text-sm font-medium py-3 px-2">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-2">
                      <div className="text-white font-medium">
                        {member.user.name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={TIER_COLORS[member.tier]}>
                        {member.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="text-white font-semibold">{member.feedbackScore}</div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="text-sm text-gray-400">
                        {member.activity.reactions}r / {member.activity.challenges}c / {member.activity.deepDives}d
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-400">
                      {member.lastActiveAt
                        ? new Date(member.lastActiveAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
