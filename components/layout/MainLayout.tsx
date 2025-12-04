'use client'

import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface MainLayoutProps {
  children: React.ReactNode
  user?: {
    name?: string | null
    email?: string | null
  }
  workspaceName?: string
}

export function MainLayout({ children, user, workspaceName }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <TopBar user={user} workspaceName={workspaceName} />

      {/* Main content area */}
      <main className="ml-64 mt-16 min-h-[calc(100vh-4rem)] p-6">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
