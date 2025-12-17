'use client'

import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

interface VaultStatsProps {
  totalDocuments: number
}

export function VaultStats({ totalDocuments }: VaultStatsProps) {
  return (
    <Card className="p-4 w-fit">
      <div className="flex items-center space-x-3">
        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Documents</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {totalDocuments.toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  )
}
