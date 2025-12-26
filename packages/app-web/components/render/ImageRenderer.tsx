'use client'

/**
 * Image Renderer Component
 * Displays DALL-E generated images with lightbox support
 * @see docs/features/RENDER_SYSTEM_SPEC.md
 */

import { useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn, ExternalLink } from 'lucide-react'
import { ImageArtifactContent } from '@/lib/render/types'

interface ImageRendererProps {
  content: ImageArtifactContent
}

export function ImageRenderer({ content }: ImageRendererProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Determine dimensions based on size
  const dimensions = {
    '1024x1024': { width: 1024, height: 1024 },
    '1792x1024': { width: 1792, height: 1024 },
    '1024x1792': { width: 1024, height: 1792 },
  }[content.size] || { width: 1024, height: 1024 }

  // Calculate display size (max 800px width for display)
  const maxDisplayWidth = 800
  const scale = Math.min(1, maxDisplayWidth / dimensions.width)
  const displayWidth = Math.round(dimensions.width * scale)
  const displayHeight = Math.round(dimensions.height * scale)

  if (imageError) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Image is no longer available.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          OpenAI image URLs expire after some time.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Image container */}
      <div className="relative group">
        <button
          onClick={() => setLightboxOpen(true)}
          className="block rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-zoom-in"
        >
          <Image
            src={content.imageUrl}
            alt={content.prompt}
            width={displayWidth}
            height={displayHeight}
            className="w-auto h-auto max-w-full"
            onError={() => setImageError(true)}
            unoptimized // DALL-E URLs are temporary, don't cache
          />

          {/* Zoom indicator */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Prompt info */}
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">Prompt:</span> {content.prompt}
          </p>
          {content.revisedPrompt && content.revisedPrompt !== content.prompt && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              <span className="font-medium">DALL-E interpretation:</span>{' '}
              {content.revisedPrompt}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span>{content.size}</span>
            <span>{content.style || 'vivid'} style</span>
            <span>{content.model}</span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Open in new tab button */}
          <a
            href={content.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 right-16 p-2 text-white/80 hover:text-white transition-colors"
            aria-label="Open in new tab"
          >
            <ExternalLink className="w-6 h-6" />
          </a>

          {/* Full size image */}
          <Image
            src={content.imageUrl}
            alt={content.prompt}
            width={dimensions.width}
            height={dimensions.height}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            unoptimized
          />
        </div>
      )}
    </>
  )
}
