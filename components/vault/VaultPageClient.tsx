'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FileUploader } from './FileUploader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface VaultPageClientProps {
  workspaceId: string
  children: React.ReactNode
}

export function VaultPageClient({ workspaceId, children }: VaultPageClientProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  const handleUploadComplete = () => {
    // Refresh the page to show new document
    setIsUploadOpen(false)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Memory Vault
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Browse and manage your indexed documents. OSQR uses this knowledge to give you personalized answers.
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload a Document</DialogTitle>
            </DialogHeader>
            <FileUploader
              workspaceId={workspaceId}
              onComplete={handleUploadComplete}
            />
          </DialogContent>
        </Dialog>
      </div>

      {children}
    </div>
  )
}
