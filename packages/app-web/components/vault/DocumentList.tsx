'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  MessageSquare,
  Upload,
  StickyNote,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Square,
  CheckSquare,
  Minus,
} from 'lucide-react'

interface Document {
  id: string
  title: string
  sourceType: string
  originalFilename?: string
  mimeType?: string
  createdAt: string
  updatedAt: string
  chunkCount: number
}

interface DocumentListProps {
  initialDocuments: Document[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  workspaceId: string
}

// Map source types to icons
const sourceIcons: Record<string, React.ElementType> = {
  chat_export: MessageSquare,
  chatgpt_conversation: MessageSquare,
  claude_conversation: MessageSquare,
  conversation: MessageSquare,  // Auto-saved OSQR conversations
  upload: Upload,
  note: StickyNote,
  system: FileText,
  other: FileText,
}

// Map source types to colors
const sourceColors: Record<string, string> = {
  chat_export: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chatgpt_conversation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  claude_conversation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  conversation: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',  // Auto-saved OSQR chats
  upload: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  note: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  system: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  other: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
}

// Format source type for display
const formatSourceType = (type: string) => {
  const labels: Record<string, string> = {
    upload: 'Uploaded',
    chat_export: 'Chat Export',
    chatgpt_conversation: 'ChatGPT',
    claude_conversation: 'Claude',
    conversation: 'OSQR Chat',  // Auto-saved conversations
    note: 'Note',
    system: 'System',
    other: 'Other',
  }
  return labels[type] || type.replace(/_/g, ' ')
}

export function DocumentList({
  initialDocuments,
  initialPagination,
  workspaceId,
}: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments || [])
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchDocuments = async (page: number, searchTerm?: string) => {
    setLoading(true)
    setSelectedIds(new Set()) // Clear selection on page change
    try {
      const params = new URLSearchParams({
        workspaceId,
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchTerm) params.append('search', searchTerm)

      const res = await fetch(`/api/vault?${params}`)
      const data = await res.json()

      setDocuments(data.documents || [])
      setPagination(data.pagination || initialPagination)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDocuments(1, search)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const res = await fetch(`/api/vault/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== docId))
        setPagination((p) => ({ ...p, total: p.total - 1 }))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(docId)
          return next
        })
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    if (!confirm(`Are you sure you want to delete ${count} document${count > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }

    setBulkDeleting(true)
    try {
      // Delete all selected documents in parallel
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`/api/vault/${id}`, { method: 'DELETE' })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter((r) => r.ok).length

      // Remove successfully deleted documents from state
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)))
      setPagination((p) => ({ ...p, total: p.total - successCount }))
      setSelectedIds(new Set())

      if (successCount < count) {
        alert(`Deleted ${successCount} of ${count} documents. Some deletions failed.`)
      }
    } catch (error) {
      console.error('Failed to delete documents:', error)
      alert('Failed to delete some documents')
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Determine select-all checkbox state
  const selectAllState =
    documents.length === 0
      ? 'none'
      : selectedIds.size === 0
        ? 'none'
        : selectedIds.size === documents.length
          ? 'all'
          : 'some'

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Button type="submit" variant="outline" disabled={loading}>
          Search
        </Button>
      </form>

      {/* Bulk actions bar - shows when documents exist */}
      {documents.length > 0 && (
        <div className="flex items-center gap-4 py-2 px-1 border-b border-slate-700">
          {/* Select all checkbox */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-slate-800 cursor-pointer"
            title={selectAllState === 'all' ? 'Deselect all' : 'Select all'}
          >
            {selectAllState === 'none' && (
              <Square className="h-4 w-4 text-slate-400" />
            )}
            {selectAllState === 'some' && (
              <Minus className="h-4 w-4 text-blue-500" />
            )}
            {selectAllState === 'all' && (
              <CheckSquare className="h-4 w-4 text-blue-500" />
            )}
          </button>

          {selectedIds.size > 0 ? (
            <>
              <span className="text-sm text-slate-300">
                {selectedIds.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </>
          ) : (
            <span className="text-sm text-slate-400">
              Select documents to delete
            </span>
          )}
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-500" />
            <p className="mt-4 text-slate-400">
              No documents found
            </p>
          </Card>
        ) : (
          documents.map((doc) => {
            const Icon = sourceIcons[doc.sourceType] || FileText
            const colorClass = sourceColors[doc.sourceType] || sourceColors.other
            const isSelected = selectedIds.has(doc.id)

            return (
              <Card
                key={doc.id}
                className={`p-4 transition-colors hover:bg-slate-800/50 ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''
                } ${selectedDoc === doc.id ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(doc.id)}
                      className="flex items-center justify-center w-5 h-5 rounded hover:bg-slate-700 cursor-pointer flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    <div className={`rounded-lg p-2 ${colorClass} flex-shrink-0`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-100 truncate">
                        {doc.title}
                      </h3>
                      <span className="text-sm text-slate-400">
                        {formatDate(doc.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDoc(selectedDoc === doc.id ? null : doc.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700 pt-4">
          <p className="text-sm text-slate-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} documents
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(pagination.page - 1, search)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(pagination.page + 1, search)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
