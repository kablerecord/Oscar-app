'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Target,
  FolderKanban,
  Lightbulb,
  Plus,
  X,
  Pin,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  Clock,
  Archive,
  Play,
  Calendar,
  GripVertical,
  Pencil,
  Trash2,
  MoreHorizontal,
  Folder,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react'

interface MSCItem {
  id: string
  category: string
  content: string
  description?: string | null
  isPinned: boolean
  sortOrder: number
  status: 'active' | 'in_progress' | 'completed' | 'archived'
  dueDate?: string | null
}

interface MSCCategory {
  id: string
  name: string
  icon: string
  color: string
  sortOrder: number
}

interface MSCPanelProps {
  workspaceId: string
  isExpanded?: boolean
  onToggle?: () => void
  onAskOSQR?: (prompt: string) => void
}

type BuiltInCategory = 'goal' | 'project' | 'idea'

const BUILTIN_CATEGORY_CONFIG: Record<BuiltInCategory, { label: string; icon: typeof Target; color: string }> = {
  goal: { label: 'Goals', icon: Target, color: 'text-green-600 dark:text-green-400' },
  project: { label: 'Projects', icon: FolderKanban, color: 'text-blue-600 dark:text-blue-400' },
  idea: { label: 'Ideas', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400' },
}

const STATUS_CONFIG = {
  active: { label: 'Active', icon: Clock, color: 'text-neutral-500' },
  in_progress: { label: 'In Progress', icon: Play, color: 'text-blue-500' },
  completed: { label: 'Completed', icon: Check, color: 'text-green-500' },
  archived: { label: 'Archived', icon: Archive, color: 'text-neutral-400' },
}

// Get icon component by name
function getIconByName(name: string) {
  const icons: Record<string, typeof Folder> = {
    folder: Folder,
    target: Target,
    lightbulb: Lightbulb,
    folderKanban: FolderKanban,
  }
  return icons[name] || Folder
}

export function MSCPanel({ workspaceId, isExpanded = true, onToggle, onAskOSQR }: MSCPanelProps) {
  const [items, setItems] = useState<MSCItem[]>([])
  const [customCategories, setCustomCategories] = useState<MSCCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newItemContent, setNewItemContent] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['goal', 'project', 'idea']))
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingDescription, setEditingDescription] = useState<string | null>(null)
  const [descriptionContent, setDescriptionContent] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleLearnMore = () => {
    if (onAskOSQR) {
      onAskOSQR("Hey! I'd love to learn more about the Command Center. What is it, how do I use it, and how is it going to help me achieve my goals?")
    }
  }

  const editInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Fetch items and custom categories on mount
  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [workspaceId])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingItem && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingItem])

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
    }
  }, [editingDescription])

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/msc?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch MSC items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/msc/categories?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setCustomCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch custom categories:', error)
    }
  }

  const addItem = async (category: string) => {
    if (!newItemContent.trim()) return

    try {
      const response = await fetch('/api/msc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          category,
          content: newItemContent.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setItems((prev) => [...prev, data.item])
        setNewItemContent('')
        setEditingCategory(null)
      }
    } catch (error) {
      console.error('Failed to add MSC item:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/msc?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete MSC item:', error)
    }
  }

  const updateItem = async (id: string, updates: Partial<MSCItem>) => {
    try {
      const response = await fetch('/api/msc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (response.ok) {
        const data = await response.json()
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...data.item } : item))
        )
      }
    } catch (error) {
      console.error('Failed to update MSC item:', error)
    }
  }

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    await updateItem(id, { isPinned: !currentlyPinned })
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const toggleItemExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const startEditing = (item: MSCItem) => {
    setEditingItem(item.id)
    setEditContent(item.content)
  }

  const saveEdit = async (id: string) => {
    if (editContent.trim() && editContent !== items.find(i => i.id === id)?.content) {
      await updateItem(id, { content: editContent.trim() })
    }
    setEditingItem(null)
    setEditContent('')
  }

  const startEditingDescription = (item: MSCItem) => {
    setEditingDescription(item.id)
    setDescriptionContent(item.description || '')
  }

  const saveDescription = async (id: string) => {
    await updateItem(id, { description: descriptionContent.trim() || null })
    setEditingDescription(null)
    setDescriptionContent('')
  }

  const updateStatus = async (id: string, status: MSCItem['status']) => {
    await updateItem(id, { status })
    setShowStatusMenu(null)
  }

  const updateDueDate = async (id: string, date: string | null) => {
    await updateItem(id, { dueDate: date ? new Date(date).toISOString() : null })
    setShowDatePicker(null)
  }

  const getItemsByCategory = (category: string) => {
    return items
      .filter((item) => item.category === category)
      .sort((a, b) => {
        // Pinned items first
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1
        // Then by status (in_progress > active > completed > archived)
        const statusOrder: Record<string, number> = { in_progress: 0, active: 1, completed: 2, archived: 3 }
        const aStatus = a.status || 'active'
        const bStatus = b.status || 'active'
        if (aStatus !== bStatus) return statusOrder[aStatus] - statusOrder[bStatus]
        // Then by sort order
        return a.sortOrder - b.sortOrder
      })
  }

  const getAllCategories = (): Array<{ id: string; label: string; icon: typeof Target; color: string; isCustom: boolean }> => {
    const builtIn = (['goal', 'project', 'idea'] as BuiltInCategory[]).map(cat => ({
      id: cat,
      label: BUILTIN_CATEGORY_CONFIG[cat].label,
      icon: BUILTIN_CATEGORY_CONFIG[cat].icon,
      color: BUILTIN_CATEGORY_CONFIG[cat].color,
      isCustom: false,
    }))

    const custom = customCategories.map(cat => ({
      id: cat.id,
      label: cat.name,
      icon: getIconByName(cat.icon),
      color: cat.color,
      isCustom: true,
    }))

    return [...builtIn, ...custom]
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetItemId: string, category: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetItemId) {
      setDraggedItem(null)
      return
    }

    const categoryItems = getItemsByCategory(category)
    const draggedIndex = categoryItems.findIndex(i => i.id === draggedItem)
    const targetIndex = categoryItems.findIndex(i => i.id === targetItemId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // Calculate new sort orders
    const newItems = [...categoryItems]
    const [removed] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, removed)

    // Update sort orders
    for (let i = 0; i < newItems.length; i++) {
      if (newItems[i].sortOrder !== i) {
        await updateItem(newItems[i].id, { sortOrder: i })
      }
    }

    setDraggedItem(null)
  }

  const formatDueDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = (dateStr: string | null | undefined) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  if (!isExpanded) {
    return (
      <div className="w-14 h-full border-l border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all group"
          title="Open Command Center"
        >
          <Zap className="h-5 w-5 text-blue-400 group-hover:text-blue-300" />
        </button>
        <div className="mt-6 space-y-4">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <Target className="h-4 w-4 text-green-400" />
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <FolderKanban className="h-4 w-4 text-blue-400" />
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lightbulb className="h-4 w-4 text-amber-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 h-full border-l border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col shadow-xl">
      {/* Header */}
      <div className="relative px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-950/50 to-purple-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <h3 className="font-bold text-sm text-white cursor-help">
                Command Center
              </h3>

              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute left-0 top-full pt-2 z-50">
                  <div className="w-72 p-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Sparkles className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium mb-2">
                          Your strategic control room for goals, projects, and ideas.
                        </p>
                        <p className="text-xs text-slate-400 mb-3">
                          OSQR uses this to understand your priorities and give you context-aware answers aligned with what matters most to you.
                        </p>
                        <button
                          onClick={() => {
                            handleLearnMore()
                            setShowTooltip(false)
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Sparkles className="h-3 w-3" />
                          Ask OSQR to explain more
                        </button>
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-0 left-8 w-4 h-4 bg-slate-800 border-l border-t border-slate-600 transform rotate-45" />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLearnMore}
              className="p-1 rounded-full hover:bg-slate-700/50 transition-colors"
              title="Learn more about Command Center"
            >
              <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-blue-400" />
            </button>
          </div>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="h-4 w-4 text-slate-400 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          </div>
        ) : (
          getAllCategories().map((category) => {
            const categoryItems = getItemsByCategory(category.id)
            const isCategoryExpanded = expandedCategories.has(category.id)
            const Icon = category.icon

            return (
              <div key={category.id} className="rounded-xl bg-slate-800/30 border border-slate-700/50 overflow-hidden">
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-between w-full px-3 py-2.5 group hover:bg-slate-700/30 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleCategory(category.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${
                      category.id === 'goal' ? 'bg-green-500/10 border border-green-500/20' :
                      category.id === 'project' ? 'bg-blue-500/10 border border-blue-500/20' :
                      category.id === 'idea' ? 'bg-amber-500/10 border border-amber-500/20' :
                      'bg-slate-500/10 border border-slate-500/20'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${category.color}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">
                      {category.label}
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-700/50 rounded-full">
                      {categoryItems.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCategory(editingCategory === category.id ? null : category.id)
                        setNewItemContent('')
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600/50 transition-all"
                    >
                      <Plus className="h-3 w-3 text-slate-400" />
                    </button>
                    {isCategoryExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Category Items */}
                {isCategoryExpanded && (
                  <div className="space-y-1 px-2 pb-2">
                    {categoryItems.map((item) => {
                      const isItemExpanded = expandedItems.has(item.id)
                      const itemStatus = item.status || 'active'
                      const StatusIcon = STATUS_CONFIG[itemStatus].icon

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, item.id, category.id)}
                          className={`group rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600/50 transition-all ${
                            draggedItem === item.id ? 'opacity-50' : ''
                          } ${itemStatus === 'completed' ? 'opacity-60' : ''}`}
                        >
                          {/* Main item row */}
                          <div className="flex items-start gap-2 p-2">
                            {/* Drag handle */}
                            <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
                              <GripVertical className="h-3 w-3 text-slate-500" />
                            </div>

                            {/* Pinned indicator */}
                            {item.isPinned && (
                              <Pin className="h-3 w-3 text-blue-500 fill-blue-500 flex-shrink-0 mt-0.5" />
                            )}

                            {/* Status indicator */}
                            <button
                              onClick={() => setShowStatusMenu(showStatusMenu === item.id ? null : item.id)}
                              className="flex-shrink-0 mt-0.5"
                              title={STATUS_CONFIG[itemStatus].label}
                            >
                              <StatusIcon className={`h-3.5 w-3.5 ${STATUS_CONFIG[itemStatus].color}`} />
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {editingItem === item.id ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(item.id)
                                    if (e.key === 'Escape') {
                                      setEditingItem(null)
                                      setEditContent('')
                                    }
                                  }}
                                  onBlur={() => saveEdit(item.id)}
                                  className="w-full px-1 py-0.5 text-xs rounded border border-blue-400 bg-white dark:bg-neutral-900 focus:outline-none"
                                />
                              ) : (
                                <button
                                  onClick={() => toggleItemExpanded(item.id)}
                                  className={`text-left text-xs text-slate-200 leading-relaxed hover:text-white transition-colors ${
                                    itemStatus === 'completed' ? 'line-through text-slate-400' : ''
                                  }`}
                                >
                                  {item.content}
                                </button>
                              )}

                              {/* Due date badge */}
                              {item.dueDate && (
                                <div className={`mt-1 flex items-center gap-1 text-[10px] ${
                                  isOverdue(item.dueDate) ? 'text-red-500' : 'text-neutral-400'
                                }`}>
                                  <Calendar className="h-2.5 w-2.5" />
                                  {formatDueDate(item.dueDate)}
                                </div>
                              )}
                            </div>

                            {/* Quick actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => startEditing(item)}
                                className="p-1 rounded-md hover:bg-slate-600/50"
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3 text-slate-400" />
                              </button>
                              <button
                                onClick={() => togglePin(item.id, item.isPinned)}
                                className="p-1 rounded-md hover:bg-slate-600/50"
                                title={item.isPinned ? 'Unpin' : 'Pin'}
                              >
                                <Pin className={`h-3 w-3 ${item.isPinned ? 'text-blue-400 fill-blue-400' : 'text-slate-400'}`} />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1 rounded-md hover:bg-red-900/30"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-red-400" />
                              </button>
                            </div>
                          </div>

                          {/* Status menu dropdown */}
                          {showStatusMenu === item.id && (
                            <div className="mx-2 mb-2 p-1 bg-slate-800 rounded-lg shadow-xl border border-slate-600">
                              {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((status) => {
                                const config = STATUS_CONFIG[status]
                                const StatusOptionIcon = config.icon
                                return (
                                  <button
                                    key={status}
                                    onClick={() => updateStatus(item.id, status)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-slate-700 text-slate-200 ${
                                      itemStatus === status ? 'bg-slate-700' : ''
                                    }`}
                                  >
                                    <StatusOptionIcon className={`h-3 w-3 ${config.color}`} />
                                    {config.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Expanded content */}
                          {isItemExpanded && (
                            <div className="px-2 pb-2 space-y-2">
                              {/* Description */}
                              <div className="ml-6">
                                {editingDescription === item.id ? (
                                  <div className="space-y-1">
                                    <textarea
                                      ref={descriptionRef}
                                      value={descriptionContent}
                                      onChange={(e) => setDescriptionContent(e.target.value)}
                                      placeholder="Add notes..."
                                      rows={3}
                                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-600 bg-slate-800 text-slate-200 focus:outline-none focus:border-blue-400"
                                    />
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => saveDescription(item.id)}
                                        className="h-6 px-2 text-xs"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingDescription(null)
                                          setDescriptionContent('')
                                        }}
                                        className="h-6 px-2 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startEditingDescription(item)}
                                    className="w-full text-left text-[11px] text-slate-400 hover:text-slate-200"
                                  >
                                    {item.description || '+ Add notes...'}
                                  </button>
                                )}
                              </div>

                              {/* Due date picker */}
                              <div className="ml-6 flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">Due:</span>
                                {showDatePicker === item.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="date"
                                      defaultValue={item.dueDate?.split('T')[0] || ''}
                                      onChange={(e) => updateDueDate(item.id, e.target.value || null)}
                                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-200"
                                    />
                                    <button
                                      onClick={() => updateDueDate(item.id, null)}
                                      className="text-[10px] text-red-400 hover:underline"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowDatePicker(item.id)}
                                    className="text-[10px] text-slate-400 hover:text-slate-200"
                                  >
                                    {item.dueDate ? formatDueDate(item.dueDate) : 'Set date'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add new item input */}
                    {editingCategory === category.id && (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder={`Add ${category.label.toLowerCase().slice(0, -1)}...`}
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addItem(category.id)
                            if (e.key === 'Escape') setEditingCategory(null)
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-600 bg-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          onClick={() => addItem(category.id)}
                          disabled={!newItemContent.trim()}
                          className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Empty state - Ask OSQR button when no items */}
                    {categoryItems.length === 0 && editingCategory !== category.id && (
                      <button
                        onClick={() => {
                          if (onAskOSQR) {
                            const categoryName = category.label.toLowerCase()
                            onAskOSQR(`Help me think about my ${categoryName}. What questions should I be asking myself to clarify my ${categoryName}?`)
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 border border-dashed border-blue-500/30 rounded-lg transition-all group"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-blue-400 group-hover:text-blue-300" />
                        <span className="text-xs text-slate-400 group-hover:text-slate-200">
                          Ask OSQR about your {category.label.toLowerCase()}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}

      </div>
    </div>
  )
}
