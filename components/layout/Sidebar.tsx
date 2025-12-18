'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Brain,
  MessageSquare,
  Database,
  Settings,
  Sparkles,
  Zap,
  TrendingUp,
  Target,
  Pin,
  User,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  FolderOpen,
  FolderPlus,
  Search,
  History,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

// Calculate how well OSQR knows the user (composite knowledge score)
function calculateKnowledgeScore(params: {
  profileCompletion: number  // 0-100
  documentsCount: number
  documentsMax: number
  totalQuestions?: number
  pinnedItemsCount: number
}): { score: number; label: string } {
  // Profile completion: 40% weight (most important for understanding user)
  const profileScore = params.profileCompletion * 0.4

  // Vault documents: 30% weight (max out at 50 docs = 100%)
  const docNormalized = Math.min(params.documentsCount / 50, 1) * 100
  const docScore = docNormalized * 0.3

  // Usage/engagement: 30% weight (based on questions and pinned items)
  const questionsNormalized = Math.min((params.totalQuestions || 0) / 100, 1) * 100
  const pinnedNormalized = Math.min(params.pinnedItemsCount / 10, 1) * 100
  const engagementScore = ((questionsNormalized + pinnedNormalized) / 2) * 0.3

  const totalScore = Math.round(profileScore + docScore + engagementScore)

  // Generate friendly label based on score
  let label: string
  if (totalScore < 15) {
    label = 'Just getting started'
  } else if (totalScore < 30) {
    label = 'Learning your style'
  } else if (totalScore < 50) {
    label = 'Understanding you'
  } else if (totalScore < 70) {
    label = 'Knowing you well'
  } else if (totalScore < 85) {
    label = 'Deep understanding'
  } else {
    label = 'Fully attuned'
  }

  return { score: totalScore, label }
}

// Map capability levels to friendly labels
function getCapabilityLabel(level: number): { label: string; description: string } {
  if (level <= 1) return {
    label: 'Building',
    description: 'You\'re building your foundation. Every question strengthens how OSQR can help you.'
  }
  if (level <= 3) return {
    label: 'Growing',
    description: 'Your thinking patterns are developing. OSQR is learning your style.'
  }
  if (level <= 5) return {
    label: 'Operating',
    description: 'You\'re in operator mode. Systems and consistency are forming.'
  }
  if (level <= 7) return {
    label: 'Creating',
    description: 'Creator level. You\'re building leverage and multiplying your impact.'
  }
  if (level <= 9) return {
    label: 'Architecting',
    description: 'Architect mode. You\'re designing systems that outlast you.'
  }
  return {
    label: 'Mastering',
    description: 'Master level. Your documented wisdom is your legacy.'
  }
}

interface SidebarProps {
  workspaceId?: string
  onClose?: () => void
}

interface QuickStats {
  queriesRemaining: number
  queriesMax: number
  documentsCount: number
  documentsMax: number
  capabilityLevel: number
}

interface RecentThread {
  id: string
  title: string
  updatedAt: string
  projectId?: string | null
}

interface Project {
  id: string
  name: string
  threadCount: number
}

interface PinnedItem {
  id: string
  content: string
  category: string
}

interface ProfileInfo {
  completionPercent: number
  answeredQuestions: number
  totalQuestions: number
}

interface UsageStreak {
  currentStreak: number
  questionsThisWeek: number
  insightsGenerated: number
  weeklyBreakdown?: { [key: string]: number }
  totalQuestions?: number
  longestStreak?: number
  memberSince?: string
}

