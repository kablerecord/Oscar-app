'use client'

interface MobileHeaderProps {
  onMenuOpen: () => void
}

/**
 * Mobile Header Component
 *
 * Simple header with OSQR logo that opens the menu when tapped.
 */
export function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50">
      <div
        className="flex justify-center py-3"
        style={{
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        <button
          onClick={onMenuOpen}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-800/50 transition-colors"
          aria-label="Open menu"
        >
          {/* OSQR Logo */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm shadow-purple-500/20">
            <span className="text-white text-xs font-bold">O</span>
          </div>
          <span className="text-sm font-medium text-slate-300">OSQR</span>
        </button>
      </div>
    </header>
  )
}
