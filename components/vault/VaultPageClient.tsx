'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen, FileText } from 'lucide-react'
import { FileUploader } from './FileUploader'
import { FolderUploader } from './FolderUploader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface VaultPageClientProps {
  workspaceId: string
  children: React.ReactNode
}

type UploadMode = 'file' | 'folder'

export function VaultPageClient({ workspaceId, children }: VaultPageClientProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<UploadMode>('file')

  const handleUploadComplete = () => {
    // Refresh the page to show new document
    setIsUploadOpen(false)
    window.location.reload()
  }

  const openUploadDialog = (mode: UploadMode) => {
    setUploadMode(mode)
    setIsUploadOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Memory Vault
          </h1>
          <p className="mt-2 text-neutral-300">
            Browse and manage your indexed documents. OSQR uses this knowledge to give you personalized answers.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <Plus className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openUploadDialog('file')}>
              <FileText className="mr-2 h-4 w-4" />
              Single File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openUploadDialog('folder')}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Entire Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className={uploadMode === 'folder' ? 'max-w-2xl' : 'max-w-xl'}>
            <DialogHeader>
              <DialogTitle>
                {uploadMode === 'file' ? 'Upload a Document' : 'Upload a Folder'}
              </DialogTitle>
            </DialogHeader>
            {uploadMode === 'file' ? (
              <FileUploader
                workspaceId={workspaceId}
                onComplete={handleUploadComplete}
              />
            ) : (
              <FolderUploader
                workspaceId={workspaceId}
                onComplete={handleUploadComplete}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {children}
    </div>
  )
}
