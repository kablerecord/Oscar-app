'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

// All highlightable elements in the app
export type HighlightId =
  | 'panel-main' // Main chat panel area
  | 'command-center-icon' // Command Center icon in right panel bar
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

  const setHighlightId = useCallback((id: HighlightId) => {
    setHighlightIdState(id)
  }, [])

  // Apply highlight effect via data attribute
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
        // Scroll into view if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
    }
  }, [highlightId])

  return (
    <TipsHighlightContext.Provider value={{ highlightId, setHighlightId }}>
      {children}
      {/* Global styles for highlight effect */}
      <style jsx global>{`
        [data-tips-highlighted="true"] {
          position: relative;
          z-index: 9999 !important;
          animation: tips-highlight-pulse 1.5s ease-in-out infinite;
        }

        [data-tips-highlighted="true"]::before {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 16px;
          background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        [data-tips-highlighted="true"]::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 12px;
          border: 2px solid rgba(59, 130, 246, 0.8);
          box-shadow:
            0 0 20px 4px rgba(59, 130, 246, 0.5),
            0 0 40px 8px rgba(59, 130, 246, 0.3),
            inset 0 0 20px 4px rgba(59, 130, 246, 0.1);
          pointer-events: none;
          animation: tips-highlight-ring 1.5s ease-in-out infinite;
        }

        @keyframes tips-highlight-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes tips-highlight-ring {
          0%, 100% {
            opacity: 1;
            box-shadow:
              0 0 20px 4px rgba(59, 130, 246, 0.5),
              0 0 40px 8px rgba(59, 130, 246, 0.3),
              inset 0 0 20px 4px rgba(59, 130, 246, 0.1);
          }
          50% {
            opacity: 0.7;
            box-shadow:
              0 0 30px 8px rgba(59, 130, 246, 0.6),
              0 0 60px 16px rgba(59, 130, 246, 0.4),
              inset 0 0 30px 8px rgba(59, 130, 246, 0.15);
          }
        }

        /* Dim overlay when highlighting */
        body:has([data-tips-highlighted="true"])::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          pointer-events: none;
          animation: tips-dim-in 0.3s ease-out;
        }

        @keyframes tips-dim-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </TipsHighlightContext.Provider>
  )
}
