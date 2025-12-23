'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'

// All highlightable elements in the app
export type HighlightId =
  | 'panel-main' // Main chat panel area
  | 'command-center-icon' // Command Center icon in right panel bar
  | 'right-panel-bar' // Right panel bar (Command Center sidebar)
  | 'sidebar' // Left sidebar
  | 'vault-link' // Memory Vault link in sidebar
  | 'focus-mode-toggle' // Focus mode toggle in top bar
  | 'chat-input' // Chat input area
  | 'response-modes' // Response mode buttons
  | 'sidebar-collapse' // Sidebar collapse button
  | null

interface TipsHighlightContextValue {
  highlightId: HighlightId
  setHighlightId: (id: HighlightId) => void
}

const TipsHighlightContext = createContext<TipsHighlightContextValue | null>(null)

export function useTipsHighlight() {
  const context = useContext(TipsHighlightContext)
  if (!context) {
    // Return a no-op version if used outside provider
    return {
      highlightId: null as HighlightId,
      setHighlightId: () => {},
    }
  }
  return context
}

interface TipsHighlightProviderProps {
  children: ReactNode
}

export function TipsHighlightProvider({ children }: TipsHighlightProviderProps) {
  const [highlightId, setHighlightIdState] = useState<HighlightId>(null)
  const currentHighlightRef = useRef<HighlightId>(null)
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const setHighlightId = useCallback((id: HighlightId) => {
    // Clear any pending timeout to clear highlight
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current)
      clearTimeoutRef.current = null
    }

    // If setting to null, delay slightly to prevent flicker
    if (id === null) {
      clearTimeoutRef.current = setTimeout(() => {
        if (currentHighlightRef.current !== null) {
          currentHighlightRef.current = null
          setHighlightIdState(null)
        }
      }, 50)
      return
    }

    // Prevent unnecessary re-renders if same value
    if (currentHighlightRef.current === id) return
    currentHighlightRef.current = id
    setHighlightIdState(id)
  }, [])

  // Apply highlight effect via data attribute - direct DOM manipulation for speed
  useEffect(() => {
    // Remove previous highlight
    document.querySelectorAll('[data-tips-highlighted="true"]').forEach(el => {
      el.removeAttribute('data-tips-highlighted')
    })

    if (highlightId) {
      // Find and highlight the target element
      const target = document.querySelector(`[data-highlight-id="${highlightId}"]`)
      if (target) {
        target.setAttribute('data-tips-highlighted', 'true')
      }
    }
  }, [highlightId])

  return (
    <TipsHighlightContext.Provider value={{ highlightId, setHighlightId }}>
      {children}
      {/* Global styles for highlight effect */}
      <style jsx global>{`
        /* Dim overlay - using body::before */
        body:has([data-tips-highlighted="true"])::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.85);
          z-index: 9990;
          pointer-events: none;
        }

        /* Highlighted element - above overlay with glow */
        [data-tips-highlighted="true"] {
          position: relative;
          z-index: 9995 !important;
          box-shadow:
            0 0 0 3px rgba(251, 191, 36, 0.9),
            0 0 20px 4px rgba(251, 191, 36, 0.5),
            0 0 40px 8px rgba(251, 191, 36, 0.25);
          border-radius: 12px;
        }

        /* Grid cells containing highlighted elements need elevated z-index */
        body:has([data-tips-highlighted="true"]) [data-grid-cell] {
          z-index: auto;
        }
        body:has([data-tips-highlighted="true"]) [data-grid-cell]:has([data-tips-highlighted="true"]) {
          z-index: 9995 !important;
        }

        /* Tips panel - always above overlay when highlight is active */
        body:has([data-tips-highlighted="true"]) [data-tips-panel="true"] {
          z-index: 10000 !important;
        }

        /* Right panel grid cell needs high z-index when highlight is active */
        body:has([data-tips-highlighted="true"]) [data-grid-cell="rightpanel"] {
          z-index: 10000 !important;
        }
      `}</style>
    </TipsHighlightContext.Provider>
  )
}
