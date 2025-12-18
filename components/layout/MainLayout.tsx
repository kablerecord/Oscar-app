'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { RightPanelBar, type HighlightTarget } from './RightPanelBar'
import { useFocusMode } from '@/components/focus/FocusModeContext'
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react'

const SIDEBAR_COLLAPSED_KEY = 'osqr_sidebar_collapsed'

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
  highlightTarget?: HighlightTarget
  onHighlightElement?: (target: HighlightTarget) => void
  pageTitle?: string
  pageDescription?: string
}

export function MainLayout({ children, user, workspaceName, workspaceId, showMSC = false, capabilityLevel, onAskOSQR, highlightTarget, onHighlightElement, pageTitle, pageDescription }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { focusMode } = useFocusMode()

  // CSS classes for highlight effect - brighten target, blur background
  const getHighlightClass = (target: HighlightTarget) => {
    if (highlightTarget === target) {
      return 'ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-950 rounded-xl z-[60] relative brightness-110 shadow-lg shadow-blue-500/20'
    }
    return ''
  }

  // Overlay class when something is highlighted (blur everything else, don't darken)
  const isHighlighting = highlightTarget !== null && highlightTarget !== undefined

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === 'true') {
        setSidebarCollapsed(true)
      }
    }
  }, [])

  const toggleSidebarCollapsed = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile right panel overlay */}
      {rightPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setRightPanelOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile (slide out), shown on lg+ */}
      {/* Focus Mode: subtle blur on sidebar when active - keep it visible but muted */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-14' : 'w-64'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${focusMode ? 'lg:blur-[2px] lg:opacity-50 lg:pointer-events-none' : ''}
        ${isHighlighting && highlightTarget !== 'sidebar' && highlightTarget !== 'vault' ? 'blur-[2px]' : ''}
        ${highlightTarget === 'sidebar' || highlightTarget === 'vault' ? 'ring-4 ring-blue-400 ring-inset rounded-r-xl z-[60] brightness-110 shadow-lg shadow-blue-500/20' : ''}
      `}>
        <Sidebar
          workspaceId={workspaceId}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </div>

      <TopBar
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
      />

      {/* Main content area with right panel bar */}
      {/* ml-0 on mobile, ml-64 (or ml-14 when collapsed) on lg+ */}
      <div className={`mt-16 flex min-h-[calc(100vh-4rem)] transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-64'}`}>
        <main className={`
          flex-1 p-4 sm:p-6 transition-all duration-300
          ${showMSC && workspaceId && !focusMode ? 'lg:mr-14' : ''}
          ${highlightTarget === 'panel' ? 'relative z-[60]' : ''}
          ${isHighlighting && highlightTarget !== 'panel' && highlightTarget !== 'modes' && highlightTarget !== 'keyboard' && highlightTarget !== 'profile' ? 'blur-[2px]' : ''}
        `}>
          <div className={`
            mx-auto max-w-7xl transition-all duration-300
            ${highlightTarget === 'panel' ? 'ring-4 ring-blue-400 ring-offset-4 ring-offset-slate-950 rounded-2xl brightness-110 shadow-lg shadow-blue-500/20' : ''}
          `}>
            {children}
          </div>
        </main>

        {/* Right Panel Bar - Slide-out on mobile, fixed on lg+ */}
        {/* Focus Mode: subtle blur on panel when active - keep it visible but muted */}
        {showMSC && workspaceId && (
          <div className={`
            fixed inset-y-0 right-0 z-50 w-14 transform transition-all duration-300 ease-in-out
            ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            ${focusMode ? 'lg:blur-[2px] lg:opacity-50 lg:pointer-events-none' : ''}
            ${isHighlighting && highlightTarget !== 'command-center' ? 'blur-[2px]' : ''}
            ${highlightTarget === 'command-center' ? 'z-[60] brightness-110' : ''}
          `}>
            <RightPanelBar
              workspaceId={workspaceId}
              onAskOSQR={onAskOSQR}
              onHighlightElement={onHighlightElement}
              highlightTarget={highlightTarget}
            />
          </div>
        )}
      </div>

      {/* Mobile toggle buttons - shown only on small screens, positioned at top corners */}
      {/* Left panel toggle - top left, below TopBar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-[72px] left-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/90 text-slate-300 shadow-lg ring-1 ring-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors lg:hidden backdrop-blur-sm"
        title="Open navigation"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      {/* Right panel toggle - top right, below TopBar */}
      {showMSC && workspaceId && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="fixed top-[72px] right-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-lg hover:bg-blue-500 transition-colors lg:hidden backdrop-blur-sm"
          title="Open command center"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
