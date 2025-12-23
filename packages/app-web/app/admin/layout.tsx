'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_EMAILS = ['admin@osqr.ai', 'kablerecord@gmail.com']

const navItems = [
  { href: '/admin', label: 'Overview', icon: '📊' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/health', label: 'Platform Health', icon: '💚' },
  { href: '/admin/cognitive', label: 'Cognitive Profiles', icon: '🧠' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user?.email) {
      router.push('/login')
      return
    }

    if (!ADMIN_EMAILS.includes(session.user.email)) {
      router.push('/')
      return
    }

    setAuthorized(true)
  }, [session, status, router])

  if (status === 'loading' || !authorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              O
            </div>
            <div>
              <div className="text-white font-semibold">OSQR Admin</div>
              <div className="text-gray-400 text-xs">Platform Dashboard</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            Logged in as
            <div className="text-white truncate">{session?.user?.email}</div>
          </div>
          <Link
            href="/"
            className="mt-3 block text-center py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            Back to OSQR
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
