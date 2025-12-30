'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GripHorizontal
} from 'lucide-react'

// Official brand icons from Bootstrap Icons and other sources
const ClaudeIcon = () => (
  <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor">
    <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
  </svg>
)
const OpenAIIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.4850 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
  </svg>
)
const GeminiIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M12 0a12 12 0 1 0 12 12A12 12 0 0 0 12 0zm0 3.6A8.4 8.4 0 1 1 3.6 12 8.41 8.41 0 0 1 12 3.6z"/>
    <path d="M12 7.2a4.8 4.8 0 1 0 4.8 4.8A4.8 4.8 0 0 0 12 7.2zm0 7.2a2.4 2.4 0 1 1 2.4-2.4 2.4 2.4 0 0 1-2.4 2.4z"/>
  </svg>
)
// Meta/Llama icon - stylized llama head silhouette
const LlamaIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M20 8c0-1.5-1-3-3-3-1 0-2 .5-2.5 1-.5-2-2-4-4.5-4S6 4 5.5 6C4 6.5 3 8 3 10c0 1.5.5 3 2 4v6h2v-4h2v4h2v-4h2v4h2v-4h2v4h2v-6c1.5-1 2-2.5 2-4zM7 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
  </svg>
)

// Model configuration with brand colors
const MODEL_CONFIG: Record<string, {
  name: string
  icon: React.ReactNode
  gradient: string
  border: string
  glow: string
  bg: string
}> = {
  // Anthropic Claude - Orange/Tan brand color
  'claude-sonnet-4-20250514': {
    name: 'Claude',
    icon: <ClaudeIcon />,
    gradient: 'from-[#D97706] to-[#B45309]',
    border: 'border-[#D97706]/30',
    glow: 'shadow-[#D97706]/20',
    bg: 'bg-[#D97706]/5',
  },
  'claude-3-5-sonnet-20241022': {
    name: 'Claude',
    icon: <ClaudeIcon />,
    gradient: 'from-[#D97706] to-[#B45309]',
    border: 'border-[#D97706]/30',
    glow: 'shadow-[#D97706]/20',
    bg: 'bg-[#D97706]/5',
  },
  'claude': {
    name: 'Claude',
    icon: <ClaudeIcon />,
    gradient: 'from-[#D97706] to-[#B45309]',
    border: 'border-[#D97706]/30',
    glow: 'shadow-[#D97706]/20',
    bg: 'bg-[#D97706]/5',
  },
  // OpenAI GPT - Green/Teal brand color
  'gpt4': {
    name: 'GPT-4o',
    icon: <OpenAIIcon />,
    gradient: 'from-[#10A37F] to-[#0D8A6A]',
    border: 'border-[#10A37F]/30',
    glow: 'shadow-[#10A37F]/20',
    bg: 'bg-[#10A37F]/5',
  },
  'gpt-4o': {
    name: 'GPT-4o',
    icon: <OpenAIIcon />,
    gradient: 'from-[#10A37F] to-[#0D8A6A]',
    border: 'border-[#10A37F]/30',
    glow: 'shadow-[#10A37F]/20',
    bg: 'bg-[#10A37F]/5',
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    icon: <OpenAIIcon />,
    gradient: 'from-[#10A37F] to-[#0D8A6A]',
    border: 'border-[#10A37F]/30',
    glow: 'shadow-[#10A37F]/20',
    bg: 'bg-[#10A37F]/5',
  },
  // Google Gemini - Blue brand color
  'gemini': {
    name: 'Gemini',
    icon: <GeminiIcon />,
    gradient: 'from-[#4285F4] to-[#1A73E8]',
    border: 'border-[#4285F4]/30',
    glow: 'shadow-[#4285F4]/20',
    bg: 'bg-[#4285F4]/5',
  },
  'gemini-2.0-flash-exp': {
    name: 'Gemini',
    icon: <GeminiIcon />,
    gradient: 'from-[#4285F4] to-[#1A73E8]',
    border: 'border-[#4285F4]/30',
    glow: 'shadow-[#4285F4]/20',
    bg: 'bg-[#4285F4]/5',
  },
  // Meta Llama - Purple brand color (Meta AI purple)
  'groq': {
    name: 'Llama 3.3',
    icon: <LlamaIcon />,
    gradient: 'from-[#7C3AED] to-[#5B21B6]',
    border: 'border-[#7C3AED]/30',
    glow: 'shadow-[#7C3AED]/20',
    bg: 'bg-[#7C3AED]/5',
  },
  'llama-3.3-70b-versatile': {
    name: 'Llama 3.3',
    icon: <LlamaIcon />,
    gradient: 'from-[#7C3AED] to-[#5B21B6]',
    border: 'border-[#7C3AED]/30',
    glow: 'shadow-[#7C3AED]/20',
    bg: 'bg-[#7C3AED]/5',
  },
  // xAI Grok - Black/white theme
  'grok-2-latest': {
    name: 'Grok',
    icon: <span className="text-lg font-bold">X</span>,
    gradient: 'from-slate-600 to-slate-800',
    border: 'border-slate-500/30',
    glow: 'shadow-slate-500/20',
    bg: 'bg-slate-500/5',
  },
}

