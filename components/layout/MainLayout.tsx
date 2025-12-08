'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MSCPanel } from '@/components/msc/MSCPanel'

interface MainLayoutProps {
  children: React.ReactNode
  user?: {
    name?: string | null
    email?: string | null
  }
  workspaceName?: string
  workspaceId?: string
  showMSC?: boolean
}

export function MainLayout({ children, user, workspaceName, workspaceId, showMSC = false }: MainLayoutProps) {
  const [mscExpanded, setMscExpanded] = useState(true)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <TopBar user={user} workspaceName={workspaceName} />

      {/* Main content area with optional MSC panel */}
      <div className="ml-64 mt-16 flex min-h-[calc(100vh-4rem)]">
        <main className={`flex-1 p-6 transition-all duration-300 ${showMSC && workspaceId ? (mscExpanded ? 'mr-72' : 'mr-12') : ''}`}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* MSC Panel - Fixed on right side */}
        {showMSC && workspaceId && (
          <div className="fixed right-0 top-16 bottom-0 z-40">
            <MSCPanel
              workspaceId={workspaceId}
              isExpanded={mscExpanded}
              onToggle={() => setMscExpanded(!mscExpanded)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
