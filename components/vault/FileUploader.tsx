'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSearch,
  Brain,
  Layers,
  Sparkles,
} from 'lucide-react'

interface UploadProgress {
  phase: 'idle' | 'starting' | 'extracting' | 'analyzing' | 'chunking' | 'embedding' | 'osqr_indexing' | 'complete' | 'error'
  progress: number
  message: string
  data?: {
    fileName?: string
    fileSize?: number
    charCount?: number
    wordCount?: number
    summary?: string
    suggestedQuestions?: string[]
    chunkCount?: number
    avgChunkSize?: number
    totalChunks?: number
    currentChunk?: number
    documentId?: string
    error?: string
    upgrade?: boolean
    currentTier?: string
    chunksIndexed?: number
  }
}

interface FileUploaderProps {
  workspaceId: string
  projectId?: string
  onComplete?: (data: {
    documentId: string
    fileName: string
    summary: string
    suggestedQuestions: string[]
    chunksIndexed: number
  }) => void
  onError?: (error: string) => void
  compact?: boolean
}

const phaseIcons = {
  idle: Upload,
  starting: Upload,
  extracting: FileSearch,
  analyzing: Brain,
  chunking: Layers,
  embedding: Sparkles,
  osqr_indexing: Brain,
  complete: CheckCircle2,
  error: AlertCircle,
}

const phaseColors = {
  idle: 'text-neutral-400',
  starting: 'text-blue-500',
  extracting: 'text-blue-500',
  analyzing: 'text-purple-500',
  chunking: 'text-amber-500',
  embedding: 'text-emerald-500',
  osqr_indexing: 'text-purple-500',
  complete: 'text-green-500',
  error: 'text-red-500',
}

