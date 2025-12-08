'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Target,
  FolderKanban,
  Lightbulb,
  Plus,
  X,
  Pin,
  PinOff,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react'

interface MSCItem {
  id: string
  category: string
  content: string
  isPinned: boolean
  sortOrder: number
}

interface MSCPanelProps {
  workspaceId: string
  isExpanded?: boolean
  onToggle?: () => void
}

type Category = 'goal' | 'project' | 'idea'

const CATEGORY_CONFIG: Record<Category, { label: string; icon: typeof Target; color: string }> = {
  goal: { label: 'Goals', icon: Target, color: 'text-green-600 dark:text-green-400' },
  project: { label: 'Projects', icon: FolderKanban, color: 'text-blue-600 dark:text-blue-400' },
  idea: { label: 'Ideas', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400' },
}

export function MSCPanel({ workspaceId, isExpanded = true, onToggle }: MSCPanelProps) {
  const [items, setItems] = useState<MSCItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newItemContent, setNewItemContent] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<Category>>(new Set(['goal', 'project', 'idea']))

  // Fetch items on mount
  useEffect(() => {
    fetchItems()
  }, [workspaceId])

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

  const addItem = async (category: Category) => {
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

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    try {
      const response = await fetch('/api/msc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPinned: !currentlyPinned }),
      })
      if (response.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isPinned: !currentlyPinned } : item))
        )
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const toggleCategory = (category: Category) => {
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

  const getItemsByCategory = (category: Category) => {
    return items
      .filter((item) => item.category === category)
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1
        return a.sortOrder - b.sortOrder
      })
      .slice(0, 3) // MSC Lite: only show 3 per category
  }

  if (!isExpanded) {
    return (
      <div className="w-12 h-full border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Expand MSC"
        >
          <ChevronRight className="h-5 w-5 text-neutral-500" />
        </button>
        <div className="mt-4 space-y-3">
          <Target className="h-5 w-5 text-green-600" />
          <FolderKanban className="h-5 w-5 text-blue-600" />
          <Lightbulb className="h-5 w-5 text-amber-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 h-full border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
          Master Summary
        </h3>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4 text-neutral-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : (
          (['goal', 'project', 'idea'] as Category[]).map((category) => {
            const config = CATEGORY_CONFIG[category]
            const categoryItems = getItemsByCategory(category)
            const isExpanded = expandedCategories.has(category)
            const Icon = config.icon

            return (
              <div key={category}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full mb-2 group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {config.label}
                    </span>
                    <span className="text-xs text-neutral-400">({categoryItems.length}/3)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCategory(editingCategory === category ? null : category)
                        setNewItemContent('')
                      }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                    >
                      <Plus className="h-3 w-3 text-neutral-500" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-neutral-400" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="space-y-1.5 ml-1">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-start gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <p className="flex-1 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => togglePin(item.id, item.isPinned)}
                            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            title={item.isPinned ? 'Unpin' : 'Pin'}
                          >
                            {item.isPinned ? (
                              <PinOff className="h-3 w-3 text-neutral-500" />
                            ) : (
                              <Pin className="h-3 w-3 text-neutral-500" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add new item input */}
                    {editingCategory === category && (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder={`Add ${category}...`}
                          value={newItemContent}
                          onChange={(e) => setNewItemContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addItem(category)
                            if (e.key === 'Escape') setEditingCategory(null)
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          onClick={() => addItem(category)}
                          disabled={!newItemContent.trim()}
                          className="h-7 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Empty state */}
                    {categoryItems.length === 0 && editingCategory !== category && (
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setNewItemContent('')
                        }}
                        className="w-full p-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-md hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                      >
                        + Add your first {category}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800">
        <p className="text-[10px] text-neutral-400 text-center">
          Track your top 3 goals, projects & ideas
        </p>
      </div>
    </div>
  )
}
