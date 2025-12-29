'use client'

/**
 * Artifact Preview Component
 * Shows a compact preview of an artifact in the chat bubble
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import { useState, useEffect } from 'react'
import {
  Image as ImageIcon,
  BarChart3,
  LayoutGrid,
  Table2,
  Gamepad2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type {
  ArtifactContent,
  ImageArtifactContent,
  ChartArtifactContent,
  TemplateArtifactContent,
  ListingsArtifactContent,
  TableArtifactContent,
  GameSimpleArtifactContent,
} from '@/lib/render/types'

interface ArtifactPreviewProps {
  artifactId: string
  type: 'IMAGE' | 'CHART' | 'TEMPLATE'
}

export function ArtifactPreview({ artifactId, type }: ArtifactPreviewProps) {
  const [content, setContent] = useState<ArtifactContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchArtifact() {
      try {
        const response = await fetch(`/api/artifacts/${artifactId}`)
        if (!response.ok) {
          setError(true)
          return
        }

        const data = await response.json()
        setContent(data.artifact.content)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchArtifact()
  }, [artifactId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-700/30 rounded-lg">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="flex items-center justify-center h-32 bg-slate-700/30 rounded-lg">
        <AlertCircle className="h-6 w-6 text-slate-400" />
      </div>
    )
  }

  // Render based on content type
  switch (content.type) {
    case 'image':
      return <ImagePreview content={content as ImageArtifactContent} />
    case 'chart':
      return <ChartPreview content={content as ChartArtifactContent} />
    case 'template':
      return <TemplatePreview content={content as TemplateArtifactContent} />
    default:
      return (
        <div className="flex items-center justify-center h-32 bg-slate-700/30 rounded-lg">
          <span className="text-slate-400 text-sm">Preview not available</span>
        </div>
      )
  }
}

function ImagePreview({ content }: { content: ImageArtifactContent }) {
  const [imageError, setImageError] = useState(false)

  if (imageError || !content.imageUrl) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
        <div className="flex-shrink-0 w-16 h-16 bg-slate-600/50 rounded-lg flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">Generated Image</p>
          <p className="text-xs text-slate-400 line-clamp-2">{content.prompt}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-700/30">
      <img
        src={content.imageUrl}
        alt={content.prompt}
        className="w-full h-32 object-cover"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-xs text-white/80 line-clamp-1">{content.prompt}</p>
      </div>
    </div>
  )
}

function ChartPreview({ content }: { content: ChartArtifactContent }) {
  const chartTypeIcons: Record<string, typeof BarChart3> = {
    line: BarChart3,
    bar: BarChart3,
    area: BarChart3,
  }
  const Icon = chartTypeIcons[content.chartType] || BarChart3

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
        <Icon className="h-8 w-8 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          {content.title || `${content.chartType.charAt(0).toUpperCase() + content.chartType.slice(1)} Chart`}
        </p>
        <p className="text-xs text-slate-400">
          {content.data.length} data points
          {content.yAxisLabel && ` • ${content.yAxisLabel}`}
        </p>
      </div>
    </div>
  )
}

function TemplatePreview({ content }: { content: TemplateArtifactContent }) {
  switch (content.template) {
    case 'listings':
      return <ListingsPreview content={content as ListingsArtifactContent} />
    case 'table':
      return <TablePreview content={content as TableArtifactContent} />
    case 'game-simple':
      return <GamePreview content={content as GameSimpleArtifactContent} />
    default:
      // Future template types
      const unknownContent = content as { template: string }
      return (
        <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
          <div className="flex-shrink-0 w-16 h-16 bg-slate-600/50 rounded-lg flex items-center justify-center">
            <LayoutGrid className="h-8 w-8 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Template</p>
            <p className="text-xs text-slate-400">{unknownContent.template}</p>
          </div>
        </div>
      )
  }
}

function ListingsPreview({ content }: { content: ListingsArtifactContent }) {
  const itemCount = content.items.length
  const firstItem = content.items[0]
  const primaryValue = firstItem?.[content.config.primaryField]

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
        <LayoutGrid className="h-8 w-8 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          {itemCount} Listings
        </p>
        <p className="text-xs text-slate-400 truncate">
          {primaryValue ? `Starting with "${String(primaryValue).slice(0, 30)}..."` : 'Card grid with filters'}
        </p>
        <div className="flex gap-1 mt-1">
          {content.config.sortableFields.slice(0, 2).map((field) => (
            <span
              key={field}
              className="px-1.5 py-0.5 text-[10px] bg-slate-600/50 text-slate-300 rounded"
            >
              {field}
            </span>
          ))}
          {content.config.sortableFields.length > 2 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-slate-600/50 text-slate-300 rounded">
              +{content.config.sortableFields.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function TablePreview({ content }: { content: TableArtifactContent }) {
  const rowCount = content.rows.length
  const columnCount = content.columns.length

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
        <Table2 className="h-8 w-8 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          Data Table
        </p>
        <p className="text-xs text-slate-400">
          {rowCount} rows × {columnCount} columns
        </p>
        <div className="flex gap-1 mt-1">
          {content.columns.slice(0, 3).map((col) => (
            <span
              key={col.key}
              className="px-1.5 py-0.5 text-[10px] bg-slate-600/50 text-slate-300 rounded"
            >
              {col.label}
            </span>
          ))}
          {content.columns.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-slate-600/50 text-slate-300 rounded">
              +{content.columns.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function GamePreview({ content }: { content: GameSimpleArtifactContent }) {
  const status = content.state.status
  const statusColors: Record<string, string> = {
    playing: 'text-green-400',
    won: 'text-yellow-400',
    draw: 'text-orange-400',
    lost: 'text-red-400',
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-lg">
      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
        <Gamepad2 className="h-8 w-8 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">
          {content.config.name}
        </p>
        <p className="text-xs text-slate-400">
          {content.variant.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        </p>
        <p className={`text-xs mt-1 ${statusColors[status] || 'text-slate-400'}`}>
          {status === 'playing' && content.state.turn && `${content.state.turn}'s turn`}
          {status === 'won' && `${content.state.winner} wins!`}
          {status === 'draw' && "It's a draw!"}
          {status === 'lost' && 'Game over'}
        </p>
      </div>
    </div>
  )
}
