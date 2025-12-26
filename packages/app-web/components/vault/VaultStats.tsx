'use client'

import { Card } from '@/components/ui/card'
import { FileText, Upload, Brain, AlertCircle, Loader2 } from 'lucide-react'
import { useUploadStatus } from './UploadStatusContext'

interface VaultStatsProps {
  totalDocuments: number
  indexedDocuments: number
}

export function VaultStats({ totalDocuments, indexedDocuments }: VaultStatsProps) {
  const { activeJob } = useUploadStatus()

  const indexedPercent = totalDocuments > 0 ? Math.round((indexedDocuments / totalDocuments) * 100) : 0
  const isAllIndexed = indexedPercent === 100

  // Active upload state
  const isUploading = activeJob?.status === 'uploading'
  const isIndexing = activeJob?.status === 'indexing'
  const hasError = activeJob?.status === 'error'
  const isActive = isUploading || isIndexing

  // Upload stats from active job
  const uploadProgress = activeJob?.progress || 0
  const errorCount = activeJob?.errorCount || 0
  const completedFiles = activeJob?.completedFiles || 0
  const totalFiles = activeJob?.totalFiles || 0
  const indexedFiles = activeJob?.indexedFiles || 0

  return (
    <Card className="p-4 w-fit">
      <div className="flex items-center gap-6">
        {/* Documents count */}
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Documents</p>
            <p className="text-2xl font-bold text-slate-100">
              {totalDocuments.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-slate-700" />

        {/* Status */}
        <div>
          <p className="text-sm text-slate-400 mb-1">Status</p>
          <div className="flex items-center gap-4">
            {/* Upload status */}
            <div className="flex items-center gap-1.5">
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="text-sm text-slate-300">Upload</span>
              <span className={`text-sm font-semibold ${isUploading ? 'text-blue-400' : 'text-slate-100'}`}>
                {isUploading ? `${uploadProgress}%` : '100%'}
              </span>
              {isUploading && totalFiles > 0 && (
                <span className="text-xs text-slate-500">({completedFiles}/{totalFiles})</span>
              )}
            </div>

            {/* Indexed status */}
            <div className="flex items-center gap-1.5">
              {isIndexing ? (
                <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="text-sm text-slate-300">Indexed</span>
              <span className={`text-sm font-semibold ${
                isIndexing ? 'text-purple-400' :
                isAllIndexed ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {isIndexing ? `${uploadProgress}%` : `${indexedPercent}%`}
              </span>
              {isIndexing && (
                <span className="text-xs text-slate-500">({indexedFiles}/{completedFiles - errorCount})</span>
              )}
            </div>

            {/* Error count */}
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-sm text-red-400 font-semibold">{errorCount} failed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
