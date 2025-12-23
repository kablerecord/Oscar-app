'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface FocusModeContextType {
  focusMode: boolean
  setFocusMode: (value: boolean) => void
  toggleFocusMode: () => void
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined)

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusModeState] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('osqr-focus-mode')
    if (stored !== null) {
      setFocusModeState(stored === 'true')
    }
  }, [])

  const setFocusMode = (value: boolean) => {
    setFocusModeState(value)
    localStorage.setItem('osqr-focus-mode', String(value))
  }

  const toggleFocusMode = () => {
    setFocusMode(!focusMode)
  }

  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  )
}

export function useFocusMode() {
  const context = useContext(FocusModeContext)
  if (context === undefined) {
    throw new Error('useFocusMode must be used within a FocusModeProvider')
  }
  return context
}
