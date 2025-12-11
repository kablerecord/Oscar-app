'use client'

import { Search, User, Menu, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { CapabilityLevelIndicator } from '@/components/capability/CapabilityBadge'

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  workspaceName?: string
  capabilityLevel?: number | null
  onMenuClick?: () => void
}

export function TopBar({ user, workspaceName = 'My Workspace', capabilityLevel, onMenuClick }: TopBarProps) {
  return (
    <header className="fixed left-0 lg:left-64 right-0 top-0 z-30 h-16 border-b border-slate-700/50 bg-slate-900">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Left: Hamburger menu (mobile) + Workspace selector */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Hamburger menu - only on mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile: Show OSQR logo */}
          <div className="lg:hidden flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-1 ring-blue-500/30">
              <Brain className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-lg font-bold tracking-tight gradient-text">OSQR</span>
          </div>

          {/* Desktop: Workspace info */}
          <div className="hidden sm:block text-sm">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-100">
                {workspaceName}
              </span>
              {capabilityLevel !== undefined && capabilityLevel !== null && (
                <CapabilityLevelIndicator level={capabilityLevel} size="sm" />
              )}
            </div>
            <div className="text-xs text-slate-400">Personal workspace</div>
          </div>
        </div>

        {/* Center: Search bar - hidden on mobile */}
        <div className="hidden md:block relative w-64 lg:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="pl-10"
          />
        </div>

        {/* Right: User menu */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="md:hidden rounded-full">
            <Search className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-slate-400">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
