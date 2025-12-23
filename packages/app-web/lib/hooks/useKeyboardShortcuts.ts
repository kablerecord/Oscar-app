'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface Shortcut {
  id: string
  keys: string[] // e.g., ['meta', 'k'] or ['ctrl', 'k']
  description: string
  category: 'navigation' | 'chat' | 'panel' | 'general'
  action: () => void
  enabled?: boolean
}

// Platform detection
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

// Format key for display
export function formatKey(key: string): string {
  if (key === 'meta') return isMac ? '⌘' : 'Ctrl'
  if (key === 'ctrl') return 'Ctrl'
  if (key === 'alt') return isMac ? '⌥' : 'Alt'
  if (key === 'shift') return '⇧'
  if (key === 'enter') return '↵'
  if (key === 'escape') return 'Esc'
  if (key === 'arrowup') return '↑'
  if (key === 'arrowdown') return '↓'
  if (key === 'arrowleft') return '←'
  if (key === 'arrowright') return '→'
  return key.toUpperCase()
}

// Format full shortcut for display
export function formatShortcut(keys: string[]): string {
  return keys.map(formatKey).join(' + ')
}

interface UseKeyboardShortcutsProps {
  workspaceId?: string
  onNewChat?: () => void
  onFocusInput?: () => void
  onToggleSidebar?: () => void
  onToggleRightPanel?: () => void
  onOpenCommandCenter?: () => void
  onOpenVault?: () => void
  onOpenSettings?: () => void
  onOpenShortcutsHelp?: () => void
}

export function useKeyboardShortcuts({
  workspaceId,
  onNewChat,
  onFocusInput,
  onToggleSidebar,
  onToggleRightPanel,
  onOpenCommandCenter,
  onOpenVault,
  onOpenSettings,
  onOpenShortcutsHelp,
}: UseKeyboardShortcutsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Define all shortcuts
  const shortcuts: Shortcut[] = [
    // Navigation
    {
      id: 'new-chat',
      keys: ['meta', 'k'],
      description: 'Start a new chat',
      category: 'navigation',
      action: () => {
        if (onNewChat) {
          onNewChat()
        } else if (workspaceId) {
          router.push('/panel')
        }
      },
    },
    {
      id: 'go-panel',
      keys: ['meta', 'shift', 'p'],
      description: 'Go to The Panel',
      category: 'navigation',
      action: () => router.push('/panel'),
    },
    {
      id: 'go-vault',
      keys: ['meta', 'shift', 'v'],
      description: 'Go to Memory Vault',
      category: 'navigation',
      action: () => {
        if (onOpenVault) {
          onOpenVault()
        } else {
          router.push('/vault')
        }
      },
    },
    {
      id: 'go-settings',
      keys: ['meta', ','],
      description: 'Open Settings',
      category: 'navigation',
      action: () => {
        if (onOpenSettings) {
          onOpenSettings()
        } else {
          router.push('/settings')
        }
      },
    },
    // Chat
    {
      id: 'focus-input',
      keys: ['meta', 'i'],
      description: 'Focus chat input',
      category: 'chat',
      action: () => {
        if (onFocusInput) {
          onFocusInput()
        } else {
          // Try to focus any textarea on the page
          const textarea = document.querySelector('textarea')
          if (textarea) {
            textarea.focus()
          }
        }
      },
    },
    {
      id: 'submit-message',
      keys: ['meta', 'enter'],
      description: 'Send message',
      category: 'chat',
      action: () => {
        // This is handled locally in the chat component
      },
      enabled: false, // Informational only
    },
    // Panel controls
    {
      id: 'toggle-sidebar',
      keys: ['meta', 'b'],
      description: 'Toggle sidebar',
      category: 'panel',
      action: () => {
        if (onToggleSidebar) {
          onToggleSidebar()
        }
      },
    },
    {
      id: 'command-center',
      keys: ['meta', 'j'],
      description: 'Open Command Center',
      category: 'panel',
      action: () => {
        if (onOpenCommandCenter) {
          onOpenCommandCenter()
        }
      },
    },
    // General
    {
      id: 'shortcuts-help',
      keys: ['meta', '/'],
      description: 'Show keyboard shortcuts',
      category: 'general',
      action: () => {
        if (onOpenShortcutsHelp) {
          onOpenShortcutsHelp()
        } else {
          setShowShortcutsModal(true)
        }
      },
    },
    {
      id: 'escape',
      keys: ['escape'],
      description: 'Close modal / Cancel',
      category: 'general',
      action: () => {
        // Close any open modal
        setShowShortcutsModal(false)
      },
    },
  ]

  // Handle keydown events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except for specific ones)
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Always allow escape
      if (event.key === 'Escape') {
        setShowShortcutsModal(false)
        return
      }

      // For other shortcuts, skip if in input (unless it's a meta shortcut)
      if (isInput && !(event.metaKey || event.ctrlKey)) {
        return
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keys = shortcut.keys
        let matches = true

        // Check modifier keys
        const needsMeta = keys.includes('meta')
        const needsCtrl = keys.includes('ctrl')
        const needsShift = keys.includes('shift')
        const needsAlt = keys.includes('alt')

        // On Mac, meta key is Command; on Windows/Linux, we treat meta as Ctrl
        const metaOrCtrl = event.metaKey || event.ctrlKey

        if (needsMeta && !metaOrCtrl) matches = false
        if (needsCtrl && !event.ctrlKey) matches = false
        if (needsShift && !event.shiftKey) matches = false
        if (needsAlt && !event.altKey) matches = false

        // Check the main key
        const mainKey = keys.find(k => !['meta', 'ctrl', 'shift', 'alt'].includes(k))
        if (mainKey) {
          const pressedKey = event.key.toLowerCase()
          // Handle special keys
          if (mainKey === 'enter' && pressedKey !== 'enter') matches = false
          else if (mainKey === 'escape' && pressedKey !== 'escape') matches = false
          else if (mainKey !== 'enter' && mainKey !== 'escape' && pressedKey !== mainKey.toLowerCase()) matches = false
        }

        // Check that we don't have extra modifiers
        if (!needsMeta && !needsCtrl && metaOrCtrl && mainKey !== 'escape') matches = false
        if (!needsShift && event.shiftKey && mainKey !== 'escape') matches = false
        if (!needsAlt && event.altKey) matches = false

        if (matches) {
          event.preventDefault()
          event.stopPropagation()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts, router, pathname]
  )

  // Register global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    shortcuts: shortcuts.filter(s => s.enabled !== false),
    showShortcutsModal,
    setShowShortcutsModal,
  }
}
