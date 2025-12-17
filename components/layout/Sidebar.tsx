'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Brain,
  MessageSquare,
  Database,
  Settings,
  Sparkles,
  Zap,
  FileText,
  TrendingUp,
  Target,
  Pin,
  User,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Calculate how well OSQR knows the user (composite knowledge score)
function calculateKnowledgeScore(params: {
  profileCompletion: number  // 0-100
  documentsCount: number
  documentsMax: number
  totalQuestions?: number
  pinnedItemsCount: number
}): { score: number; label: string } {
  // Profile completion: 40% weight (most important for understanding user)
  const profileScore = params.profileCompletion * 0.4

  // Vault documents: 30% weight (max out at 50 docs = 100%)
  const docNormalized = Math.min(params.documentsCount / 50, 1) * 100
  const docScore = docNormalized * 0.3

  // Usage/engagement: 30% weight (based on questions and pinned items)
  const questionsNormalized = Math.min((params.totalQuestions || 0) / 100, 1) * 100
  const pinnedNormalized = Math.min(params.pinnedItemsCount / 10, 1) * 100
  const engagementScore = ((questionsNormalized + pinnedNormalized) / 2) * 0.3

  const totalScore = Math.round(profileScore + docScore + engagementScore)

  // Generate friendly label based on score
  let label: string
  if (totalScore < 15) {
    label = 'Just getting started'
  } else if (totalScore < 30) {
    label = 'Learning your style'
  } else if (totalScore < 50) {
    label = 'Understanding you'
  } else if (totalScore < 70) {
    label = 'Knowing you well'
  } else if (totalScore < 85) {
    label = 'Deep understanding'
  } else {
    label = 'Fully attuned'
  }

  return { score: totalScore, label }
}

// Map capability levels to friendly labels
function getCapabilityLabel(level: number): { label: string; description: string } {
  if (level <= 1) return {
    label: 'Building',
    description: 'You\'re building your foundation. Every question strengthens how OSQR can help you.'
  }
  if (level <= 3) return {
    label: 'Growing',
    description: 'Your thinking patterns are developing. OSQR is learning your style.'
  }
  if (level <= 5) return {
    label: 'Operating',
    description: 'You\'re in operator mode. Systems and consistency are forming.'
  }
  if (level <= 7) return {
    label: 'Creating',
    description: 'Creator level. You\'re building leverage and multiplying your impact.'
  }
  if (level <= 9) return {
    label: 'Architecting',
    description: 'Architect mode. You\'re designing systems that outlast you.'
  }
  return {
    label: 'Mastering',
    description: 'Master level. Your documented wisdom is your legacy.'
  }
}

interface SidebarProps {
  workspaceId?: string
  onClose?: () => void
}

interface QuickStats {
  queriesRemaining: number
  queriesMax: number
  documentsCount: number
  documentsMax: number
  capabilityLevel: number
}

interface RecentThread {
  id: string
  title: string
  updatedAt: string
}

interface PinnedItem {
  id: string
  content: string
  category: string
}

interface ProfileInfo {
  completionPercent: number
  answeredQuestions: number
  totalQuestions: number
}

interface UsageStreak {
  currentStreak: number
  questionsThisWeek: number
  insightsGenerated: number
  weeklyBreakdown?: { [key: string]: number }
  totalQuestions?: number
  longestStreak?: number
  memberSince?: string
}