// Usage Carousel Component
function UsageCarousel({ usageStreak }: { usageStreak: UsageStreak }) {
  const [currentView, setCurrentView] = useState(0)
  const views = ['streak', 'weekly', 'allTime'] as const

  const nextView = () => setCurrentView((prev) => (prev + 1) % views.length)
  const prevView = () => setCurrentView((prev) => (prev - 1 + views.length) % views.length)

  // Use real data from API, with fallback defaults
  const weeklyData = usageStreak.weeklyBreakdown || {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  }
  const allTimeStats = {
    totalQuestions: usageStreak.totalQuestions || 0,
    totalInsights: usageStreak.insightsGenerated || 0,
    longestStreak: usageStreak.longestStreak || usageStreak.currentStreak,
    memberSince: usageStreak.memberSince || 'Unknown'
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-semibold text-slate-300">
            {currentView === 0 ? 'Your Streak' : currentView === 1 ? 'This Week' : 'All Time'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevView}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={nextView}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* View: Streak */}
      {currentView === 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{usageStreak.currentStreak}</div>
              <div className="text-[9px] text-slate-500">days</div>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">{usageStreak.questionsThisWeek}</div>
              <div className="text-[9px] text-slate-500">questions</div>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">{usageStreak.insightsGenerated}</div>
              <div className="text-[9px] text-slate-500">insights</div>
            </div>
          </div>
          {/* Week day indicators with labels */}
          <div className="flex items-center gap-1 justify-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className={`h-2 w-2 rounded-sm ${
                    i < usageStreak.currentStreak % 7
                      ? 'bg-orange-400'
                      : 'bg-slate-700'
                  }`}
                />
                <span className="text-[8px] text-slate-600">{day}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* View: Weekly Activity */}
      {currentView === 1 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between h-12 px-1">
            {Object.entries(weeklyData).map(([day, count]) => (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all"
                  style={{ height: `${Math.max((count / 6) * 32, 4)}px` }}
                />
                <span className="text-[8px] text-slate-500 uppercase">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <div className="text-center pt-1">
            <span className="text-xs text-slate-400">
              {Object.values(weeklyData).reduce((a, b) => a + b, 0)} questions this week
            </span>
          </div>
        </div>
      )}

      {/* View: All Time Stats */}
      {currentView === 2 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-cyan-400">{allTimeStats.totalQuestions}</div>
            <div className="text-[9px] text-slate-500">total questions</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-400">{allTimeStats.totalInsights}</div>
            <div className="text-[9px] text-slate-500">insights</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-400">{allTimeStats.longestStreak}</div>
            <div className="text-[9px] text-slate-500">best streak</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-slate-300">{allTimeStats.memberSince}</div>
            <div className="text-[9px] text-slate-500">member since</div>
          </div>
        </div>
      )}

      {/* Carousel dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {views.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentView(i)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              i === currentView
                ? 'w-4 bg-orange-400'
                : 'w-1.5 bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

const navigation = [
  {
    name: 'Panel',
    href: '/panel',
    icon: Brain,
    description: 'Multi-model AI panel discussion',
  },
  {
    name: 'Memory Vault',
    href: '/vault',
    icon: Database,
    description: 'Browse your indexed documents',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Agents and preferences',
  },
]

export function Sidebar({ workspaceId, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [recentThreads, setRecentThreads] = useState<RecentThread[]>([])
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([])
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [usageStreak, setUsageStreak] = useState<UsageStreak | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editProjectName, setEditProjectName] = useState('')

  // Editing state for renaming threads
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')


  useEffect(() => {
    if (workspaceId) {
      fetchSidebarData()
      fetchProjects()
    }
  }, [workspaceId])

  const fetchSidebarData = async () => {
    try {
      const res = await fetch(`/api/sidebar-data?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setQuickStats(data.quickStats)
        setRecentThreads(data.recentThreads || [])
        setPinnedItems(data.pinnedItems || [])
        setProfileInfo(data.profileInfo)
        setUsageStreak(data.usageStreak)
      }
    } catch (error) {
      console.error('Failed to fetch sidebar data:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await fetch(`/api/projects?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleNewChat = async () => {
    if (!workspaceId || isCreatingChat) return
    setIsCreatingChat(true)
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (res.ok) {
        const thread = await res.json()
        router.push(`/panel?thread=${thread.id}`)
        fetchSidebarData() // Refresh thread list
      }
    } catch (error) {
      console.error('Failed to create chat:', error)
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handleRenameThread = async (threadId: string) => {
    if (!editTitle.trim()) {
      setEditingThreadId(null)
      return
    }
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })
      if (res.ok) {
        setRecentThreads(prev =>
          prev.map(t => (t.id === threadId ? { ...t, title: editTitle.trim() } : t))
        )
      }
    } catch (error) {
      console.error('Failed to rename thread:', error)
    } finally {
      setEditingThreadId(null)
    }
  }

  const handleDeleteThread = async (threadId: string) => {
    if (!confirm('Delete this chat? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/threads/${threadId}`, { method: 'DELETE' })
      if (res.ok) {
        setRecentThreads(prev => prev.filter(t => t.id !== threadId))
        // If we're on this thread, go to panel home
        if (pathname?.includes(threadId)) {
          router.push('/panel')
        }
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  }

  const startEditing = (thread: RecentThread) => {
    setEditingThreadId(thread.id)
    setEditTitle(thread.title)
  }

  // Project handlers
  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !workspaceId) return
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, name: newProjectName.trim() }),
      })
      if (res.ok) {
        const project = await res.json()
        setProjects(prev => [...prev, { ...project, threadCount: 0 }])
        setNewProjectName('')
        setIsCreatingProject(false)
        // Auto-expand the new project
        setExpandedProjects(prev => new Set([...prev, project.id]))
      }
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleRenameProject = async (projectId: string) => {
    if (!editProjectName.trim()) {
      setEditingProjectId(null)
      return
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName.trim() }),
      })
      if (res.ok) {
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? { ...p, name: editProjectName.trim() } : p))
        )
      }
    } catch (error) {
      console.error('Failed to rename project:', error)
    } finally {
      setEditingProjectId(null)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project? Chats will be moved to Unassigned.')) return
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        fetchSidebarData() // Refresh threads
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleMoveToProject = async (threadId: string, projectId: string | null) => {
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      if (res.ok) {
        fetchSidebarData()
        fetchProjects()
      }
    } catch (error) {
      console.error('Failed to move thread:', error)
    }
  }

  const startEditingProject = (project: Project) => {
    setEditingProjectId(project.id)
    setEditProjectName(project.name)
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'goal': return 'text-green-400'
      case 'project': return 'text-blue-400'
      case 'idea': return 'text-amber-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="flex h-full flex-col">
        {/* Logo / App Name */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-6">
          <Link href="/panel" className="flex items-center space-x-3 group" onClick={onClose}>
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/30 group-hover:ring-blue-500/50 transition-all">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text">
              OSQR
            </span>
          </Link>
          {/* Close button - only visible on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="cursor-pointer lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Action Bar - Claude style */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
              {/* New Chat */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleNewChat}
                    disabled={isCreatingChat || !workspaceId}
                    className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium text-sm transition-all disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">New Chat</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Start a new conversation</p>
                </TooltipContent>
              </Tooltip>

              {/* New Project */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCreatingProject(true)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-all"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Create new project</p>
                </TooltipContent>
              </Tooltip>

              {/* Search */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push('/panel?search=true')}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Search conversations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* New project input - appears when creating */}
          {isCreatingProject && (
            <div className="flex items-center gap-1 mt-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <FolderOpen className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <Input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateProject()
                  if (e.key === 'Escape') {
                    setIsCreatingProject(false)
                    setNewProjectName('')
                  }
                }}
                placeholder="Project name..."
                className="h-6 text-xs bg-transparent border-0 focus-visible:ring-0 flex-1 px-1"
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                className="p-1 rounded hover:bg-slate-600 text-green-400"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsCreatingProject(false)
                  setNewProjectName('')
                }}
                className="p-1 rounded hover:bg-slate-600 text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
                title={item.description}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                )} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Sections */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
          {/* Projects - Collapsible */}
          {projects.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setExpandedProjects(prev => {
                  const next = new Set(prev)
                  if (next.has('__projects__')) {
                    next.delete('__projects__')
                  } else {
                    next.add('__projects__')
                  }
                  return next
                })}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !expandedProjects.has('__projects__') && "-rotate-90"
                  )}
                />
                <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                <span>Projects</span>
                <span className="ml-auto text-[10px] text-slate-500">{projects.length}</span>
              </button>

              {expandedProjects.has('__projects__') && (
                <div className="space-y-0.5 pl-2">
                  {projects.map(project => (
                    <div key={project.id}>
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-1 p-1.5">
                          <Input
                            value={editProjectName}
                            onChange={e => setEditProjectName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameProject(project.id)
                              if (e.key === 'Escape') setEditingProjectId(null)
                            }}
                            className="h-6 text-xs bg-slate-800 border-slate-600 flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameProject(project.id)}
                            className="p-1 rounded hover:bg-slate-600 text-green-400"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingProjectId(null)}
                            className="p-1 rounded hover:bg-slate-600 text-slate-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors">
                          <FolderOpen className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-xs text-slate-300 flex-1 truncate">
                            {project.name}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {project.threadCount}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all">
                                <MoreHorizontal className="h-3 w-3 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={() => startEditingProject(project)}>
                                <Pencil className="mr-2 h-3 w-3" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Chats - Collapsible, closed by default */}
          {recentThreads.length > 0 && (
            <div className="space-y-1">
              <button
                onClick={() => setExpandedProjects(prev => {
                  const next = new Set(prev)
                  if (next.has('__recent__')) {
                    next.delete('__recent__')
                  } else {
                    next.add('__recent__')
                  }
                  return next
                })}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !expandedProjects.has('__recent__') && "-rotate-90"
                  )}
                />
                <History className="h-3.5 w-3.5 text-blue-400" />
                <span>Recent Chats</span>
                <span className="ml-auto text-[10px] text-slate-500">{recentThreads.length}</span>
              </button>

              {expandedProjects.has('__recent__') && (
                <div className="space-y-0.5 pl-2">
                  {recentThreads.slice(0, 10).map((thread) => (
                    <div
                      key={thread.id}
                      className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                      {editingThreadId === thread.id ? (
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleRenameThread(thread.id)
                              if (e.key === 'Escape') setEditingThreadId(null)
                            }}
                            className="h-6 text-xs bg-slate-800 border-slate-600 flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameThread(thread.id)}
                            className="p-1 rounded hover:bg-slate-600 text-green-400"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingThreadId(null)}
                            className="p-1 rounded hover:bg-slate-600 text-slate-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <MessageSquare className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          <Link
                            href={`/panel?thread=${thread.id}`}
                            className="flex-1 min-w-0"
                          >
                            <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate block">
                              {thread.title}
                            </span>
                          </Link>
                          <span className="text-[9px] text-slate-500 flex-shrink-0">
                            {formatTimeAgo(thread.updatedAt)}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all">
                                <MoreHorizontal className="h-3 w-3 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => startEditing(thread)}>
                                <Pencil className="mr-2 h-3 w-3" />
                                Rename
                              </DropdownMenuItem>
                              {/* Move to Project submenu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                    <FolderOpen className="mr-2 h-3 w-3" />
                                    Move to...
                                    <ChevronRight className="ml-auto h-3 w-3" />
                                  </DropdownMenuItem>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" className="w-36">
                                  <DropdownMenuItem
                                    onClick={() => handleMoveToProject(thread.id, null)}
                                    className={!thread.projectId ? 'bg-slate-700/50' : ''}
                                  >
                                    No Project
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {projects.map(project => (
                                    <DropdownMenuItem
                                      key={project.id}
                                      onClick={() => handleMoveToProject(thread.id, project.id)}
                                      className={thread.projectId === project.id ? 'bg-slate-700/50' : ''}
                                    >
                                      <FolderOpen className="mr-2 h-3 w-3 text-amber-400" />
                                      {project.name}
                                    </DropdownMenuItem>
                                  ))}
                                  {projects.length === 0 && (
                                    <p className="px-2 py-1 text-[10px] text-slate-500">
                                      No projects yet
                                    </p>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteThread(thread.id)}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Stats */}
          {quickStats && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Quick Stats</span>
              </div>
              <div className="space-y-2">
                {/* Queries remaining */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Queries today</span>
                    <span>{quickStats.queriesRemaining}/{quickStats.queriesMax}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(quickStats.queriesRemaining / quickStats.queriesMax) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Documents */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Vault docs</span>
                    <span>{quickStats.documentsCount}/{quickStats.documentsMax}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(quickStats.documentsCount / quickStats.documentsMax) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Capability Level */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between pt-1 cursor-help">
                        <span className="text-[10px] text-slate-400">Capability</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <span className="text-xs font-bold text-green-400">
                            {getCapabilityLabel(quickStats.capabilityLevel).label}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] bg-slate-800 border-slate-700 text-slate-200">
                      <p className="text-xs">{getCapabilityLabel(quickStats.capabilityLevel).description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Pinned Items */}
          {pinnedItems.length > 0 && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Pin className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300">Pinned</span>
              </div>
              <div className="space-y-1.5">
                {pinnedItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50"
                  >
                    <Target className={`h-3 w-3 mt-0.5 flex-shrink-0 ${getCategoryColor(item.category)}`} />
                    <span className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile / Knowledge Score */}
          {profileInfo && quickStats && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-300">OSQR Knows You</span>
                </div>
                <Link href="/profile" className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5">
                  Improve <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {(() => {
                const knowledge = calculateKnowledgeScore({
                  profileCompletion: profileInfo.completionPercent,
                  documentsCount: quickStats.documentsCount,
                  documentsMax: quickStats.documentsMax,
                  totalQuestions: usageStreak?.totalQuestions,
                  pinnedItemsCount: pinnedItems.length,
                })
                return (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{knowledge.label}</span>
                      <span>{knowledge.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${knowledge.score}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Usage & Streak Carousel */}
          {usageStreak && (
            <UsageCarousel usageStreak={usageStreak} />
          )}
        </div>

        {/* Footer - Activity indicator for active agents */}
        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <div className="flex -space-x-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span>3 agents ready</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
