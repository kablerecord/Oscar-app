'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Zap,
  TrendingUp,
  Brain,
  Flame,
  X,
  ChevronLeft,
  ChevronRight,
  Target,
  FolderKanban,
  Lightbulb,
  Pin,
  Plus,
  Trash2,
  MessageCircle,
  Send,
  Sparkles,
  Gift,
} from 'lucide-react'
import { MSCPanel } from '@/components/msc/MSCPanel'
import { useTipsHighlight, type HighlightId } from '@/components/tips/TipsHighlightProvider'
import { BubbleContainer } from '@/components/oscar/BubbleContainer'
import { Bell } from 'lucide-react'

// Legacy types - keeping for backwards compatibility but using new system
export type HighlightTarget =
  | 'panel' // Main chat panel
  | 'command-center' // Command Center icon/panel
  | 'vault' // Memory Vault (sidebar)
  | 'profile' // Profile questions
  | 'modes' // Response modes in chat
  | 'keyboard' // Keyboard shortcut area
  | 'focus-mode' // Focus mode toggle
  | 'sidebar' // Left sidebar
  | 'tips' // Tips icon in right panel
  | 'osqr_bubble' // OSQR bubble position indicator
  | null

interface RightPanelBarProps {
  workspaceId: string
  onAskOSQR?: (prompt: string) => void
  onHighlightElement?: (target: HighlightTarget) => void
  highlightTarget?: HighlightTarget
  onExpandedChange?: (expanded: boolean) => void
}

interface SidebarData {
  quickStats: {
    queriesRemaining: number
    queriesMax: number
    documentsCount: number
    documentsMax: number
    capabilityLevel: number
    referralBonusPercent: number
    referralCount: number
    convertedReferralCount: number
    referralCode: string | null
  } | null
  pinnedItems: Array<{ id: string; content: string; category: string }>
  profileInfo: {
    completionPercent: number
    answeredQuestions: number
    totalQuestions: number
  } | null
  usageStreak: {
    currentStreak: number
    questionsThisWeek: number
    insightsGenerated: number
    weeklyBreakdown?: { [key: string]: number }
    totalQuestions?: number
    longestStreak?: number
    memberSince?: string
  } | null
}

type PanelSection = 'command' | 'stats' | 'knowledge' | 'streak' | 'tips' | 'osqr' | 'suggestions' | null

// Pending insight type from API
interface PendingInsight {
  id: string
  type: string
  title: string
  message: string
  priority: number
  hasExpandedContent: boolean
}

// Track what the user has seen
const LAST_SEEN_KEY = 'osqr_panel_last_seen'
const HIDDEN_PANELS_KEY = 'osqr_hidden_panels'

// Available panels that can be shown/hidden (Command Center and Tips are always visible)
type HideablePanel = 'stats' | 'knowledge' | 'streak'
const HIDEABLE_PANELS: { id: HideablePanel; label: string; icon: typeof Zap; color: string }[] = [
  { id: 'stats', label: 'Quick Stats', icon: TrendingUp, color: 'cyan' },
  { id: 'knowledge', label: 'Knowledge', icon: Brain, color: 'purple' },
  { id: 'streak', label: 'Streak', icon: Flame, color: 'orange' },
]

function getHiddenPanels(): HideablePanel[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_PANELS_KEY) || '[]')
  } catch {
    return []
  }
}

function setHiddenPanels(panels: HideablePanel[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HIDDEN_PANELS_KEY, JSON.stringify(panels))
}

function getLastSeen(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}')
  } catch {
    return {}
  }
}

function setLastSeen(section: string) {
  if (typeof window === 'undefined') return
  const current = getLastSeen()
  current[section] = Date.now()
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(current))
}

// Calculate knowledge score based on various factors
function calculateKnowledgeScore(data: {
  profileCompletion: number
  documentsCount: number
  documentsMax: number
  totalQuestions?: number
  pinnedItemsCount: number
}): { score: number; label: string } {
  const profileWeight = 0.35
  const docsWeight = 0.25
  const questionsWeight = 0.25
  const pinnedWeight = 0.15

  const profileScore = data.profileCompletion
  const docsScore = Math.min((data.documentsCount / Math.max(data.documentsMax, 1)) * 100, 100)
  const questionsScore = Math.min(((data.totalQuestions || 0) / 50) * 100, 100)
  const pinnedScore = Math.min((data.pinnedItemsCount / 10) * 100, 100)

  const score = Math.round(
    profileScore * profileWeight +
    docsScore * docsWeight +
    questionsScore * questionsWeight +
    pinnedScore * pinnedWeight
  )

  let label = 'Getting Started'
  if (score >= 80) label = 'Deep Understanding'
  else if (score >= 60) label = 'Well Connected'
  else if (score >= 40) label = 'Building Context'
  else if (score >= 20) label = 'Learning About You'

  return { score, label }
}

