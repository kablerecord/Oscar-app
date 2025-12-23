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
    <div>
      {/* Sticky Header - stacks on mobile, side-by-side on larger screens */}
      <div className="sticky top-0 z-10 bg-slate-950 pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Memory Vault
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-400">
              Browse and manage your indexed documents. OSQR uses this knowledge to give you personalized answers.
            </p>
          </div>

          {/* Upload button - always visible, consistent size, doesn't expand */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="self-start flex-shrink-0 whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
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
        {/* Bottom border that appears when scrolled */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      </div>

      {/* Scrollable content */}
      <div className="space-y-6 pt-2">
        {children}
      </div>
    </div>
  )
}
