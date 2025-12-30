'use client'

import { MessageSquare, Target, FileText, Lightbulb } from 'lucide-react'
import { LabMemberFullResponse } from '@/lib/lab/types'

interface LabStatsProps {
  member: LabMemberFullResponse
}

export function LabStats({ member }: LabStatsProps) {
  const stats = [
    {
      label: 'Reactions',
      value: member.impact.totalReactions,
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
    },
    {
      label: 'Challenges',
      value: member.impact.challengesCompleted,
      icon: Target,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
    },
    {
      label: 'Deep Dives',
      value: member.impact.deepDivesSubmitted,
      icon: FileText,
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/20',
    },
    {
      label: 'Insights Shaped',
      value: member.impact.insightsInfluenced,
      icon: Lightbulb,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bgColor} rounded-lg p-4 border border-gray-700`}
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-gray-400">{stat.label}</span>
          </div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
