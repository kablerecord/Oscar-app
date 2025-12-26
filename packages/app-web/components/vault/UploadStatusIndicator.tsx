'use client'

import { useState, useEffect } from 'react'
import { useUploadStatus } from './UploadStatusContext'
import {
  Upload,
  Brain,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export function UploadStatusIndicator() {
  const { activeJob, removeJob, clearCompleted } = useUploadStatus()
  const [isExpanded, setIsExpanded] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Update elapsed time every second while active
  useEffect(() => {
    if (!activeJob || activeJob.status === 'complete' || activeJob.status === 'error') {
      return
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - activeJob.startedAt) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [activeJob])

  // Auto-expand when a new job starts
  useEffect(() => {
    if (activeJob && (activeJob.status === 'uploading' || activeJob.status === 'indexing')) {
      setIsExpanded(true)
    }
  }, [activeJob?.id, activeJob?.status])

  if (!activeJob) return null

  const isActive = activeJob.status === 'uploading' || activeJob.status === 'indexing'
  const isComplete = activeJob.status === 'complete'
  const isError = activeJob.status === 'error'

  // Calculate display values
  const totalFiles = activeJob.totalFiles || 0
  const completedFiles = activeJob.completedFiles || 0
  const indexedFiles = activeJob.indexedFiles || 0
  const skippedCount = activeJob.skippedCount || 0
  const errorCount = activeJob.errorCount || 0

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={`rounded-xl border shadow-lg backdrop-blur-sm transition-all ${
          isComplete
            ? 'border-green-300 dark:border-green-700 bg-green-50/95 dark:bg-green-950/95'
            : isError
            ? 'border-red-300 dark:border-red-700 bg-red-50/95 dark:bg-red-950/95'
            : 'border-blue-300 dark:border-blue-700 bg-white/95 dark:bg-neutral-900/95'
        }`}
      >
        {/* Header - always visible */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            {activeJob.status === 'uploading' && (
              <div className="relative">
                <Upload className="h-5 w-5 text-blue-500" />
                <Loader2 className="absolute -top-1 -right-1 h-3 w-3 animate-spin text-blue-500" />
              </div>
            )}
            {activeJob.status === 'indexing' && (
              <div className="relative">
                <Brain className="h-5 w-5 text-purple-500" />
                <Loader2 className="absolute -top-1 -right-1 h-3 w-3 animate-spin text-purple-500" />
              </div>
            )}
            {isComplete && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {isError && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}

            <div>
              <p className={`text-sm font-medium ${
                isComplete ? 'text-green-800 dark:text-green-200' :
                isError ? 'text-red-800 dark:text-red-200' :
                'text-neutral-900 dark:text-white'
              }`}>
                {activeJob.status === 'uploading' && 'Uploading files...'}
                {activeJob.status === 'indexing' && 'Indexing with AI...'}
                {isComplete && 'Upload complete!'}
                {isError && 'Upload failed'}
              </p>
              <p className={`text-xs ${
                isComplete ? 'text-green-600 dark:text-green-400' :
                isError ? 'text-red-600 dark:text-red-400' :
                'text-neutral-500'
              }`}>
                {activeJob.folderName || activeJob.fileName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isActive && (
              <span className="text-xs text-neutral-500">
                {formatTime(elapsedTime)}
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-neutral-400" />
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className={`px-4 pb-4 pt-0 border-t ${
            isComplete ? 'border-green-200 dark:border-green-800' :
            isError ? 'border-red-200 dark:border-red-800' :
            'border-neutral-200 dark:border-neutral-700'
          }`}>
            {/* Progress bar */}
            {isActive && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className={activeJob.status === 'uploading' ? 'text-blue-600' : 'text-purple-600'}>
                    {activeJob.status === 'uploading' ? 'Uploading' : 'Indexing'}
                  </span>
                  <span className="text-neutral-500">{activeJob.progress}%</span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      activeJob.status === 'uploading'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                        : 'bg-gradient-to-r from-purple-500 to-purple-400'
                    }`}
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-3 flex flex-wrap gap-3">
              {activeJob.status === 'uploading' && totalFiles > 0 && (
                <div className="text-xs">
                  <span className="text-neutral-500">Files: </span>
                  <span className="font-medium">{completedFiles}/{totalFiles}</span>
                </div>
              )}
              {activeJob.status === 'indexing' && (
                <div className="text-xs">
                  <span className="text-neutral-500">Indexed: </span>
                  <span className="font-medium text-purple-600">{indexedFiles}/{completedFiles - skippedCount - errorCount}</span>
                </div>
              )}
              {isComplete && (
                <>
                  <div className="text-xs">
                    <span className="text-green-600 dark:text-green-400">Indexed: </span>
                    <span className="font-medium">{indexedFiles}</span>
                  </div>
                  {skippedCount > 0 && (
                    <div className="text-xs">
                      <span className="text-amber-600 dark:text-amber-400">Unchanged: </span>
                      <span className="font-medium">{skippedCount}</span>
                    </div>
                  )}
                  {errorCount > 0 && (
                    <div className="text-xs">
                      <span className="text-red-600 dark:text-red-400">Failed: </span>
                      <span className="font-medium">{errorCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* What's happening explanation */}
            {activeJob.status === 'indexing' && (
              <p className="mt-3 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 p-2 rounded-lg">
                Creating AI embeddings so OSQR can search and understand your documents semantically.
              </p>
            )}

            {/* Dismiss button for completed/error states */}
            {(isComplete || isError) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  removeJob(activeJob.id)
                }}
                className="mt-3 w-full text-xs"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
