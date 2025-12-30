'use client'

import { use } from 'react'
import { ChallengeFlow } from '@/components/lab/ChallengeFlow'

interface ChallengePageProps {
  params: Promise<{ id: string }>
}

export default function ChallengePage({ params }: ChallengePageProps) {
  const { id } = use(params)

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ChallengeFlow challengeId={id} />
      </div>
    </div>
  )
}
