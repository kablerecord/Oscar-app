'use client'

import { Card } from '@/components/ui/card'
import { FileText, Upload, Brain, AlertCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useUploadStatus } from './UploadStatusContext'

interface VaultStatsProps {
  totalDocuments: number
  indexedDocuments: number
}

export function VaultStats({ totalDocuments, indexedDocuments }: VaultStatsProps) {
  const { activeJob } = useUploadStatus()

  const indexedPercent = totalDocuments > 0 ? Math.round((indexedDocuments / totalDocuments) * 100) : 0
  const isAllIndexed = indexedPercent === 100
  const unindexedCount = totalDocuments - indexedDocuments

  // Active upload state
  const isUploading = activeJob?.status === 'uploading'
  const isIndexing = activeJob?.status === 'indexing'
  const isActive = isUploading || isIndexing

  // Incomplete indexing (not active, but not 100%)
  const hasIncompleteIndexing = !isActive && totalDocuments > 0 && !isAllIndexed

  // Upload stats from active job
  const uploadProgress = activeJob?.progress || 0
  const errorCount = activeJob?.errorCount || 0
  const completedFiles = activeJob?.completedFiles || 0
  const totalFiles = activeJob?.totalFiles || 0
  const indexedFiles = activeJob?.indexedFiles || 0

  return (
    <Card className="p-4 w-fit">
      <div className="flex flex-col gap-3">
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
                ) : hasIncompleteIndexing ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
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

        {/* Progress bar for incomplete indexing */}
        {hasIncompleteIndexing && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {unindexedCount} document{unindexedCount !== 1 ? 's' : ''} not indexed
              </span>
              <span className="text-slate-500">{indexedDocuments}/{totalDocuments}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                style={{ width: `${indexedPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress bar for active indexing */}
        {isActive && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={isUploading ? 'text-blue-400' : 'text-purple-400'}>
                {isUploading ? 'Uploading...' : 'Indexing...'}
              </span>
              <span className="text-slate-500">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isUploading
                    ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                    : 'bg-gradient-to-r from-purple-500 to-purple-400'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
