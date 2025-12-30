'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, Image, FileText, Music, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Attachment } from '@/hooks/useCapabilities'

interface AttachmentChipProps {
  attachment: Attachment
  onRemove: (id: string) => void
}

function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const Icon = attachment.type === 'image' ? Image
    : attachment.type === 'audio' ? Music
    : FileText

  const sizeText = attachment.size < 1024 * 1024
    ? `${(attachment.size / 1024).toFixed(1)} KB`
    : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
        'bg-slate-800 border border-slate-700',
        attachment.error && 'border-red-500/50 bg-red-900/20',
        attachment.uploading && 'opacity-70'
      )}
    >
      {attachment.uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
      ) : attachment.error ? (
        <AlertCircle className="h-4 w-4 text-red-400" />
      ) : (
        <Icon className="h-4 w-4 text-slate-400" />
      )}

      <span className="text-slate-300 truncate max-w-[120px]" title={attachment.name}>
        {attachment.name}
      </span>

      <span className="text-xs text-slate-500">{sizeText}</span>

      <button
        onClick={() => onRemove(attachment.id)}
        className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        disabled={attachment.uploading}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface AttachmentAreaProps {
  attachments: Attachment[]
  onAttachmentsChange: (attachments: Attachment[]) => void
  onUpload: (files: File[]) => Promise<Attachment[]>
  isUploading?: boolean
  disabled?: boolean
  maxFiles?: number
  maxSizeMB?: number
  className?: string
}

export function AttachmentArea({
  attachments,
  onAttachmentsChange,
  onUpload,
  isUploading = false,
  disabled = false,
  maxFiles = 5,
  maxSizeMB = 25,
  className,
}: AttachmentAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }, [disabled, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isUploading) return

    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }, [disabled, isUploading])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

  const processFiles = async (files: File[]) => {
    setUploadError(null)

    // Validate file count
    if (attachments.length + files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate file sizes
    const maxBytes = maxSizeMB * 1024 * 1024
    const oversizedFiles = files.filter(f => f.size > maxBytes)
    if (oversizedFiles.length > 0) {
      setUploadError(`Files must be under ${maxSizeMB}MB`)
      return
    }

    try {
      const uploaded = await onUpload(files)
      onAttachmentsChange([...attachments, ...uploaded])
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const handleRemove = useCallback((id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id))
  }, [attachments, onAttachmentsChange])

  const openFilePicker = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click()
    }
  }, [disabled, isUploading])

  return (
    <div className={cn('space-y-2', className)}>
      {/* Drop zone - only show when empty or dragging */}
      {(attachments.length === 0 || isDragging) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-4 transition-all cursor-pointer',
            'flex flex-col items-center justify-center gap-2 text-center',
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,audio/*,.pdf,.txt,.md,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-400">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className={cn(
                'h-8 w-8',
                isDragging ? 'text-blue-400' : 'text-slate-500'
              )} />
              <div>
                <span className={cn(
                  'text-sm font-medium',
                  isDragging ? 'text-blue-400' : 'text-slate-400'
                )}>
                  {isDragging ? 'Drop files here' : 'Drop files or click to upload'}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Images, documents, or audio (max {maxSizeMB}MB each)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-400 px-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map(attachment => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemove}
            />
          ))}

          {/* Add more button */}
          {attachments.length < maxFiles && !isDragging && (
            <button
              onClick={openFilePicker}
              disabled={disabled || isUploading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                'bg-slate-800/50 border border-dashed border-slate-700',
                'text-slate-400 hover:text-slate-300 hover:border-slate-600 hover:bg-slate-800',
                'transition-colors',
                (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              Add more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AttachmentArea
