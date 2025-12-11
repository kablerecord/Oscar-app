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
  capabilityLevel?: number | null
  onAskOSQR?: (prompt: string) => void
}

export function MainLayout({ children, user, workspaceName, workspaceId, showMSC = false, capabilityLevel, onAskOSQR }: MainLayoutProps) {
  const [mscExpanded, setMscExpanded] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar workspaceId={workspaceId} onClose={() => setSidebarOpen(false)} />
      </div>

      <TopBar
        user={user}
        workspaceName={workspaceName}
        capabilityLevel={capabilityLevel}
        onMenuClick={() => setSidebarOpen(true)}
      />

      {/* Main content area with optional MSC panel */}
      {/* ml-0 on mobile, ml-64 on lg+ */}
      <div className="lg:ml-64 mt-16 flex min-h-[calc(100vh-4rem)]">
        <main className={`flex-1 p-4 sm:p-6 transition-all duration-300 ${showMSC && workspaceId ? (mscExpanded ? 'lg:mr-80' : 'lg:mr-14') : ''}`}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Command Center Panel - Hidden on mobile, shown on lg+ */}
        {showMSC && workspaceId && (
          <div className="hidden lg:block fixed right-0 top-16 bottom-0 z-40">
            <MSCPanel
              workspaceId={workspaceId}
              isExpanded={mscExpanded}
              onToggle={() => setMscExpanded(!mscExpanded)}
              onAskOSQR={onAskOSQR}
            />
          </div>
        )}
      </div>
    </div>
  )
}
