'use client'

import { useState, useEffect } from 'react'
import { Beaker, Trophy, Target, FileText, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LabStats } from './LabStats'
import { ChallengeList } from './ChallengeList'
import { DeepDiveList } from './DeepDiveList'
import { Leaderboard } from './Leaderboard'
import { LabOnboarding } from './LabOnboarding'
import { getTierInfo } from '@/lib/lab/tiers'
import { LabMemberFullResponse, LabTier } from '@/lib/lab/types'

export function LabHub() {
  const [member, setMember] = useState<LabMemberFullResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    fetchMember()
  }, [])

  const fetchMember = async () => {
    try {
      const response = await fetch('/api/lab/member')
      if (response.ok) {
        const data = await response.json()
        setMember(data)
      } else if (response.status === 404) {
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('Failed to fetch member:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    try {
      const response = await fetch('/api/lab/join', { method: 'POST' })
      if (response.ok) {
        setShowOnboarding(false)
        fetchMember()
      }
    } catch (error) {
      console.error('Failed to join lab:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (showOnboarding) {
    return <LabOnboarding onJoin={handleJoin} />
  }

  if (!member) {
    return null
  }

  const tierInfo = getTierInfo(member.member.tier as LabTier)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Beaker className="h-8 w-8 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">Oscar Lab</h1>
          </div>
          <p className="text-gray-400 mt-1">
            Help shape OSQR by sharing your feedback
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${tierInfo.color} bg-gray-800 border-gray-700`}>
            {tierInfo.icon} {tierInfo.name}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {member.member.feedbackScore}
            </div>
            <div className="text-xs text-gray-500">points</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <LabStats member={member} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Challenges - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-white">Active Challenges</CardTitle>
              </div>
              <CardDescription>
                Complete challenges to earn points and help improve OSQR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChallengeList />
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-white">Deep Dives</CardTitle>
              </div>
              <CardDescription>
                In-depth feedback forms for detailed insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeepDiveList />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-white">Leaderboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Leaderboard />
            </CardContent>
          </Card>

          {/* Tier Perks */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                Your {tierInfo.name} Perks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tierInfo.perks.map((perk, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <ChevronRight className="h-3 w-3 text-green-400" />
                    {perk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
