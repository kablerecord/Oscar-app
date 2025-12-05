'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareActions } from '@/components/share/ShareActions'

export interface Agent {
  id: string
  name: string
  provider: 'openai' | 'anthropic'
  modelName: string
  description?: string
}

export interface AgentResponse {
  agentId: string
  content: string
  isLoading?: boolean
  error?: string
}

interface AgentCardProps {
  agent: Agent
  response?: AgentResponse
  isSelected?: boolean
  onToggle?: (agentId: string) => void
  showSelection?: boolean
}

export function AgentCard({
  agent,
  response,
  isSelected = false,
  onToggle,
  showSelection = false,
}: AgentCardProps) {
  const providerColors = {
    openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  }

  return (
    <Card
      className={cn(
        'p-4 transition-all',
        showSelection && 'cursor-pointer hover:border-neutral-400',
        isSelected && showSelection && 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
      )}
      onClick={() => showSelection && onToggle?.(agent.id)}
    >
      {/* Agent header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            {showSelection && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle?.(agent.id)}
                className="h-4 w-4 rounded border-neutral-300"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {agent.name}
            </h3>
          </div>
          {agent.description && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {agent.description}
            </p>
          )}
        </div>

        {/* Provider badge */}
        <div className="flex flex-col items-end space-y-1">
          <Badge variant="secondary" className={cn('text-xs', providerColors[agent.provider])}>
            {agent.provider}
          </Badge>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{agent.modelName}</span>
        </div>
      </div>

      {/* Response content */}
      {response && (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {response.isLoading ? (
            <div className="flex items-center space-x-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : response.error ? (
            <div className="text-sm text-red-600 dark:text-red-400">
              <strong>Error:</strong> {response.error}
            </div>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                  {response.content}
                </p>
              </div>
              {/* Share Actions for agent response */}
              <ShareActions
                content={response.content}
                agentName={agent.name}
                className="mt-2"
              />
            </>
          )}
        </div>
      )}
    </Card>
  )
}