export function FileUploader({
  workspaceId,
  projectId,
  onComplete,
  onError,
  compact = false,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    phase: 'idle',
    progress: 0,
    message: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setUploadProgress({ phase: 'idle', progress: 0, message: '' })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const startUpload = async () => {
    if (!file) return

    abortControllerRef.current = new AbortController()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', workspaceId)
    if (projectId) {
      formData.append('projectId', projectId)
    }

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              setUploadProgress(event)

              if (event.phase === 'complete' && onComplete) {
                onComplete({
                  documentId: event.data.documentId,
                  fileName: event.data.fileName,
                  summary: event.data.summary,
                  suggestedQuestions: event.data.suggestedQuestions,
                  chunksIndexed: event.data.chunksIndexed,
                })
              }

              if (event.phase === 'error' && onError) {
                onError(event.message)
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadProgress({
          phase: 'idle',
          progress: 0,
          message: 'Upload cancelled',
        })
      } else {
        setUploadProgress({
          phase: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Upload failed',
        })
        if (onError) {
          onError(error instanceof Error ? error.message : 'Upload failed')
        }
      }
    }
  }

  const cancelUpload = () => {
    abortControllerRef.current?.abort()
    setFile(null)
    setUploadProgress({ phase: 'idle', progress: 0, message: '' })
  }

  const reset = () => {
    setFile(null)
    setUploadProgress({ phase: 'idle', progress: 0, message: '' })
  }

  const isUploading = ['starting', 'extracting', 'analyzing', 'chunking', 'embedding', 'osqr_indexing'].includes(uploadProgress.phase)
  const PhaseIcon = phaseIcons[uploadProgress.phase]
  const phaseColor = phaseColors[uploadProgress.phase]

  // Compact view for sidebar/inline use
  if (compact) {
    return (
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".txt,.md,.pdf,.doc,.docx,.json"
          className="hidden"
        />

        {!file ? (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload file
          </Button>
        ) : isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate flex-1">{file.name}</span>
              <Button variant="ghost" size="sm" onClick={cancelUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500">{uploadProgress.message}</p>
          </div>
        ) : uploadProgress.phase === 'complete' ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Uploaded</span>
            </div>
            <Button variant="link" size="sm" onClick={reset} className="p-0 h-auto text-xs">
              Upload another
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="flex-1 truncate text-sm">{file.name}</div>
            <Button size="sm" onClick={startUpload}>
              Upload
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Full view with progress visualization
  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".txt,.md,.pdf,.doc,.docx,.json"
        className="hidden"
      />

      {/* Drop zone */}
      {!file && uploadProgress.phase === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
              : 'border-neutral-300 bg-neutral-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20'
          }`}
        >
          <Upload className="mx-auto mb-3 h-10 w-10 text-neutral-400" />
          <p className="font-medium text-neutral-900 dark:text-white">
            {isDragging ? 'Drop your file here' : 'Click or drag to upload'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            PDF, DOCX, TXT, MD, JSON
          </p>
        </div>
      )}

      {/* File selected but not uploading */}
      {file && uploadProgress.phase === 'idle' && (
        <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
              <Button onClick={startUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Start Upload
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {file && isUploading && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
          {/* Phase indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`${phaseColor}`}>
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <PhaseIcon className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-sm text-neutral-500">
                  {uploadProgress.message}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelUpload}>
              Cancel
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{uploadProgress.progress}%</span>
              {uploadProgress.data?.totalChunks && uploadProgress.data?.currentChunk && (
                <span>
                  Chunk {uploadProgress.data.currentChunk} of {uploadProgress.data.totalChunks}
                </span>
              )}
            </div>
          </div>

          {/* Phase steps */}
          <div className="mt-6 flex justify-between">
            {[
              { phase: 'extracting', label: 'Extract', icon: FileSearch },
              { phase: 'analyzing', label: 'Analyze', icon: Brain },
              { phase: 'chunking', label: 'Chunk', icon: Layers },
              { phase: 'embedding', label: 'Embed', icon: Sparkles },
              { phase: 'osqr_indexing', label: 'OSQR', icon: Brain },
            ].map((step, idx) => {
              const StepIcon = step.icon
              const phases = ['extracting', 'analyzing', 'chunking', 'embedding', 'osqr_indexing']
              const currentIdx = phases.indexOf(uploadProgress.phase)
              const stepIdx = phases.indexOf(step.phase)
              const isComplete = stepIdx < currentIdx
              const isCurrent = stepIdx === currentIdx
              const isPending = stepIdx > currentIdx

              return (
                <div key={step.phase} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      isComplete
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : isCurrent
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs ${
                      isComplete || isCurrent
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Live stats */}
          {uploadProgress.data && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              {uploadProgress.data.wordCount && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {uploadProgress.data.wordCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">words</p>
                </div>
              )}
              {uploadProgress.data.chunkCount && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {uploadProgress.data.chunkCount}
                  </p>
                  <p className="text-xs text-neutral-500">chunks</p>
                </div>
              )}
              {uploadProgress.data.currentChunk && uploadProgress.data.totalChunks && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {Math.round((uploadProgress.data.currentChunk / uploadProgress.data.totalChunks) * 100)}%
                  </p>
                  <p className="text-xs text-neutral-500">embedded</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Complete state */}
      {uploadProgress.phase === 'complete' && uploadProgress.data && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Successfully indexed!
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                {uploadProgress.data.summary}
              </p>

              {/* Stats */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="rounded-lg bg-white/50 dark:bg-black/20 px-3 py-2">
                  <p className="text-lg font-bold text-green-800 dark:text-green-200">
                    {uploadProgress.data.chunksIndexed}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">chunks indexed</p>
                </div>
                {uploadProgress.data.wordCount && (
                  <div className="rounded-lg bg-white/50 dark:bg-black/20 px-3 py-2">
                    <p className="text-lg font-bold text-green-800 dark:text-green-200">
                      {uploadProgress.data.wordCount.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">words</p>
                  </div>
                )}
              </div>

              {/* Suggested questions */}
              {uploadProgress.data.suggestedQuestions && uploadProgress.data.suggestedQuestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                    Try asking:
                  </p>
                  <div className="space-y-1">
                    {uploadProgress.data.suggestedQuestions.map((q, i) => (
                      <p key={i} className="text-sm text-green-700 dark:text-green-300">
                        • {q}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-4 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                Upload another file
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadProgress.phase === 'error' && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Upload failed
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {uploadProgress.message}
              </p>

              {uploadProgress.data?.upgrade && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300"
                >
                  Upgrade to upload more
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-4 ml-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
