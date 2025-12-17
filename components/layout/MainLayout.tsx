'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MSCPanel } from '@/components/msc/MSCPanel'
import { useFocusMode } from '@/components/focus/FocusModeContext'

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
  const { focusMode } = useFocusMode()

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile (slide out), shown on lg+ */}
      {/* Focus Mode: subtle blur on sidebar when active - keep it visible but muted */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform transition-all duration-500 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${focusMode ? 'lg:blur-[2px] lg:opacity-50 lg:pointer-events-none' : ''}
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
      {/* ml-0 on mobile, ml-64 on lg+ - keep margin even in focus mode so content doesn't slide */}
      <div className={`mt-16 flex min-h-[calc(100vh-4rem)] transition-all duration-500 lg:ml-64`}>
        <main className={`flex-1 p-4 sm:p-6 transition-all duration-300 ${showMSC && workspaceId ? (mscExpanded ? 'lg:mr-80' : 'lg:mr-14') : ''} ${focusMode ? 'lg:mr-0' : ''}`}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Command Center Panel - Hidden on mobile, shown on lg+ */}
        {/* Focus Mode: subtle blur on MSC panel when active - keep it visible but muted */}
        {showMSC && workspaceId && (
          <div className={`
            hidden lg:block fixed right-0 top-16 bottom-0 z-40 transition-all duration-500
            ${focusMode ? 'blur-[2px] opacity-50 pointer-events-none' : ''}
          `}>
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
