'use client'

import { useState } from 'react'
import { Beaker, Rocket, Trophy, Lightbulb, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface LabOnboardingProps {
  onJoin: () => void
}

export function LabOnboarding({ onJoin }: LabOnboardingProps) {
  const [joining, setJoining] = useState(false)

  const handleJoin = async () => {
    setJoining(true)
    await onJoin()
    setJoining(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
          <Beaker className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Welcome to OSQR Lab</h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Shape the future of OSQR by sharing your feedback. Your insights directly
          influence what we build next.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <Rocket className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <h3 className="font-medium text-white mb-2">Early Access</h3>
            <p className="text-sm text-gray-400">
              Be first to try new features before anyone else
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <h3 className="font-medium text-white mb-2">Earn Rewards</h3>
            <p className="text-sm text-gray-400">
              Level up through tiers and unlock special perks
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6 text-center">
            <Lightbulb className="h-8 w-8 text-green-400 mx-auto mb-3" />
            <h3 className="font-medium text-white mb-2">Real Impact</h3>
            <p className="text-sm text-gray-400">
              See your feedback turn into actual product improvements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-medium text-white text-center mb-4">How It Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700 flex items-center justify-center text-xs text-blue-400 flex-shrink-0">
                1
              </div>
              <div>
                <div className="text-white font-medium">Quick Reactions</div>
                <div className="text-sm text-gray-400">
                  Thumbs up/down on responses as you chat. Takes 2 seconds.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-900/50 border border-purple-700 flex items-center justify-center text-xs text-purple-400 flex-shrink-0">
                2
              </div>
              <div>
                <div className="text-white font-medium">Weekly Challenges</div>
                <div className="text-sm text-gray-400">
                  Guided tasks to test specific features. 3-5 minutes each.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-900/50 border border-amber-700 flex items-center justify-center text-xs text-amber-400 flex-shrink-0">
                3
              </div>
              <div>
                <div className="text-white font-medium">Deep Dives</div>
                <div className="text-sm text-gray-400">
                  Detailed feedback forms when we need your expertise.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <Button
          onClick={handleJoin}
          disabled={joining}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 cursor-pointer"
        >
          {joining ? (
            'Joining...'
          ) : (
            <>
              Join OSQR Lab
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 mt-3">
          Free to join. You can leave anytime.
        </p>
      </div>
    </div>
  )
}
