'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Lock, Sparkles, AlertTriangle, Brain, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Model visual styles for differentiation
const MODEL_STYLES: Record<string, { color: string; bgColor: string; borderColor: string; icon: string }> = {
  // Anthropic
  'claude-sonnet-4-20250514': { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: '🧠' },
  'claude-3-5-sonnet-20241022': { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: '🧠' },
  'claude-3-5-haiku-20241022': { color: 'text-orange-300', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', icon: '⚡' },
  // OpenAI
  'gpt-4o': { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: '🤖' },
  'gpt-4o-mini': { color: 'text-green-300', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: '🔹' },
  'gpt-4.1': { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', icon: '🤖' },
  // Google
  'gemini-2.0-flash-exp': { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: '💎' },
  'gemini-1.5-pro': { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: '💎' },
  // xAI
  'grok-2-latest': { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', icon: '🚀' },
  // Default
  default: { color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', icon: '🤖' },
}

function getModelStyle(modelId: string) {
  return MODEL_STYLES[modelId] || MODEL_STYLES.default
}

function getModelDisplayName(modelId: string): string {
  const names: Record<string, string> = {
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-5-haiku-20241022': 'Claude Haiku',
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4.1': 'GPT-4.1',
    'gemini-2.0-flash-exp': 'Gemini 2.0 Flash',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'grok-2-latest': 'Grok 2',
  }
  return names[modelId] || modelId
}

export interface ModelResponse {
  modelId: string
  modelName?: string
  content: string
  confidence: number // 0-1 scale
  reasoning?: string
  isLoading?: boolean
  error?: string
}

export interface CouncilCarouselProps {
  responses: ModelResponse[]
  synthesis: string
  userTier: 'starter' | 'pro' | 'master'
  isVisible: boolean
  onUpgrade?: () => void
  onDiscussWithOscar?: (modelId: string, content: string) => void
}

/**
 * Calculate if there's significant disagreement between models
 * Per spec: 15% confidence delta indicates disagreement
 */
function calculateDisagreement(responses: ModelResponse[]): {
  hasDisagreement: boolean
  divergentPoints: string[]
  maxDelta: number
} {
  if (responses.length < 2) {
    return { hasDisagreement: false, divergentPoints: [], maxDelta: 0 }
  }

  const confidences = responses.map(r => r.confidence)
  const maxConfidence = Math.max(...confidences)
  const minConfidence = Math.min(...confidences)
  const maxDelta = maxConfidence - minConfidence

  // 15% delta threshold from spec
  const hasDisagreement = maxDelta >= 0.15

  // Find which models diverge most
  const divergentPoints: string[] = []
  if (hasDisagreement) {
    const highConfidenceModels = responses.filter(r => r.confidence >= maxConfidence - 0.05)
    const lowConfidenceModels = responses.filter(r => r.confidence <= minConfidence + 0.05)

    if (highConfidenceModels.length > 0 && lowConfidenceModels.length > 0) {
      const highNames = highConfidenceModels.map(r => getModelDisplayName(r.modelId)).join(', ')
      const lowNames = lowConfidenceModels.map(r => getModelDisplayName(r.modelId)).join(', ')
      divergentPoints.push(`${highNames} showed higher confidence than ${lowNames}`)
    }
  }

  return { hasDisagreement, divergentPoints, maxDelta }
}

export function CouncilCarousel({
  responses,
  synthesis,
  userTier,
  isVisible,
  onUpgrade,
  onDiscussWithOscar,
}: CouncilCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Pro users see blurred panels (teaser for Master)
  const shouldBlur = userTier === 'pro'
  const isLocked = userTier === 'starter'

  // Calculate disagreement signal
  const { hasDisagreement, divergentPoints, maxDelta } = calculateDisagreement(responses)

  // Navigation handlers
  const goToNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % responses.length)
  }, [responses.length])

  const goToPrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + responses.length) % responses.length)
  }, [responses.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'ArrowLeft') goToPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, goToNext, goToPrev])

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext()
      else goToPrev()
    }
    setTouchStart(null)
  }

  if (!isVisible || responses.length === 0) return null

  // Starter tier: show locked state
  if (isLocked) {
    return (
      <div className="relative mt-4 p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <Lock className="h-8 w-8 text-slate-500 mb-3" />
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Council Mode</h3>
          <p className="text-sm text-slate-400 max-w-md mb-4">
            See how multiple AI models approach your question. Council Mode shows individual perspectives before OSQR synthesizes them.
          </p>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Upgrade to Pro to Preview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mt-4 space-y-4">
      {/* Disagreement Signal Banner */}
      {hasDisagreement && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-amber-200">
              Models showed different perspectives ({Math.round(maxDelta * 100)}% confidence gap)
            </span>
            {divergentPoints.length > 0 && (
              <p className="text-xs text-amber-400/80 mt-0.5">{divergentPoints[0]}</p>
            )}
          </div>
        </div>
      )}

      {/* Council Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Council Perspectives</h3>
            <p className="text-xs text-slate-500">{responses.length} models consulted</p>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="flex items-center gap-1.5">
          {responses.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                idx === activeIndex
                  ? 'bg-purple-400 w-4'
                  : 'bg-slate-600 hover:bg-slate-500'
              )}
              aria-label={`Go to panel ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Arrows */}
        {responses.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-600/50 shadow-lg transition-all opacity-80 hover:opacity-100"
              aria-label="Previous model"
            >
              <ChevronLeft className="h-5 w-5 text-slate-300" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-slate-600/50 shadow-lg transition-all opacity-80 hover:opacity-100"
              aria-label="Next model"
            >
              <ChevronRight className="h-5 w-5 text-slate-300" />
            </button>
          </>
        )}

        {/* Panels */}
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {responses.map((response, idx) => {
            const style = getModelStyle(response.modelId)
            const displayName = response.modelName || getModelDisplayName(response.modelId)
            const isActive = idx === activeIndex

            return (
              <div
                key={response.modelId}
                className="w-full flex-shrink-0 px-8"
              >
                <Card
                  className={cn(
                    'transition-all duration-300 border-2',
                    style.borderColor,
                    isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-60',
                    shouldBlur && 'relative overflow-hidden'
                  )}
                >
                  <CardContent className="p-4">
                    {/* Model Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', style.bgColor)}>
                          <span className="text-lg">{style.icon}</span>
                        </div>
                        <div>
                          <span className={cn('text-sm font-semibold', style.color)}>
                            {displayName}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <span>Confidence:</span>
                            <span className={cn(
                              response.confidence >= 0.8 ? 'text-green-400' :
                              response.confidence >= 0.6 ? 'text-yellow-400' :
                              'text-red-400'
                            )}>
                              {Math.round(response.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Discuss button (Master only) */}
                      {userTier === 'master' && onDiscussWithOscar && (
                        <button
                          onClick={() => onDiscussWithOscar(response.modelId, response.content)}
                          className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                        >
                          Discuss
                        </button>
                      )}
                    </div>

                    {/* Response Content */}
                    <div className={cn('relative', shouldBlur && 'min-h-[120px]')}>
                      {response.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <div className="animate-pulse">Thinking...</div>
                        </div>
                      ) : response.error ? (
                        <div className="text-sm text-red-400">{response.error}</div>
                      ) : (
                        <p className={cn(
                          'text-sm text-slate-300 whitespace-pre-wrap',
                          shouldBlur && 'blur-md select-none'
                        )}>
                          {response.content}
                        </p>
                      )}

                      {/* Blur Overlay for Pro */}
                      {shouldBlur && !response.isLoading && !response.error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/60 rounded">
                          <Lock className="h-6 w-6 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-300 font-medium">Full content on Master</span>
                          <button
                            onClick={onUpgrade}
                            className="mt-2 text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                          >
                            Upgrade to View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Reasoning (if available and Master tier) */}
                    {response.reasoning && userTier === 'master' && !shouldBlur && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500 mb-1">Reasoning:</p>
                        <p className="text-xs text-slate-400">{response.reasoning}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Persistent OSQR Synthesis Bar */}
      <div className="sticky bottom-0 z-20">
        <Card className="border-purple-500/30 bg-gradient-to-r from-slate-800/95 to-purple-900/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 ring-2 ring-purple-500/30 flex-shrink-0">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-purple-300">OSQR's Synthesis</span>
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{synthesis}</p>

                {/* What do you think? prompt */}
                <p className="mt-3 text-sm text-slate-400 italic">
                  What do you think? I can explain any model's perspective further.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Compact badge to show Council Mode was used
 * Can be placed in message header
 */
export function CouncilModeBadge({
  modelCount,
  hasDisagreement,
  onClick,
}: {
  modelCount: number
  hasDisagreement?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors',
        hasDisagreement
          ? 'bg-amber-500/10 ring-1 ring-amber-500/20 text-amber-400 hover:bg-amber-500/20'
          : 'bg-purple-500/10 ring-1 ring-purple-500/20 text-purple-400 hover:bg-purple-500/20'
      )}
    >
      <Users className="h-3 w-3" />
      <span>{modelCount} models</span>
      {hasDisagreement && <AlertTriangle className="h-3 w-3" />}
    </button>
  )
}