const DEFAULT_CONFIG = {
  name: 'AI',
  icon: <span className="text-lg">?</span>,
  gradient: 'from-slate-500 to-slate-400',
  border: 'border-slate-500/30',
  glow: 'shadow-slate-500/20',
  bg: 'bg-slate-500/5',
}

function getModelConfig(modelId: string) {
  return MODEL_CONFIG[modelId] || DEFAULT_CONFIG
}

export interface CouncilResponse {
  modelId: string
  content: string
  isLoading?: boolean
  error?: string
  confidence?: number
}

export interface CouncilSynthesisData {
  content: string
  agreements?: string[]
  disagreements?: string[]
  consensusLevel?: 'high' | 'moderate' | 'low' | 'split'
}

interface CouncilFullViewProps {
  isOpen: boolean
  onClose: () => void
  query: string
  responses: CouncilResponse[]
  synthesis?: CouncilSynthesisData
  isProcessing?: boolean
}

export function CouncilFullView({
  isOpen,
  onClose,
  query,
  responses,
  synthesis,
  isProcessing,
}: CouncilFullViewProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [synthesisHeight, setSynthesisHeight] = useState(200) // Default height in pixels
  const [isDragging, setIsDragging] = useState(false)

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle drag to resize synthesis panel
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new height based on mouse position from bottom of viewport
      const newHeight = window.innerHeight - e.clientY - 16 // 16px padding
      // Clamp between min 100px and max 60% of viewport
      const clampedHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.6))
      setSynthesisHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm"
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="h-5 w-5" />
          </motion.button>

          {/* Query header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="absolute top-4 left-4 right-16 z-10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-400">Council Mode</h2>
                <p className="text-lg font-semibold text-white truncate max-w-2xl">{query}</p>
              </div>
            </div>
          </motion.div>

          {/* Main content area */}
          <div className="h-full pt-24 pb-4 px-4 flex flex-col">
            {/* Model panels - vertical columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4 overflow-hidden">
              {responses.map((response, index) => {
                const config = getModelConfig(response.modelId)

                return (
                  <motion.div
                    key={response.modelId}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 0.1 + index * 0.15,
                      type: 'spring',
                      stiffness: 100,
                      damping: 15
                    }}
                    className={`relative flex flex-col rounded-2xl border ${config.border} ${config.bg} backdrop-blur-sm overflow-hidden shadow-xl ${config.glow}`}
                  >
                    {/* Model header with gradient */}
                    <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${config.gradient} bg-opacity-10`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}>
                        {config.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">{config.name}</h3>
                        <p className="text-xs text-white/60">{response.modelId}</p>
                      </div>
                      {response.confidence && (
                        <div className="text-right">
                          <p className="text-xs text-white/60">Confidence</p>
                          <p className="text-lg font-bold text-white">{response.confidence}%</p>
                        </div>
                      )}
                    </div>

                    {/* Response content */}
                    <div className="flex-1 p-4 overflow-y-auto">
                      {response.isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                          <p className="text-sm text-slate-400">Thinking...</p>
                        </div>
                      ) : response.error ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                          <AlertTriangle className="h-8 w-8 text-red-400" />
                          <p className="text-sm text-red-400">{response.error}</p>
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none">
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {response.content}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Animated border glow */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: response.isLoading ? 1 : 0 }}
                      className={`absolute inset-0 rounded-2xl border-2 ${config.border} pointer-events-none`}
                      style={{
                        boxShadow: response.isLoading ? `0 0 30px 5px var(--tw-shadow-color)` : 'none',
                      }}
                    />
                  </motion.div>
                )
              })}

              {/* Loading placeholder panels */}
              {isProcessing && responses.length < 3 && (
                [...Array(3 - responses.length)].map((_, i) => (
                  <motion.div
                    key={`placeholder-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                    <p className="mt-3 text-sm text-slate-500">Waiting for model...</p>
                  </motion.div>
                ))
              )}
            </div>

            {/* Oscar Synthesis - resizable horizontal bottom panel */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 100, damping: 15 }}
              className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm shadow-xl shadow-purple-500/10 flex flex-col"
              style={{ height: synthesisHeight, minHeight: 100 }}
            >
              {/* Drag handle to resize */}
              <div
                className={`flex items-center justify-center py-1 cursor-ns-resize hover:bg-purple-500/10 transition-colors rounded-t-2xl ${isDragging ? 'bg-purple-500/20' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
              >
                <GripHorizontal className="h-4 w-4 text-purple-400/50" />
              </div>

              {/* Synthesis header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">OSQR Synthesis</h3>
                    <p className="text-xs text-purple-300/60">
                      {synthesis?.consensusLevel
                        ? `${synthesis.consensusLevel.charAt(0).toUpperCase() + synthesis.consensusLevel.slice(1)} consensus`
                        : 'Analyzing perspectives...'}
                    </p>
                  </div>
                </div>

                {synthesis && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    <span className="text-sm">Details</span>
                    {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Synthesis content - scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                {isProcessing && !synthesis ? (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    <p className="text-slate-400">Oscar is synthesizing the council's perspectives...</p>
                  </div>
                ) : synthesis ? (
                  <div className="space-y-4">
                    {/* Main synthesis */}
                    <div className="prose prose-sm prose-invert max-w-none">
                      <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {synthesis.content}
                      </p>
                    </div>

                    {/* Expandable details */}
                    <AnimatePresence>
                      {showDetails && (synthesis.agreements?.length || synthesis.disagreements?.length) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid md:grid-cols-2 gap-4 pt-4 border-t border-purple-500/20"
                        >
                          {/* Agreements */}
                          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Check className="h-5 w-5 text-green-400" />
                              <h4 className="font-semibold text-green-400">Points of Agreement</h4>
                            </div>
                            <ul className="space-y-2">
                              {synthesis.agreements?.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-green-500 mt-1">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                              {(!synthesis.agreements || synthesis.agreements.length === 0) && (
                                <li className="text-sm text-slate-500 italic">No major consensus points</li>
                              )}
                            </ul>
                          </div>

                          {/* Disagreements */}
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="h-5 w-5 text-amber-400" />
                              <h4 className="font-semibold text-amber-400">Different Perspectives</h4>
                            </div>
                            <ul className="space-y-2">
                              {synthesis.disagreements?.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-amber-500 mt-1">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                              {(!synthesis.disagreements || synthesis.disagreements.length === 0) && (
                                <li className="text-sm text-slate-500 italic">All models aligned</li>
                              )}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">Waiting for council responses...</p>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
