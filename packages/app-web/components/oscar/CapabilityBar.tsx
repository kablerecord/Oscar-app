'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Zap,
  Search,
  Code,
  Image,
  Eye,
  BookOpen,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Types from @osqr/core design system
export type CapabilityType =
  | 'auto'
  | 'web_search'
  | 'code_execution'
  | 'image_generation'
  | 'vision_analysis'
  | 'deep_research'
  | 'voice_input'
  | 'voice_output'

export type CapabilityCostIndicator = 'free' | 'low' | 'medium' | 'high'

export interface CapabilityPill {
  id: CapabilityType
  label: string
  icon: LucideIcon
  shortcut?: string
  enabled: boolean
  available: boolean
  costIndicator?: CapabilityCostIndicator
  tooltip: string
}

export interface CapabilityBarState {
  mode: 'auto' | 'explicit'
  enabledCapabilities: CapabilityType[]
  disabledCapabilities?: CapabilityType[]
}

export interface CapabilityBarProps {
  state: CapabilityBarState
  onStateChange: (state: CapabilityBarState) => void
  disabled?: boolean
  compact?: boolean
  userTier?: 'free' | 'pro' | 'master'
}

// Default capability pill configurations
const DEFAULT_CAPABILITY_PILLS: Omit<CapabilityPill, 'enabled'>[] = [
  {
    id: 'auto',
    label: 'Auto',
    icon: Zap,
    shortcut: '⌘⇧A',
    available: true,
    costIndicator: 'free',
    tooltip: 'Let OSQR decide what capabilities to use',
  },
  {
    id: 'web_search',
    label: 'Search',
    icon: Search,
    shortcut: '⌘⇧S',
    available: true,
    costIndicator: 'low',
    tooltip: 'Search the web for current information',
  },
  {
    id: 'code_execution',
    label: 'Code',
    icon: Code,
    shortcut: '⌘⇧C',
    available: true,
    costIndicator: 'medium',
    tooltip: 'Run code and analyze data',
  },
  {
    id: 'image_generation',
    label: 'Image',
    icon: Image,
    shortcut: '⌘⇧I',
    available: true,
    costIndicator: 'medium',
    tooltip: 'Generate an image with DALL-E',
  },
  {
    id: 'vision_analysis',
    label: 'Analyze',
    icon: Eye,
    available: true,
    costIndicator: 'low',
    tooltip: 'Analyze images and extract information',
  },
  {
    id: 'deep_research',
    label: 'Research',
    icon: BookOpen,
    available: true,
    costIndicator: 'high',
    tooltip: 'Comprehensive multi-source research',
  },
]

// Cost indicator colors
const costColors: Record<CapabilityCostIndicator, string> = {
  free: 'bg-green-500',
  low: 'bg-slate-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

// Cost indicator labels
const costLabels: Record<CapabilityCostIndicator, string> = {
  free: 'Free',
  low: '~$0.01',
  medium: '~$0.05',
  high: '~$0.20+',
}

interface CapabilityPillButtonProps {
  pill: CapabilityPill
  isAutoMode: boolean
  onClick: (id: CapabilityType) => void
  disabled?: boolean
  compact?: boolean
}

function CapabilityPillButton({
  pill,
  isAutoMode,
  onClick,
  disabled,
  compact,
}: CapabilityPillButtonProps) {
  const Icon = pill.icon
  const isActive = pill.enabled
  const isDimmed = isAutoMode && pill.id !== 'auto' && !pill.enabled

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(pill.id)}
          disabled={disabled || !pill.available}
          className={cn(
            'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
            // Base states
            isActive && pill.id === 'auto' && 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25',
            isActive && pill.id !== 'auto' && 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25',
            !isActive && !isDimmed && 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100 ring-1 ring-slate-700/50',
            isDimmed && 'bg-slate-800/50 text-slate-500 hover:text-slate-400 hover:bg-slate-800',
            // Disabled state
            (disabled || !pill.available) && 'opacity-50 cursor-not-allowed',
            // Compact mode
            compact && 'px-2 py-1'
          )}
        >
          <Icon className={cn(
            'h-4 w-4 transition-transform duration-200',
            isActive && 'animate-pulse',
            !isActive && !isDimmed && 'group-hover:scale-110'
          )} />
          {!compact && <span className="hidden sm:inline">{pill.label}</span>}

          {/* Active indicator dot */}
          {isActive && pill.id !== 'auto' && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-300" />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-slate-800 border-slate-700 max-w-[220px]"
      >
        <div className="space-y-1">
          <p className="font-medium text-slate-100">{pill.label}</p>
          <p className="text-xs text-slate-400">{pill.tooltip}</p>
          {pill.shortcut && (
            <p className="text-xs text-slate-500">Shortcut: {pill.shortcut}</p>
          )}
          {pill.costIndicator && (
            <div className="flex items-center gap-1.5 pt-1">
              <div className={cn('w-2 h-2 rounded-full', costColors[pill.costIndicator])} />
              <span className="text-xs text-slate-400">
                Cost: {costLabels[pill.costIndicator]}
              </span>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function CapabilityBar({
  state,
  onStateChange,
  disabled,
  compact,
  userTier = 'free',
}: CapabilityBarProps) {
  const isAutoMode = state.mode === 'auto'

  // Build pills with current enabled state
  const pills: CapabilityPill[] = DEFAULT_CAPABILITY_PILLS.map(pill => ({
    ...pill,
    enabled: pill.id === 'auto'
      ? isAutoMode
      : state.enabledCapabilities.includes(pill.id),
    // Research only available for pro/master tiers
    available: pill.id === 'deep_research'
      ? userTier !== 'free'
      : pill.available,
  }))

  const handlePillClick = useCallback((id: CapabilityType) => {
    if (id === 'auto') {
      // Toggle back to auto mode
      onStateChange({
        mode: 'auto',
        enabledCapabilities: [],
      })
    } else {
      // Toggle specific capability
      const isCurrentlyEnabled = state.enabledCapabilities.includes(id)

      if (isCurrentlyEnabled) {
        // Remove capability
        const newEnabled = state.enabledCapabilities.filter(c => c !== id)
        onStateChange({
          mode: newEnabled.length === 0 ? 'auto' : 'explicit',
          enabledCapabilities: newEnabled,
        })
      } else {
        // Add capability, switch to explicit mode
        onStateChange({
          mode: 'explicit',
          enabledCapabilities: [...state.enabledCapabilities, id],
        })
      }
    }
  }, [state, onStateChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.shiftKey) return

      const shortcuts: Record<string, CapabilityType> = {
        'a': 'auto',
        's': 'web_search',
        'c': 'code_execution',
        'i': 'image_generation',
      }

      const capability = shortcuts[e.key.toLowerCase()]
      if (capability) {
        e.preventDefault()
        handlePillClick(capability)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePillClick])

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        'flex items-center gap-1.5 p-1.5 bg-slate-900/50 rounded-xl ring-1 ring-slate-700/50 overflow-x-auto',
        compact && 'gap-1 p-1'
      )}>
        {pills.map(pill => (
          <CapabilityPillButton
            key={pill.id}
            pill={pill}
            isAutoMode={isAutoMode}
            onClick={handlePillClick}
            disabled={disabled}
            compact={compact}
          />
        ))}

        {/* More capabilities button (placeholder) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-400 hover:bg-slate-800 transition-all',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
            <p className="text-xs text-slate-400">More capabilities coming soon</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

// Export default initial state
export const DEFAULT_CAPABILITY_STATE: CapabilityBarState = {
  mode: 'auto',
  enabledCapabilities: [],
}
