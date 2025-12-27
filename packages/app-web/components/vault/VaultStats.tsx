'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { FileText, Upload, Brain, AlertCircle, Loader2 } from 'lucide-react'
import { useUploadStatus } from './UploadStatusContext'

interface VaultStatsProps {
  totalDocuments: number
  indexedDocuments: number
  workspaceId: string
}

interface IndexingStatus {
  totalDocuments: number
  indexedDocuments: number
  unindexedCount: number
  indexedPercent: number
  pendingTasks: number
  runningTasks: number
  failedTasks: number
  isIndexing: boolean
  currentDocument: string | null
  recentFailures: Array<{ id: string; title?: string; error?: string }>
}

export function VaultStats({ totalDocuments: initialTotal, indexedDocuments: initialIndexed, workspaceId }: VaultStatsProps) {
  const { activeJob } = useUploadStatus()

  // Track indexing status from background jobs
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>({
    totalDocuments: initialTotal,
    indexedDocuments: initialIndexed,
    unindexedCount: initialTotal - initialIndexed,
    indexedPercent: initialTotal > 0 ? Math.round((initialIndexed / initialTotal) * 100) : 100,
    pendingTasks: 0,
    runningTasks: 0,
    failedTasks: 0,
    isIndexing: false,
    currentDocument: null,
    recentFailures: [],
  })

  const prevIsIndexing = useRef(false)

  // Fetch status from the polling API
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/vault/indexing-status?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data: IndexingStatus = await res.json()
        setIndexingStatus(data)

        // If indexing just completed, reload the page to get fresh data
        if (prevIsIndexing.current && !data.isIndexing && data.indexedPercent === 100) {
          window.location.reload()
        }
        prevIsIndexing.current = data.isIndexing
      }
    } catch (error) {
      console.error('Failed to fetch indexing status:', error)
    }
  }, [workspaceId])

  // Poll for status every 2 seconds when there's work to do
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    // Initial fetch
    fetchStatus()

    // Start polling if not fully indexed or if there are pending/running tasks
    const needsPolling = initialIndexed < initialTotal || indexingStatus.isIndexing

    if (needsPolling) {
      interval = setInterval(fetchStatus, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [workspaceId, initialTotal, initialIndexed, fetchStatus, indexingStatus.isIndexing])

  // Active upload state from context
  const isUploading = activeJob?.status === 'uploading'
  const isActiveUploadIndexing = activeJob?.status === 'indexing'
  const isActive = isUploading || isActiveUploadIndexing

  // Background indexing state
  const isBackgroundIndexing = indexingStatus.isIndexing

  // Display values
  const { totalDocuments, indexedDocuments, indexedPercent, pendingTasks, runningTasks, failedTasks, currentDocument } = indexingStatus

  // Upload stats from active job
  const uploadProgress = activeJob?.progress || 0
  const errorCount = (activeJob?.errorCount || 0) + failedTasks
  const completedFiles = activeJob?.completedFiles || 0
  const totalFiles = activeJob?.totalFiles || 0
  const indexedFiles = activeJob?.indexedFiles || 0

  // Incomplete indexing (not active, but not 100%)
  const hasIncompleteIndexing = !isActive && !isBackgroundIndexing && totalDocuments > 0 && indexedPercent < 100

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
                {isActiveUploadIndexing || isBackgroundIndexing ? (
                  <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                ) : (
                  <Brain className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span className="text-sm text-slate-300">Indexed</span>
                <span className={`text-sm font-semibold ${
                  isActiveUploadIndexing || isBackgroundIndexing ? 'text-purple-400' : 'text-emerald-400'
                }`}>
                  {isActiveUploadIndexing ? `${uploadProgress}%` : `${indexedPercent}%`}
                </span>
                {isActiveUploadIndexing && (
                  <span className="text-xs text-slate-500">({indexedFiles}/{completedFiles - (activeJob?.errorCount || 0)})</span>
                )}
                {isBackgroundIndexing && (pendingTasks > 0 || runningTasks > 0) && (
                  <span className="text-xs text-slate-500">({pendingTasks + runningTasks} queued)</span>
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

        {/* Progress bar for background indexing */}
        {isBackgroundIndexing && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-purple-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {currentDocument
                  ? `Indexing "${currentDocument.length > 30 ? currentDocument.slice(0, 30) + '...' : currentDocument}"`
                  : `Processing ${pendingTasks + runningTasks} documents...`}
              </span>
              <span className="text-slate-500">{indexedDocuments}/{totalDocuments}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                style={{ width: `${indexedPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress bar for incomplete indexing (not actively processing) */}
        {hasIncompleteIndexing && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-emerald-400 flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {indexedDocuments.toLocaleString()} document{indexedDocuments !== 1 ? 's' : ''} indexed
              </span>
              <span className="text-slate-500">{indexedDocuments.toLocaleString()}/{totalDocuments.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${indexedPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Progress bar for active upload/indexing */}
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
