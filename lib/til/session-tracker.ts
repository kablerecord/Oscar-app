/**
 * Session Tracker - Temporal Intelligence Layer (J-1)
 *
 * Tracks user sessions, activities, and progress over time.
 * Foundation for proactive insights and pattern detection.
 */

import { prisma } from '../db/prisma'

// ============================================
// Types
// ============================================

export interface SessionEvent {
  type: 'conversation' | 'msc_update' | 'document_add' | 'task_complete' | 'login' | 'custom'
  category?: string
  content?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface SessionSummary {
  id: string
  workspaceId: string
  startedAt: Date
  endedAt?: Date
  duration_minutes: number
  events: SessionEvent[]
  metrics: SessionMetrics
}

export interface SessionMetrics {
  conversations: number
  msc_additions: number
  msc_completions: number
  documents_added: number
  tasks_completed: number
  topics_discussed: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export interface DailySnapshot {
  date: string // YYYY-MM-DD
  workspaceId: string
  sessions: number
  total_duration_minutes: number
  metrics: SessionMetrics
  themes: ThemeCount[]
  velocity: VelocityMetrics
}

export interface ThemeCount {
  theme: string
  count: number
  last_mentioned: Date
}

export interface VelocityMetrics {
  conversations_per_hour: number
  msc_items_per_day: number
  completion_rate: number // completed / total active
  avg_session_duration: number
}

// ============================================
// Session Storage (using UserSetting as store)
// ============================================

const SESSION_KEY_PREFIX = 'til_session_'
const DAILY_KEY_PREFIX = 'til_daily_'
const THEMES_KEY = 'til_themes'

/**
 * Start a new session
 */
export async function startSession(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) throw new Error('Workspace not found')

  const sessionId = `session_${Date.now()}`
  const session: SessionSummary = {
    id: sessionId,
    workspaceId,
    startedAt: new Date(),
    duration_minutes: 0,
    events: [],
    metrics: {
      conversations: 0,
      msc_additions: 0,
      msc_completions: 0,
      documents_added: 0,
      tasks_completed: 0,
      topics_discussed: [],
    },
  }

  await prisma.userSetting.create({
    data: {
      userId: workspace.ownerId,
      key: `${SESSION_KEY_PREFIX}${sessionId}`,
      value: session as object,
    },
  })

  // Store current session ID for quick lookup
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: `til_current_session_${workspaceId}`,
      },
    },
    create: {
      userId: workspace.ownerId,
      key: `til_current_session_${workspaceId}`,
      value: { sessionId } as object,
    },
    update: {
      value: { sessionId } as object,
    },
  })

  return sessionId
}

/**
 * Get current active session or start new one
 */
export async function getOrCreateSession(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) throw new Error('Workspace not found')

  const currentSession = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: `til_current_session_${workspaceId}`,
    },
  })

  if (currentSession) {
    const { sessionId } = currentSession.value as { sessionId: string }

    // Check if session is still active (within last 30 min)
    const session = await getSession(workspaceId, sessionId)
    if (session) {
      const lastActivity = session.events.length > 0
        ? new Date(session.events[session.events.length - 1].timestamp)
        : session.startedAt

      const minutesSinceActivity = (Date.now() - lastActivity.getTime()) / 60000

      if (minutesSinceActivity < 30) {
        return sessionId
      }

      // Session expired, close it and start new
      await endSession(workspaceId, sessionId)
    }
  }

  return startSession(workspaceId)
}

/**
 * Get a session by ID
 */
export async function getSession(workspaceId: string, sessionId: string): Promise<SessionSummary | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return null

  const stored = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: `${SESSION_KEY_PREFIX}${sessionId}`,
    },
  })

  if (!stored) return null
  return stored.value as unknown as SessionSummary
}

/**
 * Record an event in the current session
 */
