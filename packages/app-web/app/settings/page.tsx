'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { User, CreditCard, Settings2, Flame, Download, Loader2, Check, Lightbulb, Bell, BellOff, Volume2, Shield, AlertTriangle, Award, Gift, Copy, Users, Link2, RefreshCw, MessageSquareQuote, ChevronDown, ChevronUp } from 'lucide-react'
import { getAllEarnedBadges, BADGES, BADGE_CATEGORIES, UserStats } from '@/lib/badges/config'
import { MainLayout } from '@/components/layout/MainLayout'
import { UserProfileSection } from '@/components/settings/UserProfileSection'
import { AICapabilitiesSection } from '@/components/settings/AICapabilitiesSection'
import { LabFeedbackSection } from '@/components/settings/LabFeedbackSection'

interface UserData {
  name: string
  email: string
  tier: string
  createdAt: string
}

// UserStats is now imported from @/lib/badges/config

interface InsightPreferences {
  enabled: boolean
  bubbleMode: 'on' | 'off' | 'quiet'
  maxPerSession: number
  maxPerHour: number
  minIntervalMinutes: number
  mutedCategories: string[]
}

type PrivacyTier = 'A' | 'B' | 'C'

interface PrivacySettings {
  privacyTier: PrivacyTier
  consentTimestamp: string
  consentVersion: string
  summary: {
    title: string
    description: string
    dataCollected: string[]
    benefits: string[]
  }
}

