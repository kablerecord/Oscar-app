'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Brain,
  MessageSquare,
  Database,
  FolderKanban,
  Settings,
} from 'lucide-react'

const navigation = [
  {
    name: 'Panel',
    href: '/panel',
    icon: Brain,
    description: 'Multi-model AI panel discussion',
  },
  {
    name: 'Threads',
    href: '/threads',
    icon: MessageSquare,
    description: 'Chat history and conversations',
  },
  {
    name: 'Memory Vault',
    href: '/vault',
    icon: Database,
    description: 'Browse your indexed documents',
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: FolderKanban,
    description: 'Organize your work',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Agents and preferences',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex h-full flex-col">
        {/* Logo / App Name */}
        <div className="flex h-16 items-center border-b border-neutral-200 px-6 dark:border-neutral-800">
          <Link href="/panel" className="flex items-center space-x-2">
            <div className="relative flex items-center">
              {/* Multiple overlapping brain icons to represent "multiple brains" */}
              <Brain className="h-6 w-6 text-neutral-900 dark:text-neutral-100" />
              <Brain className="absolute left-2 h-6 w-6 text-neutral-400 opacity-40 dark:text-neutral-500" />
              <Brain className="absolute left-4 h-6 w-6 text-neutral-300 opacity-20 dark:text-neutral-600" />
            </div>
            <span className="ml-4 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              PanelBrain
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100'
                )}
                title={item.description}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer - Activity indicator for active agents */}
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex -space-x-1">
              {/* Animated dots representing active agents */}
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 delay-100"></div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500 delay-200"></div>
            </div>
            <span>3 agents active</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
