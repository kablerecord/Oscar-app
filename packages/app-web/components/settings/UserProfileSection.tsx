'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  User,
  MessageSquare,
  Lightbulb,
  Target,
  Brain,
  Heart,
  Check,
  X,
  Plus,
  Pencil,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface ProfileItem {
  id: string
  label: string
  value: string | string[] | null
  type: 'text' | 'list' | 'choice' | 'scale'
  editable: boolean
  source: 'learned' | 'explicit' | 'inferred'
  confidence: number
  options?: string[]
  scaleLabels?: [string, string]
}

interface ProfileSection {
  id: string
  title: string
  description: string
  items: ProfileItem[]
  confidence: number
  editable: boolean
}

interface UserFacingProfile {
  hasProfile: boolean
  lastUpdated: string | null
  overallConfidence: number
  sections: ProfileSection[]
}

// ============================================
// Main Component
// ============================================

export function UserProfileSection() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserFacingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<{ sectionId: string; itemId: string } | null>(null)
  const [editValue, setEditValue] = useState<string | string[]>('')
  const [saving, setSaving] = useState(false)
  const [showFeedbackToast, setShowFeedbackToast] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackSentiment, setFeedbackSentiment] = useState<'positive' | 'negative' | 'neutral' | null>(null)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (sectionId: string, item: ProfileItem) => {
    setEditingItem({ sectionId, itemId: item.id })
    setEditValue(item.value || (item.type === 'list' ? [] : ''))
  }

  const cancelEditing = () => {
    setEditingItem(null)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editingItem) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: editingItem.sectionId,
          itemId: editingItem.itemId,
          value: editValue,
        }),
      })

      if (res.ok) {
        // Refresh profile
        await fetchProfile()
        setEditingItem(null)
        setEditValue('')
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleFeedback = () => {
    setShowFeedbackModal(true)
  }

  const submitFeedback = async () => {
    if (!feedbackMessage.trim() && !feedbackSentiment) return

    setSubmittingFeedback(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: feedbackMessage,
          sentiment: feedbackSentiment,
          source: 'BUTTON',
        }),
      })

      // Close modal and show success toast
      setShowFeedbackModal(false)
      setFeedbackMessage('')
      setFeedbackSentiment(null)
      setShowFeedbackToast(true)
      setTimeout(() => setShowFeedbackToast(false), 3000)
    } catch {
      // Silent fail
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const getSectionIcon = (sectionId: string) => {
    switch (sectionId) {
      case 'identity':
        return <User className="h-5 w-5 text-cyan-400" />
      case 'communication':
        return <MessageSquare className="h-5 w-5 text-blue-400" />
      case 'expertise':
        return <Lightbulb className="h-5 w-5 text-amber-400" />
      case 'goals':
        return <Target className="h-5 w-5 text-green-400" />
      case 'cognitive':
        return <Brain className="h-5 w-5 text-purple-400" />
      case 'relationship':
        return <Heart className="h-5 w-5 text-pink-400" />
      default:
        return <User className="h-5 w-5 text-neutral-400" />
    }
  }

  const getSourceBadge = (source: 'learned' | 'explicit' | 'inferred') => {
    switch (source) {
      case 'explicit':
        return (
          <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
            You told us
          </span>
        )
      case 'learned':
        return (
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
            Learned
          </span>
        )
      case 'inferred':
        return (
          <span className="text-xs bg-neutral-500/20 text-neutral-400 px-2 py-0.5 rounded">
            Inferred
          </span>
        )
    }
  }

  const getConfidenceBar = (confidence: number) => {
    const width = Math.round(confidence * 100)
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${width}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500 w-8">{width}%</span>
      </div>
    )
  }

  if (loading) {
    return (
      <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </section>
    )
  }

  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      {/* Header - Clickable to expand/collapse */}
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Expand/Collapse Chevron - now on the left */}
          <div className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-neutral-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <User className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">How OSQR Sees You</h2>
            <p className="text-sm text-neutral-400">
              {isExpanded
                ? 'OSQR learns from your conversations to give better responses'
                : 'Click to expand and edit your profile'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Let OSQR Help Button with Tooltip */}
          <div className="relative group/help" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => router.push('/panel')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 hover:from-cyan-500/30 hover:to-blue-500/30 rounded-lg transition-all cursor-pointer ring-1 ring-cyan-500/30 hover:ring-cyan-500/50"
            >
              <Sparkles className="h-4 w-4" />
              Let OSQR Help
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/help:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-slate-800 border border-cyan-500/30 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                <div className="flex items-center gap-2 mb-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Quick Profile Setup</span>
                </div>
                <span className="text-xs text-slate-400">Make it easy, let OSQR ask you</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-b border-r border-cyan-500/30 rotate-45" />
            </div>
          </div>

          {/* Feedback Button with Tooltip */}
          <div className="relative group/feedback" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleFeedback}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Feedback
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/feedback:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
              <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                <span className="text-xs text-slate-200">Tell us what you think</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* Preview when collapsed - show profile summary */}
      {!isExpanded && profile && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="flex flex-wrap gap-4 text-sm">
            {/* Confidence indicator */}
            {profile.overallConfidence > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Knowledge:</span>
                <span className="text-neutral-300">
                  {profile.overallConfidence > 0.7 ? 'Well understood' :
                   profile.overallConfidence > 0.4 ? 'Getting to know you' :
                   'Just getting started'}
                </span>
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${Math.round(profile.overallConfidence * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {/* Section count */}
            <div className="flex items-center gap-2 text-neutral-500">
              <span>{profile.sections.length} profile sections</span>
              <span className="text-cyan-400">• Click to expand</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <>
          {/* Disclaimer */}
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 mb-6 mt-6">
            <p className="text-sm text-neutral-300">
              We do our best to get things right, but we&apos;re not perfect. Feel free to make as many
              changes as you like. Your edits become the highest-priority information OSQR uses.
            </p>
            {profile?.lastUpdated && (
              <p className="text-xs text-neutral-500 mt-2">
                Last updated: {new Date(profile.lastUpdated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          {/* Overall Confidence */}
          {profile && profile.overallConfidence > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-400">How well OSQR knows you</span>
                <span className="text-sm text-neutral-300">
                  {profile.overallConfidence > 0.7 ? 'Well understood' :
                   profile.overallConfidence > 0.4 ? 'Getting to know you' :
                   'Just getting started'}
                </span>
              </div>
              {getConfidenceBar(profile.overallConfidence)}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-6">
            {profile?.sections.map((section) => (
              <div key={section.id} className="border-t border-neutral-800 pt-6 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 bg-neutral-800 rounded-lg">
                    {getSectionIcon(section.id)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{section.title}</h3>
                    <p className="text-xs text-neutral-500">{section.description}</p>
                  </div>
                  {!section.editable && (
                    <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                      Read only
                    </span>
                  )}
                </div>

                <div className="space-y-3 ml-10">
                  {section.items.map((item) => {
                    const isEditing = editingItem?.sectionId === section.id && editingItem?.itemId === item.id

                    return (
                      <div key={item.id} className="group">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <label className="text-sm text-neutral-400">{item.label}</label>
                              {item.value && item.confidence > 0 && getSourceBadge(item.source)}
                            </div>

                            {isEditing ? (
                              <div className="space-y-2">
                                {item.type === 'text' && (
                                  <input
                                    type="text"
                                    value={editValue as string}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder={`Enter your ${item.label.toLowerCase()}`}
                                    className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    autoFocus
                                  />
                                )}

                                {item.type === 'choice' && item.options && (
                                  <div className="flex flex-wrap gap-2">
                                    {item.options.map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => setEditValue(option)}
                                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                          editValue === option
                                            ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50'
                                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                      >
                                        {option.charAt(0).toUpperCase() + option.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {item.type === 'list' && (
                                  <ListEditor
                                    values={editValue as string[]}
                                    onChange={setEditValue}
                                    placeholder={`Add ${item.label.toLowerCase()}`}
                                  />
                                )}

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                                  >
                                    {saving ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )}
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {renderValue(item)}
                                {item.editable && (
                                  <button
                                    onClick={() => startEditing(section.id, item)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-all"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {profile && !profile.hasProfile && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-neutral-500" />
              </div>
              <p className="text-neutral-400 mb-2">OSQR is still getting to know you</p>
              <p className="text-sm text-neutral-500">
                As you use OSQR, it will learn your preferences and update this profile automatically.
                You can also add information directly.
              </p>
            </div>
          )}
        </>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFeedbackModal(false)}
          />
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <MessageCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Share Your Feedback</h3>
                <p className="text-sm text-neutral-400">Help us improve the profile experience</p>
              </div>
            </div>

            {/* Sentiment Selection */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">How do you feel about this feature?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFeedbackSentiment('positive')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                    feedbackSentiment === 'positive'
                      ? 'bg-green-500/20 text-green-300 ring-1 ring-green-500/50'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  😊 Love it
                </button>
                <button
                  onClick={() => setFeedbackSentiment('neutral')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                    feedbackSentiment === 'neutral'
                      ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  🤔 It&apos;s okay
                </button>
                <button
                  onClick={() => setFeedbackSentiment('negative')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                    feedbackSentiment === 'negative'
                      ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/50'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  }`}
                >
                  😕 Needs work
                </button>
              </div>
            </div>

            {/* Message Input */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">Tell us more (optional)</label>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="What's working? What could be better? Any suggestions?"
                rows={4}
                className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={submittingFeedback || (!feedbackMessage.trim() && !feedbackSentiment)}
                className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {showFeedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3">
            <div className="p-1.5 bg-green-500/20 rounded-full">
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Thanks for your feedback!</p>
              <p className="text-neutral-400 text-xs">Your input helps us improve OSQR.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================
// Sub-components
// ============================================

function renderValue(item: ProfileItem) {
  if (!item.value || (Array.isArray(item.value) && item.value.length === 0)) {
    return (
      <span className="text-neutral-500 text-sm italic">
        {item.editable ? 'Click to add' : 'Not yet determined'}
      </span>
    )
  }

  if (item.type === 'list' && Array.isArray(item.value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {item.value.map((v, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-sm"
          >
            {v}
          </span>
        ))}
      </div>
    )
  }

  if (item.type === 'choice') {
    return (
      <span className="text-white">
        {(item.value as string).charAt(0).toUpperCase() + (item.value as string).slice(1)}
      </span>
    )
  }

  return <span className="text-white">{item.value as string}</span>
}

interface ListEditorProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}

function ListEditor({ values, onChange, placeholder }: ListEditorProps) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...values, newItem.trim()])
      setNewItem('')
    }
  }

  const removeItem = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-sm group"
          >
            {v}
            <button
              onClick={() => removeItem(i)}
              className="text-neutral-500 hover:text-red-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder={placeholder}
          className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          onClick={addItem}
          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
