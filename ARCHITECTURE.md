# Oscar Architecture

**Last updated:** 2025-12-03
**Owner:** Kable Record

Oscar is a multi-model AI companion (Jarvis-style) that combines:
- **Multiple LLMs** (OpenAI, Anthropic, etc.)
- **Personal Knowledge Vault** (indexed user files, chats, notes)
- **Adaptive Profile** that learns about the user over time
- **Simple UX** (powerful under the hood, calm on the surface)

## KEY DIFFERENTIATOR: Automatic Indexing of Everything

**Oscar indexes EVERYTHING automatically.** This is what sets Oscar apart from every other AI assistant.

- Every conversation with Oscar is automatically indexed and searchable
- Every profile answer becomes part of Oscar's memory
- Every uploaded document is chunked and embedded
- Every artifact generated is stored and retrievable

This creates **compounding value** - the longer you use Oscar, the more it knows about you, the better it serves you, and the harder it becomes to leave. Oscar can say "You mentioned last week..." or "Based on your goals from our conversation on..." because it remembers EVERYTHING.

This document serves as the single source of truth for both humans and AI assistants (Claude, Copilot, etc.) working on Oscar.

---

## 1. High-Level Goals

### Multi-Model Intelligence
- Route each request to the best model (or panel of models)
- Support multiple response modes: **Quick**, **Thoughtful**, **Contemplate**
- Hide complexity from the user; expose power only when needed

### Personal Knowledge Vault
- Users can upload/connect files and past chats
- All content is indexed and searchable via vector embeddings
- Oscar references this vault in normal conversations

### User Profile & Master Summary
- Ask lightweight questions over time to build a deep user profile
- Maintain a Master Summary of goals, projects, and key facts
- Let the user adjust/override anything

### Privacy, Trust, & Control
- User owns their data
- Clear privacy levels (A/B/C) with optional anonymized learning
- "Burn it" button to wipe everything instantly

### Simple, Extensible UI
- Start with a web app
- Architect for future native clients (mobile/desktop) without rewrites
- Keep the interface minimal and obvious

---

## 2. System Architecture

Oscar has **ONE brain** (the backend) and **many clients** (web now, mobile later).

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │   Web   │  │   iOS   │  │ Android │  │ Desktop │                │
│  │ (React) │  │ (future)│  │ (future)│  │ (future)│                │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                │
│       └────────────┴────────────┴────────────┘                      │
│                         │                                            │
│                    API Calls                                         │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              API GATEWAY / BFF (Next.js API Routes)           │   │
│  │         Auth • Rate Limits • Input Validation • Routing       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                         │                                            │
│         ┌───────────────┼───────────────┐                           │
│         ▼               ▼               ▼                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │Conversation│  │ Knowledge  │  │   User     │                    │
│  │  Engine    │  │   Layer    │  │  Services  │                    │
│  │            │  │            │  │            │                    │
│  │ • Model    │  │ • Vault    │  │ • Auth     │                    │
│  │   Router   │  │ • Ingestion│  │ • Billing  │                    │
│  │ • Panel    │  │ • Vector   │  │ • Profile  │                    │
│  │ • Modes    │  │   Search   │  │ • Settings │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                         │                                            │
│                         ▼                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    EXTERNAL SERVICES                          │   │
│  │  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │ OpenAI │  │ Anthropic│  │ Supabase │  │  Stripe  │       │   │
│  │  │  API   │  │   API    │  │ Postgres │  │ Payments │       │   │
│  │  └────────┘  └──────────┘  └──────────┘  └──────────┘       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

### 3.1 Client Apps

**Current focus:** Web App (React/Next.js)

**Key screens:**
- **Auth flows** - Sign Up, Login, Reset Password
- **Main Chat** - Message input, thread view, mode switcher (Quick/Thoughtful/Contemplate)
- **Memory Vault** - Upload files, browse documents, see what Oscar "knows"
- **Settings** - Privacy level, model preferences, data wipe
- **Billing** - Plan selection, usage overview

**Design principle:** No business logic in the client. All intelligence lives in the backend.

### 3.2 API Gateway (Next.js API Routes)

**Responsibilities:**
- Authenticate requests (session/JWT via NextAuth)
- Enforce rate limiting per user & per plan
- Input validation (Zod schemas)
- Route calls to internal services
- CAPTCHA on high-risk endpoints (login, signup)

### 3.3 Conversation Engine

The "brain" of Oscar's runtime behavior.

**Intent & Context Builder:**
- Accepts user message + context
- Loads conversation history, relevant vault docs, profile summary
- Assembles system + user prompts