interface ReferralStats {
  referralCode: string | null
  totalReferrals: number
  pendingReferrals: number
  convertedReferrals: number
  expiredReferrals: number
  currentBonusPercent: number
  maxBonusPercent: number
  effectiveTokenBonus: number
  baseTokenLimit: number
  effectiveTokenLimit: number
  referrals: Array<{
    id: string
    status: 'PENDING' | 'CONVERTED' | 'EXPIRED'
    createdAt: string
    convertedAt: string | null
  }>
}

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Insight preferences state
  const [insightPrefs, setInsightPrefs] = useState<InsightPreferences | null>(null)
  const [savingInsights, setSavingInsights] = useState(false)

  // Burn It modal state
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [burnStep, setBurnStep] = useState<'initial' | 'confirm' | 'final' | 'burning' | 'done'>('initial')
  const [confirmText, setConfirmText] = useState('')

  // Export state
  const [exporting, setExporting] = useState(false)

  // Light mode coming soon state
  const [showLightModeToast, setShowLightModeToast] = useState(false)

  // Use Knowledge Base state (persisted in localStorage)
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true)

  // Refinement hints state (persisted in localStorage)
  const [showRefinementHints, setShowRefinementHints] = useState(false)

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false)
  const [deletingData, setDeletingData] = useState(false)
  const [deleteDataSuccess, setDeleteDataSuccess] = useState(false)

  // Referral system state
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [referralLoading, setReferralLoading] = useState(true)
  const [referralError, setReferralError] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Testimonial state
  const [testimonialContent, setTestimonialContent] = useState('')
  const [testimonialDisplayName, setTestimonialDisplayName] = useState('')
  const [testimonialRole, setTestimonialRole] = useState('')
  const [testimonialStatus, setTestimonialStatus] = useState<'idle' | 'loading' | 'submitted' | 'error'>('idle')
  const [existingTestimonial, setExistingTestimonial] = useState<{
    id: string
    content: string
    displayName: string | null
    role: string | null
    status: string
  } | null>(null)
  const [testimonialError, setTestimonialError] = useState<string | null>(null)

  // Achievements section expanded state
  const [achievementsExpanded, setAchievementsExpanded] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch('/api/settings/user')
        if (res.ok) {
          const data = await res.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  // Fetch user stats for badges
  useEffect(() => {
    async function fetchUserStats() {
      try {
        const res = await fetch('/api/settings/stats')
        if (res.ok) {
          const data = await res.json()
          setUserStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch user stats:', error)
      }
    }
    fetchUserStats()
  }, [])

  // Fetch insight preferences
  useEffect(() => {
    async function fetchInsightPrefs() {
      try {
        const res = await fetch('/api/insights/preferences')
        if (res.ok) {
          const data = await res.json()
          setInsightPrefs(data.preferences)
        }
      } catch (error) {
        console.error('Failed to fetch insight preferences:', error)
      }
    }
    fetchInsightPrefs()
  }, [])

  // Load Use Knowledge Base setting from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('osqr-use-knowledge-base')
    if (stored !== null) {
      setUseKnowledgeBase(stored === 'true')
    }
  }, [])

  // Load Refinement Hints setting from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('osqr-show-refinement-hints')
    // Default to false if not set
    setShowRefinementHints(stored === 'true')
  }, [])

  // Fetch privacy settings
  useEffect(() => {
    async function fetchPrivacySettings() {
      try {
        const res = await fetch('/api/user/privacy')
        if (res.ok) {
          const data = await res.json()
          setPrivacySettings(data)
        }
      } catch (error) {
        console.error('Failed to fetch privacy settings:', error)
      }
    }
    fetchPrivacySettings()
  }, [])

  // Fetch existing testimonial
  useEffect(() => {
    async function fetchTestimonial() {
      try {
        const res = await fetch('/api/testimonials')
        if (res.ok) {
          const data = await res.json()
          if (data.hasSubmitted && data.testimonial) {
            setExistingTestimonial(data.testimonial)
            setTestimonialStatus('submitted')
          }
        }
      } catch (error) {
        console.error('Failed to fetch testimonial:', error)
      }
    }
    fetchTestimonial()
  }, [])

  // Fetch referral stats
  useEffect(() => {
    async function fetchReferralStats() {
      try {
        setReferralError(null)
        const res = await fetch('/api/referrals/stats')
        if (res.ok) {
          const data = await res.json()
          setReferralStats(data)
        } else {
          const errorData = await res.json().catch(() => ({}))
          const errorMsg = errorData.details
            ? `${errorData.error}: ${errorData.details}`
            : (errorData.error || 'Failed to load referral data')
          console.error('Referral stats error:', errorData)
          setReferralError(errorMsg)
        }
      } catch (error) {
        console.error('Failed to fetch referral stats:', error)
        setReferralError('Network error - please try again')
      } finally {
        setReferralLoading(false)
      }
    }
    fetchReferralStats()
  }, [])

  // Toggle Use Knowledge Base setting
  const toggleUseKnowledgeBase = () => {
    const newValue = !useKnowledgeBase
    setUseKnowledgeBase(newValue)
    localStorage.setItem('osqr-use-knowledge-base', String(newValue))
  }

  // Toggle Refinement Hints setting
  const toggleRefinementHints = () => {
    const newValue = !showRefinementHints
    setShowRefinementHints(newValue)
    localStorage.setItem('osqr-show-refinement-hints', String(newValue))
    // Trigger storage event for other tabs/components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'osqr-show-refinement-hints',
      newValue: String(newValue),
    }))
  }

  // Update privacy tier
  const updatePrivacyTier = async (tier: PrivacyTier) => {
    setSavingPrivacy(true)
    try {
      const res = await fetch('/api/user/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      if (res.ok) {
        const data = await res.json()
        setPrivacySettings(data)
      }
    } catch (error) {
      console.error('Failed to update privacy tier:', error)
    } finally {
      setSavingPrivacy(false)
    }
  }

  // Delete telemetry data
  const handleDeleteTelemetryData = async () => {
    setDeletingData(true)
    try {
      const res = await fetch('/api/user/privacy', {
        method: 'DELETE',
      })
      if (res.ok) {
        setDeleteDataSuccess(true)
        // Refresh privacy settings
        const refreshRes = await fetch('/api/user/privacy')
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          setPrivacySettings(data)
        }
        // Close modal after delay
        setTimeout(() => {
          setShowDeleteDataModal(false)
          setDeleteDataSuccess(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to delete telemetry data:', error)
    } finally {
      setDeletingData(false)
    }
  }

  // Generate referral code
  const handleGenerateReferralCode = async () => {
    setGeneratingCode(true)
    setReferralError(null)
    try {
      const res = await fetch('/api/referrals/generate', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        // Refetch full stats to get the complete data
        const statsRes = await fetch('/api/referrals/stats')
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setReferralStats(statsData)
        } else {
          // At minimum, show the code we just generated
          setReferralStats(prev => prev ? { ...prev, referralCode: data.referralCode } : {
            referralCode: data.referralCode,
            totalReferrals: 0,
            pendingReferrals: 0,
            convertedReferrals: 0,
            expiredReferrals: 0,
            currentBonusPercent: 0,
            maxBonusPercent: 50,
            effectiveTokenBonus: 1,
            baseTokenLimit: 0,
            effectiveTokenLimit: 0,
            referrals: [],
          })
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        setReferralError(errorData.error || 'Failed to generate code')
      }
    } catch (error) {
      console.error('Failed to generate referral code:', error)
      setReferralError('Network error - please try again')
    } finally {
      setGeneratingCode(false)
    }
  }

  // Copy referral code to clipboard
  const handleCopyReferralCode = async () => {
    if (!referralStats?.referralCode) return
    try {
      await navigator.clipboard.writeText(referralStats.referralCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy referral code:', error)
    }
  }

  // Copy share link to clipboard
  const handleCopyShareLink = async () => {
    if (!referralStats?.referralCode) return
    try {
      const shareLink = `https://app.osqr.app/signup?ref=${referralStats.referralCode}`
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy share link:', error)
    }
  }

  // Submit testimonial
  const handleSubmitTestimonial = async () => {
    if (!testimonialContent.trim()) {
      setTestimonialError('Please write a testimonial')
      return
    }

    setTestimonialStatus('loading')
    setTestimonialError(null)

    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: testimonialContent.trim(),
          displayName: testimonialDisplayName.trim() || null,
          role: testimonialRole.trim() || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setExistingTestimonial({
          id: data.testimonialId,
          content: testimonialContent.trim(),
          displayName: testimonialDisplayName.trim() || null,
          role: testimonialRole.trim() || null,
          status: 'PENDING',
        })
        setTestimonialStatus('submitted')
        setTestimonialContent('')
        setTestimonialDisplayName('')
        setTestimonialRole('')
      } else {
        const errorData = await res.json()
        setTestimonialError(errorData.error || 'Failed to submit testimonial')
        setTestimonialStatus('error')
      }
    } catch (error) {
      console.error('Failed to submit testimonial:', error)
      setTestimonialError('Network error - please try again')
      setTestimonialStatus('error')
    }
  }

  // Format token count for display
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`.replace('.0M', 'M')
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(0)}K`
    }
    return tokens.toString()
  }

  // Update insight preferences
  const updateInsightPrefs = async (updates: Partial<InsightPreferences>) => {
    setSavingInsights(true)
    try {
      const res = await fetch('/api/insights/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (res.ok) {
        const data = await res.json()
        setInsightPrefs(data.preferences)
      }
    } catch (error) {
      console.error('Failed to update insight preferences:', error)
    } finally {
      setSavingInsights(false)
    }
  }

  // Toggle category mute
  const toggleCategory = async (category: string) => {
    if (!insightPrefs) return
    const isMuted = insightPrefs.mutedCategories.includes(category)
    setSavingInsights(true)
    try {
      const res = await fetch('/api/insights/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isMuted ? 'unmute' : 'mute',
          category,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInsightPrefs(data.preferences)
      }
    } catch (error) {
      console.error('Failed to toggle category:', error)
    } finally {
      setSavingInsights(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/settings/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `osqr-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleBurnIt = async () => {
    setBurnStep('burning')
    try {
      const res = await fetch('/api/settings/burn-it', {
        method: 'DELETE',
      })
      if (res.ok) {
        setBurnStep('done')
        // Redirect to home after 2 seconds
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        setBurnStep('initial')
        alert('Failed to delete data. Please try again.')
      }
    } catch (error) {
      console.error('Burn failed:', error)
      setBurnStep('initial')
      alert('Failed to delete data. Please try again.')
    }
  }

  const handleLightModeClick = async () => {
    // Track the click
    try {
      await fetch('/api/analytics/feature-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: 'light_mode' }),
      })
    } catch (e) {
      // Silent fail - don't block UX for analytics
    }

    // Show toast
    setShowLightModeToast(true)
    setTimeout(() => setShowLightModeToast(false), 3000)
  }

  const openBurnModal = () => {
    setShowBurnModal(true)
    setBurnStep('initial')
    setConfirmText('')
  }

  const closeBurnModal = () => {
    setShowBurnModal(false)
    setBurnStep('initial')
    setConfirmText('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-neutral-400">
            Manage your account, subscription, and preferences.
          </p>
        </div>

        {/* Account Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <User className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Account</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
              <p className="text-white">{userData?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
              <p className="text-white">{userData?.email || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Member since</label>
              <p className="text-white">
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
          </div>
        </section>

        {/* How OSQR Sees You - User Profile Section */}
        <UserProfileSection />

        {/* Badges Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          {/* Header - Clickable to expand/collapse */}
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setAchievementsExpanded(!achievementsExpanded)}
          >
            <div className="flex items-center gap-3">
              {/* Expand/Collapse Chevron */}
              <div className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                {achievementsExpanded ? (
                  <ChevronUp className="h-5 w-5 text-neutral-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-neutral-400" />
                )}
              </div>
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Award className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Achievements</h2>
                <p className="text-sm text-neutral-400">
                  {achievementsExpanded
                    ? 'Your badges and milestones'
                    : 'Click to expand and view all badges'}
                </p>
              </div>
            </div>
          </div>

          {/* Preview when collapsed */}
          {!achievementsExpanded && userStats && (
            <div
              className="mt-4 pt-4 border-t border-neutral-800 cursor-pointer"
              onClick={() => setAchievementsExpanded(true)}
            >
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Badges:</span>
                  <span className="text-amber-400 font-medium">
                    {getAllEarnedBadges(userStats).length}/{Object.keys(BADGES).length} earned
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Questions:</span>
                  <span className="text-neutral-300">{userStats.totalQuestions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Active Days:</span>
                  <span className="text-neutral-300">{userStats.totalActiveDays || 0}</span>
                </div>
                <span className="text-amber-400">• Click to expand</span>
              </div>
            </div>
          )}

          {/* Expanded Content */}
          {achievementsExpanded && (
            <>
              {userStats ? (
                <div className="space-y-6 mt-6">
                  {/* Stats Summary at top */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-white">{userStats.totalQuestions}</p>
                      <p className="text-xs text-neutral-400">Questions</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-white">{userStats.totalActiveDays || 0}</p>
                      <p className="text-xs text-neutral-400">Active Days</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-white">{userStats.documentsIndexed}</p>
                      <p className="text-xs text-neutral-400">Docs Indexed</p>
                    </div>
                    <div className="bg-neutral-800/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-amber-400">{getAllEarnedBadges(userStats).length}/{Object.keys(BADGES).length}</p>
                      <p className="text-xs text-neutral-400">Badges Earned</p>
                    </div>
                  </div>

                  {/* Badges by Category */}
                  {(() => {
                    const earnedBadges = getAllEarnedBadges(userStats)
                    const earnedBadgeIds = new Set(earnedBadges.map(b => b.id))

                    return (
                      <div className="space-y-6">
                        {Object.entries(BADGE_CATEGORIES).map(([categoryId, category]) => {
                          const categoryBadges = category.badges
                          const earnedInCategory = categoryBadges.filter(id => earnedBadgeIds.has(id))

                          return (
                            <div key={categoryId} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-sm font-medium text-white">{category.name}</h3>
                                  <p className="text-xs text-neutral-500">{category.description}</p>
                                </div>
                                <span className="text-xs text-neutral-400">
                                  {earnedInCategory.length}/{categoryBadges.length}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {categoryBadges.map((badgeId) => {
                                  const badge = BADGES[badgeId]
                                  if (!badge) return null
                                  const isEarned = earnedBadgeIds.has(badgeId)
                                  const badgeWithReq = badge as typeof badge & { requirement?: string }

                                  return (
                                    <div
                                      key={badgeId}
                                      className={`relative group/badge flex items-center gap-2 p-2.5 rounded-lg transition-all cursor-default ${
                                        isEarned
                                          ? badge.color
                                          : 'bg-neutral-800/30 opacity-60 hover:opacity-80'
                                      }`}
                                    >
                                      <span className={`text-xl ${isEarned ? '' : 'grayscale'}`}>
                                        {badge.icon}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-medium truncate ${
                                          isEarned ? 'text-white' : 'text-neutral-500'
                                        }`}>
                                          {badge.name}
                                        </p>
                                      </div>

                                      {/* Custom Tooltip */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/badge:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                                        <div className={`px-3 py-2 rounded-lg shadow-xl whitespace-nowrap ${
                                          isEarned
                                            ? 'bg-neutral-800 border border-neutral-700'
                                            : 'bg-neutral-900 border border-neutral-700'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base">{badge.icon}</span>
                                            <span className="text-sm font-medium text-white">{badge.name}</span>
                                            {isEarned && (
                                              <Check className="h-3.5 w-3.5 text-green-400" />
                                            )}
                                          </div>
                                          <p className="text-xs text-neutral-400 max-w-[200px] whitespace-normal">
                                            {isEarned ? badge.description : badgeWithReq.requirement || badge.description}
                                          </p>
                                          {!isEarned && (
                                            <p className="text-[10px] text-amber-400/80 mt-1">
                                              Not yet earned
                                            </p>
                                          )}
                                        </div>
                                        {/* Tooltip arrow */}
                                        <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 ${
                                          isEarned
                                            ? 'bg-neutral-800 border-b border-r border-neutral-700'
                                            : 'bg-neutral-900 border-b border-r border-neutral-700'
                                        }`} />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {/* Progress indicators for long-term badges */}
                  {userStats.consecutiveMonthsActive !== undefined && userStats.consecutiveMonthsActive > 0 && userStats.consecutiveMonthsActive < 12 && (
                    <div className="border-t border-neutral-800 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-400">Journey Progress</span>
                        <span className="text-xs text-neutral-500">
                          {userStats.consecutiveMonthsActive} month{userStats.consecutiveMonthsActive !== 1 ? 's' : ''} active
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 rounded-full ${
                              i < userStats.consecutiveMonthsActive!
                                ? i < 3
                                  ? 'bg-emerald-500'
                                  : i < 6
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                                : 'bg-neutral-800'
                            }`}
                            title={
                              i === 2 ? 'Quarterly Quest (3 months)' :
                              i === 5 ? 'Semester Scholar (6 months)' :
                              i === 11 ? 'Year One (12 months)' :
                              `Month ${i + 1}`
                            }
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-neutral-600">3mo</span>
                        <span className="text-[10px] text-neutral-600">6mo</span>
                        <span className="text-[10px] text-neutral-600">12mo</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 mt-6">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              )}
            </>
          )}
        </section>

        {/* Subscription Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Subscription</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Current Plan</label>
                <p className="text-white font-semibold">
                  OSQR {userData?.tier === 'master' ? 'Master' : userData?.tier === 'pro' ? 'Pro' : 'Free'}
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {userData?.tier === 'free' ? 'Upgrade' : 'Manage Plan'}
              </Link>
            </div>
            <p className="text-sm text-neutral-500">
              {userData?.tier === 'master'
                ? 'You have access to all OSQR features including priority processing and unlimited queries.'
                : userData?.tier === 'pro'
                ? 'You have access to multi-model AI and advanced features.'
                : 'Upgrade to unlock the full power of OSQR.'}
            </p>
          </div>
        </section>

        {/* Refer Friends Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Gift className="h-5 w-5 text-pink-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Refer Friends, Get More</h2>
              <p className="text-sm text-neutral-400">You BOTH get +5% permanent usage boost — about 60 extra questions/month. Stack up to 50%!</p>
            </div>
          </div>

          {referralStats ? (
            <div className="space-y-6">
              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Your Referral Code</label>
                {referralStats.referralCode ? (
                  <div className="space-y-4">
                    {/* Code for manual entry */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Copy className="h-3.5 w-3.5 text-neutral-500" />
                        <span className="text-xs text-neutral-500">For manual entry during signup</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 font-mono text-lg text-white tracking-wider">
                          {referralStats.referralCode}
                        </div>
                        <button
                          onClick={handleCopyReferralCode}
                          className="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          {codeCopied ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Code
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Share Link for easy sharing */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="h-3.5 w-3.5 text-neutral-500" />
                        <span className="text-xs text-neutral-500">Share this link — code auto-fills on signup</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-400 truncate">
                          app.osqr.app/signup?ref={referralStats.referralCode}
                        </div>
                        <button
                          onClick={handleCopyShareLink}
                          className="px-4 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Link2 className="h-4 w-4" />
                              Copy Link
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateReferralCode}
                    disabled={generatingCode}
                    className="px-4 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-wait"
                  >
                    {generatingCode ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" />
                        Generate Referral Code
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{referralStats.totalReferrals}</p>
                  <p className="text-xs text-neutral-400">Total Referred</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">{referralStats.convertedReferrals}</p>
                  <p className="text-xs text-neutral-400">Converted</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{referralStats.pendingReferrals}</p>
                  <p className="text-xs text-neutral-400">Pending</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-pink-400">+{referralStats.currentBonusPercent}%</p>
                  <p className="text-xs text-neutral-400">Usage Boost</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">Progress to max usage boost</span>
                  <span className="text-white font-medium">+{referralStats.currentBonusPercent}% / +{referralStats.maxBonusPercent}%</span>
                </div>
                <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${(referralStats.currentBonusPercent / referralStats.maxBonusPercent) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {referralStats.currentBonusPercent < referralStats.maxBonusPercent
                    ? `${Math.ceil((referralStats.maxBonusPercent - referralStats.currentBonusPercent) / 5)} more successful referrals to reach max`
                    : 'Maximum usage boost achieved!'}
                </p>
              </div>

              {/* Effective Usage Limit */}
              {referralStats.currentBonusPercent > 0 && (
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-pink-400" />
                    <span className="text-sm font-medium text-pink-300">Your Usage Boost</span>
                  </div>
                  <p className="text-sm text-neutral-300">
                    Base: <span className="text-white font-medium">{formatTokens(referralStats.baseTokenLimit)}</span> →
                    With boost: <span className="text-pink-300 font-medium">{formatTokens(referralStats.effectiveTokenLimit)}</span>
                    <span className="text-pink-400 ml-2">(+{referralStats.currentBonusPercent}%)</span>
                  </p>
                </div>
              )}

              {/* Referral History */}
              {referralStats.referrals.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Referral History</label>
                  <div className="space-y-2">
                    {referralStats.referrals.slice(0, 5).map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between bg-neutral-800 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            referral.status === 'CONVERTED' ? 'bg-green-500' :
                            referral.status === 'PENDING' ? 'bg-amber-500' :
                            'bg-neutral-500'
                          }`} />
                          <span className="text-sm text-neutral-400">
                            {new Date(referral.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          referral.status === 'CONVERTED' ? 'bg-green-500/20 text-green-300' :
                          referral.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-neutral-700 text-neutral-400'
                        }`}>
                          {referral.status === 'CONVERTED' ? 'Converted' :
                           referral.status === 'PENDING' ? 'Pending' :
                           'Expired'}
                        </span>
                      </div>
                    ))}
                    {referralStats.referrals.length > 5 && (
                      <p className="text-xs text-neutral-500 text-center mt-2">
                        And {referralStats.referrals.length - 5} more...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* How It Works */}
              <div className="border-t border-neutral-800 pt-4">
                <p className="text-sm text-neutral-400 mb-2">How it works:</p>
                <ul className="text-sm text-neutral-500 space-y-1.5">
                  <li>1. Share your referral code with friends</li>
                  <li>2. They sign up and <span className="text-pink-400">instantly get +5%</span> <span className="text-neutral-600">(~60 extra questions/month)</span></li>
                  <li>3. When they become a paying customer, <span className="text-pink-400">you get +5% too</span></li>
                  <li>4. Stack up to 10 referrals for <span className="text-pink-400">+50% max</span> <span className="text-neutral-600">(~600 extra questions/month)</span></li>
                </ul>
              </div>
            </div>
          ) : referralLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : referralError ? (
            /* Error state */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
              <p className="text-neutral-400 mb-4 max-w-sm mx-auto">
                {referralError}
              </p>
              <button
                onClick={async () => {
                  setReferralLoading(true)
                  setReferralError(null)
                  try {
                    const res = await fetch('/api/referrals/stats')
                    if (res.ok) {
                      const data = await res.json()
                      setReferralStats(data)
                    } else {
                      const errorData = await res.json().catch(() => ({}))
                      const errorMsg = errorData.details
                        ? `${errorData.error}: ${errorData.details}`
                        : (errorData.error || 'Failed to load - please try again')
                      setReferralError(errorMsg)
                    }
                  } catch {
                    setReferralError('Network error - please check your connection')
                  } finally {
                    setReferralLoading(false)
                  }
                }}
                className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-all flex items-center gap-2 mx-auto cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          ) : (
            /* Empty state with marketing copy */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Share the Love, Get Rewarded</h3>
              <p className="text-neutral-400 mb-4 max-w-sm mx-auto">
                When you refer a friend, you <span className="text-pink-400 font-medium">both</span> get +5% extra usage forever.
                Stack up to 10 referrals for a massive 50% boost!
              </p>
              <button
                onClick={handleGenerateReferralCode}
                disabled={generatingCode}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center gap-2 mx-auto cursor-pointer disabled:cursor-wait"
              >
                {generatingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Get Your Referral Code
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Share a Testimonial Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <MessageSquareQuote className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Share a Testimonial</h2>
              <p className="text-sm text-neutral-400">Tell us how Oscar has helped you</p>
            </div>
          </div>

          {testimonialStatus === 'submitted' && existingTestimonial ? (
            <div className="space-y-4">
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-indigo-300 font-medium">Thank you for your testimonial!</p>
                    <p className="text-sm text-neutral-400 mt-1">
                      {existingTestimonial.status === 'PENDING'
                        ? "We're reviewing it and may feature it on our website."
                        : existingTestimonial.status === 'APPROVED'
                        ? 'Your testimonial has been approved and may appear on our website.'
                        : 'Your testimonial has been reviewed.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-800 rounded-lg p-4">
                <p className="text-neutral-300 italic">&quot;{existingTestimonial.content}&quot;</p>
                {(existingTestimonial.displayName || existingTestimonial.role) && (
                  <p className="text-sm text-neutral-500 mt-2">
                    — {existingTestimonial.displayName || 'Anonymous'}
                    {existingTestimonial.role && `, ${existingTestimonial.role}`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Your testimonial
                </label>
                <textarea
                  value={testimonialContent}
                  onChange={(e) => {
                    setTestimonialContent(e.target.value)
                    setTestimonialError(null)
                  }}
                  placeholder="How has Oscar helped you? What do you love about it?"
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-neutral-500 mt-1 text-right">
                  {testimonialContent.length}/1000
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Display name <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={testimonialDisplayName}
                    onChange={(e) => setTestimonialDisplayName(e.target.value)}
                    placeholder="How you'd like to be credited"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Role/Title <span className="text-neutral-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={testimonialRole}
                    onChange={(e) => setTestimonialRole(e.target.value)}
                    placeholder="e.g., Startup Founder"
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {testimonialError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {testimonialError}
                </div>
              )}

              <button
                onClick={handleSubmitTestimonial}
                disabled={testimonialStatus === 'loading' || !testimonialContent.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {testimonialStatus === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquareQuote className="h-4 w-4" />
                    Submit Testimonial
                  </>
                )}
              </button>

              <p className="text-xs text-neutral-500">
                By submitting, you agree that we may use your testimonial on our website and marketing materials.
              </p>
            </div>
          )}
        </section>

        {/* Preferences Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Settings2 className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Theme</p>
                <p className="text-sm text-neutral-400">Choose your preferred appearance</p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50 rounded-lg text-sm cursor-default">
                  Dark
                </div>
                <button
                  onClick={handleLightModeClick}
                  className="px-3 py-1.5 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  Light
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Use Knowledge Base</p>
                <p className="text-sm text-neutral-400">Include your documents when answering questions</p>
              </div>
              <button
                onClick={toggleUseKnowledgeBase}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                  useKnowledgeBase ? 'bg-blue-500' : 'bg-neutral-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  useKnowledgeBase ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Question Refinement Hints</p>
                <p className="text-sm text-neutral-400">Show suggestions to improve your questions</p>
              </div>
              <button
                onClick={toggleRefinementHints}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${
                  showRefinementHints ? 'bg-blue-500' : 'bg-neutral-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  showRefinementHints ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* AI Capabilities Section */}
        <AICapabilitiesSection />

        {/* Oscar Lab Section */}
        <LabFeedbackSection />

        {/* OSQR Bubble Settings Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Lightbulb className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Proactive Insights</h2>
              <p className="text-sm text-neutral-400">Control when and how OSQR shares thoughts with you</p>
            </div>
          </div>

          {insightPrefs ? (
            <div className="space-y-6">
              {/* Bubble Mode */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-3">Bubble Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateInsightPrefs({ bubbleMode: 'on' })}
                    disabled={savingInsights}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      insightPrefs.bubbleMode === 'on'
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                    On
                  </button>
                  <button
                    onClick={() => updateInsightPrefs({ bubbleMode: 'quiet' })}
                    disabled={savingInsights}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      insightPrefs.bubbleMode === 'quiet'
                        ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    <Volume2 className="h-4 w-4" />
                    Quiet
                  </button>
                  <button
                    onClick={() => updateInsightPrefs({ bubbleMode: 'off' })}
                    disabled={savingInsights}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      insightPrefs.bubbleMode === 'off'
                        ? 'bg-neutral-600/20 text-neutral-300 ring-1 ring-neutral-500/50'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    <BellOff className="h-4 w-4" />
                    Off
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  {insightPrefs.bubbleMode === 'on' && 'OSQR will proactively share insights when appropriate'}
                  {insightPrefs.bubbleMode === 'quiet' && 'Only high-priority insights will be shown'}
                  {insightPrefs.bubbleMode === 'off' && 'No proactive insights - OSQR only responds when asked'}
                </p>
              </div>

              {/* Interrupt Budget */}
              {insightPrefs.bubbleMode !== 'off' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-neutral-400">Max insights per hour</label>
                    <span className="text-white font-semibold">{insightPrefs.maxPerHour}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={insightPrefs.maxPerHour}
                    onChange={(e) => updateInsightPrefs({ maxPerHour: parseInt(e.target.value) })}
                    disabled={savingInsights}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between mt-1 text-xs text-neutral-500">
                    <span>Less frequent</span>
                    <span>More frequent</span>
                  </div>
                </div>
              )}

              {/* Category Toggles */}
              {insightPrefs.bubbleMode !== 'off' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-3">Insight Categories</label>
                  <div className="space-y-2">
                    {[
                      { id: 'contradiction', label: 'Pattern noticed', icon: '⚠️', desc: 'When OSQR notices inconsistencies' },
                      { id: 'clarify', label: 'Quick thoughts', icon: '💡', desc: 'Helpful suggestions when you seem stuck' },
                      { id: 'next_step', label: 'Next steps', icon: '→', desc: 'Natural momentum opportunities' },
                      { id: 'recall', label: 'Remember', icon: '💭', desc: 'Surfaces related past context', tooltip: 'OSQR may remind you of relevant past conversations or documents. For example: "Hey, you mentioned this project last week..."' },
                    ].map((cat) => {
                      const isMuted = insightPrefs.mutedCategories.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          disabled={savingInsights}
                          title={'tooltip' in cat ? cat.tooltip : undefined}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all cursor-pointer ${
                            isMuted
                              ? 'bg-neutral-800/50 opacity-50'
                              : 'bg-neutral-800 hover:bg-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{cat.icon}</span>
                            <div className="text-left">
                              <p className="text-white text-sm font-medium">{cat.label}</p>
                              <p className="text-neutral-500 text-xs">{cat.desc}</p>
                            </div>
                          </div>
                          <div className={`w-10 h-6 rounded-full transition-colors ${
                            isMuted ? 'bg-neutral-700' : 'bg-amber-500'
                          } relative`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              isMuted ? 'left-1' : 'left-5'
                            }`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {savingInsights && (
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          )}
        </section>

        {/* Privacy Tier Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Privacy Settings</h2>
              <p className="text-sm text-neutral-400">Control how OSQR learns from your usage</p>
            </div>
          </div>

          {privacySettings ? (
            <div className="space-y-6">
              {/* Tier Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-3">Learning Level</label>
                <div className="space-y-3">
                  {/* Tier A */}
                  <button
                    onClick={() => updatePrivacyTier('A')}
                    disabled={savingPrivacy}
                    className={`w-full text-left px-4 py-4 rounded-lg transition-all ${
                      privacySettings.privacyTier === 'A'
                        ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${privacySettings.privacyTier === 'A' ? 'text-emerald-300' : 'text-white'}`}>
                            Local Only
                          </p>
                          {privacySettings.privacyTier === 'A' && (
                            <span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">Current</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 mt-1">
                          OSQR does not learn from your behavior. Maximum privacy.
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        privacySettings.privacyTier === 'A'
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-neutral-600'
                      }`}>
                        {privacySettings.privacyTier === 'A' && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Tier B */}
                  <button
                    onClick={() => updatePrivacyTier('B')}
                    disabled={savingPrivacy}
                    className={`w-full text-left px-4 py-4 rounded-lg transition-all ${
                      privacySettings.privacyTier === 'B'
                        ? 'bg-blue-500/20 ring-1 ring-blue-500/50'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${privacySettings.privacyTier === 'B' ? 'text-blue-300' : 'text-white'}`}>
                            Personal Learning
                          </p>
                          <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">Recommended</span>
                          {privacySettings.privacyTier === 'B' && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">Current</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 mt-1">
                          OSQR learns your preferences to personalize your experience. Data stays private to you.
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        privacySettings.privacyTier === 'B'
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-neutral-600'
                      }`}>
                        {privacySettings.privacyTier === 'B' && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Tier C */}
                  <button
                    onClick={() => updatePrivacyTier('C')}
                    disabled={savingPrivacy}
                    className={`w-full text-left px-4 py-4 rounded-lg transition-all ${
                      privacySettings.privacyTier === 'C'
                        ? 'bg-purple-500/20 ring-1 ring-purple-500/50'
                        : 'bg-neutral-800 hover:bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${privacySettings.privacyTier === 'C' ? 'text-purple-300' : 'text-white'}`}>
                            Global Learning
                          </p>
                          {privacySettings.privacyTier === 'C' && (
                            <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded">Current</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-400 mt-1">
                          Help improve OSQR for everyone. Anonymized patterns contribute to global learning.
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        privacySettings.privacyTier === 'C'
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-neutral-600'
                      }`}>
                        {privacySettings.privacyTier === 'C' && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {savingPrivacy && (
                  <div className="flex items-center justify-center gap-2 text-sm text-neutral-400 mt-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                )}
              </div>

              {/* Delete Telemetry Data */}
              <div className="border-t border-neutral-800 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Delete Learning Data</p>
                    <p className="text-sm text-neutral-400">
                      Remove all telemetry and behavioral data OSQR has collected about you
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteDataModal(true)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete Data
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  This only deletes telemetry data, not your conversations or documents.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          )}
        </section>

        {/* Data & Privacy Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Download className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Data & Privacy</h2>
          </div>

          <div className="space-y-6">
            {/* Export Data */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Export Your Data</p>
                <p className="text-sm text-neutral-400">Download all your data in JSON format</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Data
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-neutral-800" />

            {/* Burn It Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Flame className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400">Burn It</h3>
                  <p className="text-sm text-neutral-400">Permanently delete all your data</p>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-200 mb-3">
                  <strong>Your data, your choice.</strong> We built OSQR on the belief that you should
                  have complete control over your information. The &quot;Burn It&quot; button is our promise
                  to you: with one action, you can permanently and irrevocably delete everything.
                </p>
                <p className="text-sm text-red-300/80">
                  This will delete:
                </p>
                <ul className="text-sm text-red-300/80 list-disc list-inside mt-2 space-y-1">
                  <li>All your conversations and chat history</li>
                  <li>Your Knowledge Vault documents and embeddings</li>
                  <li>Profile answers and preferences</li>
                  <li>Goals, projects, and MSC items</li>
                  <li>Your account and all associated data</li>
                </ul>
                <p className="text-sm text-red-400 font-semibold mt-3">
                  This action cannot be undone. There are no backups. When it&apos;s gone, it&apos;s gone forever.
                </p>
              </div>

              <button
                onClick={openBurnModal}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Flame className="h-5 w-5" />
                Burn It All
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Burn It Modal */}
      {showBurnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeBurnModal} />

          <div className="relative w-full max-w-md bg-neutral-900 border border-red-900/50 rounded-2xl p-6 shadow-xl">
            {burnStep === 'initial' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Flame className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Are you sure?</h3>
                </div>

                <p className="text-neutral-300 mb-6">
                  You&apos;re about to permanently delete all your data from OSQR. This includes
                  your conversations, documents, profile, and account. This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={closeBurnModal}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBurnStep('confirm')}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Yes, Continue
                  </button>
                </div>
              </>
            )}

            {burnStep === 'confirm' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Flame className="h-6 w-6 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Final Confirmation</h3>
                </div>

                <p className="text-neutral-300 mb-4">
                  This is your last chance to turn back. To confirm, type <strong className="text-red-400">BURN IT</strong> below:
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type BURN IT to confirm"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6"
                />

                <div className="flex gap-3">
                  <button
                    onClick={closeBurnModal}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBurnIt}
                    disabled={confirmText !== 'BURN IT'}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Burn Everything
                  </button>
                </div>
              </>
            )}

            {burnStep === 'burning' && (
              <div className="text-center py-8">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <Flame className="h-16 w-16 text-red-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Burning...</h3>
                <p className="text-neutral-400">Deleting all your data permanently.</p>
              </div>
            )}

            {burnStep === 'done' && (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Done</h3>
                <p className="text-neutral-400">Your data has been permanently deleted. Redirecting...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Telemetry Data Modal */}
      {showDeleteDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !deletingData && setShowDeleteDataModal(false)} />

          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-xl">
            {deleteDataSuccess ? (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Data Deleted</h3>
                <p className="text-neutral-400">Your telemetry data has been removed.</p>
              </div>
            ) : deletingData ? (
              <div className="text-center py-8">
                <Loader2 className="h-10 w-10 animate-spin text-neutral-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Deleting...</h3>
                <p className="text-neutral-400">Removing your telemetry data.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-500/20 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Delete Learning Data?</h3>
                </div>

                <p className="text-neutral-300 mb-4">
                  This will delete all telemetry and behavioral data that OSQR has collected about you, including:
                </p>
                <ul className="text-sm text-neutral-400 list-disc list-inside mb-6 space-y-1">
                  <li>Mode preference patterns</li>
                  <li>Usage timing data</li>
                  <li>Feature adoption records</li>
                  <li>Session patterns</li>
                </ul>
                <p className="text-sm text-neutral-500 mb-6">
                  Your conversations, documents, and profile will not be affected.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteDataModal(false)}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTelemetryData}
                    className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Delete Data
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Light Mode Coming Soon Toast */}
      {showLightModeToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="p-1.5 bg-yellow-500/20 rounded-full">
              <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Light mode coming soon!</p>
              <p className="text-neutral-400 text-xs">We&apos;ve noted your interest.</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  )
}
