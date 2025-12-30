'use client'

import { useState, useEffect } from 'react'
import { Trophy, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LeaderboardEntry, LabTier } from '@/lib/lab/types'

const TIER_COLORS: Record<LabTier, string> = {
  EXPLORER: 'text-blue-400',
  CONTRIBUTOR: 'text-purple-400',
  INSIDER: 'text-amber-400',
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
}

export function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/lab/leaderboard?limit=5')
      if (response.ok) {
        const data = await response.json()
        setLeaders(data.leaders)
        setUserRank(data.userRank)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-gray-400 text-sm py-4">Loading...</div>
  }

  if (leaders.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4">
        Be the first to join the leaderboard!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {leaders.map((leader) => (
        <div
          key={leader.rank}
          className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/50"
        >
          <div
            className={`w-6 text-center font-bold ${
              RANK_COLORS[leader.rank] || 'text-gray-500'
            }`}
          >
            {leader.rank <= 3 ? (
              <Trophy className="h-4 w-4 mx-auto" />
            ) : (
              leader.rank
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium truncate">
                {leader.name}
              </span>
              {leader.tier !== 'EXPLORER' && (
                <Badge
                  variant="outline"
                  className={`text-xs ${TIER_COLORS[leader.tier]} border-current`}
                >
                  {leader.tier.charAt(0)}
                </Badge>
              )}
            </div>
            {leader.streakDays > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Flame className="h-3 w-3 text-orange-400" />
                {leader.streakDays} day streak
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-white font-semibold">{leader.score}</div>
            <div className="text-xs text-gray-500">pts</div>
          </div>
        </div>
      ))}

      {userRank && userRank > 5 && (
        <div className="pt-2 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Your rank: <span className="text-white font-medium">#{userRank}</span>
          </div>
        </div>
      )}
    </div>
  )
}
