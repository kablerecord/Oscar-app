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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface SidebarProps {
  workspaceId?: string
  onClose?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
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

export function Sidebar({ workspaceId, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [recentThreads, setRecentThreads] = useState<RecentThread[]>([])
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
        setRecentThreads(data.recentThreads || [])
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

  // Collapsed mode - icon-only sidebar
  if (isCollapsed) {
    return (
      <aside data-highlight-id="sidebar" className="fixed left-0 top-0 z-40 h-screen w-14 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="flex h-full flex-col items-center">
          {/* Logo - compact */}
          <div className="flex h-16 items-center justify-center border-b border-slate-700/50 w-full">
            <Link href="/panel" className="group" onClick={onClose}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/30 group-hover:ring-blue-500/50 transition-all">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
            </Link>
          </div>

          {/* Icon-only navigation */}
          <nav className="flex flex-col items-center gap-2 py-4">
            {/* New Chat */}
            <div className="relative group">
              <button
                onClick={handleNewChat}
                disabled={isCreatingChat || !workspaceId}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-sm font-semibold text-white">New Chat</span>
                  </div>
                  <p className="text-xs text-slate-400">Start a new conversation</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
              </div>
            </div>

            {/* Search */}
            <div className="relative group">
              <button
                onClick={() => router.push('/panel?search=true')}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all"
              >
                <Search className="h-5 w-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Search</span>
                  </div>
                  <p className="text-xs text-slate-400">Find chats & content</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
              </div>
            </div>

            <div className="h-px w-8 bg-slate-700/50 my-1" />

            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon
              const iconColor = item.name === 'Panel' ? 'text-blue-400' : item.name === 'Memory Vault' ? 'text-purple-400' : 'text-slate-400'

              return (
                <div key={item.name} className="relative group">
                  <Link
                    href={item.href}
                    data-highlight-id={item.name === 'Memory Vault' ? 'vault-link' : undefined}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                      isActive
                        ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.description}</p>
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Expand button */}
          {onToggleCollapse && (
            <div className="relative group mb-4">
              <button
                onClick={onToggleCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <PanelLeftOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-white">Expand</span>
                  </div>
                  <p className="text-xs text-slate-400">Show full sidebar</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
              </div>
            </div>
          )}

          {/* Activity indicator */}
          <div className="border-t border-slate-700/50 py-4 w-full flex justify-center">
            <div className="flex -space-x-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside data-highlight-id="sidebar" className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950">
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
          {/* Collapse button - only visible on lg+ */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="cursor-pointer hidden lg:block p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
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

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {/* New Chat - subtle nav item style */}
          <button
            onClick={handleNewChat}
            disabled={isCreatingChat || !workspaceId}
            className="group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
          >
            <Plus className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
            New Chat
          </button>

          {/* Search */}
          <button
            onClick={() => router.push('/panel?search=true')}
            className="group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <Search className="mr-3 h-5 w-5 flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
            Search
          </button>

          <div className="h-px bg-slate-700/50 my-2" />

          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                data-highlight-id={item.name === 'Memory Vault' ? 'vault-link' : undefined}
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
          <div className="space-y-1">
            <div className="flex items-center gap-1">
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
                className="flex items-center gap-2 flex-1 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
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
              <button
                onClick={() => setIsCreatingProject(true)}
                className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors"
                title="Create new project"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* New project input - appears when creating */}
            {isCreatingProject && (
              <div className="flex items-center gap-1 p-2 rounded-lg bg-slate-800/50 border border-slate-700 ml-2">
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

            {expandedProjects.has('__projects__') && (
              <div className="space-y-0.5 pl-2">
                {projects.length === 0 ? (
                  <p className="text-[11px] text-slate-500 px-2 py-1">No projects yet</p>
                ) : (
                  projects.map(project => (
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
                  ))
                )}
              </div>
            )}
          </div>

          {/* Recent Chats - Collapsible, closed by default */}
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
                {recentThreads.length === 0 ? (
                  <p className="text-[11px] text-slate-500 px-2 py-1">No chats yet</p>
                ) : (
                  recentThreads.slice(0, 10).map((thread) => (
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
                  ))
                )}
              </div>
            )}
          </div>
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