**Model Router:**
- **Quick** → Fast, cheap model (single agent)
- **Thoughtful** → Panel discussion + synthesis (~20-40s)
- **Contemplate** → Extended multi-round discussion (~60-90s)

**Response Orchestration:**
- Stream tokens back to client
- Record messages and metadata
- Log usage for billing

**Background Question Hooks:**
- Occasionally append contextual questions
- Responses feed into Profile service

### 3.4 Knowledge Layer (Personal Knowledge Vault)

**Core concepts:**
- **Sources** – where data comes from (upload, note, chat export)
- **Documents** – logical groupings (PDF, DOCX, markdown)
- **Chunks** – smaller pieces for vector search with embeddings

**Services:**
- **Ingestion** – Upload handling, text extraction, OCR, chunking, embedding generation
- **Retrieval** – Vector search scoped to user's tenant, ranked results
- **Profile Service** – Master Summary, user goals, preferences

### 3.5 User Services

- **Auth & Accounts** – Registration, login, sessions
- **Billing & Plans** – Usage tracking, plan tiers, Stripe integration
- **Settings** – Privacy level, model preferences

---

## 4. Data Model

```
User
├── id, email, name, password (hashed)
├── plan_id, privacy_level (A/B/C)
└── settings (JSON)

Workspace (multi-tenant ready)
├── id, name, ownerId
├── Agents[] (AI panel members)
├── Documents[] (indexed files)
├── ChatThreads[]
└── ProfileAnswers[]

Document
├── id, workspaceId, title, sourceType
├── textContent, metadata
└── Chunks[] (with embedding vectors)

ChatThread
├── id, workspaceId, title, mode
└── Messages[]

ChatMessage
├── id, threadId, role, content
├── provider, agentId, metadata
└── createdAt

ProfileAnswer
├── id, workspaceId, questionId
├── category, question, answer
└── timestamps

UsageRecord
├── userId, endpoint, date
├── requestCount, tokenCount
└── timestamps

RateLimitEvent
├── userId, ip, endpoint, timestamp
```

---

## 5. Request Flow: "Ask Oscar a Question"

```
1. User types prompt in web app, selects mode (or uses default)
                    │
                    ▼
2. Client → POST /api/oscar/ask
   Body: { message, workspaceId, mode, useKnowledge }
                    │
                    ▼
3. API Route Security Checks:
   ├── Authenticate user (NextAuth session)
   ├── Check rate limits (per-minute burst + daily quota)
   ├── Validate input (Zod schema)
   └── Record request for usage tracking
                    │
                    ▼
4. Conversation Engine:
   ├── Load active agents from database
   ├── Query Knowledge Vault (vector search)
   ├── Get user ProfileAnswers
   ├── Build context for each agent
   └── Route based on mode:
       ├── Quick → Single agent, direct response
       ├── Thoughtful → Panel + roundtable + synthesis
       └── Contemplate → Extended multi-round + deep synthesis
                    │
                    ▼
5. Oscar Synthesis:
   ├── Gather all agent responses
   ├── Build panel summary
   └── Generate unified answer via GPT-4
                    │
                    ▼
6. Response:
   ├── Save thread + messages to database
   ├── Return { answer, threadId, panelDiscussion? }
   └── Include rate limit headers (X-RateLimit-Remaining)
```

---

## 6. Privacy Levels

### Level A – Private Vault (default)
- All data encrypted at rest
- Only used to serve that user's Oscar
- No anonymized pattern learning

### Level B – Anonymized Learning Signals
- Same as Level A, plus:
- Opt-in to allow anonymized signal sharing
- Only patterns/metrics (no raw content) improve global behavior

### Level C – Inner Circle
- Same as Level B, plus:
- Access to extra perks (early features, special pricing)
- Participation in experimental features (still anonymized)

### "Burn It" Button
- Hard delete of: Conversations, Documents, Embeddings, Profile snapshots
- Immediate soft delete + background hard delete job
- Clear user-facing confirmation

---