// Usage Carousel Component
function UsageCarousel({ usageStreak }: { usageStreak: UsageStreak }) {
  const [currentView, setCurrentView] = useState(0)
  const views = ['streak', 'weekly', 'allTime'] as const

  const nextView = () => setCurrentView((prev) => (prev + 1) % views.length)
  const prevView = () => setCurrentView((prev) => (prev - 1 + views.length) % views.length)

  // Use real data from API, with fallback defaults
  const weeklyData = usageStreak.weeklyBreakdown || {
    mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
  }
  const allTimeStats = {
    totalQuestions: usageStreak.totalQuestions || 0,
    totalInsights: usageStreak.insightsGenerated || 0,
    longestStreak: usageStreak.longestStreak || usageStreak.currentStreak,
    memberSince: usageStreak.memberSince || 'Unknown'
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 p-3">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-semibold text-slate-300">
            {currentView === 0 ? 'Your Streak' : currentView === 1 ? 'This Week' : 'All Time'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevView}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            onClick={nextView}
            className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* View: Streak */}
      {currentView === 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{usageStreak.currentStreak}</div>
              <div className="text-[9px] text-slate-500">days</div>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">{usageStreak.questionsThisWeek}</div>
              <div className="text-[9px] text-slate-500">questions</div>
            </div>
            <div className="h-10 w-px bg-slate-700" />
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-300">{usageStreak.insightsGenerated}</div>
              <div className="text-[9px] text-slate-500">insights</div>
            </div>
          </div>
          {/* Week day indicators with labels */}
          <div className="flex items-center gap-1 justify-center">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className={`h-2 w-2 rounded-sm ${
                    i < usageStreak.currentStreak % 7
                      ? 'bg-orange-400'
                      : 'bg-slate-700'
                  }`}
                />
                <span className="text-[8px] text-slate-600">{day}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* View: Weekly Activity */}
      {currentView === 1 && (
        <div className="space-y-2">
          <div className="flex items-end justify-between h-12 px-1">
            {Object.entries(weeklyData).map(([day, count]) => (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all"
                  style={{ height: `${Math.max((count / 6) * 32, 4)}px` }}
                />
                <span className="text-[8px] text-slate-500 uppercase">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <div className="text-center pt-1">
            <span className="text-xs text-slate-400">
              {Object.values(weeklyData).reduce((a, b) => a + b, 0)} questions this week
            </span>
          </div>
        </div>
      )}

      {/* View: All Time Stats */}
      {currentView === 2 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-cyan-400">{allTimeStats.totalQuestions}</div>
            <div className="text-[9px] text-slate-500">total questions</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-400">{allTimeStats.totalInsights}</div>
            <div className="text-[9px] text-slate-500">insights</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-400">{allTimeStats.longestStreak}</div>
            <div className="text-[9px] text-slate-500">best streak</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xs font-semibold text-slate-300">{allTimeStats.memberSince}</div>
            <div className="text-[9px] text-slate-500">member since</div>
          </div>
        </div>
      )}

      {/* Carousel dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {views.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentView(i)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              i === currentView
                ? 'w-4 bg-orange-400'
                : 'w-1.5 bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

const navigation = [
  {
    name: 'Panel',
    href: '/panel',
    icon: Brain,
    description: 'Multi-model AI panel discussion',
  },
  {
    name: 'Memory Vault',
    href: '/vault',
    icon: Database,
    description: 'Browse your indexed documents',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Agents and preferences',
  },
]

export function Sidebar({ workspaceId, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [recentThreads, setRecentThreads] = useState<RecentThread[]>([])
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([])
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [usageStreak, setUsageStreak] = useState<UsageStreak | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (workspaceId) {
      fetchSidebarData()
    }
  }, [workspaceId])

  const fetchSidebarData = async () => {
    try {
      const res = await fetch(`/api/sidebar-data?workspaceId=${workspaceId}`)
      if (res.ok) {
        const data = await res.json()
        setQuickStats(data.quickStats)
        setRecentThreads(data.recentThreads || [])
        setPinnedItems(data.pinnedItems || [])
        setProfileInfo(data.profileInfo)
        setUsageStreak(data.usageStreak)
      }
    } catch (error) {
      console.error('Failed to fetch sidebar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'goal': return 'text-green-400'
      case 'project': return 'text-blue-400'
      case 'idea': return 'text-amber-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="flex h-full flex-col">
        {/* Logo / App Name */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700/50 px-6">
          <Link href="/panel" className="flex items-center space-x-3 group" onClick={onClose}>
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/30 group-hover:ring-blue-500/50 transition-all">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text">
              OSQR
            </span>
          </Link>
          {/* Close button - only visible on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="cursor-pointer lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                )}
                title={item.description}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                )} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Sections */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
          {/* Quick Stats */}
          {quickStats && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Quick Stats</span>
              </div>
              <div className="space-y-2">
                {/* Queries remaining */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Queries today</span>
                    <span>{quickStats.queriesRemaining}/{quickStats.queriesMax}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${(quickStats.queriesRemaining / quickStats.queriesMax) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Documents */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Vault docs</span>
                    <span>{quickStats.documentsCount}/{quickStats.documentsMax}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{ width: `${(quickStats.documentsCount / quickStats.documentsMax) * 100}%` }}
                    />
                  </div>
                </div>
                {/* Capability Level */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between pt-1 cursor-help">
                        <span className="text-[10px] text-slate-400">Capability</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <span className="text-xs font-bold text-green-400">
                            {getCapabilityLabel(quickStats.capabilityLevel).label}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px] bg-slate-800 border-slate-700 text-slate-200">
                      <p className="text-xs">{getCapabilityLabel(quickStats.capabilityLevel).description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Recent Threads */}
          {recentThreads.length > 0 && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-300">Recent</span>
                </div>
                <Link href="/threads" className="text-[10px] text-slate-500 hover:text-slate-300">
                  View all
                </Link>
              </div>
              <div className="space-y-1.5">
                {recentThreads.slice(0, 3).map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/panel?thread=${thread.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-colors group"
                  >
                    <span className="text-xs text-slate-400 group-hover:text-slate-200 truncate flex-1">
                      {thread.title}
                    </span>
                    <span className="text-[9px] text-slate-500 ml-2">
                      {formatTimeAgo(thread.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pinned Items */}
          {pinnedItems.length > 0 && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <Pin className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-slate-300">Pinned</span>
              </div>
              <div className="space-y-1.5">
                {pinnedItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-slate-800/50"
                  >
                    <Target className={`h-3 w-3 mt-0.5 flex-shrink-0 ${getCategoryColor(item.category)}`} />
                    <span className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile / Knowledge Score */}
          {profileInfo && quickStats && (
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/50 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-semibold text-slate-300">OSQR Knows You</span>
                </div>
                <Link href="/profile" className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5">
                  Improve <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {(() => {
                const knowledge = calculateKnowledgeScore({
                  profileCompletion: profileInfo.completionPercent,
                  documentsCount: quickStats.documentsCount,
                  documentsMax: quickStats.documentsMax,
                  totalQuestions: usageStreak?.totalQuestions,
                  pinnedItemsCount: pinnedItems.length,
                })
                return (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>{knowledge.label}</span>
                      <span>{knowledge.score}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${knowledge.score}%` }}
                      />
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Usage & Streak Carousel */}
          {usageStreak && (
            <UsageCarousel usageStreak={usageStreak} />
          )}
        </div>

        {/* Footer - Activity indicator for active agents */}
        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <div className="flex -space-x-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" style={{ animationDelay: '0.2s' }}></div>
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span>3 agents ready</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
