'use client'

/**
 * Render Surface Page
 * Displays rendered artifacts (images, charts, templates)
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ImageArtifactContent,
  ChartArtifactContent,
  TemplateArtifactContent,
  ArtifactContent,
} from '@/lib/render/types'
import { ImageRenderer } from '@/components/render/ImageRenderer'
import { ChartRenderer } from '@/components/render/ChartRenderer'
import { TemplateRenderer } from '@/components/render/TemplateRenderer'
import { ArrowLeft, Download, RefreshCw, AlertCircle, Gamepad2, Table2, LayoutGrid } from 'lucide-react'

interface ArtifactWithRelations {
  id: string
  type: 'IMAGE' | 'CHART' | 'TEMPLATE'
  title: string | null
  content: ArtifactContent
  state: string
  version: number
  createdAt: string
  viewedAt: string | null
  parent?: { id: string; version: number } | null
  children?: { id: string; version: number }[]
}

function getDefaultTitle(content: ArtifactContent): string {
  switch (content.type) {
    case 'image':
      return 'Generated Image'
    case 'chart':
      return 'Chart'
    case 'template':
      const templateContent = content as TemplateArtifactContent
      switch (templateContent.template) {
        case 'listings':
          return 'Listings'
        case 'table':
          return 'Data Table'
        case 'game-simple':
          return templateContent.config?.name || 'Game'
        default:
          return 'Template'
      }
    default:
      return 'Artifact'
  }
}

export default function RenderSurfacePage() {
  const params = useParams()
  const router = useRouter()
  const artifactId = params.artifactId as string

  const [artifact, setArtifact] = useState<ArtifactWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce timer for state persistence
  const stateUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle template state changes with debounced persistence
  const handleStateChange = useCallback((newState: unknown) => {
    if (!artifact || artifact.content.type !== 'template') return

    // Update local state immediately for responsive UI
    setArtifact(prev => {
      if (!prev) return prev
      return {
        ...prev,
        content: {
          ...prev.content,
          state: newState,
        } as TemplateArtifactContent,
      }
    })

    // Debounce API updates (300ms delay to batch rapid changes)
    if (stateUpdateTimerRef.current) {
      clearTimeout(stateUpdateTimerRef.current)
    }

    stateUpdateTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/artifacts/${artifactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              ...artifact.content,
              state: newState,
            },
          }),
        })
      } catch (err) {
        console.error('Failed to persist template state:', err)
      }
    }, 300)
  }, [artifact, artifactId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (stateUpdateTimerRef.current) {
        clearTimeout(stateUpdateTimerRef.current)
      }
    }
  }, [])

  // Fetch artifact on mount
  useEffect(() => {
    async function fetchArtifact() {
      try {
        const response = await fetch(`/api/artifacts/${artifactId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Artifact not found')
          } else {
            setError('Failed to load artifact')
          }
          return
        }

        const data = await response.json()
        setArtifact(data.artifact)

        // Mark as viewed
        await fetch(`/api/artifacts/${artifactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markViewed: true }),
        })
      } catch (err) {
        console.error('Error fetching artifact:', err)
        setError('Failed to load artifact')
      } finally {
        setLoading(false)
      }
    }

    if (artifactId) {
      fetchArtifact()
    }
  }, [artifactId])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-200 dark:bg-purple-800" />
          <p className="text-gray-500 dark:text-gray-400">Loading render...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !artifact) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || 'Artifact not found'}
          </h1>
          <button
            onClick={() => router.back()}
            className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  // Render based on type
  const content = artifact.content

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {content.type === 'template' && (
                    <>
                      {(content as TemplateArtifactContent).template === 'game-simple' && <Gamepad2 className="w-5 h-5" />}
                      {(content as TemplateArtifactContent).template === 'table' && <Table2 className="w-5 h-5" />}
                      {(content as TemplateArtifactContent).template === 'listings' && <LayoutGrid className="w-5 h-5" />}
                    </>
                  )}
                  {artifact.title || getDefaultTitle(content)}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Version {artifact.version}
                  {artifact.parent && (
                    <> • <button
                      onClick={() => router.push(`/r/${artifact.parent?.id}`)}
                      className="text-purple-600 hover:underline"
                    >
                      View previous
                    </button></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {content.type === 'image' && (
                <a
                  href={content.imageUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {artifact.state === 'ERROR' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 dark:text-red-200 font-medium">
                  Render failed
                </p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                  There was an error generating this artifact.
                </p>
              </div>
            </div>
          </div>
        )}

        {artifact.state === 'RENDERING' && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Rendering...</p>
          </div>
        )}

        {(artifact.state === 'COMPLETE_AWAITING_VIEW' ||
          artifact.state === 'VIEWING' ||
          artifact.state === 'IDLE') && (
          <div className="flex justify-center">
            {content.type === 'image' && (
              <ImageRenderer content={content as ImageArtifactContent} />
            )}
            {content.type === 'chart' && (
              <ChartRenderer content={content as ChartArtifactContent} />
            )}
            {content.type === 'template' && (
              <TemplateRenderer
                content={content as TemplateArtifactContent}
                onStateChange={handleStateChange}
              />
            )}
          </div>
        )}

        {/* Version history */}
        {artifact.children && artifact.children.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Later versions
            </h2>
            <div className="flex gap-2">
              {artifact.children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => router.push(`/r/${child.id}`)}
                  className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  v{child.version}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
