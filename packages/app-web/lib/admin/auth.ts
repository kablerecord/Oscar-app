/**
 * Admin Authentication & Authorization
 *
 * Handles admin role checking and route protection.
 */

import { getServerSession } from 'next-auth'
import { prisma } from '../db/prisma'

// Admin emails - in production, this would be in a database table
const ADMIN_EMAILS = [
  'admin@osqr.ai',
  'kablerecord@gmail.com', // Primary admin
]

/**
 * Check if the current session user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return false
  }

  // Check against admin list
  if (ADMIN_EMAILS.includes(session.user.email)) {
    return true
  }

  // Also check database for admin role (via settings)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { settings: { where: { key: 'role' } } },
  })

  const roleSetting = user?.settings?.find(s => s.key === 'role')
  return (roleSetting?.value as { role?: string })?.role === 'admin'
}

/**
 * Get current admin user or null
 */
export async function getAdminUser() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    return null
  }

  const isAdminUser = await isAdmin()
  if (!isAdminUser) {
    return null
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
  })
}

/**
 * Admin route guard - returns error response if not admin
 */
export async function requireAdmin(): Promise<{
  authorized: boolean
  error?: Response
}> {
  const authorized = await isAdmin()

  if (!authorized) {
    return {
      authorized: false,
      error: new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { authorized: true }
}
