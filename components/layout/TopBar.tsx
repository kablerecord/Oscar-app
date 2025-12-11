'use client'

import { Search, User } from 'lucide-react'
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
}

export function TopBar({ user, workspaceName = 'My Workspace', capabilityLevel }: TopBarProps) {
  return (
    <header className="fixed left-64 right-0 top-0 z-30 h-16 border-b border-slate-700/50 bg-slate-900">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Workspace selector (for future multi-workspace) */}
        <div className="flex items-center space-x-4">
          <div className="text-sm">
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

        {/* Center: Search bar */}
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search documents, chats, projects..."
            className="pl-10"
          />
        </div>

        {/* Right: User menu */}
        <div className="flex items-center space-x-4">
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
