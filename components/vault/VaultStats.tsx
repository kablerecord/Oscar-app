'use client'

import { Card } from '@/components/ui/card'
import { Database, FileText, Layers, Clock } from 'lucide-react'

interface VaultStatsProps {
  totalDocuments: number
  totalChunks: number
  sourceBreakdown: Array<{ type: string; count: number }>
}

export function VaultStats({ totalDocuments, totalChunks, sourceBreakdown }: VaultStatsProps) {
  // Map source types to friendly names
  const sourceLabels: Record<string, string> = {
    chat_export: 'Chat Exports',
    upload: 'Uploads',
    note: 'Notes',
    chatgpt_conversation: 'ChatGPT',
    claude_conversation: 'Claude',
    other: 'Other',
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Documents</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalDocuments.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
            <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Chunks</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalChunks.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="col-span-2 lg:col-span-2 p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20">
            <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Source Breakdown
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sourceBreakdown.map((source) => (
            <span
              key={source.type}
              className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {sourceLabels[source.type] || source.type}: {source.count.toLocaleString()}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}
