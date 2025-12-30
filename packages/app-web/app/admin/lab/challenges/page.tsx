'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ChallengeData {
  id: string
  title: string
  description: string
  category: string
  status: string
  compareMode: boolean
  estimatedMinutes: number
  pointsReward: number
  responseCount: number
  avgCompletionTime: number
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-700 text-gray-300',
  ACTIVE: 'bg-green-900/50 text-green-400',
  PAUSED: 'bg-yellow-900/50 text-yellow-400',
  COMPLETED: 'bg-blue-900/50 text-blue-400',
  ARCHIVED: 'bg-gray-800 text-gray-500',
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/admin/lab/challenges')
      if (response.ok) {
        const data = await response.json()
        setChallenges(data.challenges)
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          <p className="text-gray-400">Manage lab challenges</p>
        </div>
        <Link href="/admin/lab/challenges/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>
        </Link>
      </div>

      {challenges.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400">No challenges yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <Link key={challenge.id} href={`/admin/lab/challenges/${challenge.id}`}>
              <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{challenge.title}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {challenge.description}
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[challenge.status]}>
                      {challenge.status.toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {challenge.responseCount} responses
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {challenge.estimatedMinutes} min
                    </span>
                    <span className="text-amber-400">
                      +{challenge.pointsReward} pts
                    </span>
                    {challenge.compareMode && (
                      <Badge variant="outline" className="border-purple-700 text-purple-400">
                        Compare
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