// Get capability label
function getCapabilityLabel(level: number): { label: string; description: string } {
  const labels = [
    { label: 'Starter', description: 'Basic features enabled' },
    { label: 'Explorer', description: 'Standard features unlocked' },
    { label: 'Builder', description: 'Advanced features available' },
    { label: 'Architect', description: 'Full platform access' },
    { label: 'Visionary', description: 'Premium features enabled' },
  ]
  return labels[Math.min(level, labels.length - 1)] || labels[0]
}

export function RightPanelBar({ workspaceId, onAskOSQR, onHighlightElement, highlightTarget, onExpandedChange }: RightPanelBarProps) {
  const [activeSection, setActiveSectionState] = useState<PanelSection>(null)

  // Wrapper to notify parent when panel expands/collapses
  const setActiveSection = (section: PanelSection) => {
    setActiveSectionState(section)
    onExpandedChange?.(section !== null)
  }
  const [data, setData] = useState<SidebarData | null>(null)
  const [mscItemCount, setMscItemCount] = useState(0)
  const [hasUnseenChanges, setHasUnseenChanges] = useState<Record<string, boolean>>({})
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [hiddenPanels, setHiddenPanelsState] = useState<HideablePanel[]>([])
  const [showAddPicker, setShowAddPicker] = useState(false)

  // New tips highlight system
  const { highlightId, setHighlightId } = useTipsHighlight()

  // OSQR proactive insights state
  const [pendingInsight, setPendingInsight] = useState<PendingInsight | null>(null)
  const [osqrChatInput, setOsqrChatInput] = useState('')
  const [osqrChatLoading, setOsqrChatLoading] = useState(false)
  // Insight conversation state - for "Tell me more" flow within the sidebar
  const [insightConversation, setInsightConversation] = useState<{ role: 'osqr' | 'user'; message: string }[]>([])
  const [insightChatInput, setInsightChatInput] = useState('')
  const insightChatRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    if (insightChatRef.current) {
      insightChatRef.current.scrollTop = insightChatRef.current.scrollHeight
    }
  }, [insightConversation, osqrChatLoading])

  // Load hidden panels from localStorage
  useEffect(() => {
    setHiddenPanelsState(getHiddenPanels())
  }, [])

  // Hide a panel
  const hidePanel = (panel: HideablePanel) => {
    const newHidden = [...hiddenPanels, panel]
    setHiddenPanelsState(newHidden)
    setHiddenPanels(newHidden)
    setActiveSection(null) // Close the panel
  }

  // Show a panel
  const showPanel = (panel: HideablePanel) => {
    const newHidden = hiddenPanels.filter(p => p !== panel)
    setHiddenPanelsState(newHidden)
    setHiddenPanels(newHidden)
    setShowAddPicker(false)
  }

  // Get panels that can be restored
  const availablePanels = HIDEABLE_PANELS.filter(p => hiddenPanels.includes(p.id))

  // Fetch sidebar data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/sidebar-data?workspaceId=${workspaceId}`)
      if (res.ok) {
        const result = await res.json()
        setData({
          quickStats: result.quickStats,
          pinnedItems: result.pinnedItems || [],
          profileInfo: result.profileInfo,
          usageStreak: result.usageStreak,
        })
        setLastFetchTime(Date.now())

        // Check for unseen changes
        const lastSeen = getLastSeen()
        const newUnseen: Record<string, boolean> = {}

        // Check if stats changed since last seen
        if (result.quickStats && (!lastSeen.stats || lastFetchTime > 0)) {
          newUnseen.stats = Date.now() - (lastSeen.stats || 0) > 60000 // 1 minute
        }

        // Check if streak changed
        if (result.usageStreak && result.usageStreak.currentStreak > 0) {
          newUnseen.streak = Date.now() - (lastSeen.streak || 0) > 86400000 // 1 day
        }

        // Check if knowledge score changed
        if (result.profileInfo) {
          newUnseen.knowledge = Date.now() - (lastSeen.knowledge || 0) > 3600000 // 1 hour
        }

        setHasUnseenChanges(newUnseen)
      }
    } catch (error) {
      console.error('Failed to fetch panel data:', error)
    }
  }, [workspaceId, lastFetchTime])

  // Fetch MSC item count
  const fetchMscCount = useCallback(async () => {
    try {
      const res = await fetch(`/api/msc?workspaceId=${workspaceId}`)
      if (res.ok) {
        const result = await res.json()
        setMscItemCount(result.items?.length || 0)

        // Check for unseen command center changes
        const lastSeen = getLastSeen()
        setHasUnseenChanges(prev => ({
          ...prev,
          command: Date.now() - (lastSeen.command || 0) > 300000 // 5 minutes
        }))
      }
    } catch (error) {
      console.error('Failed to fetch MSC count:', error)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchData()
    fetchMscCount()
  }, [fetchData, fetchMscCount])

  // Poll for pending insights (for OSQR icon pulse)
  const fetchPendingInsights = useCallback(async () => {
    try {
      const res = await fetch(`/api/insights/pending?trigger=idle&deliver=false`)
      if (res.ok) {
        const result = await res.json()
        if (result.hasInsight && result.insight) {
          setPendingInsight(result.insight)
        } else {
          setPendingInsight(null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch pending insights:', error)
    }
  }, [])

  useEffect(() => {
    fetchPendingInsights()
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingInsights, 30000)
    return () => clearInterval(interval)
  }, [fetchPendingInsights])

  // Handle OSQR chat from the panel
  const handleOsqrChat = async () => {
    if (!osqrChatInput.trim() || osqrChatLoading) return

    const message = osqrChatInput.trim()
    setOsqrChatInput('')
    setOsqrChatLoading(true)

    try {
      // Use the parent's onAskOSQR callback to send to panel
      if (onAskOSQR) {
        onAskOSQR(message)
        setActiveSection(null) // Close the OSQR panel
      }
    } finally {
      setOsqrChatLoading(false)
    }
  }

  // Handle insight engagement - tell me more (stays in sidebar)
  const handleInsightEngage = async () => {
    if (!pendingInsight) return

    try {
      await fetch(`/api/insights/${pendingInsight.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'engage' }),
      })

      // Start a conversation in the sidebar instead of sending to panel
      const followUp = getInsightFollowUp(pendingInsight.type)
      setInsightConversation([
        { role: 'osqr', message: pendingInsight.message },
        { role: 'osqr', message: followUp },
      ])

      // Clear the pending insight card (conversation takes over)
      setPendingInsight(null)
    } catch (error) {
      console.error('Failed to engage insight:', error)
    }
  }

  // Generate a natural follow-up based on insight type
  const getInsightFollowUp = (type: string): string => {
    switch (type) {
      case 'commitment':
        return "Want to update me on where that stands? I can help you figure out next steps if needed."
      case 'deadline':
        return "How's this looking? If you need to adjust the timeline, I can help you think through it."
      case 'follow_up':
        return "I can help you pick up where you left off if you'd like."
      case 'dependency':
        return "Is there anything blocking this that I can help you work through?"
      case 'next_step':
        return "What's the next thing you want to tackle here?"
      default:
        return "What are your thoughts on this?"
    }
  }

  // Handle insight conversation reply
  const handleInsightReply = async () => {
    if (!insightChatInput.trim() || osqrChatLoading) return

    const userMessage = insightChatInput.trim()
    setInsightChatInput('')
    setOsqrChatLoading(true)

    // Add user message to conversation
    setInsightConversation(prev => [...prev, { role: 'user', message: userMessage }])

    try {
      const res = await fetch('/api/chat/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.response) {
          setInsightConversation(prev => [...prev, { role: 'osqr', message: data.response }])
        }
      }
    } catch (error) {
      console.error('Failed to get response:', error)
      setInsightConversation(prev => [...prev, { role: 'osqr', message: "Sorry, I couldn't process that. Try again?" }])
    } finally {
      setOsqrChatLoading(false)
    }
  }

  // Clear insight conversation
  const handleClearInsightConversation = () => {
    setInsightConversation([])
  }

  // Handle insight dismiss
  const handleInsightDismiss = async () => {
    if (!pendingInsight) return

    try {
      await fetch(`/api/insights/${pendingInsight.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setPendingInsight(null)
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
    }
  }

  // Mark section as seen when opened
  const openSection = (section: PanelSection) => {
    // Clear any active highlight to avoid CSS interference
    setHighlightId(null)

    if (activeSection === section) {
      setActiveSection(null)
    } else {
      setActiveSection(section)
      if (section) {
        setLastSeen(section)
        setHasUnseenChanges(prev => ({ ...prev, [section]: false }))
      }
    }
  }

  // Close panel when clicking outside
  const handleBackdropClick = () => {
    setActiveSection(null)
    setShowAddPicker(false)
  }

  // Calculate metrics for badges
  const knowledgeScore = data?.profileInfo && data?.quickStats
    ? calculateKnowledgeScore({
        profileCompletion: data.profileInfo.completionPercent,
        documentsCount: data.quickStats.documentsCount,
        documentsMax: data.quickStats.documentsMax,
        totalQuestions: data.usageStreak?.totalQuestions,
        pinnedItemsCount: data.pinnedItems.length,
      })
    : null

  const capabilityInfo = data?.quickStats
    ? getCapabilityLabel(data.quickStats.capabilityLevel)
    : null

  return (
    <>
      {/* Backdrop when drawer is open (not for tips - it has its own highlight overlay) */}
      {activeSection && activeSection !== 'tips' && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:bg-transparent"
          onClick={handleBackdropClick}
        />
      )}

      {/* Main container - w-14 matches icon bar, drawer overflows to the left */}
      <div className={cn(
        "h-full w-14 relative",
        activeSection === 'tips' ? "z-[10000]" : "z-40"
      )} data-tips-panel="true">
        {/* Slide-out drawer - positioned absolutely to overflow left without affecting icon bar */}
        <div
          className={cn(
            'absolute top-0 right-14 h-full bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-700/50 shadow-2xl transition-all duration-300 ease-out overflow-hidden',
            activeSection ? 'w-80' : 'w-0'
          )}
        >
          {activeSection === 'command' && (
            <MSCPanel
              workspaceId={workspaceId}
              isExpanded={true}
              onToggle={() => setActiveSection(null)}
              onAskOSQR={onAskOSQR}
            />
          )}

          {activeSection === 'stats' && data?.quickStats && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-cyan-950/50 to-blue-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-white">Quick Stats</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative group/trash">
                      <button
                        onClick={() => hidePanel('stats')}
                        className="cursor-pointer p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 group-hover/trash:text-red-400" />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/trash:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                        <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 shadow-lg whitespace-nowrap">
                          <span className="text-xs text-slate-200">Remove</span>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45" />
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection(null)}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Documents */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>Vault Documents</span>
                    <span className="font-semibold">{data.quickStats.documentsCount}/{data.quickStats.documentsMax}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(data.quickStats.documentsCount / data.quickStats.documentsMax) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Capability Level */}
                {capabilityInfo && (
                  <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Capability Level</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">{capabilityInfo.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{capabilityInfo.description}</p>
                  </div>
                )}

                {/* Referral Bonus */}
                <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-pink-400" />
                      <span className="text-sm text-slate-300">Referral Bonus</span>
                    </div>
                    <span className="text-sm font-bold text-pink-400">
                      +{data.quickStats.referralBonusPercent}%
                    </span>
                  </div>
                  {data.quickStats.referralCount > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Friends referred</span>
                        <span className="text-slate-300">{data.quickStats.referralCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Converted</span>
                        <span className="text-emerald-400">{data.quickStats.convertedReferralCount}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all"
                          style={{ width: `${Math.min(data.quickStats.referralBonusPercent * 2, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 text-right">
                        {data.quickStats.referralBonusPercent}/50% max bonus
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Refer friends to earn up to 50% more usage!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'knowledge' && knowledgeScore && data?.profileInfo && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-950/50 to-pink-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-white">OSQR Knows You</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative group/trash">
                      <button
                        onClick={() => hidePanel('knowledge')}
                        className="cursor-pointer p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 group-hover/trash:text-red-400" />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/trash:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                        <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 shadow-lg whitespace-nowrap">
                          <span className="text-xs text-slate-200">Remove</span>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45" />
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection(null)}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Knowledge Score */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>{knowledgeScore.label}</span>
                    <span className="font-semibold text-purple-400">{knowledgeScore.score}%</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${knowledgeScore.score}%` }}
                    />
                  </div>
                </div>

                {/* Profile Completion */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>Profile Questions</span>
                    <span className="font-semibold">{data.profileInfo.answeredQuestions}/{data.profileInfo.totalQuestions}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Answer more questions to help OSQR understand you better.
                  </p>
                </div>

                {/* Pinned Items */}
                {data.pinnedItems.length > 0 && (
                  <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Pin className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold text-slate-300">Pinned Items</span>
                    </div>
                    <div className="space-y-2">
                      {data.pinnedItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50"
                        >
                          {item.category === 'goal' && <Target className="h-3 w-3 mt-0.5 text-green-400" />}
                          {item.category === 'project' && <FolderKanban className="h-3 w-3 mt-0.5 text-blue-400" />}
                          {item.category === 'idea' && <Lightbulb className="h-3 w-3 mt-0.5 text-amber-400" />}
                          <span className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                            {item.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'streak' && data?.usageStreak && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-orange-950/50 to-red-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/25">
                      <Flame className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-white">Your Streak</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative group/trash">
                      <button
                        onClick={() => hidePanel('streak')}
                        className="cursor-pointer p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500 group-hover/trash:text-red-400" />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/trash:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                        <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 shadow-lg whitespace-nowrap">
                          <span className="text-xs text-slate-200">Remove</span>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45" />
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection(null)}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Current Streak */}
                <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-400">{data.usageStreak.currentStreak}</div>
                      <div className="text-xs text-slate-500">day streak</div>
                    </div>
                    <div className="h-12 w-px bg-slate-700" />
                    <div className="text-center">
                      <div className="text-xl font-semibold text-slate-300">{data.usageStreak.questionsThisWeek}</div>
                      <div className="text-xs text-slate-500">this week</div>
                    </div>
                    <div className="h-12 w-px bg-slate-700" />
                    <div className="text-center">
                      <div className="text-xl font-semibold text-slate-300">{data.usageStreak.insightsGenerated}</div>
                      <div className="text-xs text-slate-500">insights</div>
                    </div>
                  </div>
                  {/* Week day indicators */}
                  <div className="flex items-center gap-2 justify-center">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            'h-3 w-3 rounded-sm',
                            i < data.usageStreak!.currentStreak % 7 ? 'bg-orange-400' : 'bg-slate-700'
                          )}
                        />
                        <span className="text-[9px] text-slate-600">{day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weekly Activity */}
                {data.usageStreak.weeklyBreakdown && (
                  <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Weekly Activity</h4>
                    <div className="flex items-end justify-between h-16 px-1">
                      {Object.entries(data.usageStreak.weeklyBreakdown).map(([day, count]) => (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div
                            className="w-5 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all"
                            style={{ height: `${Math.max((count / 6) * 40, 4)}px` }}
                          />
                          <span className="text-[9px] text-slate-500 uppercase">{day.slice(0, 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Time Stats */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">All Time</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-cyan-400">{data.usageStreak.totalQuestions || 0}</div>
                      <div className="text-[10px] text-slate-500">total questions</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-purple-400">{data.usageStreak.insightsGenerated}</div>
                      <div className="text-[10px] text-slate-500">insights</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-orange-400">{data.usageStreak.longestStreak || data.usageStreak.currentStreak}</div>
                      <div className="text-[10px] text-slate-500">best streak</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold text-slate-300">{data.usageStreak.memberSince || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500">member since</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions Panel - TIL Bubble Suggestions */}
          {activeSection === 'suggestions' && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-green-950/50 to-emerald-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-white">Suggestions</h3>
                  </div>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Your commitments and reminders from conversations</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <BubbleContainer
                  className="h-full"
                  defaultExpanded={true}
                  autoRefreshInterval={5 * 60 * 1000}
                />
              </div>
            </div>
          )}

          {/* OSQR Panel - with tail connecting to icon */}
          {activeSection === 'osqr' && (
            <div className="h-full flex flex-col relative">
              {/* Tail/connector pointing to OSQR icon at bottom */}
              <div className="absolute -right-2 bottom-8 w-4 h-4 rotate-45 bg-gradient-to-br from-blue-950/90 to-purple-950/90 border-r border-t border-blue-500/30 z-10" />
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-950/50 to-purple-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25">
                      <Brain className="h-4 w-4 text-white" />
                      <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-blue-300" />
                    </div>
                    <h3 className="font-bold text-sm text-white">OSQR</h3>
                  </div>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Insight Conversation - show if we're in a "Tell me more" flow */}
                {insightConversation.length > 0 ? (
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                        <h4 className="font-semibold text-sm text-amber-300">Insight Chat</h4>
                      </div>
                      <button
                        onClick={handleClearInsightConversation}
                        className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {/* Conversation messages */}
                    <div ref={insightChatRef} className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                      {insightConversation.map((msg, i) => (
                        <div
                          key={i}
                          className={`text-sm leading-relaxed ${
                            msg.role === 'osqr'
                              ? 'text-slate-200'
                              : 'text-blue-300 bg-blue-500/10 rounded-lg px-3 py-2'
                          }`}
                        >
                          {msg.message}
                        </div>
                      ))}
                      {osqrChatLoading && (
                        <div className="flex space-x-1">
                          <div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" />
                          <div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                    {/* Reply input */}
                    <div className="relative">
                      <input
                        type="text"
                        value={insightChatInput}
                        onChange={(e) => setInsightChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleInsightReply()}
                        placeholder="Reply to OSQR..."
                        disabled={osqrChatLoading}
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-700/50 border border-amber-500/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
                      />
                      {insightChatInput.trim() && (
                        <button
                          onClick={handleInsightReply}
                          disabled={osqrChatLoading}
                          className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : pendingInsight ? (
                  /* Pending Insight card - show if there's one */
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      <h4 className="font-semibold text-sm text-amber-300">
                        {pendingInsight.type === 'contradiction' && 'Pattern Noticed'}
                        {pendingInsight.type === 'clarify' && 'Quick Thought'}
                        {pendingInsight.type === 'next_step' && 'Ready for Next Step?'}
                        {pendingInsight.type === 'recall' && 'Remember This?'}
                        {!['contradiction', 'clarify', 'next_step', 'recall'].includes(pendingInsight.type) && 'Insight'}
                      </h4>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed mb-4">
                      {pendingInsight.message}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleInsightEngage}
                        className="cursor-pointer flex-1 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors"
                      >
                        Tell me more
                      </button>
                      <button
                        onClick={handleInsightDismiss}
                        className="cursor-pointer px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 text-sm transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Default state - quick chat input */
                  <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="h-4 w-4 text-blue-400" />
                      <h4 className="font-semibold text-sm text-white">Quick Question</h4>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Ask OSQR something quick. For deeper conversations, use the main panel.
                    </p>
                    <div className="relative">
                      <input
                        type="text"
                        value={osqrChatInput}
                        onChange={(e) => setOsqrChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleOsqrChat()}
                        placeholder="Ask something..."
                        className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-700/50 border border-slate-600/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                      />
                      {osqrChatInput.trim() && (
                        <button
                          onClick={handleOsqrChat}
                          disabled={osqrChatLoading}
                          className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Status indicators */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex -space-x-1">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <h4 className="font-semibold text-xs text-white">Status</h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    {pendingInsight ? 'OSQR has something to share with you' : 'OSQR is learning. When something comes up, the icon will pulse.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips Panel */}
          {activeSection === 'tips' && (
            <div className="h-full flex flex-col">
              <div className="px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-yellow-950/50 to-amber-950/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg shadow-yellow-500/25">
                      <Lightbulb className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-bold text-sm text-white">Tips & Walkthrough</h3>
                  </div>
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Hover over a tip to spotlight the element</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Getting Started - The Panel */}
                <div
                  className={cn(
                    "rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4 cursor-pointer",
                    highlightId === 'panel-main' && "ring-2 ring-blue-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('panel-main')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-sm text-white">The Panel</h4>
                    <span className="ml-auto text-[9px] text-blue-400 opacity-60">← Hover to spotlight</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This is where you chat with OSQR. Ask any question and it gets refined before being sent to a panel of AI experts. The better your question, the better the answer.
                  </p>
                </div>

                {/* Command Center Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'command-center-icon' && "ring-2 ring-blue-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('command-center-icon')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-sm text-white">Command Center</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Your goals, tasks, and action items live here. OSQR will suggest items based on your conversations. Pin the important ones to keep them front and center.
                  </p>
                </div>

                {/* Memory Vault Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'vault-link' && "ring-2 ring-purple-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('vault-link')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="h-4 w-4 text-purple-400" />
                    <h4 className="font-semibold text-sm text-white">Memory Vault</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Upload documents, notes, or any files you want OSQR to remember. When you enable "Use Knowledge," OSQR references your vault to give personalized answers.
                  </p>
                </div>

                {/* Chat Input Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'chat-input' && "ring-2 ring-cyan-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('chat-input')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-4 w-4 text-cyan-400" />
                    <h4 className="font-semibold text-sm text-white">Chat Input</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Type your question here. OSQR will refine it automatically to get you the best possible answer from the panel of AI experts.
                  </p>
                </div>

                {/* Focus Mode Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'focus-mode-toggle' && "ring-2 ring-orange-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('focus-mode-toggle')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-orange-400" />
                    <h4 className="font-semibold text-sm text-white">Focus Mode</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Need to concentrate? Click the eye icon in the top right to toggle Focus Mode and dim the sidebars.
                  </p>
                </div>

                {/* Sidebar Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'sidebar' && "ring-2 ring-slate-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('sidebar')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronLeft className="h-4 w-4 text-slate-400" />
                    <h4 className="font-semibold text-sm text-white">Navigation Sidebar</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Access your conversation threads, Memory Vault, settings, and more from the left sidebar. Collapse it for more screen space.
                  </p>
                </div>

                {/* Right Panel Bar Tip */}
                <div
                  className={cn(
                    "rounded-xl bg-slate-800/30 border border-slate-700/50 p-4 cursor-pointer",
                    highlightId === 'right-panel-bar' && "ring-2 ring-blue-400/50"
                  )}
                  onMouseEnter={() => setHighlightId('right-panel-bar')}
                  onMouseLeave={() => setHighlightId(null)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold text-sm text-white">Command Sidebar</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Quick access to your Command Center, stats, knowledge score, streak, and OSQR insights. Each icon expands into a detailed panel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Icon bar - absolute positioned at right edge, always clickable */}
        <div
          data-highlight-id="right-panel-bar"
          className="absolute top-0 right-0 z-10 w-14 h-full border-l border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center py-4 gap-2"
        >
          {/* Command Center - shows item count (always visible) */}
          <div className={cn(
            "relative group transition-all duration-300",
            highlightTarget === 'command-center' && 'scale-125 z-[60]'
          )}>
            <button
              onClick={() => openSection('command')}
              data-highlight-id="command-center-icon"
              className={cn(
                'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
                activeSection === 'command' && 'ring-2 ring-blue-400/50 bg-blue-500/20',
                highlightTarget === 'command-center' && 'ring-4 ring-amber-400 bg-amber-500/20 brightness-125 shadow-lg shadow-amber-400/30'
              )}
            >
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-[9px] font-bold text-blue-300">
                {mscItemCount || 0}
              </span>
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Command Center</span>
                </div>
                <p className="text-xs text-slate-400">Your goals, tasks & action items</p>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
            </div>
          </div>

          {/* Stats - shows capability level as colored bar */}
          {!hiddenPanels.includes('stats') && (
            <div className="relative group">
              <button
                onClick={() => openSection('stats')}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                  'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
                  activeSection === 'stats' && 'ring-2 ring-cyan-400/50 bg-cyan-500/20'
                )}
              >
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                {/* Capability level bar - 5 segments */}
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'w-1 h-1.5 rounded-sm transition-colors',
                        level <= (data?.quickStats?.capabilityLevel || 0)
                          ? 'bg-cyan-400'
                          : 'bg-slate-600'
                      )}
                    />
                  ))}
                </div>
              </button>
              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">Quick Stats</span>
                  </div>
                  <p className="text-xs text-slate-400">Vault usage & capability level</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
              </div>
            </div>
          )}

          {/* Knowledge - shows percentage as mini arc/bar */}
          {!hiddenPanels.includes('knowledge') && (
            <div className="relative group">
              <button
                onClick={() => openSection('knowledge')}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                  'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
                  activeSection === 'knowledge' && 'ring-2 ring-purple-400/50 bg-purple-500/20'
                )}
              >
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-[9px] font-bold text-purple-300">
                  {knowledgeScore?.score || 0}%
                </span>
              </button>
              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Knowledge Score</span>
                  </div>
                  <p className="text-xs text-slate-400">How well OSQR knows you</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
              </div>
            </div>
          )}

          {/* Streak - shows current streak number */}
          {!hiddenPanels.includes('streak') && (
            <div className="relative group">
              <button
                onClick={() => openSection('streak')}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                  'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
                  activeSection === 'streak' && 'ring-2 ring-orange-400/50 bg-orange-500/20'
                )}
              >
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-[9px] font-bold text-orange-300">
                  {data?.usageStreak?.currentStreak || 0}d
                </span>
              </button>
              {/* Tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-sm font-semibold text-white">Your Streak</span>
                  </div>
                  <p className="text-xs text-slate-400">Daily usage & activity history</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
              </div>
            </div>
          )}

          {/* Suggestions - TIL Bubble Suggestions */}
          <div className="relative group">
            <button
              onClick={() => openSection('suggestions')}
              className={cn(
                'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                'bg-green-500/10 border-green-500/20 hover:bg-green-500/20',
                activeSection === 'suggestions' && 'ring-2 ring-green-400/50 bg-green-500/20'
              )}
            >
              <Bell className="h-4 w-4 text-green-400" />
              <span className="text-[9px] font-bold text-green-300">
                TIL
              </span>
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-sm font-semibold text-white">Suggestions</span>
                </div>
                <p className="text-xs text-slate-400">Commitments & reminders from chats</p>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
            </div>
          </div>

          {/* Add button - shows when panels are hidden */}
          {availablePanels.length > 0 && (
            <div className="relative group/add">
              <button
                onClick={() => setShowAddPicker(!showAddPicker)}
                className={cn(
                  'flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                  'bg-slate-500/10 border-slate-500/20 hover:bg-slate-500/20 border-dashed',
                  showAddPicker && 'ring-2 ring-slate-400/50 bg-slate-500/20'
                )}
              >
                <Plus className="h-4 w-4 text-slate-400" />
                <span className="text-[9px] font-bold text-slate-400">
                  +{availablePanels.length}
                </span>
              </button>

              {/* Tooltip - only show when picker is not open */}
              {!showAddPicker && (
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/add:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
                    <div className="flex items-center gap-2 mb-1">
                      <Plus className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-semibold text-white">Add Panel</span>
                    </div>
                    <p className="text-xs text-slate-400">Restore hidden panels</p>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
                </div>
              )}

              {/* Picker dropdown */}
              {showAddPicker && (
                <div className="absolute right-full mr-2 top-0 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl p-2 min-w-[140px] z-50">
                  <div className="text-[10px] text-slate-500 uppercase font-bold px-2 py-1 mb-1">
                    Add Panel
                  </div>
                  {availablePanels.map((panel) => {
                    const Icon = panel.icon
                    const colorClasses = {
                      cyan: 'hover:bg-cyan-500/20 text-cyan-400',
                      purple: 'hover:bg-purple-500/20 text-purple-400',
                      orange: 'hover:bg-orange-500/20 text-orange-400',
                    }[panel.color] || 'hover:bg-slate-500/20 text-slate-400'
                    return (
                      <button
                        key={panel.id}
                        onClick={() => showPanel(panel.id)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-colors cursor-pointer',
                          colorClasses.split(' ')[0]
                        )}
                      >
                        <Icon className={cn('h-4 w-4', colorClasses.split(' ')[1])} />
                        <span className="text-xs text-slate-300">{panel.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Divider before OSQR */}
          <div className="w-8 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent my-2" />

          {/* OSQR - The main AI assistant, in his own space */}
          <div className="relative group" data-osqr-icon>
            <button
              onClick={() => openSection('osqr')}
              className={cn(
                'relative flex items-center justify-center rounded-full border-2 transition-all cursor-pointer',
                'w-11 h-11',
                pendingInsight
                  ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 border-amber-400/50 hover:from-amber-500/40 hover:to-orange-500/40 shadow-lg shadow-amber-500/20'
                  : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-400/30 hover:from-blue-500/30 hover:to-purple-500/30 shadow-md shadow-blue-500/15',
                activeSection === 'osqr' && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-950'
              )}
            >
              <div className="relative">
                <Brain className={cn(
                  'h-5 w-5',
                  pendingInsight ? 'text-amber-300' : 'text-blue-300'
                )} />
                {pendingInsight && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5">
                    <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" style={{ animationDuration: '1.5s' }} />
                    <span className="absolute inset-0 rounded-full bg-amber-400" />
                  </span>
                )}
              </div>
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className={cn(
                'border rounded-lg px-3 py-2 shadow-xl min-w-[160px]',
                pendingInsight
                  ? 'bg-amber-950/90 border-amber-700'
                  : 'bg-slate-900 border-slate-700'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className={cn('h-3.5 w-3.5', pendingInsight ? 'text-amber-400' : 'text-blue-400')} />
                  <span className="text-sm font-semibold text-white">
                    {pendingInsight ? 'OSQR has an insight!' : 'OSQR'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {pendingInsight ? 'Click to see what OSQR noticed' : 'Quick chat & proactive insights'}
                </p>
              </div>
              <div className={cn(
                'absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 border-r border-t rotate-45',
                pendingInsight
                  ? 'bg-amber-950/90 border-amber-700'
                  : 'bg-slate-900 border-slate-700'
              )} />
            </div>
          </div>

          {/* Spacer to push Tips to bottom */}
          <div className="flex-1" />

          {/* Tips - at the bottom */}
          <div className="relative group">
            <button
              onClick={() => openSection('tips')}
              className={cn(
                'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
                'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20',
                activeSection === 'tips' && 'ring-2 ring-yellow-400/50 bg-yellow-500/20'
              )}
            >
              <Lightbulb className="h-4 w-4 text-yellow-400" />
              <span className="text-[9px] font-bold text-yellow-300">Tips</span>
            </button>
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-sm font-semibold text-white">Tips & Help</span>
                </div>
                <p className="text-xs text-slate-400">Learn how to use OSQR</p>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-900 border-r border-t border-slate-700 rotate-45" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

// Icon button component with badge and pulse
interface IconButtonProps {
  icon: typeof Zap
  label: string
  badge?: string | number
  isActive: boolean
  hasUnseen?: boolean
  colorClass: string
  onClick: () => void
}

function IconButton({ icon: Icon, label, badge, isActive, hasUnseen, colorClass, onClick }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2.5 rounded-xl border transition-all cursor-pointer group',
        colorClass,
        isActive && 'ring-2 ring-offset-2 ring-offset-slate-950'
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />

      {/* Badge */}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-slate-700 rounded-full border border-slate-600">
          {badge}
        </span>
      )}

      {/* Unseen pulse indicator */}
      {hasUnseen && !isActive && (
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
          <span className="absolute inset-0 rounded-full bg-blue-400" />
        </span>
      )}
    </button>
  )
}
