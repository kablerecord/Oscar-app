'use client'

import { useState } from 'react'
import { X, Keyboard, MessageSquare, Send, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Shortcut, formatShortcut } from '@/lib/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: Shortcut[]
  onSuggestShortcut?: () => void
}

const categoryLabels: Record<string, { label: string; icon: typeof Keyboard }> = {
  navigation: { label: 'Navigation', icon: Keyboard },
  chat: { label: 'Chat', icon: MessageSquare },
  panel: { label: 'Panels', icon: Keyboard },
  general: { label: 'General', icon: Keyboard },
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
  onSuggestShortcut,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, Shortcut[]>)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-950/50 to-purple-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/30">
              <Keyboard className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Quick access to common actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => {
            const categoryInfo = categoryLabels[category] || { label: category, icon: Keyboard }
            return (
              <div key={category}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {categoryInfo.label}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                      <span className="text-sm text-slate-300">{shortcut.description}</span>
                      <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 border border-slate-600 text-xs font-mono text-slate-300">
                        {formatShortcut(shortcut.keys)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer with suggest button */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[10px]">Esc</kbd> to close
            </p>
            {onSuggestShortcut && (
              <button
                onClick={onSuggestShortcut}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Suggest a Shortcut
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Suggest shortcut modal
interface SuggestShortcutModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
}

export function SuggestShortcutModal({
  isOpen,
  onClose,
  userEmail,
}: SuggestShortcutModalProps) {
  const [suggestion, setSuggestion] = useState('')
  const [email, setEmail] = useState(userEmail || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!suggestion.trim()) return

    setIsSubmitting(true)
    try {
      // Send suggestion via API
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shortcut_suggestion',
          message: suggestion,
          email: email || undefined,
        }),
      })
      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setSubmitted(false)
        setSuggestion('')
      }, 2000)
    } catch (error) {
      console.error('Failed to submit suggestion:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-amber-950/50 to-orange-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 ring-1 ring-amber-500/30">
              <Lightbulb className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Suggest a Shortcut</h2>
              <p className="text-xs text-slate-400">Help us improve OSQR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-green-500/20 mb-4">
                <Send className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Thanks for your suggestion!</h3>
              <p className="text-sm text-slate-400">We'll review it and consider adding it to OSQR.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What shortcut would you like to see?
                </label>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="e.g., 'A shortcut to quickly toggle dark/light mode' or 'Press Cmd+E to export chat'"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your email <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">
                  We'll notify you if we add your suggested shortcut
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!suggestion.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Submit Suggestion'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
