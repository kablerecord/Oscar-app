'use client'

import { useEffect } from 'react'

/**
 * Easter Egg: Console message for the curious developers
 * Only visible when someone opens browser DevTools
 */
export function EasterEggConsole() {
  useEffect(() => {
    // Delay slightly so it appears after page load logs
    const timer = setTimeout(() => {
      console.log(
        '%c👁️ You found the console.',
        'color: #a855f7; font-size: 16px; font-weight: bold;'
      )
      console.log(
        '%cMost people never look here. You did.',
        'color: #64748b; font-size: 12px;'
      )
      console.log(
        '%c/vision',
        'color: #f59e0b; font-size: 12px; font-style: italic;'
      )
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return null
}
