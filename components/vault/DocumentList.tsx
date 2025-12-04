'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  filters: {
    sourceTypes: Array<{ type: string; count: number }>
  }
  workspaceId: string
}

// Map source types to icons
const sourceIcons: Record<string, React.ElementType> = {
  chat_export: MessageSquare,
  chatgpt_conversation: MessageSquare,
  claude_conversation: MessageSquare,
  upload: Upload,
  note: StickyNote,
  other: FileText,
}

// Map source types to colors
const sourceColors: Record<string, string> = {
  chat_export: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  chatgpt_conversation: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  claude_conversation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  upload: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  note: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  other: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
}

export function DocumentList({
  initialDocuments,
  initialPagination,
  filters,
  workspaceId,
}: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

  const fetchDocuments = async (page: number, searchTerm?: string, source?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchTerm) params.append('search', searchTerm)
      if (source && source !== 'all') params.append('sourceType', source)

      const res = await fetch(`/api/vault?${params}`)
      const data = await res.json()

      setDocuments(data.documents)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDocuments(1, search, sourceFilter)
  }

  const handleSourceFilter = (source: string) => {
    setSourceFilter(source)
    fetchDocuments(1, search, source)
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const res = await fetch(`/api/vault/${docId}`, { method: 'DELETE' })
      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== docId))
        setPagination((p) => ({ ...p, total: p.total - 1 }))
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
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

        {/* Source type filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={sourceFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSourceFilter('all')}
          >
            All
          </Button>
          {filters.sourceTypes.map((st) => (
            <Button
              key={st.type}
              variant={sourceFilter === st.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSourceFilter(st.type)}
            >
              {st.type.replace('_', ' ')} ({st.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-600" />
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <p className="mt-4 text-neutral-500 dark:text-neutral-400">
              No documents found
            </p>
          </Card>
        ) : (
          documents.map((doc) => {
            const Icon = sourceIcons[doc.sourceType] || FileText
            const colorClass = sourceColors[doc.sourceType] || sourceColors.other

            return (
              <Card
                key={doc.id}
                className={`p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                  selectedDoc === doc.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`rounded-lg p-2 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                        <span>{formatDate(doc.createdAt)}</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">
                          {doc.chunkCount} chunks
                        </Badge>
                      </div>
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
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} documents
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(pagination.page - 1, search, sourceFilter)}
              disabled={pagination.page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDocuments(pagination.page + 1, search, sourceFilter)}
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
