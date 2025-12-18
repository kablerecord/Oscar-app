'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { MSCPanel } from '@/components/msc/MSCPanel'

interface RightPanelBarProps {
  workspaceId: string
  onAskOSQR?: (prompt: string) => void
}

interface SidebarData {
  quickStats: {
    queriesRemaining: number
    queriesMax: number
    documentsCount: number
    documentsMax: number
    capabilityLevel: number
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

type PanelSection = 'command' | 'stats' | 'knowledge' | 'streak' | null

// Track what the user has seen
const LAST_SEEN_KEY = 'osqr_panel_last_seen'

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

export function RightPanelBar({ workspaceId, onAskOSQR }: RightPanelBarProps) {
  const [activeSection, setActiveSection] = useState<PanelSection>(null)
  const [data, setData] = useState<SidebarData | null>(null)
  const [mscItemCount, setMscItemCount] = useState(0)
  const [hasUnseenChanges, setHasUnseenChanges] = useState<Record<string, boolean>>({})
  const [lastFetchTime, setLastFetchTime] = useState(0)

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

  // Mark section as seen when opened
  const openSection = (section: PanelSection) => {
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
      {/* Backdrop when drawer is open */}
      {activeSection && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:bg-transparent"
          onClick={handleBackdropClick}
        />
      )}

      {/* Main container */}
      <div className="fixed right-0 top-16 bottom-0 z-40 flex">
        {/* Slide-out drawer */}
        <div
          className={cn(
            'h-full bg-gradient-to-b from-slate-900 to-slate-950 border-l border-slate-700/50 shadow-2xl transition-all duration-300 ease-out overflow-hidden',
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
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Queries remaining */}
                <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-4">
                  <div className="flex justify-between text-sm text-slate-300 mb-2">
                    <span>Queries Today</span>
                    <span className="font-semibold">{data.quickStats.queriesRemaining}/{data.quickStats.queriesMax}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(data.quickStats.queriesRemaining / data.quickStats.queriesMax) * 100}%` }}
                    />
                  </div>
                </div>

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
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
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
                  <button
                    onClick={() => setActiveSection(null)}
                    className="cursor-pointer p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-white" />
                  </button>
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
        </div>

        {/* Icon bar */}
        <div className="w-14 h-full border-l border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center py-4 gap-2">
          {/* Command Center - shows item count */}
          <button
            onClick={() => openSection('command')}
            className={cn(
              'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
              'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
              activeSection === 'command' && 'ring-2 ring-blue-400/50 bg-blue-500/20'
            )}
            title="Command Center"
          >
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-[9px] font-bold text-blue-300">
              {mscItemCount || 0}
            </span>
          </button>

          {/* Stats - shows capability level as colored bar */}
          <button
            onClick={() => openSection('stats')}
            className={cn(
              'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
              'bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20',
              activeSection === 'stats' && 'ring-2 ring-cyan-400/50 bg-cyan-500/20'
            )}
            title="Quick Stats"
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

          {/* Knowledge - shows percentage as mini arc/bar */}
          <button
            onClick={() => openSection('knowledge')}
            className={cn(
              'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
              'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20',
              activeSection === 'knowledge' && 'ring-2 ring-purple-400/50 bg-purple-500/20'
            )}
            title="Knowledge Score"
          >
            <Brain className="h-4 w-4 text-purple-400" />
            <span className="text-[9px] font-bold text-purple-300">
              {knowledgeScore?.score || 0}%
            </span>
          </button>

          {/* Streak - shows current streak number */}
          <button
            onClick={() => openSection('streak')}
            className={cn(
              'relative flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all cursor-pointer w-11',
              'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
              activeSection === 'streak' && 'ring-2 ring-orange-400/50 bg-orange-500/20'
            )}
            title="Your Streak"
          >
            <Flame className="h-4 w-4 text-orange-400" />
            <span className="text-[9px] font-bold text-orange-300">
              {data?.usageStreak?.currentStreak || 0}d
            </span>
          </button>
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
