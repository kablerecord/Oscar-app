'use client'

import { signOut } from 'next-auth/react'
import { X, ExternalLink, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

// Get version from package.json or use fallback
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'

/**
 * Mobile Menu Component
 *
 * Minimal slide-up sheet with:
 * - Open OSQR on Web
 * - Sign Out
 * - App version
 */
export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/mobile/signin' })
  }

  const handleOpenWeb = () => {
    window.open('https://app.osqr.app', '_blank')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-3xl border-t border-slate-800 animate-in slide-in-from-bottom duration-300"
        style={{
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-slate-100"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Menu items */}
        <div className="px-4 pb-4 space-y-2">
          {/* Open on Web */}
          <button
            onClick={handleOpenWeb}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-left"
          >
            <ExternalLink className="w-5 h-5 text-purple-400" />
            <span className="text-slate-100 font-medium">Open OSQR on Web</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-left"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            <span className="text-slate-100 font-medium">Sign Out</span>
          </button>
        </div>

        {/* Version */}
        <div className="px-4 pb-2 text-center">
          <span className="text-xs text-slate-600">
            OSQR Mobile v{APP_VERSION}
          </span>
        </div>
      </div>
    </>
  )
}
