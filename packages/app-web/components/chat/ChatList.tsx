'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  MessageSquare,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Thread {
  id: string
  title: string
  projectId: string | null
  projectName?: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  threads: Thread[]
}

interface ChatListProps {
  workspaceId: string
  onThreadSelect?: (threadId: string | null) => void
  collapsed?: boolean
}

export function ChatList({ workspaceId, onThreadSelect, collapsed = false }: ChatListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentThreadId = searchParams.get('thread')

  const [threads, setThreads] = useState<Thread[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Move to project dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingThread, setMovingThread] = useState<Thread | null>(null)

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ workspaceId })
      if (search) params.append('search', search)

      const res = await fetch(`/api/threads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])

        // Group threads by project
        const projectMap = new Map<string, Project>()
        const unassigned: Thread[] = []

        for (const thread of data.threads || []) {
          if (thread.projectId && thread.projectName) {
            if (!projectMap.has(thread.projectId)) {
              projectMap.set(thread.projectId, {
                id: thread.projectId,
                name: thread.projectName,
                threads: [],
              })
            }
            projectMap.get(thread.projectId)!.threads.push(thread)
          } else {
            unassigned.push(thread)
          }
        }

        // Add unassigned as a pseudo-project
        const projectList = Array.from(projectMap.values())
        if (unassigned.length > 0) {
          projectList.push({
            id: '__unassigned__',
            name: 'Unassigned',
            threads: unassigned,
          })
        }

        setProjects(projectList)
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, search])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })

      if (res.ok) {
        const thread = await res.json()
        router.push(`/panel?thread=${thread.id}`)
        onThreadSelect?.(thread.id)
        fetchThreads()
      }
    } catch (error) {
      console.error('Failed to create thread:', error)
    }
  }

  const handleSelectThread = (threadId: string) => {
    router.push(`/panel?thread=${threadId}`)
    onThreadSelect?.(threadId)
  }

  const handleRename = async (threadId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })

      if (res.ok) {
        setThreads(prev =>
          prev.map(t => (t.id === threadId ? { ...t, title: editTitle.trim() } : t))
        )
      }
    } catch (error) {
      console.error('Failed to rename thread:', error)
    } finally {
      setEditingId(null)
    }
  }

  const handleDelete = async (threadId: string) => {
    if (!confirm('Delete this chat? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/threads/${threadId}`, { method: 'DELETE' })
      if (res.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId))
        if (currentThreadId === threadId) {
          router.push('/panel')
          onThreadSelect?.(null)
        }
        fetchThreads()
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
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
        fetchThreads()
      }
    } catch (error) {
      console.error('Failed to move thread:', error)
    } finally {
      setMoveDialogOpen(false)
      setMovingThread(null)
    }
  }

  const startEditing = (thread: Thread) => {
    setEditingId(thread.id)
    setEditTitle(thread.title)
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (collapsed) {
    return (
      <div className="p-2">
        <Button
          onClick={handleNewChat}
          size="icon"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-3 border-b border-slate-700/50">
        <Button
          onClick={handleNewChat}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-sm"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No chats yet. Start a new conversation!
          </div>
        ) : (
          <div className="space-y-1">
            {/* Recent section (flat list of all threads by date) */}
            {threads.map(thread => (
              <div
                key={thread.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                  currentThreadId === thread.id
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'hover:bg-slate-800/50 text-slate-300'
                )}
                onClick={() => editingId !== thread.id && handleSelectThread(thread.id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-slate-500" />

                {editingId === thread.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(thread.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="h-6 text-xs bg-slate-800 border-slate-600"
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={e => {
                        e.stopPropagation()
                        handleRename(thread.id)
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={e => {
                        e.stopPropagation()
                        setEditingId(null)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{thread.title}</span>
                    <span className="text-[10px] text-slate-500">
                      {formatTimeAgo(thread.updatedAt)}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => startEditing(thread)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setMovingThread(thread)
                            setMoveDialogOpen(true)
                          }}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Move to Project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(thread.id)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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

      {/* Move to Project Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <button
              onClick={() => movingThread && handleMoveToProject(movingThread.id, null)}
              className="w-full p-3 text-left rounded-lg hover:bg-slate-800 transition-colors"
            >
              <span className="text-sm text-slate-300">No Project (Unassigned)</span>
            </button>
            {projects
              .filter(p => p.id !== '__unassigned__')
              .map(project => (
                <button
                  key={project.id}
                  onClick={() => movingThread && handleMoveToProject(movingThread.id, project.id)}
                  className={cn(
                    'w-full p-3 text-left rounded-lg hover:bg-slate-800 transition-colors',
                    movingThread?.projectId === project.id && 'bg-blue-500/20'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-slate-300">{project.name}</span>
                  </div>
                </button>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
