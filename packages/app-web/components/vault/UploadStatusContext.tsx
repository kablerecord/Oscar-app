'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface UploadJob {
  id: string
  fileName: string
  folderName?: string
  status: 'uploading' | 'indexing' | 'complete' | 'error'
  progress: number // 0-100
  totalFiles?: number
  completedFiles?: number
  indexedFiles?: number
  errorCount?: number
  skippedCount?: number
  startedAt: number
  completedAt?: number
  error?: string
}

interface UploadStatusContextType {
  jobs: UploadJob[]
  activeJob: UploadJob | null
  addJob: (job: Omit<UploadJob, 'id' | 'startedAt'>) => string
  updateJob: (id: string, updates: Partial<UploadJob>) => void
  removeJob: (id: string) => void
  clearCompleted: () => void
}

const UploadStatusContext = createContext<UploadStatusContextType | null>(null)

export function useUploadStatus() {
  const context = useContext(UploadStatusContext)
  if (!context) {
    throw new Error('useUploadStatus must be used within UploadStatusProvider')
  }
  return context
}

export function UploadStatusProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([])

  const addJob = useCallback((job: Omit<UploadJob, 'id' | 'startedAt'>): string => {
    const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const newJob: UploadJob = {
      ...job,
      id,
      startedAt: Date.now(),
    }
    setJobs(prev => [...prev, newJob])
    return id
  }, [])

  const updateJob = useCallback((id: string, updates: Partial<UploadJob>) => {
    setJobs(prev => prev.map(job =>
      job.id === id ? { ...job, ...updates } : job
    ))
  }, [])

  const removeJob = useCallback((id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'complete' && job.status !== 'error'))
  }, [])

  // Get the most recent active job (uploading or indexing)
  const activeJob = jobs.find(j => j.status === 'uploading' || j.status === 'indexing') ||
                    jobs.find(j => j.status === 'complete' || j.status === 'error') ||
                    null

  return (
    <UploadStatusContext.Provider value={{ jobs, activeJob, addJob, updateJob, removeJob, clearCompleted }}>
      {children}
    </UploadStatusContext.Provider>
  )
}
