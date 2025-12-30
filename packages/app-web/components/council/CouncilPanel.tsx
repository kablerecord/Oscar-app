'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp, Users, Check, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Model avatars/colors for visual distinction - brand appropriate
const MODEL_STYLES: Record<string, { color: string; bgColor: string; icon: string }> = {
  // Anthropic Claude - Orange brand color, "A" for Anthropic
  'claude-sonnet-4-20250514': { color: 'text-[#D97706]', bgColor: 'bg-[#D97706]/10', icon: 'A' },
  'claude-3-5-sonnet-20241022': { color: 'text-[#D97706]', bgColor: 'bg-[#D97706]/10', icon: 'A' },
  'claude-3-5-haiku-20241022': { color: 'text-[#D97706]', bgColor: 'bg-[#D97706]/10', icon: 'A' },
  'claude': { color: 'text-[#D97706]', bgColor: 'bg-[#D97706]/10', icon: 'A' },
  // OpenAI GPT - Green/Teal brand color
  'gpt-4o': { color: 'text-[#10A37F]', bgColor: 'bg-[#10A37F]/10', icon: '◎' },
  'gpt-4o-mini': { color: 'text-[#10A37F]', bgColor: 'bg-[#10A37F]/10', icon: '◎' },
  'gpt-4.1': { color: 'text-[#10A37F]', bgColor: 'bg-[#10A37F]/10', icon: '◎' },
  'gpt4': { color: 'text-[#10A37F]', bgColor: 'bg-[#10A37F]/10', icon: '◎' },
  // Google Gemini - Blue brand color
  'gemini-2.0-flash-exp': { color: 'text-[#4285F4]', bgColor: 'bg-[#4285F4]/10', icon: '✦' },
  'gemini-1.5-pro': { color: 'text-[#4285F4]', bgColor: 'bg-[#4285F4]/10', icon: '✦' },
  'gemini': { color: 'text-[#4285F4]', bgColor: 'bg-[#4285F4]/10', icon: '✦' },
  // xAI Grok
  'grok-2-latest': { color: 'text-slate-300', bgColor: 'bg-slate-500/10', icon: '𝕏' },
  // Meta Llama - Purple brand color
  'llama-3.3-70b-versatile': { color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/10', icon: '🦙' },
  'llama-3.1-8b-instant': { color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/10', icon: '🦙' },
  'groq': { color: 'text-[#7C3AED]', bgColor: 'bg-[#7C3AED]/10', icon: '🦙' },
  // Default
  default: { color: 'text-slate-400', bgColor: 'bg-slate-500/10', icon: '?' },
}

function getModelStyle(modelId: string) {
  return MODEL_STYLES[modelId] || MODEL_STYLES.default
}

function getModelDisplayName(modelId: string): string {
  const names: Record<string, string> = {
    // Full model IDs
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude Haiku',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4.1': 'GPT-4.1',
    'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'grok-2-latest': 'Grok 2',
    'llama-3.3-70b-versatile': 'Llama 3.3 70B',
    'llama-3.1-8b-instant': 'Llama 3.1 8B',
    // Short IDs from council mode
    'claude': 'Claude',
    'gpt4': 'GPT-4o',
    'gemini': 'Gemini',
    'groq': 'Llama 3.3',
  }
  return names[modelId] || modelId
}

export interface PanelMemberResponse {
  agentId: string
  agentName?: string
  modelId: string
  provider: string
  content: string
  isLoading?: boolean
  error?: string
  confidence?: number // 0-1 scale from council mode
  reasoning?: string // Model's reasoning chain from council mode
}

export interface CouncilSynthesis {
  agreements: string[]
  disagreements: string[]
  synthesis: string
}

interface CouncilPanelProps {
  isVisible: boolean
  responses: PanelMemberResponse[]
  roundtableResponses?: PanelMemberResponse[]
  synthesis?: CouncilSynthesis
  isProcessing?: boolean
  mode: 'thoughtful' | 'contemplate'
  onClose?: () => void
}

export function CouncilPanel({
  isVisible,
  responses,
  roundtableResponses,
  synthesis,
  isProcessing,
  mode,
}: CouncilPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [showRoundtable, setShowRoundtable] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(true)

  if (!isVisible) return null

  const hasRoundtable = roundtableResponses && roundtableResponses.length > 0
  const hasSynthesis = synthesis && (synthesis.agreements.length > 0 || synthesis.disagreements.length > 0)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Council Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Council Discussion</h3>
            <p className="text-xs text-slate-500">
              {mode === 'contemplate' ? 'Deep analysis with extended deliberation' : 'Panel + roundtable synthesis'}
            </p>
          </div>
        </div>
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Council deliberating...</span>
          </div>
        )}
      </div>

      {/* Initial Responses Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {responses.map((response, idx) => {
          const style = getModelStyle(response.modelId)
          const isExpanded = expandedAgent === response.agentId
          const displayName = response.agentName || getModelDisplayName(response.modelId)

          return (
            <Card
              key={response.agentId || idx}
              className={`border-slate-700/50 bg-slate-800/50 transition-all ${
                isExpanded ? 'col-span-full' : ''
              }`}
            >
              <CardContent className="p-3">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${style.bgColor}`}>
                      <span className="text-sm">{style.icon}</span>
                    </div>
                    <span className={`text-xs font-medium ${style.color}`}>
                      {displayName}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedAgent(isExpanded ? null : response.agentId)}
                    className="cursor-pointer text-slate-500 hover:text-slate-300"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {/* Response Content */}
                {response.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : response.error ? (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{response.error}</span>
                  </div>
                ) : (
                  <p className={`text-xs text-slate-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {response.content}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Roundtable Discussion (Collapsible) */}
      {hasRoundtable && (
        <div className="border-t border-slate-700/50 pt-4">
          <button
            onClick={() => setShowRoundtable(!showRoundtable)}
            className="cursor-pointer flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-3"
          >
            {showRoundtable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Roundtable Reactions ({roundtableResponses.length} responses)</span>
          </button>

          {showRoundtable && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {roundtableResponses.map((response, idx) => {
                const style = getModelStyle(response.modelId)
                const displayName = response.agentName || getModelDisplayName(response.modelId)

                return (
                  <div
                    key={`roundtable-${response.agentId || idx}`}
                    className="border-l-2 border-slate-600 pl-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{style.icon}</span>
                      <span className={`text-xs font-medium ${style.color}`}>{displayName}</span>
                      <span className="text-xs text-slate-600">reacts:</span>
                    </div>
                    <p className="text-xs text-slate-400">{response.content}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Synthesis Analysis */}
      {hasSynthesis && (
        <div className="border-t border-slate-700/50 pt-4">
          <button
            onClick={() => setShowSynthesis(!showSynthesis)}
            className="cursor-pointer flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-3"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            {showSynthesis ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span>Council Synthesis</span>
          </button>

          {showSynthesis && (
            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Agreements */}
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                      Consensus Points
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {synthesis.agreements.map((point, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                    {synthesis.agreements.length === 0 && (
                      <li className="text-xs text-slate-500 italic">No major consensus points</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              {/* Disagreements */}
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                      Different Perspectives
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {synthesis.disagreements.map((point, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                    {synthesis.disagreements.length === 0 && (
                      <li className="text-xs text-slate-500 italic">All models agreed</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline Council Badge - shows which models contributed
 * Used in the response header to indicate council mode was used
 */
export function CouncilBadge({
  modelCount,
  onClick,
}: {
  modelCount: number
  onClick?: () => void
}) {
  // Use span instead of button to avoid nested button issues when used inside clickable containers
  const Component = onClick ? 'button' : 'span'
  return (
    <Component
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 ring-1 ring-purple-500/20 text-xs text-purple-400 hover:bg-purple-500/20 transition-colors"
    >
      <Users className="h-3 w-3" />
      <span>{modelCount} models</span>
    </Component>
  )
}
