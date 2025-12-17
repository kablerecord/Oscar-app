'use client'

import { Search, User, Menu, Brain, Sparkles } from 'lucide-react'
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
import { FocusModeToggle } from '@/components/focus/FocusModeToggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Badge configuration - expand this as you add more badges
export interface UserBadge {
  id: string
  name: string
  description: string
  icon: string // emoji or icon name
  color: string // tailwind gradient or color class
  earnedAt?: Date
}

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
  }
  workspaceName?: string
  capabilityLevel?: number | null
  onMenuClick?: () => void
  activeBadge?: UserBadge | null // The badge to display next to user icon
}

export function TopBar({ user, workspaceName = 'My Workspace', capabilityLevel, onMenuClick, activeBadge }: TopBarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

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

        {/* Right: Focus Mode + User menu */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="md:hidden rounded-full">
            <Search className="h-5 w-5" />
          </Button>

          {/* Focus Mode Toggle */}
          <FocusModeToggle />

          {/* User Badge + Icon */}
          <div className="flex items-center gap-1">
            {/* Badge Display */}
            {activeBadge && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center justify-center h-8 w-8 rounded-full ${activeBadge.color} cursor-pointer transition-transform hover:scale-110`}>
                      <span className="text-sm">{activeBadge.icon}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
                    <p className="font-medium text-white">{activeBadge.name}</p>
                    <p className="text-xs text-slate-400">{activeBadge.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full cursor-pointer">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-slate-400">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-200 focus:bg-slate-800 focus:text-white cursor-pointer"
                  onClick={() => router.push('/settings')}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-red-400 focus:bg-slate-800 focus:text-red-300 cursor-pointer"
                  onClick={handleSignOut}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
