/**
 * User Profile API
 *
 * GET: Returns the user's UIP (User Intelligence Profile) in a readable format
 * POST: Accepts user edits to their profile (creates high-confidence signals)
 *
 * This gives users visibility into what OSQR has learned about them
 * and allows them to correct or add information.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { getFullProfile, upsertFact } from '@/lib/uip/service'
import { UIPDomain, UIPSource, Prisma } from '@prisma/client'
import {
  CommunicationPrefsValue,
  ExpertiseCalibrationValue,
  IdentityContextValue,
  GoalsValuesValue,
  CognitiveStyleValue,
  BehavioralPatternsValue,
  RelationshipStateValue,
  DecisionFrictionValue,
  DOMAIN_CONFIG,
} from '@/lib/uip/types'

// ============================================
// Types for User-Facing Profile
// ============================================

interface ProfileSection {
  id: string
  title: string
  description: string
  items: ProfileItem[]
  confidence: number // 0-1
  editable: boolean
}

interface ProfileItem {
  id: string
  label: string
  value: string | string[] | null
  type: 'text' | 'list' | 'choice' | 'scale'
  editable: boolean
  source: 'learned' | 'explicit' | 'inferred'
  confidence: number
  options?: string[] // For choice type
  scaleLabels?: [string, string] // For scale type [low, high]
}

interface UserFacingProfile {
  hasProfile: boolean
  lastUpdated: string | null
  overallConfidence: number
  sections: ProfileSection[]
}

// ============================================
// GET: Read Profile
// ============================================

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const profile = await getFullProfile(user.id)

  if (!profile) {
    return NextResponse.json({
      hasProfile: false,
      lastUpdated: null,
      overallConfidence: 0,
      sections: getEmptySections(),
    } as UserFacingProfile)
  }

  // Build dimension map for easy access
  const dimMap = new Map<UIPDomain, { value: unknown; confidence: number; sources: string[] }>()
  for (const dim of profile.dimensions) {
    dimMap.set(dim.domain, {
      value: dim.value,
      confidence: dim.confidence,
      sources: dim.sources,
    })
  }

  // Build fact map for explicit user statements
  const factMap = new Map<string, { value: string; confidence: number; isExplicit: boolean }>()
  for (const fact of profile.facts) {
    factMap.set(`${fact.factType}:${fact.key}`, {
      value: fact.value,
      confidence: fact.confidence,
      isExplicit: fact.isExplicit,
    })
  }

  // Transform to user-facing format
  const sections: ProfileSection[] = []

  // Section 1: Identity & Context
  const identity = dimMap.get('IDENTITY_CONTEXT')?.value as IdentityContextValue | undefined
  sections.push({
    id: 'identity',
    title: 'About You',
    description: 'Basic information that helps OSQR understand your context',
    confidence: dimMap.get('IDENTITY_CONTEXT')?.confidence ?? 0,
    editable: true,
    items: [
      {
        id: 'name',
        label: 'Name',
        value: identity?.preferredName || identity?.name || null,
        type: 'text',
        editable: true,
        source: getSource(dimMap.get('IDENTITY_CONTEXT')?.sources),
        confidence: dimMap.get('IDENTITY_CONTEXT')?.confidence ?? 0,
      },
      {
        id: 'role',
        label: 'Role',
        value: identity?.role || null,
        type: 'text',
        editable: true,
        source: getSource(dimMap.get('IDENTITY_CONTEXT')?.sources),
        confidence: dimMap.get('IDENTITY_CONTEXT')?.confidence ?? 0,
      },
      {
        id: 'industry',
        label: 'Industry',
        value: identity?.industry || null,
        type: 'text',
        editable: true,
        source: getSource(dimMap.get('IDENTITY_CONTEXT')?.sources),
        confidence: dimMap.get('IDENTITY_CONTEXT')?.confidence ?? 0,
      },
    ],
  })

  // Section 2: Communication Preferences
  const commPrefs = dimMap.get('COMMUNICATION_PREFS')?.value as CommunicationPrefsValue | undefined
  sections.push({
    id: 'communication',
    title: 'Communication Style',
    description: 'How you prefer OSQR to communicate with you',
    confidence: dimMap.get('COMMUNICATION_PREFS')?.confidence ?? 0,
    editable: true,
    items: [
      {
        id: 'verbosity',
        label: 'Response Length',
        value: commPrefs?.verbosity || null,
        type: 'choice',
        editable: true,
        source: getSource(dimMap.get('COMMUNICATION_PREFS')?.sources),
        confidence: dimMap.get('COMMUNICATION_PREFS')?.confidence ?? 0,
        options: ['concise', 'moderate', 'detailed'],
      },
      {
        id: 'tone',
        label: 'Tone Preference',
        value: commPrefs?.tonePreference || null,
        type: 'choice',
        editable: true,
        source: getSource(dimMap.get('COMMUNICATION_PREFS')?.sources),
        confidence: dimMap.get('COMMUNICATION_PREFS')?.confidence ?? 0,
        options: ['directive', 'exploratory', 'supportive'],
      },
      {
        id: 'format',
        label: 'Preferred Format',
        value: commPrefs?.preferredFormat || null,
        type: 'choice',
        editable: true,
        source: getSource(dimMap.get('COMMUNICATION_PREFS')?.sources),
        confidence: dimMap.get('COMMUNICATION_PREFS')?.confidence ?? 0,
        options: ['bullets', 'prose', 'mixed'],
      },
      {
        id: 'proactivity',
        label: 'Proactivity Level',
        value: commPrefs?.proactivityTolerance !== undefined
          ? formatScale(commPrefs.proactivityTolerance)
          : null,
        type: 'scale',
        editable: true,
        source: getSource(dimMap.get('COMMUNICATION_PREFS')?.sources),
        confidence: dimMap.get('COMMUNICATION_PREFS')?.confidence ?? 0,
        scaleLabels: ['Only when asked', 'Very proactive'],
      },
    ],
  })

  // Section 3: Expertise
  const expertise = dimMap.get('EXPERTISE_CALIBRATION')?.value as ExpertiseCalibrationValue | undefined
  sections.push({
    id: 'expertise',
    title: 'Expertise',
    description: 'What you know well and what you\'re learning',
    confidence: dimMap.get('EXPERTISE_CALIBRATION')?.confidence ?? 0,
    editable: true,
    items: [
      {
        id: 'expertDomains',
        label: 'Strong Areas',
        value: expertise?.expertDomains || [],
        type: 'list',
        editable: true,
        source: getSource(dimMap.get('EXPERTISE_CALIBRATION')?.sources),
        confidence: dimMap.get('EXPERTISE_CALIBRATION')?.confidence ?? 0,
      },
      {
        id: 'learningDomains',
        label: 'Currently Learning',
        value: expertise?.learningDomains || [],
        type: 'list',
        editable: true,
        source: getSource(dimMap.get('EXPERTISE_CALIBRATION')?.sources),
        confidence: dimMap.get('EXPERTISE_CALIBRATION')?.confidence ?? 0,
      },
    ],
  })

  // Section 4: Goals
  const goals = dimMap.get('GOALS_VALUES')?.value as GoalsValuesValue | undefined
  sections.push({
    id: 'goals',
    title: 'Current Goals',
    description: 'What you\'re working towards',
    confidence: dimMap.get('GOALS_VALUES')?.confidence ?? 0,
    editable: true,
    items: [
      {
        id: 'activeGoals',
        label: 'Active Goals',
        value: goals?.activeGoals?.map(g => g.goal) || [],
        type: 'list',
        editable: true,
        source: getSource(dimMap.get('GOALS_VALUES')?.sources),
        confidence: dimMap.get('GOALS_VALUES')?.confidence ?? 0,
      },
    ],
  })

  // Section 5: Cognitive Style (read-only, inferred)
  const cognitive = dimMap.get('COGNITIVE_STYLE')?.value as CognitiveStyleValue | undefined
  if (cognitive) {
    sections.push({
      id: 'cognitive',
      title: 'How You Think',
      description: 'Patterns OSQR has noticed in how you process information',
      confidence: dimMap.get('COGNITIVE_STYLE')?.confidence ?? 0,
      editable: false, // This is inferred, not directly editable
      items: [
        {
          id: 'abstractConcrete',
          label: 'Thinking Style',
          value: describeScale(cognitive.abstractVsConcrete, 'concrete', 'abstract'),
          type: 'text',
          editable: false,
          source: 'inferred',
          confidence: dimMap.get('COGNITIVE_STYLE')?.confidence ?? 0,
        },
        {
          id: 'linearAssociative',
          label: 'Processing Style',
          value: describeScale(cognitive.linearVsAssociative, 'associative', 'linear'),
          type: 'text',
          editable: false,
          source: 'inferred',
          confidence: dimMap.get('COGNITIVE_STYLE')?.confidence ?? 0,
        },
      ],
    })
  }

  // Section 6: Relationship with OSQR (read-only)
  const relationship = dimMap.get('RELATIONSHIP_STATE')?.value as RelationshipStateValue | undefined
  if (relationship) {
    sections.push({
      id: 'relationship',
      title: 'Your Relationship with OSQR',
      description: 'How well OSQR knows you (based on interactions)',
      confidence: dimMap.get('RELATIONSHIP_STATE')?.confidence ?? 0,
      editable: false,
      items: [
        {
          id: 'trustLevel',
          label: 'Trust Level',
          value: describeTrust(relationship.trustMaturity),
          type: 'text',
          editable: false,
          source: 'inferred',
          confidence: dimMap.get('RELATIONSHIP_STATE')?.confidence ?? 0,
        },
        {
          id: 'sessionCount',
          label: 'Sessions Together',
          value: relationship.sessionCount?.toString() || '0',
          type: 'text',
          editable: false,
          source: 'inferred',
          confidence: 1,
        },
      ],
    })
  }

  // Calculate overall confidence
  const allConfidences = profile.dimensions.map(d => d.confidence)
  const overallConfidence = allConfidences.length > 0
    ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
    : 0

  return NextResponse.json({
    hasProfile: true,
    lastUpdated: profile.updatedAt?.toISOString() || null,
    overallConfidence,
    sections,
  } as UserFacingProfile)
}

// ============================================
// POST: Update Profile
// ============================================

interface ProfileUpdate {
  sectionId: string
  itemId: string
  value: string | string[]
}

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body: ProfileUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sectionId, itemId, value } = body

  // Validate the update - check for potentially harmful content
  if (typeof value === 'string') {
    const sanitized = sanitizeInput(value)
    if (sanitized !== value) {
      return NextResponse.json({
        error: 'Input contains invalid characters',
        sanitized,
      }, { status: 400 })
    }
  }

  // Get or create profile
  let profile = await prisma.userIntelligenceProfile.findUnique({
    where: { userId: user.id },
  })

  if (!profile) {
    profile = await prisma.userIntelligenceProfile.create({
      data: {
        userId: user.id,
        privacyTier: 'B',
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
      },
    })
  }

  // Map section/item to domain and store as explicit fact
  const domain = mapToDomain(sectionId)
  const factType = `${sectionId}_${itemId}`
  const factValue = Array.isArray(value) ? value.join('|||') : value

  // Store as explicit fact with highest confidence
  await upsertFact(
    profile.id,
    domain,
    factType,
    itemId,
    factValue,
    'EXPLICIT_PKV' as UIPSource,
    true // isExplicit = true
  )

  // Also update the dimension if it exists
  await updateDimensionFromFact(profile.id, sectionId, itemId, value)

  return NextResponse.json({
    success: true,
    message: 'Profile updated',
    updated: { sectionId, itemId, value },
  })
}

// ============================================
// Helper Functions
// ============================================

function getSource(sources?: string[]): 'learned' | 'explicit' | 'inferred' {
  if (!sources || sources.length === 0) return 'inferred'
  if (sources.includes('EXPLICIT_PKV')) return 'explicit'
  if (sources.includes('ELICITATION')) return 'explicit'
  return 'learned'
}

function formatScale(value: number): string {
  // Convert 0-1 to percentage string
  return `${Math.round(value * 100)}%`
}

function describeScale(value: number, lowLabel: string, highLabel: string): string {
  if (value < -0.5) return `Strongly ${lowLabel}`
  if (value < -0.2) return `Somewhat ${lowLabel}`
  if (value > 0.5) return `Strongly ${highLabel}`
  if (value > 0.2) return `Somewhat ${highLabel}`
  return 'Balanced'
}

function describeTrust(value: number): string {
  if (value > 0.7) return 'Established'
  if (value > 0.3) return 'Developing'
  return 'New'
}

function mapToDomain(sectionId: string): UIPDomain {
  switch (sectionId) {
    case 'identity':
      return 'IDENTITY_CONTEXT'
    case 'communication':
      return 'COMMUNICATION_PREFS'
    case 'expertise':
      return 'EXPERTISE_CALIBRATION'
    case 'goals':
      return 'GOALS_VALUES'
    case 'cognitive':
      return 'COGNITIVE_STYLE'
    case 'relationship':
      return 'RELATIONSHIP_STATE'
    default:
      return 'IDENTITY_CONTEXT'
  }
}

function sanitizeInput(input: string): string {
  // Remove any potential injection attempts or harmful patterns
  // Keep it simple - just strip obvious bad stuff
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 500) // Limit length
}

async function updateDimensionFromFact(
  profileId: string,
  sectionId: string,
  itemId: string,
  value: string | string[]
): Promise<void> {
  const domain = mapToDomain(sectionId)

  // Get existing dimension
  const existing = await prisma.uIPDimensionScore.findUnique({
    where: { profileId_domain: { profileId, domain } },
  })

  if (!existing) {
    // Create new dimension with the value
    const newValue = buildDimensionValue(sectionId, itemId, value, {})
    await prisma.uIPDimensionScore.create({
      data: {
        profileId,
        tier: DOMAIN_CONFIG[domain].tier,
        domain,
        value: newValue as Prisma.InputJsonValue,
        confidence: 1.0, // Explicit = max confidence
        decayRate: DOMAIN_CONFIG[domain].decayRate,
        sources: ['EXPLICIT_PKV' as UIPSource],
        sourceCount: 1,
        lastUpdatedAt: new Date(),
        lastDecayedAt: new Date(),
      },
    })
  } else {
    // Update existing dimension
    const updatedValue = buildDimensionValue(sectionId, itemId, value, existing.value as Record<string, unknown>)
    const newSources = [...new Set([...existing.sources, 'EXPLICIT_PKV' as UIPSource])] as UIPSource[]
    await prisma.uIPDimensionScore.update({
      where: { id: existing.id },
      data: {
        value: updatedValue as Prisma.InputJsonValue,
        confidence: 1.0, // Explicit updates get max confidence
        sources: newSources,
        sourceCount: existing.sourceCount + 1,
        lastUpdatedAt: new Date(),
      },
    })
  }
}

function buildDimensionValue(
  sectionId: string,
  itemId: string,
  value: string | string[],
  existing: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...existing }

  switch (sectionId) {
    case 'identity':
      if (itemId === 'name') result.preferredName = value
      if (itemId === 'role') result.role = value
      if (itemId === 'industry') result.industry = value
      break
    case 'communication':
      if (itemId === 'verbosity') result.verbosity = value
      if (itemId === 'tone') result.tonePreference = value
      if (itemId === 'format') result.preferredFormat = value
      if (itemId === 'proactivity') result.proactivityTolerance = parseFloat(value as string) / 100
      break
    case 'expertise':
      if (itemId === 'expertDomains') result.expertDomains = value
      if (itemId === 'learningDomains') result.learningDomains = value
      break
    case 'goals':
      if (itemId === 'activeGoals' && Array.isArray(value)) {
        result.activeGoals = value.map((g, i) => ({
          id: `goal_${i}`,
          goal: g,
          timeframe: 'medium' as const,
          priority: 5,
        }))
      }
      break
  }

  return result
}

function getEmptySections(): ProfileSection[] {
  return [
    {
      id: 'identity',
      title: 'About You',
      description: 'Basic information that helps OSQR understand your context',
      confidence: 0,
      editable: true,
      items: [
        { id: 'name', label: 'Name', value: null, type: 'text', editable: true, source: 'learned', confidence: 0 },
        { id: 'role', label: 'Role', value: null, type: 'text', editable: true, source: 'learned', confidence: 0 },
        { id: 'industry', label: 'Industry', value: null, type: 'text', editable: true, source: 'learned', confidence: 0 },
      ],
    },
    {
      id: 'communication',
      title: 'Communication Style',
      description: 'How you prefer OSQR to communicate with you',
      confidence: 0,
      editable: true,
      items: [
        { id: 'verbosity', label: 'Response Length', value: null, type: 'choice', editable: true, source: 'learned', confidence: 0, options: ['concise', 'moderate', 'detailed'] },
        { id: 'tone', label: 'Tone Preference', value: null, type: 'choice', editable: true, source: 'learned', confidence: 0, options: ['directive', 'exploratory', 'supportive'] },
        { id: 'format', label: 'Preferred Format', value: null, type: 'choice', editable: true, source: 'learned', confidence: 0, options: ['bullets', 'prose', 'mixed'] },
      ],
    },
    {
      id: 'expertise',
      title: 'Expertise',
      description: 'What you know well and what you\'re learning',
      confidence: 0,
      editable: true,
      items: [
        { id: 'expertDomains', label: 'Strong Areas', value: [], type: 'list', editable: true, source: 'learned', confidence: 0 },
        { id: 'learningDomains', label: 'Currently Learning', value: [], type: 'list', editable: true, source: 'learned', confidence: 0 },
      ],
    },
    {
      id: 'goals',
      title: 'Current Goals',
      description: 'What you\'re working towards',
      confidence: 0,
      editable: true,
      items: [
        { id: 'activeGoals', label: 'Active Goals', value: [], type: 'list', editable: true, source: 'learned', confidence: 0 },
      ],
    },
  ]
}
