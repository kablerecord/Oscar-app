'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar, type UserBadge } from './TopBar'
import { RightPanelBar, type HighlightTarget } from './RightPanelBar'
import { useFocusMode } from '@/components/focus/FocusModeContext'
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react'
import { getActiveBadge } from '@/lib/badges/config'
import { LabPrompt } from '@/components/lab/LabPrompt'

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
  rightPanelExpanded?: boolean
  onRightPanelExpandedChange?: (expanded: boolean) => void
}

// Breakpoint for mobile view (matches Tailwind's 'sm')
const MOBILE_BREAKPOINT = 640

export function MainLayout({ children, user, workspaceName, workspaceId, showMSC = false, capabilityLevel, onAskOSQR, highlightTarget, onHighlightElement, pageTitle, pageDescription, rightPanelExpanded, onRightPanelExpandedChange }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeBadge, setActiveBadge] = useState<UserBadge | null>(null)
  const { focusMode } = useFocusMode()

  // Track window size for responsive grid
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === 'true') {
        setSidebarCollapsed(true)
      }
    }
  }, [])

  // Fetch user stats and calculate active badge
  useEffect(() => {
    async function fetchBadge() {
      try {
        const response = await fetch('/api/settings/stats')
        if (response.ok) {
          const stats = await response.json()
          // Pass full stats object - API now returns complete UserStats
          const badge = getActiveBadge(stats)
          setActiveBadge(badge)
        }
      } catch (error) {
        console.error('Failed to fetch badge stats:', error)
      }
    }
    fetchBadge()
  }, [])

  const toggleSidebarCollapsed = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
    }
  }

  // Calculate grid columns based on state and screen size
  const leftSidebarWidth = isMobile ? '0px' : (sidebarCollapsed ? '3.5rem' : '16rem') // 56px or 256px
  // Right panel is always 3.5rem - drawer is absolutely positioned and overflows left
  const rightPanelWidth = isMobile ? '0px' : (showMSC && workspaceId && !focusMode ? '3.5rem' : '0px')

  return (
    <div
      className="h-screen overflow-hidden bg-slate-950 grid"
      style={{
        gridTemplateRows: '4rem 1fr', // TopBar height, then remaining
        gridTemplateColumns: `${leftSidebarWidth} 1fr ${rightPanelWidth}`,
        gridTemplateAreas: `
          "topbar topbar topbar"
          "sidebar main rightpanel"
        `,
      }}
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile right panel overlay */}
      {rightPanelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setRightPanelOpen(false)}
        />
      )}

      {/* TopBar - spans full width */}
      <div style={{ gridArea: 'topbar' }} data-grid-cell="topbar" className="z-30">
        <TopBar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          activeBadge={activeBadge}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          sidebarCollapsed={sidebarCollapsed}
        />
      </div>

      {/* Left Sidebar */}
      <div
        style={{ gridArea: 'sidebar' }}
        data-grid-cell="sidebar"
        className={`
          hidden sm:block overflow-visible transition-all duration-300
          ${focusMode ? 'blur-[2px] opacity-50 pointer-events-none' : ''}
          ${highlightTarget === 'sidebar' || highlightTarget === 'vault' ? 'ring-4 ring-amber-400 ring-inset rounded-r-xl brightness-110 shadow-lg shadow-amber-400/30 z-[60]' : ''}
        `}
      >
        <Sidebar
          workspaceId={workspaceId}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar - slides in from left */}
      <div className={`
        fixed inset-y-0 left-0 z-50 sm:hidden transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'w-14' : 'w-64'}
      `}>
        <Sidebar
          workspaceId={workspaceId}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </div>

      {/* Main Content - fills remaining space */}
      <main
        style={{ gridArea: 'main' }}
        data-grid-cell="main"
        className={`
          overflow-y-auto transition-all duration-300
          ${highlightTarget === 'panel' || highlightTarget === 'modes' || highlightTarget === 'keyboard' || highlightTarget === 'profile' ? 'relative z-[60]' : ''}
        `}
      >
        <div className={`
          mx-auto max-w-7xl p-4 sm:p-6 transition-all duration-300
          ${highlightTarget === 'panel' ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-slate-950 rounded-2xl brightness-110 shadow-lg shadow-amber-400/30' : ''}
        `}>
          {children}
        </div>
      </main>

      {/* Right Panel - in grid, not fixed */}
      {showMSC && workspaceId && (
        <div
          style={{ gridArea: 'rightpanel' }}
          data-grid-cell="rightpanel"
          className={`
            hidden sm:block overflow-visible transition-all duration-300
            ${focusMode ? 'blur-[2px] opacity-50 pointer-events-none' : ''}
            ${highlightTarget === 'command-center' ? 'z-[60] brightness-110' : ''}
          `}
        >
          <RightPanelBar
            workspaceId={workspaceId}
            onAskOSQR={onAskOSQR}
            onHighlightElement={onHighlightElement}
            highlightTarget={highlightTarget}
            onExpandedChange={onRightPanelExpandedChange}
          />
        </div>
      )}

      {/* Mobile Right Panel - slides in from right */}
      {showMSC && workspaceId && (
        <div className={`
          fixed inset-y-0 right-0 z-50 sm:hidden transform transition-transform duration-300 ease-in-out
          ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <RightPanelBar
            workspaceId={workspaceId}
            onAskOSQR={onAskOSQR}
            onHighlightElement={onHighlightElement}
            highlightTarget={highlightTarget}
            onExpandedChange={onRightPanelExpandedChange}
          />
        </div>
      )}

      {/* Mobile toggle buttons - shown only on small screens */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-[72px] left-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/90 text-slate-300 shadow-lg ring-1 ring-slate-700/50 hover:bg-slate-700 hover:text-white transition-colors sm:hidden backdrop-blur-sm"
        title="Open navigation"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>

      {showMSC && workspaceId && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="fixed top-[72px] right-2 z-30 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-lg hover:bg-blue-500 transition-colors sm:hidden backdrop-blur-sm"
          title="Open command center"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}

      {/* Lab prompt - shows after 5+ chats for non-members */}
      <LabPrompt />
    </div>
  )
}
