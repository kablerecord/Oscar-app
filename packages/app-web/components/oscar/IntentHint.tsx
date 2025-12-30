'use client'

import { useMemo } from 'react'
import {
  Lightbulb,
  Search,
  Code,
  Image,
  Eye,
  BookOpen,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CapabilityType, CapabilityBarState } from '@/components/oscar/CapabilityBar'

interface IntentHintProps {
  query: string
  capabilityState: CapabilityBarState
  onDismiss?: (capability: CapabilityType) => void
  className?: string
}

interface DetectedIntent {
  capability: CapabilityType
  message: string
  estimatedCost?: string
  icon: typeof Lightbulb
}

// Detect what capabilities would be used based on query
function detectIntents(
  query: string,
  capabilityState: CapabilityBarState
): DetectedIntent[] {
  const q = query.toLowerCase().trim()
  if (q.length < 3) return []

  const intents: DetectedIntent[] = []

  // In auto mode, detect based on query content
  if (capabilityState.mode === 'auto') {
    // Web search detection
    const searchPatterns = [
      /\b(search|find|look up|latest|current|recent|today|news|weather)\b/i,
      /\b(what is|who is|when did|where is)\b.*\b(now|today|2024|2025)\b/i,
      /\b(stock|price|score|result)\b/i,
    ]
    if (searchPatterns.some(p => p.test(q))) {
      intents.push({
        capability: 'web_search',
        message: "I'll search the web for current information",
        estimatedCost: '~$0.01',
        icon: Search,
      })
    }

    // Code execution detection
    const codePatterns = [
      /\b(calculate|compute|run|execute|code|python|javascript)\b/i,
      /\b(sum|average|total|analyze data|chart|graph)\b/i,
      /\d+\s*[\+\-\*\/\^]\s*\d+/,
    ]
    if (codePatterns.some(p => p.test(q))) {
      intents.push({
        capability: 'code_execution',
        message: "I'll run code to compute this",
        estimatedCost: '~$0.05',
        icon: Code,
      })
    }

    // Image generation detection
    const imageGenPatterns = [
      /\b(generate|create|make|draw|design|render)\b.*\b(image|picture|photo|illustration|art)\b/i,
      /\b(image|picture|photo|illustration|art)\b.*\b(of|showing|with)\b/i,
      /^\/image\s/i,
    ]
    if (imageGenPatterns.some(p => p.test(q))) {
      intents.push({
        capability: 'image_generation',
        message: "I'll generate an image with DALL-E",
        estimatedCost: '~$0.04',
        icon: Image,
      })
    }

    // Research detection
    const researchPatterns = [
      /\b(research|analyze|compare|comprehensive|deep dive|investigate)\b/i,
      /^\/research\s/i,
      /\b(pros and cons|advantages|disadvantages|analysis)\b/i,
    ]
    if (researchPatterns.some(p => p.test(q))) {
      intents.push({
        capability: 'deep_research',
        message: "I'll conduct deep research with multiple sources",
        estimatedCost: '~$0.20+',
        icon: BookOpen,
      })
    }

    // Vision detection (when images are attached - this is just query-based hint)
    const visionPatterns = [
      /\b(what's in|what is in|describe|analyze|look at)\b.*\b(image|photo|picture|this)\b/i,
      /\b(this|the)\b.*\b(image|photo|picture)\b/i,
    ]
    if (visionPatterns.some(p => p.test(q))) {
      intents.push({
        capability: 'vision_analysis',
        message: "I'll analyze any attached images",
        estimatedCost: '~$0.01',
        icon: Eye,
      })
    }
  } else {
    // In explicit mode, show what capabilities are enabled
    const capabilityInfo: Record<CapabilityType, { message: string; cost?: string; icon: typeof Lightbulb }> = {
      auto: { message: 'Auto mode', icon: Lightbulb },
      web_search: { message: "I'll search the web", cost: '~$0.01', icon: Search },
      code_execution: { message: "I'll run code", cost: '~$0.05', icon: Code },
      image_generation: { message: "I'll generate images", cost: '~$0.04', icon: Image },
      vision_analysis: { message: "I'll analyze images", cost: '~$0.01', icon: Eye },
      deep_research: { message: "I'll do deep research", cost: '~$0.20+', icon: BookOpen },
      voice_input: { message: 'Voice input enabled', icon: Lightbulb },
      voice_output: { message: 'Voice output enabled', icon: Lightbulb },
    }

    for (const cap of capabilityState.enabledCapabilities) {
      const info = capabilityInfo[cap]
      if (info && cap !== 'auto' && cap !== 'voice_input' && cap !== 'voice_output') {
        intents.push({
          capability: cap,
          message: info.message,
          estimatedCost: info.cost,
          icon: info.icon,
        })
      }
    }
  }

  return intents
}

export function IntentHint({
  query,
  capabilityState,
  onDismiss,
  className,
}: IntentHintProps) {
  const intents = useMemo(
    () => detectIntents(query, capabilityState),
    [query, capabilityState]
  )

  if (intents.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {intents.map(intent => {
        const Icon = intent.icon
        return (
          <div
            key={intent.capability}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
              'bg-blue-500/10 border border-blue-500/30',
              'animate-fade-in'
            )}
          >
            <Icon className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-300">{intent.message}</span>
            {intent.estimatedCost && (
              <span className="text-xs text-blue-400/70">
                ({intent.estimatedCost})
              </span>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(intent.capability)}
                className="p-0.5 rounded hover:bg-blue-500/20 text-blue-400/70 hover:text-blue-300 transition-colors ml-1"
                title="Don't use this capability"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default IntentHint
