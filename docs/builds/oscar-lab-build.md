# Oscar Lab - Build Document

> **Version:** 1.1
> **Status:** ✅ Implemented (December 2025)
> **Priority:** High - Pre-launch feature for early user feedback loop

---

## Executive Summary

Oscar Lab is a structured feedback system that transforms early users into product co-pilots. It provides guided challenges, quick reaction widgets, and deep dive forms to collect the exact signal needed to close the gap between "raw API" and "magical AI assistant."

**Goal:** Exceed Claude Code's perceived capability by leveraging OSQR's unique advantages (persistent profile, multi-model synthesis, personal knowledge vault) while iterating rapidly on real user feedback.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [API Routes](#3-api-routes)
4. [User-Facing Components](#4-user-facing-components)
5. [Admin Dashboard](#5-admin-dashboard)
6. [Starter Content](#6-starter-content)
7. [Implementation Phases](#7-implementation-phases)
8. [File Structure](#8-file-structure)
9. [Testing Requirements](#9-testing-requirements)

---

## 1. Architecture Overview

### Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIER 1: Quick Reactions (Always On)                        │
│  • Thumbs up/down on responses                              │
│  • "Missed something" flag                                  │
│  • Optional one-line comment                                │
│  Friction: ~2 seconds                                       │
│                                                              │
│  TIER 2: Guided Challenges (Weekly)                         │
│  • Structured tasks with prompts to try                     │
│  • A/B comparisons between modes                            │
│  • Feature discovery missions                               │
│  Friction: ~3-5 minutes per challenge                       │
│                                                              │
│  TIER 3: Deep Dives (On Request)                            │
│  • Detailed feedback forms for specific features            │
│  • UIP accuracy reviews                                     │
│  • Gap analysis surveys                                     │
│  Friction: ~10-15 minutes                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   AGGREGATION LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  • Pattern detection across feedback                        │
│  • Sentiment analysis by category                           │
│  • Automatic insight generation                             │
│  • Confidence scoring                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD                            │
├─────────────────────────────────────────────────────────────┤
│  • Real-time feedback visualization                         │
│  • Challenge management                                     │
│  • Insight review & action tracking                         │
│  • Member engagement metrics                                │
└─────────────────────────────────────────────────────────────┘
```

### Feedback Categories

These are the specific areas we're measuring to close the capability gap:

| Category | Code | What We're Measuring |
|----------|------|---------------------|
| Intent Understanding | `INTENT_UNDERSTANDING` | Did Oscar understand what the user meant? |
| Response Quality | `RESPONSE_QUALITY` | Was the depth/format appropriate? |
| Mode Calibration | `MODE_CALIBRATION` | Did Quick/Thoughtful/Contemplate feel right? |
| Knowledge Retrieval | `KNOWLEDGE_RETRIEVAL` | Did RAG find relevant context? |
| Personalization | `PERSONALIZATION` | Did UIP assumptions feel accurate? |
| Capability Gaps | `CAPABILITY_GAP` | What's missing vs expectations? |

### Member Tiers

| Tier | Criteria | Perks |
|------|----------|-------|
| **Explorer** | Just joined | Access to all challenges |
| **Contributor** | 5+ challenges completed | Early feature previews |
| **Insider** | Top 10% by feedback score | Direct line to founder, feature requests prioritized |

---

## 2. Database Schema

Add to `packages/app-web/prisma/schema.prisma`:

```prisma
// ============================================
// OSCAR LAB - STRUCTURED FEEDBACK SYSTEM
// ============================================

// Lab membership and engagement tracking
model LabMember {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Engagement level
  tier            LabTier  @default(EXPLORER)
  joinedAt        DateTime @default(now())

  // Progress tracking
  challengesCompleted  Int @default(0)
  feedbackScore        Int @default(0)
  streakDays           Int @default(0)
  lastActiveAt         DateTime?

  // Preferences
  weeklyDigest         Boolean @default(true)
  challengeReminders   Boolean @default(true)

  // Relations
  challengeResponses   ChallengeResponse[]
  deepDiveResponses    DeepDiveResponse[]
  quickReactions       QuickReaction[]

  @@index([tier])
  @@index([feedbackScore])
}

enum LabTier {
  EXPLORER
  CONTRIBUTOR
  INSIDER
}

// Quick inline reactions (Tier 1)
model QuickReaction {
  id              String   @id @default(cuid())

  labMemberId     String
  labMember       LabMember @relation(fields: [labMemberId], references: [id], onDelete: Cascade)

  // What they're reacting to
  messageId       String?
  message         ChatMessage? @relation(fields: [messageId], references: [id], onDelete: SetNull)
  threadId        String?

  // The reaction
  reaction        ReactionType
  category        FeedbackCategory?
  comment         String?  @db.Text

  // Context capture
  responseMode    String?
  modelUsed       String?
  hadPanelDiscussion Boolean @default(false)
  retrievalUsed   Boolean @default(false)

  createdAt       DateTime @default(now())

  @@index([labMemberId])
  @@index([reaction])
  @@index([category])
  @@index([createdAt])
}

enum ReactionType {
  THUMBS_UP
  THUMBS_DOWN
  MISSED_SOMETHING
  UNEXPECTED_GOOD
  WRONG_MODE
}

enum FeedbackCategory {
  INTENT_UNDERSTANDING
  RESPONSE_QUALITY
  MODE_CALIBRATION
  KNOWLEDGE_RETRIEVAL
  PERSONALIZATION
  CAPABILITY_GAP
}

// Guided challenges (Tier 2)
model Challenge {
  id              String   @id @default(cuid())

  // Challenge definition
  title           String
  description     String   @db.Text
  category        FeedbackCategory

  // The task
  promptToTry     String?  @db.Text
  compareMode     Boolean  @default(false)
  modesCompare    String[]

  // Questions to answer after
  questions       Json     // Array of ChallengeQuestion objects

  // Targeting
  targetTier      LabTier?
  targetModes     String[]
  prerequisiteId  String?

  // Lifecycle
  status          ChallengeStatus @default(DRAFT)
  publishedAt     DateTime?
  expiresAt       DateTime?

  // Metadata
  estimatedMinutes Int @default(5)
  pointsReward     Int @default(10)

  // Relations
  responses       ChallengeResponse[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([status])
  @@index([category])
  @@index([publishedAt])
}

enum ChallengeStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

// User's response to a challenge
model ChallengeResponse {
  id              String   @id @default(cuid())

  challengeId     String
  challenge       Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)

  labMemberId     String
  labMember       LabMember @relation(fields: [labMemberId], references: [id], onDelete: Cascade)

  // Their answers
  answers         Json

  // If it was a comparison challenge
  preferredMode   String?
  comparisonNotes String?  @db.Text

  // Context
  threadId        String?
  timeSpentSeconds Int?

  // Quality signals
  thoughtfulness  Int?
  flagged         Boolean  @default(false)

  createdAt       DateTime @default(now())

  @@unique([challengeId, labMemberId])
  @@index([challengeId])
  @@index([labMemberId])
  @@index([createdAt])
}

// Deep dive feedback forms (Tier 3)
model DeepDiveForm {
  id              String   @id @default(cuid())

  // Form definition
  title           String
  description     String   @db.Text
  category        FeedbackCategory

  // Form structure
  sections        Json     // Array of FormSection objects

  // Targeting
  targetTier      LabTier?
  triggerAfter    String?

  // Lifecycle
  status          ChallengeStatus @default(DRAFT)

  // Metadata
  estimatedMinutes Int @default(15)
  pointsReward     Int @default(50)

  // Relations
  responses       DeepDiveResponse[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// User's response to a deep dive form
model DeepDiveResponse {
  id              String   @id @default(cuid())

  formId          String
  form            DeepDiveForm @relation(fields: [formId], references: [id], onDelete: Cascade)

  labMemberId     String
  labMember       LabMember @relation(fields: [labMemberId], references: [id], onDelete: Cascade)

  // Their answers
  answers         Json

  // Quality
  thoughtfulness  Int?
  flagged         Boolean  @default(false)
  adminNotes      String?  @db.Text

  createdAt       DateTime @default(now())

  @@index([formId])
  @@index([labMemberId])
}

// Aggregated insights from feedback
model FeedbackInsight {
  id              String   @id @default(cuid())

  // What this insight is about
  category        FeedbackCategory
  subcategory     String?

  // The insight
  title           String
  summary         String   @db.Text

  // Evidence
  sampleSize      Int
  sentiment       Float
  confidence      Float

  // Source data
  sourceReactions Int      @default(0)
  sourceChallenges Int     @default(0)
  sourceDeepDives Int      @default(0)

  // Action tracking
  status          InsightStatus @default(NEW)
  actionTaken     String?  @db.Text
  resolvedAt      DateTime?

  // Time window
  periodStart     DateTime
  periodEnd       DateTime

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([category])
  @@index([status])
  @@index([createdAt])
}

enum InsightStatus {
  NEW
  REVIEWING
  ACTIONABLE
  IN_PROGRESS
  RESOLVED
  WONT_FIX
}
```

**Don't forget to add the relation to ChatMessage:**

```prisma
model ChatMessage {
  // ... existing fields ...

  // Add this relation
  quickReactions  QuickReaction[]
}
```

**And to User:**

```prisma
model User {
  // ... existing fields ...

  // Add this relation
  labMember       LabMember?
}
```

---

## 3. API Routes

### User-Facing Routes

#### `POST /api/lab/join`

Join Oscar Lab as a member.

```typescript
// Request: (no body needed, uses session)

// Response:
{
  success: true,
  member: {
    id: string,
    tier: "EXPLORER",
    feedbackScore: 0,
    challengesCompleted: 0
  }
}
```

#### `GET /api/lab/member`

Get current member profile and stats.

```typescript
// Response:
{
  member: {
    id: string,
    tier: "EXPLORER" | "CONTRIBUTOR" | "INSIDER",
    feedbackScore: number,
    challengesCompleted: number,
    streakDays: number,
    joinedAt: string,
    lastActiveAt: string | null
  },
  impact: {
    totalReactions: number,
    challengesCompleted: number,
    deepDivesSubmitted: number,
    insightsInfluenced: number // challenges/reactions that led to product changes
  },
  preferences: {
    weeklyDigest: boolean,
    challengeReminders: boolean
  }
}
```

#### `PATCH /api/lab/member/preferences`

Update notification preferences.

```typescript
// Request:
{
  weeklyDigest?: boolean,
  challengeReminders?: boolean
}

// Response:
{ success: true }
```

#### `POST /api/lab/reactions`

Submit a quick reaction.

```typescript
// Request:
{
  messageId?: string,
  threadId?: string,
  reaction: "THUMBS_UP" | "THUMBS_DOWN" | "MISSED_SOMETHING" | "UNEXPECTED_GOOD" | "WRONG_MODE",
  category?: FeedbackCategory,
  comment?: string,
  // Auto-captured context:
  responseMode?: string,
  modelUsed?: string,
  hadPanelDiscussion?: boolean,
  retrievalUsed?: boolean
}

// Response:
{
  success: true,
  pointsEarned: 1,
  newScore: number
}
```

#### `GET /api/lab/challenges`

List available challenges for the current user.

```typescript
// Response:
{
  active: Challenge[],
  completed: { challengeId: string, completedAt: string }[],
  upcoming: Challenge[] // previews of next week's challenges
}

// Challenge type:
{
  id: string,
  title: string,
  description: string,
  category: FeedbackCategory,
  estimatedMinutes: number,
  pointsReward: number,
  compareMode: boolean,
  prerequisiteCompleted: boolean
}
```

#### `GET /api/lab/challenges/[id]`

Get challenge details including questions.

```typescript
// Response:
{
  challenge: {
    id: string,
    title: string,
    description: string,
    category: FeedbackCategory,
    promptToTry: string | null,
    compareMode: boolean,
    modesCompare: string[],
    questions: ChallengeQuestion[],
    estimatedMinutes: number,
    pointsReward: number
  },
  userResponse: ChallengeResponse | null // if already completed
}

// ChallengeQuestion type:
{
  id: string,
  type: "rating" | "choice" | "text" | "comparison",
  question: string,
  options?: string[], // for choice type
  required: boolean
}
```

#### `POST /api/lab/challenges/[id]/submit`

Submit challenge response.

```typescript
// Request:
{
  answers: Record<string, any>, // questionId -> answer
  preferredMode?: string, // for comparison challenges
  comparisonNotes?: string,
  threadId?: string, // if they created a chat for this
  timeSpentSeconds?: number
}

// Response:
{
  success: true,
  pointsEarned: number,
  newScore: number,
  newTier?: LabTier, // if they leveled up
  nextChallenge?: Challenge // recommendation
}
```

#### `GET /api/lab/deep-dives`

List available deep dive forms.

```typescript
// Response:
{
  available: DeepDiveForm[],
  completed: { formId: string, completedAt: string }[]
}
```

#### `GET /api/lab/deep-dives/[id]`

Get deep dive form details.

```typescript
// Response:
{
  form: {
    id: string,
    title: string,
    description: string,
    category: FeedbackCategory,
    sections: FormSection[],
    estimatedMinutes: number,
    pointsReward: number
  },
  userResponse: DeepDiveResponse | null
}

// FormSection type:
{
  id: string,
  title: string,
  description?: string,
  questions: FormQuestion[]
}

// FormQuestion type:
{
  id: string,
  type: "rating" | "scale" | "text" | "choice" | "uip_accuracy",
  question: string,
  context?: string, // e.g., "Oscar thinks you prefer: [X]"
  options?: string[],
  required: boolean
}
```

#### `POST /api/lab/deep-dives/[id]/submit`

Submit deep dive response.

```typescript
// Request:
{
  answers: Record<string, any>
}

// Response:
{
  success: true,
  pointsEarned: number,
  newScore: number
}
```

#### `GET /api/lab/leaderboard`

Get top contributors.

```typescript
// Query: ?limit=10

// Response:
{
  leaders: {
    rank: number,
    name: string, // first name only for privacy
    tier: LabTier,
    score: number,
    streakDays: number
  }[],
  userRank: number | null
}
```

#### `GET /api/lab/impact`

Get user's impact on product development.

```typescript
// Response:
{
  totalContributions: number,
  insightsInfluenced: {
    id: string,
    title: string,
    status: InsightStatus,
    actionTaken?: string
  }[],
  featuresInfluenced: string[] // e.g., ["Mode selection improvements (v1.5.2)"]
}
```

---

### Admin Routes

#### `GET /api/admin/lab/overview`

Dashboard overview stats.

```typescript
// Query: ?days=30

// Response:
{
  members: {
    total: number,
    byTier: { EXPLORER: number, CONTRIBUTOR: number, INSIDER: number },
    newThisWeek: number,
    activeThisWeek: number
  },
  reactions: {
    total: number,
    thisWeek: number,
    byType: Record<ReactionType, number>,
    positiveRate: number // 0-1
  },
  challenges: {
    totalResponses: number,
    thisWeek: number,
    completionRate: number
  },
  deepDives: {
    totalResponses: number,
    thisWeek: number
  },
  insights: {
    total: number,
    actionable: number,
    resolved: number
  },
  categoryHealth: {
    category: FeedbackCategory,
    sentiment: number, // -1 to 1
    volume: number,
    trend: "improving" | "stable" | "declining"
  }[]
}
```

#### `GET /api/admin/lab/insights`

List all insights.

```typescript
// Query: ?status=NEW&category=MODE_CALIBRATION&limit=20&offset=0

// Response:
{
  insights: FeedbackInsight[],
  total: number
}
```

#### `GET /api/admin/lab/insights/[id]`

Get insight details with evidence.

```typescript
// Response:
{
  insight: FeedbackInsight,
  evidence: {
    reactions: {
      total: number,
      samples: QuickReaction[] // top 10 most relevant
    },
    challengeResponses: {
      total: number,
      samples: ChallengeResponse[]
    },
    deepDiveResponses: {
      total: number,
      samples: DeepDiveResponse[]
    }
  },
  suggestedActions: string[] // AI-generated suggestions
}
```

#### `PATCH /api/admin/lab/insights/[id]`

Update insight status and action taken.

```typescript
// Request:
{
  status?: InsightStatus,
  actionTaken?: string
}

// Response:
{ success: true }
```

#### `GET /api/admin/lab/challenges`

List all challenges with stats.

```typescript
// Response:
{
  challenges: {
    ...Challenge,
    responseCount: number,
    targetResponses: number,
    avgCompletionTime: number,
    summaryStats: Record<string, any> // aggregated answer stats
  }[]
}
```

#### `POST /api/admin/lab/challenges`

Create a new challenge.

```typescript
// Request:
{
  title: string,
  description: string,
  category: FeedbackCategory,
  promptToTry?: string,
  compareMode?: boolean,
  modesCompare?: string[],
  questions: ChallengeQuestion[],
  targetTier?: LabTier,
  estimatedMinutes?: number,
  pointsReward?: number,
  status?: ChallengeStatus
}

// Response:
{ success: true, challenge: Challenge }
```

#### `PATCH /api/admin/lab/challenges/[id]`

Update challenge.

```typescript
// Request: Partial<Challenge>
// Response: { success: true }
```

#### `GET /api/admin/lab/challenges/[id]/responses`

View all responses for a challenge.

```typescript
// Query: ?flagged=true&limit=50&offset=0

// Response:
{
  responses: (ChallengeResponse & { user: { email: string, name: string } })[],
  total: number,
  stats: {
    avgTimeSpent: number,
    answerDistribution: Record<string, Record<string, number>> // questionId -> answer -> count
  }
}
```

#### `GET /api/admin/lab/members`

List all lab members.

```typescript
// Query: ?tier=INSIDER&sort=feedbackScore&limit=50&offset=0

// Response:
{
  members: (LabMember & {
    user: { email: string, name: string },
    recentActivity: { type: string, date: string }[]
  })[],
  total: number
}
```

#### `GET /api/admin/lab/members/[id]`

Get member details.

```typescript
// Response:
{
  member: LabMember & { user: User },
  activity: {
    reactions: QuickReaction[],
    challenges: ChallengeResponse[],
    deepDives: DeepDiveResponse[]
  },
  timeline: { type: string, date: string, details: any }[]
}
```

#### `POST /api/admin/lab/aggregate`

Manually trigger insight aggregation.

```typescript
// Request:
{
  periodDays?: number, // default 7
  categories?: FeedbackCategory[]
}

// Response:
{
  success: true,
  insightsGenerated: number,
  insights: FeedbackInsight[]
}
```

---

## 4. User-Facing Components

### File Structure

```
packages/app-web/components/lab/
├── QuickReactionWidget.tsx      # Inline reaction buttons
├── QuickReactionExpanded.tsx    # Expanded feedback on thumbs down
├── LabHub.tsx                   # Main /lab page
├── LabStats.tsx                 # User's impact stats
├── ChallengeList.tsx            # Available challenges
├── ChallengeCard.tsx            # Single challenge preview
├── ChallengeFlow.tsx            # Multi-step challenge UI
├── ChallengeQuestion.tsx        # Individual question renderer
├── DeepDiveList.tsx             # Available deep dives
├── DeepDiveForm.tsx             # Deep dive form renderer
├── FormQuestion.tsx             # Individual form question
├── Leaderboard.tsx              # Top contributors
├── LabOnboarding.tsx            # First-time join flow
└── ImpactFeed.tsx               # "Your feedback shaped..." feed
```

### Component Specs

#### QuickReactionWidget

**Location:** Rendered below each Oscar response in chat

**Props:**
```typescript
interface QuickReactionWidgetProps {
  messageId: string;
  threadId: string;
  responseMode: string;
  modelUsed: string;
  hadPanelDiscussion: boolean;
  retrievalUsed: boolean;
}
```

**States:**
1. Default: Show reaction buttons
2. Expanded: Show category selector (on thumbs down)
3. Submitted: Show "Thanks!" confirmation

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  Was this helpful?                                          │
│  [👍]  [👎]  [🎯 Missed something]  [💬 Add note]          │
└─────────────────────────────────────────────────────────────┘
```

#### LabHub

**Route:** `/lab`

**Sections:**
1. Header with tier badge and score
2. Impact stats (contributions, insights influenced)
3. Active challenges
4. Completed challenges (collapsed)
5. Deep dives
6. Community insights ("What we're learning")

**Data fetching:**
- `GET /api/lab/member`
- `GET /api/lab/challenges`
- `GET /api/lab/deep-dives`
- `GET /api/lab/impact`

#### ChallengeFlow

**Route:** `/lab/challenges/[id]`

**Flow:**
1. Introduction screen (what to do, estimated time)
2. If `promptToTry`: Show prompt with "Open Chat" button
3. For each question: Render appropriate input
4. If `compareMode`: Show comparison UI
5. Submit screen with points earned

**Question types:**
- `rating`: 1-5 star/number rating
- `choice`: Radio button options
- `text`: Textarea for open response
- `comparison`: Side-by-side comparison UI

#### DeepDiveForm

**Route:** `/lab/deep-dives/[id]`

**Renders:**
- Form sections with titles/descriptions
- Various question types
- Progress indicator
- Auto-save draft

**Special question type: `uip_accuracy`**
- Shows what Oscar thinks about the user
- Asks for accuracy rating
- Optional correction text field

---

## 5. Admin Dashboard

### File Structure

```
packages/app-web/app/admin/lab/
├── page.tsx                     # Overview dashboard
├── challenges/
│   ├── page.tsx                 # Challenge list
│   ├── new/page.tsx             # Create challenge
│   └── [id]/
│       ├── page.tsx             # Challenge details
│       ├── edit/page.tsx        # Edit challenge
│       └── responses/page.tsx   # View responses
├── deep-dives/
│   ├── page.tsx                 # Form list
│   ├── new/page.tsx             # Create form
│   └── [id]/
│       ├── page.tsx             # Form details
│       └── responses/page.tsx   # View responses
├── insights/
│   ├── page.tsx                 # Insight list
│   └── [id]/page.tsx            # Insight details
├── members/
│   ├── page.tsx                 # Member list
│   └── [id]/page.tsx            # Member details
└── components/
    ├── LabOverviewCards.tsx
    ├── CategoryHealthChart.tsx
    ├── TopIssuesList.tsx
    ├── ChallengeEditor.tsx
    ├── InsightDrilldown.tsx
    └── MemberTable.tsx
```

### Key Views

#### Overview Dashboard (`/admin/lab`)

**Cards:**
- Total members (with tier breakdown)
- Reactions this week (with positive rate)
- Challenges completed
- Actionable insights

**Charts:**
- Category health bar chart (sentiment by category)
- Feedback volume over time

**Lists:**
- Top issues this week (clickable to insight)
- Recent high-value feedback

#### Insight Drilldown (`/admin/lab/insights/[id]`)

**Sections:**
1. Summary with confidence score
2. Evidence breakdown (reactions, challenges, deep dives)
3. Sample quotes
4. Suggested actions (checkboxes)
5. Action taken text area
6. Status update buttons

---

## 6. Starter Content

### Week 1 Challenges

#### Challenge 1: First Conversation
```json
{
  "title": "Your First Oscar Conversation",
  "description": "Have a conversation with Oscar and tell us how it felt.",
  "category": "INTENT_UNDERSTANDING",
  "promptToTry": "Ask Oscar to help you think through a decision you're facing - could be work-related, a purchase, or any choice on your mind.",
  "compareMode": false,
  "questions": [
    {
      "id": "understood",
      "type": "rating",
      "question": "How well did Oscar understand what you were asking?",
      "required": true
    },
    {
      "id": "rephrase",
      "type": "choice",
      "question": "Did you have to rephrase your question?",
      "options": ["No, Oscar got it first try", "Once", "Multiple times", "Oscar never quite got it"],
      "required": true
    },
    {
      "id": "helpful",
      "type": "rating",
      "question": "How helpful was the response?",
      "required": true
    },
    {
      "id": "openFeedback",
      "type": "text",
      "question": "Anything else you noticed?",
      "required": false
    }
  ],
  "estimatedMinutes": 5,
  "pointsReward": 15
}
```

#### Challenge 2: Quick vs Thoughtful
```json
{
  "title": "Compare: Quick vs Thoughtful Mode",
  "description": "Try the same question in both modes and tell us which felt better.",
  "category": "MODE_CALIBRATION",
  "promptToTry": "What are the key differences between REST and GraphQL APIs?",
  "compareMode": true,
  "modesCompare": ["quick", "thoughtful"],
  "questions": [
    {
      "id": "preferred",
      "type": "comparison",
      "question": "Which response was more helpful?",
      "options": ["Quick - fast and sufficient", "Thoughtful - worth the extra time", "About the same"],
      "required": true
    },
    {
      "id": "wouldUseAgain",
      "type": "choice",
      "question": "For this type of question, which mode would you use again?",
      "options": ["Quick", "Thoughtful", "Depends on my mood/time"],
      "required": true
    },
    {
      "id": "thoughtfulValue",
      "type": "rating",
      "question": "Did Thoughtful mode add meaningful value over Quick?",
      "required": true
    },
    {
      "id": "notes",
      "type": "text",
      "question": "What differences did you notice?",
      "required": false
    }
  ],
  "estimatedMinutes": 7,
  "pointsReward": 20
}
```

#### Challenge 3: Knowledge Vault Test
```json
{
  "title": "Test Your Knowledge Vault",
  "description": "Upload a document and see if Oscar can find relevant information from it.",
  "category": "KNOWLEDGE_RETRIEVAL",
  "promptToTry": null,
  "compareMode": false,
  "questions": [
    {
      "id": "uploadedDoc",
      "type": "choice",
      "question": "What type of document did you upload?",
      "options": ["Work document", "Personal notes", "Research/article", "Other"],
      "required": true
    },
    {
      "id": "foundIt",
      "type": "choice",
      "question": "When you asked about the document, did Oscar find the relevant information?",
      "options": ["Yes, exactly what I expected", "Partially - found some but missed things", "No - didn't find the relevant parts", "Oscar didn't seem to use the document at all"],
      "required": true
    },
    {
      "id": "accuracy",
      "type": "rating",
      "question": "How accurate was the information Oscar retrieved?",
      "required": true
    },
    {
      "id": "whatMissed",
      "type": "text",
      "question": "If Oscar missed something, what was it?",
      "required": false
    }
  ],
  "estimatedMinutes": 10,
  "pointsReward": 25
}
```

### Deep Dive Form: UIP Accuracy Review

```json
{
  "title": "UIP Accuracy Review",
  "description": "Help us understand how well Oscar knows you by reviewing its assumptions.",
  "category": "PERSONALIZATION",
  "sections": [
    {
      "id": "communication",
      "title": "Communication Style",
      "questions": [
        {
          "id": "style_accuracy",
          "type": "uip_accuracy",
          "question": "How accurate is this assessment?",
          "context": "Oscar thinks you prefer: [dynamically populated from UIP]",
          "required": true
        },
        {
          "id": "style_correction",
          "type": "text",
          "question": "What would be more accurate?",
          "required": false
        }
      ]
    },
    {
      "id": "expertise",
      "title": "Expertise Level",
      "questions": [
        {
          "id": "expertise_accuracy",
          "type": "uip_accuracy",
          "question": "How accurate is this assessment?",
          "context": "Oscar thinks your expertise in [primary domain] is: [level]",
          "required": true
        },
        {
          "id": "expertise_correction",
          "type": "text",
          "question": "What should Oscar know about your expertise?",
          "required": false
        }
      ]
    },
    {
      "id": "missing",
      "title": "What's Missing",
      "questions": [
        {
          "id": "missing_context",
          "type": "text",
          "question": "What does Oscar NOT know about you that would help it give better responses?",
          "required": true
        },
        {
          "id": "wrong_assumptions",
          "type": "text",
          "question": "Has Oscar made any wrong assumptions about you? What were they?",
          "required": false
        }
      ]
    }
  ],
  "estimatedMinutes": 10,
  "pointsReward": 50
}
```

---

## 7. Implementation Phases

### Phase 1: Foundation ✅
**Goal:** Core infrastructure and quick reactions

- [x] Add Prisma schema and run migrations
- [x] Create LabMember model and join flow
- [x] Build QuickReactionWidget component
- [x] Implement `POST /api/lab/reactions`
- [x] Add reaction widget to chat responses
- [x] Build basic `/lab` page with join CTA

**Deliverable:** Users can join Lab and submit quick reactions

### Phase 2: Challenges ✅
**Goal:** Guided challenge system

- [x] Create Challenge and ChallengeResponse models
- [x] Build ChallengeFlow component
- [x] Implement challenge API routes
- [x] Create 3 starter challenges
- [x] Add challenges to Lab Hub
- [x] Implement points and streak system

**Deliverable:** Users can complete guided challenges

### Phase 3: Deep Dives ✅
**Goal:** Detailed feedback forms

- [x] Create DeepDiveForm and DeepDiveResponse models
- [x] Build DeepDiveForm component with all question types
- [x] Implement UIP accuracy review (fetch UIP data for context)
- [x] Create 1 starter deep dive form (UIP Accuracy Review)
- [x] Add deep dives to Lab Hub

**Deliverable:** Users can complete deep dive forms

### Phase 4: Admin Dashboard ✅
**Goal:** Visibility into feedback

- [x] Build `/admin/lab` overview page
- [x] Build insight drilldown view
- [x] Build challenge management UI
- [x] Build member management UI
- [ ] Create insight aggregation job (Inngest - future)
- [ ] Add category health visualization (future)

**Deliverable:** Admins can view and act on feedback

### Phase 5: Polish & Gamification ✅
**Goal:** Engagement and retention

- [x] Implement tier progression (Explorer → Contributor → Insider)
- [x] Build leaderboard
- [x] Add impact feed component
- [x] Add Lab section to Settings page
- [x] Add proactive Lab prompt (after 5+ chats)
- [x] Add post-response nudge with global disable option
- [ ] Add weekly digest email (via Resend - future)
- [ ] Add challenge reminders (future)

**Deliverable:** Full gamification loop

---

## 8. File Structure Summary

```
packages/app-web/
├── prisma/
│   └── schema.prisma              # Add new models
│
├── app/
│   ├── lab/
│   │   ├── page.tsx               # Lab Hub
│   │   ├── challenges/
│   │   │   └── [id]/page.tsx      # Challenge flow
│   │   └── deep-dives/
│   │       └── [id]/page.tsx      # Deep dive form
│   │
│   ├── api/
│   │   └── lab/
│   │       ├── join/route.ts
│   │       ├── member/route.ts
│   │       ├── member/preferences/route.ts
│   │       ├── reactions/route.ts
│   │       ├── challenges/route.ts
│   │       ├── challenges/[id]/route.ts
│   │       ├── challenges/[id]/submit/route.ts
│   │       ├── deep-dives/route.ts
│   │       ├── deep-dives/[id]/route.ts
│   │       ├── deep-dives/[id]/submit/route.ts
│   │       ├── leaderboard/route.ts
│   │       └── impact/route.ts
│   │
│   └── admin/
│       └── lab/
│           ├── page.tsx           # Overview
│           ├── challenges/...
│           ├── deep-dives/...
│           ├── insights/...
│           └── members/...
│
├── components/
│   └── lab/
│       ├── QuickReactionWidget.tsx
│       ├── QuickReactionExpanded.tsx
│       ├── LabHub.tsx
│       ├── LabStats.tsx
│       ├── ChallengeList.tsx
│       ├── ChallengeCard.tsx
│       ├── ChallengeFlow.tsx
│       ├── ChallengeQuestion.tsx
│       ├── DeepDiveList.tsx
│       ├── DeepDiveForm.tsx
│       ├── FormQuestion.tsx
│       ├── Leaderboard.tsx
│       ├── LabOnboarding.tsx
│       └── ImpactFeed.tsx
│
└── lib/
    └── lab/
        ├── types.ts               # TypeScript types
        ├── scoring.ts             # Points calculation
        ├── tiers.ts               # Tier progression logic
        ├── aggregation.ts         # Insight aggregation
        └── challenges/
            └── starter.ts         # Seed data for challenges
```

---

## 9. Testing Requirements

### Unit Tests

```typescript
// lib/lab/scoring.test.ts
describe('Lab Scoring', () => {
  it('awards points for quick reactions', () => {})
  it('awards bonus points for detailed comments', () => {})
  it('calculates streak correctly', () => {})
  it('promotes to Contributor at 5 challenges', () => {})
  it('promotes to Insider at top 10% score', () => {})
})

// lib/lab/aggregation.test.ts
describe('Insight Aggregation', () => {
  it('groups reactions by category', () => {})
  it('calculates sentiment correctly', () => {})
  it('generates insights above confidence threshold', () => {})
  it('links evidence to insights', () => {})
})
```

### E2E Tests

```typescript
// e2e/lab.spec.ts
describe('Oscar Lab', () => {
  it('allows user to join Lab', () => {})
  it('shows quick reaction widget on responses', () => {})
  it('submits thumbs up reaction', () => {})
  it('expands category selector on thumbs down', () => {})
  it('displays available challenges', () => {})
  it('completes a challenge flow', () => {})
  it('awards points after challenge completion', () => {})
  it('shows updated score in Lab Hub', () => {})
})

// e2e/admin-lab.spec.ts
describe('Admin Lab Dashboard', () => {
  it('shows overview stats', () => {})
  it('displays category health chart', () => {})
  it('allows creating new challenge', () => {})
  it('shows insight details with evidence', () => {})
  it('updates insight status', () => {})
})
```

---

## Appendix: Type Definitions

```typescript
// lib/lab/types.ts

export type LabTier = 'EXPLORER' | 'CONTRIBUTOR' | 'INSIDER'

export type ReactionType =
  | 'THUMBS_UP'
  | 'THUMBS_DOWN'
  | 'MISSED_SOMETHING'
  | 'UNEXPECTED_GOOD'
  | 'WRONG_MODE'

export type FeedbackCategory =
  | 'INTENT_UNDERSTANDING'
  | 'RESPONSE_QUALITY'
  | 'MODE_CALIBRATION'
  | 'KNOWLEDGE_RETRIEVAL'
  | 'PERSONALIZATION'
  | 'CAPABILITY_GAP'

export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'

export type InsightStatus = 'NEW' | 'REVIEWING' | 'ACTIONABLE' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX'

export interface ChallengeQuestion {
  id: string
  type: 'rating' | 'choice' | 'text' | 'comparison'
  question: string
  options?: string[]
  required: boolean
}

export interface FormSection {
  id: string
  title: string
  description?: string
  questions: FormQuestion[]
}

export interface FormQuestion {
  id: string
  type: 'rating' | 'scale' | 'text' | 'choice' | 'uip_accuracy'
  question: string
  context?: string
  options?: string[]
  required: boolean
}

export interface LabMemberStats {
  tier: LabTier
  feedbackScore: number
  challengesCompleted: number
  streakDays: number
  rank?: number
}

export interface ImpactStats {
  totalContributions: number
  insightsInfluenced: number
  featuresInfluenced: string[]
}
```

---

## Notes for Implementation

1. **Privacy:** Quick reactions are stored with `labMemberId`, not raw `userId`, adding a layer of separation. Consider hashing for extra privacy if needed.

2. **Performance:** Use React Query or SWR for data fetching in the Lab Hub to enable optimistic updates when submitting reactions.

3. **Gamification balance:** Start conservative with points. It's easier to increase rewards than decrease them.

4. **Insight aggregation:** Consider running this as an Inngest job nightly rather than real-time to avoid complexity.

5. **Mobile:** The Lab Hub should be fully responsive. Consider a bottom sheet for the reaction widget on mobile.

6. **Localization:** Keep all strings in a constants file for future i18n support.

---

*Last updated: December 2025*
*Version: 1.0*
*Author: Claude (with Kable)*