## 7. Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| **No API keys in client** | All AI calls through backend |
| **Rate limiting** | Per IP + per user, burst + daily limits |
| **Brute force protection** | CAPTCHA, exponential backoff on login |
| **Encryption** | TLS in transit, encrypted at rest |
| **Multi-tenant isolation** | All queries scoped by workspaceId |
| **Input validation** | Zod schemas for all API inputs |
| **Auth required** | All `/api/oscar/*` routes require session |

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + pgvector (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js |
| AI Providers | OpenAI API, Anthropic API |
| Embeddings | OpenAI text-embedding-ada-002 (1536 dimensions) |
| UI | Tailwind CSS + Shadcn/UI |
| Payments | Stripe |

---

## 9. Scalability & Future-Proofing

### Service Boundaries
Current monolith can be split as load grows:
- Conversation Engine → separate service
- Knowledge Layer → separate service
- Billing/Auth → separate service

### Multi-Client Support
- Web app (v1) ✓
- Native apps later using same API Gateway
- No business logic in any client

### Multi-Provider AI
- Model router designed to add/remove providers easily
- Fallbacks if a provider is down or changes pricing

---

## 10. Pricing Tiers

### Oscar Lite - $19/mo ($168/yr)
*"A taste of the second brain — without the full power."*

- 2 AI models (Llama + GPT-3.5)
- 1 AI-to-AI Discussion per day (6 back-and-forths max)
- 50MB Knowledge Vault (first 2 files indexed)
- Remembers last 3 interactions
- 1 Daily Calibration question
- Basic Tasks checklist (no Master Summary)

### Oscar Pro - $49/mo ($399/yr) ⭐ CORE TIER
*"Your fully indexed second brain. The 90-Day Transformation Tier."*

- Everything in Lite
- Full Personal Knowledge Vault (unlimited indexing)
- Multi-model panel (Claude, GPT-4, etc.)
- Oscar's Daily Calibration Questions (full sequence)
- Master Summary Checklist
- Unlimited long-context threads
- Full chat memory
- 2-3 concurrent model calls
- **90-Day Transformation Guarantee (annual only)**

### Oscar Master - $149/mo ($1,299/yr)
*"Your personal team of AI agents."*

- Everything in Pro
- Personal AI Agents (automations)
- Meeting summarizer, Task generator, Content engine
- Unlimited document ingestion
- Priority processing (faster calls)
- Higher context limits
- Custom agent builder
- Team workflows (up to 3 teammates)
- Exclusive templates
- Early access to new features

---

## 11. 90-Day Transformation Guarantee

*"Pay for the year. Use Oscar for 90 days. If you follow Oscar's prompts 5 minutes a day and don't feel dramatically more capable—faster decisions, better organization, clearer thinking—I'll give you 100% of your money back. No questions asked."*

### Why This Works:
- Forces enough interactions for Oscar to build indexed profile
- Compounding value becomes obvious after 2-3 months
- Screens out tire-kickers (usage requirement)
- Signals confidence in the product
- Pushes users to annual plan (guarantee only applies there)

### Upgrade Credits:
- 100% of Lite payments apply to Pro/Master upgrade
- Credits carry forward (no penalty for upgrading)
- Makes staying on Lite feel riskier than upgrading

---

## 12. Referral System

### Core Structure: "Give X / Get X"
**Give:** Friend gets 14 days of Oscar Pro for free (no credit card)
**Get:** Referrer chooses reward based on tier

### Rewards by Tier:

**Lite Users:**
- +25MB vault storage (stackable to +500MB)
- OR +1 AI panel discussion/day (stackable to +5)
- OR $5 credit toward Pro upgrade

**Pro Users:**
- +7 days added to subscription
- OR +500MB vault storage
- OR 1 month Master Summary Insights

**Master Users:**
- +10 days added to subscription
- OR 1 Team Member seat for 30 days
- OR double AI processing speed for 30 days

### Milestone Bonus:
🎯 **Refer 5 friends → Unlock 30 days of Oscar Master for free**

### Badge System (Status Flywheel):
- 🟦 **Connector** (1 referral): Badge + 7 days Pro
- 🟩 **Architect** (3 referrals): Special avatar border + 14 days Pro/Master
- 🟧 **Builder** (5 referrals): 30 days Master + leaderboard feature
- 🟥 **Pioneer** (10+ referrals): Permanent badge + early access + quarterly Oscar Labs calls

### Referral Triggers (contextual popups):
1. After a breakthrough: "Want to give a friend 14 days of Oscar Pro?"
2. When hitting a limit: "Refer a friend → get +25MB free"
3. After upgrading: "Want 7 days free? Send your Pro trial link"
4. After creating big indexed vault: "Know someone who needs this?"
5. After super long-context question: "Your friend can do this too"

---

## 13. Viral Sharing Features

### Make Sharing Frictionless (Low Dev, High Viral Impact)
Every Oscar output should have:
- **"Share as image"** - Screenshot-ready outputs
- **"Copy to clipboard"** - One-click text copy
- **"Share debate"** - AI Panel Discussion export
- **"Share summary"** - Master Summary shareable card

### Magic Moments (engineer into first 10 minutes):
1. **Upload → Insight**: User uploads doc → Oscar gives immediate personalized insight
2. **Memory Callback Surprise**: "You mentioned last week your goal was X — this connects to that"
3. **AI Debate**: First two-AI discussion triggers "This is wild" reaction
4. **Cross-Reference**: Oscar connects dots across uploaded documents
5. **Master Summary**: First generated Master Summary moment

### "Show Your Setup" Culture:
- "Screenshot your vault"
- "Share your AI panel setup"
- "Show your Master Summary"
- "Here's my Daily Calibration streak"

### Weekly "Oscar Wins" Email:
- User's insights, streak, wins, time saved
- Master Summary highlights
- Users forward these → passive virality

### Public-Facing Outputs (Phase 3+):
- Knowledge graph visualization
- Life systems map
- Personal summary poster
- Monthly "Your Oscar Map"

---

## 14. Growth Roadmap

### Phase 1 — Launch Prep (Now → Month 1)
- Magic Moments in onboarding
- Sharing Buttons
- Referral System
- Upgrade-Credit + Guarantee Limit Messaging
- Weekly Oscar Wins Email
- Build in Public Content Engine

### Phase 2 — Early Traction (Months 2–4)
- "Show Your Setup" Culture
- Public Roadmap + Feature Voting

### Phase 3 — Growth Tuning (Months 4–8)
- Public-Facing Outputs (knowledge graph, etc.)
- Oscar Personality Layer (brand voice)

### Phase 4 — Expansion (Months 8–12+)
- Creator Template Library / Marketplace
- Monthly Oscar Intelligence Digest

---

## 15. Revenue Projections

### 12-Month Projections (End of 2026)
| Scenario | Users | MRR | ARR |
|----------|-------|-----|-----|
| Base Case | ~3,500 | $143K/mo | $1.7M/yr |
| Aggressive | ~7,000 | $328K/mo | $4.0M/yr |
| Viral | ~15,000 | $756K/mo | $9.0M/yr |

### 36-Month Projections (End of 2028)
| Scenario | Users | MRR | ARR |
|----------|-------|-----|-----|
| Base Case | ~18,500 | $839K/mo | $10.0M/yr |
| Aggressive | ~37,000 | $1.8M/mo | $22M/yr |
| Viral | ~90,000 | $4.7M/mo | $56M/yr |

### Key Assumptions:
- Start with 200-300 new users Month 1
- 15-25% monthly growth
- Referral R₀ = 0.3-0.55
- 60% Lite, 35% Pro, 5% Master initial mix
- 20-30% Lite→Pro upgrade monthly
- 5-8% Pro→Master upgrade monthly
- Churn: Lite 12%, Pro 3%, Master 1%

---

## 16. Open Questions / TODOs

- [ ] Master Summary editing UI
- [ ] Knowledge Vault management (bulk delete, re-index)
- [ ] Privacy explanation and opt-in flows
- [ ] Mobile app API considerations
- [ ] Team Accounts feature (2027-2028)
- [ ] Oscar Agent Marketplace (Year 1+)
- [ ] Enterprise Tier (SSO, SOC2, Year 3-4)

---

## Appendix A: Directory Structure

```
oscar-app/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (BACKEND LOGIC)
│   │   ├── oscar/            # Oscar chat endpoints
│   │   │   └── ask/route.ts  # Main chat endpoint
│   │   ├── auth/             # NextAuth endpoints
│   │   ├── profile/          # User profile endpoints
│   │   ├── vault/            # Memory vault endpoints
│   │   └── usage/            # Usage stats endpoint
│   ├── panel/                # Main chat page
│   ├── vault/                # Memory vault page
│   └── layout.tsx            # Root layout
│
├── lib/                      # Core business logic (BACKEND)
│   ├── ai/                   # AI orchestration
│   │   ├── oscar.ts          # Oscar main class
│   │   ├── panel.ts          # Multi-agent panel
│   │   ├── providers/        # OpenAI, Anthropic adapters
│   │   └── types.ts          # AI-related types
│   ├── knowledge/            # Knowledge base / RAG
│   │   ├── search.ts         # Vector search
│   │   ├── chunker.ts        # Text chunking
│   │   └── vector-search.ts  # pgvector queries
│   ├── db/                   # Database
│   │   └── prisma.ts         # Prisma client singleton
│   ├── auth/                 # Auth utilities
│   ├── profile/              # Profile context builder
│   └── security/             # Rate limiting, validation
│       ├── rate-limit.ts     # Rate limit logic
│       ├── api-middleware.ts # Security wrapper
│       └── index.ts          # Exports
│
├── components/               # React components (CLIENT)
│   ├── ui/                   # Shadcn/UI primitives
│   ├── oscar/                # Oscar chat components
│   ├── vault/                # Vault components
│   └── layout/               # Layout components
│
├── prisma/
│   └── schema.prisma         # Database schema
│
├── scripts/                  # CLI scripts (indexing, maintenance)
│
└── types/                    # Shared TypeScript types
```

---

## Appendix B: Rules for AI Assistants

**All AI assistants (Claude, Copilot, etc.) must follow these rules when making changes.**

### Rule 1: Backend is the Single Source of Truth

**All business logic MUST live in `/lib/` or `/app/api/`.**

✅ DO:
- Put AI calls in `/lib/ai/`
- Put database queries in `/lib/db/` or API routes
- Put authentication logic in `/lib/auth/`
- Put billing/limits logic in `/lib/billing/`

❌ DON'T:
- Call OpenAI/Anthropic directly from React components
- Access the database from React components
- Put business logic in `/components/`

### Rule 2: Clients Only Call APIs

**React components should ONLY:**
- Render UI
- Manage local UI state
- Call `/api/` endpoints

```typescript
// ✅ CORRECT - Component calls API
const response = await fetch('/api/oscar/ask', {
  method: 'POST',
  body: JSON.stringify({ message, workspaceId })
})

// ❌ WRONG - Component calls AI directly
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: '...' }) // NEVER DO THIS
```

### Rule 3: API Keys Stay Server-Side

**Never expose API keys to the client.**

- All secrets live in `.env` (server-only)
- API routes read from `process.env`
- Client code NEVER sees keys

### Rule 4: Design APIs for Multi-Client

**Every API endpoint should work for web, mobile, and future clients.**

```typescript
// ✅ GOOD - Generic API that any client can use
POST /api/oscar/ask
Body: { message: string, workspaceId: string, mode: string }
Response: { answer: string, threadId: string }

// ❌ BAD - Web-specific assumptions
POST /api/oscar/ask
Body: { message: string, sessionStorage: {...} } // Don't assume browser APIs
```

### Rule 5: Security at the API Layer

**All security checks happen in API routes, not components.**

```typescript
// In /app/api/oscar/ask/route.ts
export async function POST(req: Request) {
  // 1. Check auth
  const session = await getServerSession()
  if (!session) return unauthorized()

  // 2. Check rate limit
  const rateLimitResult = await checkRateLimit({ userId, ip, endpoint })
  if (!rateLimitResult.allowed) return tooManyRequests()

  // 3. Validate input
  const body = RequestSchema.parse(await req.json())

  // 4. Record request for tracking
  await recordRequest({ userId, ip, endpoint })

  // 5. Do the work
  const result = await Oscar.ask(...)

  // 6. Return with rate limit headers
  return NextResponse.json(result, {
    headers: { 'X-RateLimit-Remaining': rateLimitResult.remaining }
  })
}
```

---

## Appendix C: Key Files Reference

### AI System
- `/lib/ai/oscar.ts` - Main Oscar class, synthesizes panel responses
- `/lib/ai/panel.ts` - Multi-agent orchestration
- `/lib/ai/providers/` - OpenAI/Anthropic adapters

### Knowledge Base
- `/lib/knowledge/search.ts` - Semantic search entry point
- `/lib/knowledge/vector-search.ts` - pgvector queries
- `/lib/knowledge/chunker.ts` - Document chunking

### Security
- `/lib/security/rate-limit.ts` - Rate limiting logic
- `/lib/security/api-middleware.ts` - Security wrapper for routes

### Database
- `/prisma/schema.prisma` - All models defined here
- `/lib/db/prisma.ts` - Singleton Prisma client

### API Routes
- `/app/api/oscar/ask/route.ts` - Main chat endpoint
- `/app/api/vault/route.ts` - Document listing
- `/app/api/usage/route.ts` - Usage statistics

---

## For AI Assistants: Before Making Changes

1. **Read this file first**
2. **Check which layer** you're working in (client vs backend)
3. **Put logic in the right place** per the rules in Appendix B
4. **If adding a new feature**, decide: is this client or backend?
5. **If unsure**, ask before implementing

When proposing changes:
- Clearly state which files you'll modify
- Explain why each change belongs in that location
- Consider how a future mobile app would use the same backend
