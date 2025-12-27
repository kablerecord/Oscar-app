'use client'

import { useState, createContext, useContext } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, FolderOpen, FileText, Shield } from 'lucide-react'
import Link from 'next/link'
import { FileUploader } from './FileUploader'
import { FolderUploader } from './FolderUploader'
import { UploadStatusProvider } from './UploadStatusContext'
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

// Context for sharing upload state with children (DocumentList)
interface VaultContextType {
  isUploading: boolean
  setIsUploading: (value: boolean) => void
  triggerRefresh: () => void
  refreshKey: number
}

const VaultContext = createContext<VaultContextType | null>(null)

export function useVaultContext() {
  return useContext(VaultContext)
}

interface VaultPageClientProps {
  workspaceId: string
  children: React.ReactNode
}

type UploadMode = 'file' | 'folder'

export function VaultPageClient({ workspaceId, children }: VaultPageClientProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<UploadMode>('file')
  const [isUploading, setIsUploading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleUploadComplete = () => {
    // No more page reload - just trigger a refresh and close dialog
    setIsUploadOpen(false)
    setIsUploading(false)
    triggerRefresh()
  }

  const handleUploadStart = () => {
    setIsUploading(true)
  }

  const openUploadDialog = (mode: UploadMode) => {
    setUploadMode(mode)
    setIsUploadOpen(true)
  }

  const vaultContextValue: VaultContextType = {
    isUploading,
    setIsUploading,
    triggerRefresh,
    refreshKey,
  }

  return (
    <UploadStatusProvider>
      <VaultContext.Provider value={vaultContextValue}>
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
              <Link
                href="/settings#privacy"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-emerald-400/80 hover:text-emerald-400 transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Your documents are encrypted and private</span>
              </Link>
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
                    onStart={handleUploadStart}
                  />
                ) : (
                  <FolderUploader
                    workspaceId={workspaceId}
                    onComplete={handleUploadComplete}
                    onStart={handleUploadStart}
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
      </VaultContext.Provider>
    </UploadStatusProvider>
  )
}
