/**
 * OSQR Pre-fetch API
 *
 * Called when user opens the chat interface to warm up their context.
 * Returns immediately with whatever is cached, while background fetch continues.
 *
 * GET /api/oscar/prefetch
 * - Returns cached context if available
 * - Triggers background prefetch if cache is stale
 *
 * POST /api/oscar/prefetch
 * - Forces a fresh prefetch
 * - Waits for Tier 1 to complete before responding
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import {
  initializePrefetch,
  getCachedContext,
  buildContextFromPrefetch,
  invalidateCache,
} from '@/lib/context/prefetch'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Check for cached context first (instant response)
    const cached = getCachedContext(workspace.id)

    if (cached) {
      // Return cached data immediately
      // Also trigger background refresh if stale (fire and forget)
      const age = Date.now() - cached._meta.fetchedAt.getTime()
      if (age > 30000) {
        // Older than 30s, refresh in background
        initializePrefetch(workspace.id).catch(console.error)
      }

      return NextResponse.json({
        status: 'cached',
        context: buildContextFromPrefetch(cached),
        meta: {
          fetchedAt: cached._meta.fetchedAt,
          tier1Complete: cached._meta.tier1Complete,
          tier2Complete: cached._meta.tier2Complete,
          tier3Complete: cached._meta.tier3Complete,
          tier4Complete: cached._meta.tier4Complete,
          totalItems: cached._meta.totalItems,
        },
        // Include raw data for frontend use
        vaultStats: cached.vaultStats,
        mscProjects: cached.mscProjects?.slice(0, 5),
        recentThreads: cached.recentThreads?.slice(0, 5),
      })
    }

    // No cache - start prefetch and wait for Tier 1 only
    const prefetchPromise = initializePrefetch(workspace.id)

    // Wait up to 200ms for Tier 1 to complete
    const result = await Promise.race([
      prefetchPromise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), 200)),
    ])

    if (result) {
      return NextResponse.json({
        status: 'fresh',
        context: buildContextFromPrefetch(result),
        meta: result._meta,
        vaultStats: result.vaultStats,
        mscProjects: result.mscProjects?.slice(0, 5),
        recentThreads: result.recentThreads?.slice(0, 5),
      })
    }

    // Tier 1 didn't complete in time, return minimal response
    // The prefetch will continue in background
    return NextResponse.json({
      status: 'initializing',
      context: null,
      meta: { fetchedAt: new Date(), tier1Complete: false },
    })

  } catch (error) {
    console.error('[Prefetch] Error:', error)
    return NextResponse.json(
      { error: 'Prefetch failed', status: 'error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workspace
    const workspace = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Invalidate cache and force fresh fetch
    invalidateCache(workspace.id)

    const result = await initializePrefetch(workspace.id)

    return NextResponse.json({
      status: 'refreshed',
      context: buildContextFromPrefetch(result),
      meta: result._meta,
      vaultStats: result.vaultStats,
      mscProjects: result.mscProjects?.slice(0, 5),
      recentThreads: result.recentThreads?.slice(0, 5),
    })

  } catch (error) {
    console.error('[Prefetch] Error:', error)
    return NextResponse.json(
      { error: 'Prefetch failed', status: 'error' },
      { status: 500 }
    )
  }
}
