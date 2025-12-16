'use client'

import { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'

interface FileEntry {
  file: File
  path: string
  relativePath: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'complete' | 'error' | 'skipped'
  error?: string
  documentId?: string
}

interface UploadStats {
  total: number
  pending: number
  uploading: number
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

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FolderUploader({
  workspaceId,
  projectId,
  onComplete,
  onError,
}: FolderUploaderProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const getStats = useCallback((): UploadStats => {
    return {
      total: files.length,
      pending: files.filter(f => f.status === 'pending').length,
      uploading: files.filter(f => f.status === 'uploading').length,
      complete: files.filter(f => f.status === 'complete').length,
      error: files.filter(f => f.status === 'error').length,
      skipped: files.filter(f => f.status === 'skipped').length,
    }
  }, [files])

  const processFileList = async (fileList: FileList | File[]) => {
    const entries: FileEntry[] = []

    for (const file of Array.from(fileList)) {
      // Get the relative path from webkitRelativePath or just the name
      const relativePath = (file as any).webkitRelativePath || file.name
      const ext = getFileExtension(file.name)

      // Skip hidden files, system files, and unsupported types
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

    // Sort by path for better display
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

  // Recursively read all files from a directory entry
  const readAllFiles = async (entry: FileSystemEntry, basePath: string = ''): Promise<File[]> => {
    const files: File[] = []

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject)
      })
      // Add the relative path to the file object
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

    // Process all dropped items
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

  const uploadFile = async (fileEntry: FileEntry): Promise<{ success: boolean; documentId?: string; error?: string; skipped?: boolean }> => {
    const formData = new FormData()
    formData.append('file', fileEntry.file)
    formData.append('workspaceId', workspaceId)
    formData.append('relativePath', fileEntry.relativePath)
    if (projectId) {
      formData.append('projectId', projectId)
    }

    try {
      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { success: false, error: errorText || 'Upload failed' }
      }

      // Parse SSE response to get final result
      const reader = response.body?.getReader()
      if (!reader) {
        return { success: false, error: 'No response body' }
      }

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

      if (lastEvent?.phase === 'complete') {
        return { success: true, documentId: lastEvent.data?.documentId }
      } else if (lastEvent?.phase === 'error') {
        if (lastEvent.message?.includes('already indexed')) {
          return { success: true, skipped: true }
        }
        return { success: false, error: lastEvent.message }
      }

      return { success: false, error: 'Unknown upload state' }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Cancelled' }
      }
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  const startUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    setCurrentFileIndex(0)
    setOverallProgress(0)
    abortControllerRef.current = new AbortController()

    const pendingFiles = files.filter(f => f.status === 'pending')
    const updatedFiles = [...files]

    for (let i = 0; i < pendingFiles.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break

      const fileEntry = pendingFiles[i]
      const fileIndex = files.findIndex(f => f.path === fileEntry.path)

      setCurrentFileIndex(i)
      setOverallProgress(Math.round((i / pendingFiles.length) * 100))

      // Update status to uploading
      updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], status: 'uploading' }
      setFiles([...updatedFiles])

      const result = await uploadFile(fileEntry)

      // Update status based on result
      if (result.skipped) {
        updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], status: 'skipped' }
      } else if (result.success) {
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'complete',
          documentId: result.documentId,
        }
      } else {
        updatedFiles[fileIndex] = {
          ...updatedFiles[fileIndex],
          status: 'error',
          error: result.error,
        }
      }
      setFiles([...updatedFiles])
    }

    setOverallProgress(100)
    setIsUploading(false)

    // Final stats
    const stats = {
      total: files.length,
      pending: 0,
      uploading: 0,
      complete: updatedFiles.filter(f => f.status === 'complete').length,
      error: updatedFiles.filter(f => f.status === 'error').length,
      skipped: updatedFiles.filter(f => f.status === 'skipped').length,
    }

    if (onComplete) {
      onComplete(stats)
    }
  }

  const cancelUpload = () => {
    abortControllerRef.current?.abort()
    setIsUploading(false)
  }

  const reset = () => {
    setFiles([])
    setIsUploading(false)
    setCurrentFileIndex(0)
    setOverallProgress(0)
  }

  const removeFile = (path: string) => {
    setFiles(files.filter(f => f.path !== path))
  }

  const stats = getStats()
  const hasFiles = files.length > 0
  const allComplete = hasFiles && stats.pending === 0 && stats.uploading === 0

  return (
    <div className="space-y-4">
      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in standard types
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Drop zone - show when no files selected */}
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

      {/* Files preview */}
      {hasFiles && !isUploading && !allComplete && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center space-x-3">
              <FolderOpen className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {files.length} files ready to index
                </p>
                <p className="text-xs text-neutral-500">
                  {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))} total
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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

          {/* File list */}
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

      {/* Upload progress */}
      {isUploading && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* Progress header */}
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  Uploading... ({currentFileIndex + 1} of {files.filter(f => f.status !== 'complete' && f.status !== 'error' && f.status !== 'skipped').length + stats.complete + stats.error + stats.skipped})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelUpload}>
                Cancel
              </Button>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
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
                  {fileEntry.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
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
                  {fileEntry.status === 'pending' && (
                    <FileText className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-white truncate">
                      {fileEntry.file.name}
                    </p>
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

              {/* Stats */}
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