export async function recordEvent(
  workspaceId: string,
  event: Omit<SessionEvent, 'timestamp'>
): Promise<void> {
  const sessionId = await getOrCreateSession(workspaceId)
  const session = await getSession(workspaceId, sessionId)
  if (!session) return

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  // Add event
  session.events.push({
    ...event,
    timestamp: new Date(),
  })

  // Update metrics
  switch (event.type) {
    case 'conversation':
      session.metrics.conversations++
      if (event.content) {
        const topics = extractTopics(event.content)
        session.metrics.topics_discussed.push(...topics)
      }
      break
    case 'msc_update':
      if (event.metadata?.action === 'add') {
        session.metrics.msc_additions++
      } else if (event.metadata?.action === 'complete') {
        session.metrics.msc_completions++
      }
      break
    case 'document_add':
      session.metrics.documents_added++
      break
    case 'task_complete':
      session.metrics.tasks_completed++
      break
  }

  // Update duration
  session.duration_minutes = Math.round(
    (Date.now() - new Date(session.startedAt).getTime()) / 60000
  )

  // Save updated session
  await prisma.userSetting.updateMany({
    where: {
      userId: workspace.ownerId,
      key: `${SESSION_KEY_PREFIX}${sessionId}`,
    },
    data: {
      value: session as object,
    },
  })

  // Update theme tracking
  if (event.content) {
    await updateThemes(workspaceId, event.content)
  }
}

/**
 * End a session and roll up to daily snapshot
 */
export async function endSession(workspaceId: string, sessionId: string): Promise<void> {
  const session = await getSession(workspaceId, sessionId)
  if (!session) return

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  // Mark session as ended
  session.endedAt = new Date()
  session.duration_minutes = Math.round(
    (session.endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000
  )

  // Save final session state
  await prisma.userSetting.updateMany({
    where: {
      userId: workspace.ownerId,
      key: `${SESSION_KEY_PREFIX}${sessionId}`,
    },
    data: {
      value: session as object,
    },
  })

  // Roll up to daily snapshot
  await updateDailySnapshot(workspaceId, session)

  // Clear current session pointer
  await prisma.userSetting.deleteMany({
    where: {
      userId: workspace.ownerId,
      key: `til_current_session_${workspaceId}`,
    },
  })
}

// ============================================
// Daily Snapshots
// ============================================

/**
 * Update daily snapshot with session data
 */
async function updateDailySnapshot(workspaceId: string, session: SessionSummary): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  const dateKey = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const dailyKey = `${DAILY_KEY_PREFIX}${workspaceId}_${dateKey}`

  const existing = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: dailyKey,
    },
  })

  let snapshot: DailySnapshot

  if (existing) {
    snapshot = existing.value as unknown as DailySnapshot
    snapshot.sessions++
    snapshot.total_duration_minutes += session.duration_minutes

    // Merge metrics
    snapshot.metrics.conversations += session.metrics.conversations
    snapshot.metrics.msc_additions += session.metrics.msc_additions
    snapshot.metrics.msc_completions += session.metrics.msc_completions
    snapshot.metrics.documents_added += session.metrics.documents_added
    snapshot.metrics.tasks_completed += session.metrics.tasks_completed
    snapshot.metrics.topics_discussed.push(...session.metrics.topics_discussed)
  } else {
    snapshot = {
      date: dateKey,
      workspaceId,
      sessions: 1,
      total_duration_minutes: session.duration_minutes,
      metrics: { ...session.metrics },
      themes: [],
      velocity: {
        conversations_per_hour: 0,
        msc_items_per_day: 0,
        completion_rate: 0,
        avg_session_duration: 0,
      },
    }
  }

  // Calculate velocity
  const hours = snapshot.total_duration_minutes / 60
  snapshot.velocity.conversations_per_hour = hours > 0 ? snapshot.metrics.conversations / hours : 0
  snapshot.velocity.msc_items_per_day = snapshot.metrics.msc_additions
  snapshot.velocity.avg_session_duration = snapshot.total_duration_minutes / snapshot.sessions

  // Get completion rate from actual MSC data
  const [active, completed] = await Promise.all([
    prisma.mSCItem.count({ where: { workspaceId, status: { in: ['active', 'in_progress'] } } }),
    prisma.mSCItem.count({ where: { workspaceId, status: 'completed' } }),
  ])
  snapshot.velocity.completion_rate = active + completed > 0 ? completed / (active + completed) : 0

  // Save snapshot
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: dailyKey,
      },
    },
    create: {
      userId: workspace.ownerId,
      key: dailyKey,
      value: snapshot as object,
    },
    update: {
      value: snapshot as object,
    },
  })
}

