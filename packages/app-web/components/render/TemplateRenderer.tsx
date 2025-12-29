'use client'

/**
 * Template Renderer Component
 * Routes to the appropriate template renderer based on content type
 * @see docs/features/TEMPLATE_SYSTEM_SPEC.md
 */

import type {
  TemplateArtifactContent,
  ListingsArtifactContent,
  TableArtifactContent,
  GameSimpleArtifactContent,
} from '@/lib/render/types'
import { ListingsRenderer } from './ListingsRenderer'
import { TableRenderer } from './TableRenderer'
import { GameRenderer } from './GameRenderer'

interface TemplateRendererProps {
  content: TemplateArtifactContent
  onStateChange?: (state: unknown) => void
}

export function TemplateRenderer({ content, onStateChange }: TemplateRendererProps) {
  switch (content.template) {
    case 'listings':
      return (
        <ListingsRenderer
          content={content as ListingsArtifactContent}
          onStateChange={onStateChange}
        />
      )

    case 'table':
      return (
        <TableRenderer
          content={content as TableArtifactContent}
          onStateChange={onStateChange}
        />
      )

    case 'game-simple':
      return (
        <GameRenderer
          content={content as GameSimpleArtifactContent}
          onStateChange={onStateChange}
        />
      )

    default:
      return (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>Unknown template type: {(content as { template: string }).template}</p>
        </div>
      )
  }
}
