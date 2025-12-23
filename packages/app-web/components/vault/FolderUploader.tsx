'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  File,
  Trash2,
  Clock,
  Coffee,
  Monitor,
  Zap,
  Brain,
} from 'lucide-react'

interface FileEntry {
  file: File
  path: string
  relativePath: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'uploaded' | 'indexing' | 'complete' | 'error' | 'skipped'
  error?: string
  documentId?: string
}

interface UploadStats {
  total: number
  pending: number
  uploading: number
  uploaded: number
  indexing: number
  complete: number
  error: number
  skipped: number
}

interface FolderUploaderProps {
  workspaceId: string
  projectId?: string
  onComplete?: (stats: UploadStats) => void
  onError?: (error: string) => void
}

const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.doc', '.docx', '.json']
const MAX_CONCURRENT_UPLOADS = 5 // More concurrent uploads since we're not doing heavy processing

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export function FolderUploader({
  workspaceId,
  projectId,
  onComplete,
  onError,
}: FolderUploaderProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'indexing' | 'complete'>('idle')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const getStats = useCallback((): UploadStats => {
    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      uploading: files.filter(f => f.status === 'uploading').length,
      uploaded: files.filter(f => f.status === 'uploaded').length,
      indexing: files.filter(f => f.status === 'indexing').length,
      complete: files.filter(f => f.status === 'complete').length,
      error: files.filter(f => f.status === 'error').length,
      skipped: files.filter(f => f.status === 'skipped').length,
    }
  }, [files])

  // Update time estimates during upload phase
  useEffect(() => {
    if (phase !== 'uploading' || !startTime) return

    const stats = getStats()
    const uploaded = stats.uploaded + stats.error + stats.skipped
    const remaining = stats.pending + stats.uploading

    if (uploaded > 0 && remaining > 0) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = uploaded / elapsed
      setEstimatedTimeRemaining(remaining / rate)
    }
  }, [files, phase, startTime, getStats])

  const processFileList = async (fileList: FileList | File[]) => {
    const entries: FileEntry[] = []

    for (const file of Array.from(fileList)) {
      const relativePath = (file as any).webkitRelativePath || file.name
      const ext = getFileExtension(file.name)

      if (file.name.startsWith('.') || file.name.startsWith('~')) continue
      if (!SUPPORTED_EXTENSIONS.includes(ext)) continue

      entries.push({
        file,
        path: relativePath,
        relativePath,
        size: file.size,
        type: file.type || 'application/octet-stream',
        status: 'pending',
      })
    }

    entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    setFiles(entries)
  }

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFileList(e.target.files)
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

  const readAllFiles = async (entry: FileSystemEntry, basePath: string = ''): Promise<File[]> => {
    const files: File[] = []

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      Object.defineProperty(file, 'webkitRelativePath', {
        value: basePath + entry.name,
        writable: false,
      })
      files.push(file)
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry
      const reader = dirEntry.createReader()

      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })

      for (const childEntry of entries) {
        const childFiles = await readAllFiles(childEntry, basePath + entry.name + '/')
        files.push(...childFiles)
      }
    }

    return files
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const items = e.dataTransfer.items
    const allFiles: File[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const entry = item.webkitGetAsEntry?.()

      if (entry) {
        try {
          const files = await readAllFiles(entry)
          allFiles.push(...files)
        } catch (err) {
          console.error('Error reading entry:', err)
        }
      } else if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) allFiles.push(file)
      }
    }

    if (allFiles.length > 0) {
      processFileList(allFiles)
    }
  }, [])

  // Fast upload - just saves content to DB
  const uploadFileFast = async (fileEntry: FileEntry): Promise<{ success: boolean; documentId?: string; error?: string }> => {
    const formData = new FormData()
    formData.append('file', fileEntry.file)
    formData.append('workspaceId', workspaceId)
    formData.append('relativePath', fileEntry.relativePath)
    if (projectId) {
      formData.append('projectId', projectId)
    }

    try {
      const response = await fetch('/api/vault/upload-fast', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result.error || 'Upload failed' }
      }

      return { success: true, documentId: result.documentId }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Cancelled' }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Index a single document (embeddings)
  const indexDocument = async (documentId: string, updateStatus: (id: string, status: FileEntry['status']) => void): Promise<boolean> => {
    try {
      const response = await fetch('/api/vault/index-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
        signal: abortControllerRef.current?.signal,
      })

      if (!response.ok) return false

      // Parse SSE response
      const reader = response.body?.getReader()
      if (!reader) return false

      const decoder = new TextDecoder()
      let lastEvent: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              lastEvent = JSON.parse(line.slice(6))
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      return lastEvent?.phase === 'complete'
    } catch {
      return false
    }
  }

  const startUpload = async () => {
    if (files.length === 0) return

    setPhase('uploading')
    setStartTime(Date.now())
    setEstimatedTimeRemaining(null)
    abortControllerRef.current = new AbortController()

    const filesRef = { current: [...files] }

    const updateFileStatus = (path: string, updates: Partial<FileEntry>) => {
      const index = filesRef.current.findIndex(f => f.path === path)
      if (index >= 0) {
        filesRef.current[index] = { ...filesRef.current[index], ...updates }
        setFiles([...filesRef.current])
      }
    }

    const updateFileById = (documentId: string, status: FileEntry['status']) => {
      const index = filesRef.current.findIndex(f => f.documentId === documentId)
      if (index >= 0) {
        filesRef.current[index] = { ...filesRef.current[index], status }
        setFiles([...filesRef.current])
      }
    }

    // PHASE 1: Fast uploads - all files in parallel (up to limit)
    const pendingFiles = files.filter(f => f.status === 'pending')
    const uploadQueue = [...pendingFiles]
    const uploadedDocs: string[] = []

    const processUpload = async () => {
      while (uploadQueue.length > 0 && !abortControllerRef.current?.signal.aborted) {
        const fileEntry = uploadQueue.shift()
        if (!fileEntry) break

        updateFileStatus(fileEntry.path, { status: 'uploading' })

        const result = await uploadFileFast(fileEntry)

        if (result.success && result.documentId) {
          updateFileStatus(fileEntry.path, { status: 'uploaded', documentId: result.documentId })
          uploadedDocs.push(result.documentId)
        } else {
          updateFileStatus(fileEntry.path, { status: 'error', error: result.error })
        }
      }
    }

    // Start concurrent uploads
    const uploadPromises: Promise<void>[] = []
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      uploadPromises.push(processUpload())
    }

    await Promise.all(uploadPromises)

    // PHASE 2: Indexing (embeddings) - sequential to avoid overloading OpenAI
    if (uploadedDocs.length > 0 && !abortControllerRef.current?.signal.aborted) {
      setPhase('indexing')
      setStartTime(Date.now())

      for (const documentId of uploadedDocs) {
        if (abortControllerRef.current?.signal.aborted) break

        updateFileById(documentId, 'indexing')
        const success = await indexDocument(documentId, updateFileById)
        updateFileById(documentId, success ? 'complete' : 'error')
      }
    }

    setPhase('complete')

    // Final stats
    const finalStats = {
      total: filesRef.current.length,
      pending: 0,
      uploading: 0,
      uploaded: 0,
      indexing: 0,
      complete: filesRef.current.filter(f => f.status === 'complete').length,
      error: filesRef.current.filter(f => f.status === 'error').length,
      skipped: filesRef.current.filter(f => f.status === 'skipped').length,
    }

    if (onComplete) {
      onComplete(finalStats)
    }
  }

  const cancelUpload = () => {
    abortControllerRef.current?.abort()
    setPhase('idle')
  }

  const reset = () => {
    setFiles([])
    setPhase('idle')
    setStartTime(null)
    setEstimatedTimeRemaining(null)
  }

  const removeFile = (path: string) => {
    setFiles(files.filter(f => f.path !== path))
  }

  const stats = getStats()
  const hasFiles = files.length > 0
  const isWorking = phase === 'uploading' || phase === 'indexing'
  const allComplete = phase === 'complete'

  // Progress calculations
  const uploadedCount = stats.uploaded + stats.indexing + stats.complete + stats.error + stats.skipped
  const uploadProgress = hasFiles ? Math.round((uploadedCount / stats.total) * 100) : 0
  const indexedCount = stats.complete + stats.error
  const indexProgress = uploadedCount > 0 ? Math.round((indexedCount / uploadedCount) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Drop zone */}
      {!hasFiles && (
        <div
          onClick={() => folderInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
              : 'border-neutral-300 bg-neutral-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-600 dark:hover:bg-blue-950/20'
          }`}
        >
          <FolderOpen className="mx-auto mb-3 h-12 w-12 text-neutral-400" />
          <p className="font-medium text-neutral-900 dark:text-white">
            {isDragging ? 'Drop your folder here' : 'Drop a folder or click to select'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Supports PDF, DOCX, TXT, MD, JSON files
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            All subfolders will be scanned automatically
          </p>
        </div>
      )}

      {/* Files preview (before upload) */}
      {hasFiles && phase === 'idle' && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-3 min-w-0">
              <FolderOpen className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 dark:text-white truncate">
                  {files.length} files ready to upload
                </p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))} total
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button variant="ghost" size="sm" onClick={reset}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button onClick={startUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Start Upload
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.map((fileEntry) => (
              <div
                key={fileEntry.path}
                className="flex items-center justify-between px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-white truncate">
                      {fileEntry.file.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {fileEntry.relativePath}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs text-neutral-400">
                    {formatFileSize(fileEntry.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileEntry.path)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload/Indexing progress */}
      {isWorking && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* Progress header */}
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            {/* Phase indicator */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                {/* Upload phase */}
                <div className={`flex items-center space-x-2 ${phase === 'uploading' ? 'text-blue-500' : phase === 'indexing' ? 'text-green-500' : 'text-neutral-400'}`}>
                  {phase === 'uploading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className={`h-4 w-4 ${uploadProgress === 100 ? 'text-green-500' : ''}`} />
                  )}
                  <span className="text-sm font-medium">
                    Upload {uploadProgress}%
                  </span>
                </div>

                {/* Arrow */}
                <span className="text-neutral-300">→</span>

                {/* Index phase */}
                <div className={`flex items-center space-x-2 ${phase === 'indexing' ? 'text-purple-500' : 'text-neutral-400'}`}>
                  {phase === 'indexing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    Index {phase === 'indexing' ? `${indexProgress}%` : '0%'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-neutral-500">
                    <Clock className="h-3 w-3" />
                    <span>~{formatTime(estimatedTimeRemaining)} remaining</span>
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={cancelUpload}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* Combined progress bar */}
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  phase === 'uploading'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                    : 'bg-gradient-to-r from-purple-500 to-purple-400'
                }`}
                style={{ width: `${phase === 'uploading' ? uploadProgress : indexProgress}%` }}
              />
            </div>

            {/* Helpful tips */}
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex items-center space-x-2 text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-700/50 px-2 py-1 rounded-full">
                <Coffee className="h-3 w-3" />
                <span>Feel free to work on something else while we process</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-700/50 px-2 py-1 rounded-full">
                <Monitor className="h-3 w-3" />
                <span>Keep your computer open and awake</span>
              </div>
            </div>
          </div>

          {/* File list with status */}
          <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.map((fileEntry) => (
              <div
                key={fileEntry.path}
                className="flex items-center justify-between px-4 py-2"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {fileEntry.status === 'pending' && (
                    <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'uploaded' && (
                    <Zap className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'indexing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'complete' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  {fileEntry.status === 'skipped' && (
                    <File className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-white truncate">
                      {fileEntry.file.name}
                    </p>
                    {fileEntry.status === 'uploading' && (
                      <p className="text-xs text-blue-500">Uploading...</p>
                    )}
                    {fileEntry.status === 'uploaded' && (
                      <p className="text-xs text-green-500">Uploaded, waiting to index</p>
                    )}
                    {fileEntry.status === 'indexing' && (
                      <p className="text-xs text-purple-500">Generating embeddings...</p>
                    )}
                    {fileEntry.error && (
                      <p className="text-xs text-red-500 truncate">{fileEntry.error}</p>
                    )}
                    {fileEntry.status === 'skipped' && (
                      <p className="text-xs text-amber-500">Already indexed</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete state */}
      {allComplete && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                Folder upload complete!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Your documents are now indexed and ready for OSQR to search.
              </p>

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="rounded-lg bg-white/50 dark:bg-black/20 px-3 py-2">
                  <p className="text-lg font-bold text-green-800 dark:text-green-200">
                    {stats.complete}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">indexed</p>
                </div>
                {stats.skipped > 0 && (
                  <div className="rounded-lg bg-white/50 dark:bg-black/20 px-3 py-2">
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {stats.skipped}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">skipped</p>
                  </div>
                )}
                {stats.error > 0 && (
                  <div className="rounded-lg bg-white/50 dark:bg-black/20 px-3 py-2">
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">
                      {stats.error}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">failed</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-4 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                Upload another folder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