/**
 * Get daily snapshot
 */
export async function getDailySnapshot(workspaceId: string, date?: string): Promise<DailySnapshot | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return null

  const dateKey = date || new Date().toISOString().split('T')[0]
  const dailyKey = `${DAILY_KEY_PREFIX}${workspaceId}_${dateKey}`

  const stored = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: dailyKey,
    },
  })

  if (!stored) return null
  return stored.value as unknown as DailySnapshot
}

/**
 * Get snapshots for a date range
 */
export async function getSnapshotRange(
  workspaceId: string,
  days: number = 7
): Promise<DailySnapshot[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return []

  const snapshots: DailySnapshot[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().split('T')[0]

    const snapshot = await getDailySnapshot(workspaceId, dateKey)
    if (snapshot) {
      snapshots.push(snapshot)
    }
  }

  return snapshots.reverse() // Oldest first
}

// ============================================
// Theme Tracking
// ============================================

/**
 * Extract topics/themes from text
 */
function extractTopics(text: string): string[] {
  const topics: string[] = []

  // Keywords that indicate topics
  const patterns: Record<string, RegExp> = {
    'product': /\b(product|feature|MVP|launch|ship|release)\b/gi,
    'marketing': /\b(marketing|brand|audience|campaign|content|social)\b/gi,
    'finance': /\b(revenue|profit|cost|budget|funding|investment)\b/gi,
    'team': /\b(team|hire|hiring|culture|management|leadership)\b/gi,
    'tech': /\b(code|bug|deploy|API|database|server|frontend|backend)\b/gi,
    'strategy': /\b(strategy|plan|goal|roadmap|vision|mission)\b/gi,
    'customer': /\b(customer|user|client|feedback|support)\b/gi,
    'growth': /\b(growth|scale|expand|acquire|retention)\b/gi,
    'operations': /\b(process|workflow|automation|efficiency)\b/gi,
    'personal': /\b(health|balance|stress|energy|focus)\b/gi,
  }

  for (const [topic, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      topics.push(topic)
    }
  }

  return [...new Set(topics)]
}

/**
 * Update theme tracking
 */
async function updateThemes(workspaceId: string, text: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return

  const topics = extractTopics(text)
  if (topics.length === 0) return

  const themesKey = `${THEMES_KEY}_${workspaceId}`
  const existing = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: themesKey,
    },
  })

  const themes: Map<string, ThemeCount> = new Map()

  if (existing) {
    const storedThemes = existing.value as unknown as ThemeCount[]
    storedThemes.forEach((t) => themes.set(t.theme, t))
  }

  // Update counts
  for (const topic of topics) {
    const existing = themes.get(topic)
    if (existing) {
      existing.count++
      existing.last_mentioned = new Date()
    } else {
      themes.set(topic, {
        theme: topic,
        count: 1,
        last_mentioned: new Date(),
      })
    }
  }

  // Save
  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: workspace.ownerId,
        key: themesKey,
      },
    },
    create: {
      userId: workspace.ownerId,
      key: themesKey,
      value: Array.from(themes.values()) as object,
    },
    update: {
      value: Array.from(themes.values()) as object,
    },
  })
}

/**
 * Get theme counts for a workspace
 */
export async function getThemes(workspaceId: string): Promise<ThemeCount[]> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) return []

  const themesKey = `${THEMES_KEY}_${workspaceId}`
  const stored = await prisma.userSetting.findFirst({
    where: {
      userId: workspace.ownerId,
      key: themesKey,
    },
  })

  if (!stored) return []
  return (stored.value as unknown as ThemeCount[]).sort((a, b) => b.count - a.count)
}
