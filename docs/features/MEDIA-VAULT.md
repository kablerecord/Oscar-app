# OSQR Media Vault

**Status:** Planned for v3.0+ (Phase 4.8)
**Category:** Personal Knowledge Vault / Life OS
**Owner:** Kable Record
**Tier:** Pro ($49/mo) for storage, Master ($149/mo) for advanced analysis
**Target:** After Council Mode and core intelligence features are stable

---

## Vision

> **"A lifelong, AI-enhanced, meaning-driven memory vault."**

Media Vault transforms OSQR from a "smart assistant with documents" into **the OS of someone's entire life**. Users can store photos and videos alongside their documents, notes, and conversations — and OSQR can cross-reference everything.

This is not:
- A social feed (no posting, no likes, no followers)
- A photo backup service (though it stores media)
- Instagram/Facebook competition

This is:
- **A private archive of your life** that you can search and query
- **Context for OSQR** to understand you better over time
- **A future-proof bet** — store media now, analyze with better AI later

---

## Why This Matters

### 1. The Strategic Bet

> "If you store people's memories now, future AI will make them exponentially more valuable."

AI capabilities double quarterly, not annually. In 2025:
- Image analysis is great
- Video analysis is decent
- Multimodal reasoning is exploding

By 2026-2028:
- Video comprehension will be normal
- Auto-tagging will be instant
- Life timeline creation will be AI-native
- Health/wellness inference from photos will be standard

**If OSQR stores media today, it can retroactively analyze EVERYTHING when AI matures.**

### 2. Uncopiable Moat

No one else has:
- A Personal Knowledge Vault (PKV)
- A Master Summary Checklist (MSC)
- A Memory Engine with temporal intelligence
- An Identity Model (Capability Ladder)
- A multi-model reasoning panel

Facebook stores memories. Google Photos stores memories.
**OSQR *uses* memories** — cross-referencing them with your goals, values, projects, and life patterns.

### 3. Category Creation

Current landscape:
| Platform | Purpose | Relationship to Memory |
|----------|---------|------------------------|
| Facebook | Social validation | Memories as content to share |
| Instagram | Aesthetic curation | Memories as performance |
| Google Photos | Passive backup | Memories as storage |
| iCloud Photos | Device sync | Memories as files |
| **OSQR** | **Personal intelligence** | **Memories as context for understanding you** |

OSQR creates a new category: **"Meaningful memory vault"**

---

## User Experience

### Where It Lives

New left-nav item: **"Media"** or **"Memories"**

Inside PKV, tabs become:
```
[Documents] [Media] [Projects] [Notes]
```

### Media Tab (v1 - Grid View)

```
┌─────────────────────────────────────────────────────────────┐
│  Media                                         [+ Upload]   │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Images] [Videos] | [This Month ▼]          │
│                                                             │
│  December 2025                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ 📷  │ │ 📷  │ │ 🎬  │ │ 📷  │ │ 📷  │ │ 📷  │           │
│  │     │ │     │ │     │ │     │ │     │ │     │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                             │
│  November 2025                                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │ 📷  │ │ 📷  │ │ 📷  │ │ 🎬  │                           │
│  │     │ │     │ │     │ │     │                           │
│  └─────┘ └─────┘ └─────┘ └─────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Detail View (Click to Expand)

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]                                         [⋮ Menu]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────────┐                      │
│                    │                 │                      │
│                    │    [IMAGE]      │                      │
│                    │                 │                      │
│                    └─────────────────┘                      │
│                                                             │
│  Caption: "Family at Playa Bowls Buckeye construction"      │
│  [Edit caption]                                             │
│                                                             │
│  Tags: family, Playa Bowls, construction, storefront        │
│  [+ Add tag]                                                │
│                                                             │
│  Linked to:                                                 │
│  • Project: Playa Bowls Buckeye                            │
│  • Person: Amanda, Mason, Collins                          │
│  [+ Link to project] [+ Link to person]                    │
│                                                             │
│  Notes:                                                     │
│  "This was the day we broke ground. Kids were so excited." │
│  [Edit notes]                                               │
│                                                             │
│  Captured: December 5, 2025 at 2:34 PM                     │
│  Uploaded: December 9, 2025                                 │
└─────────────────────────────────────────────────────────────┘
```

### Chat Integration (Future)

In chat, OSQR can reference media:

```
User: "When did we start construction on the Buckeye location?"

OSQR: "Based on your photos, you broke ground on December 5, 2025.
       Here's the photo from that day:

       [📷 Thumbnail: Family at Playa Bowls construction]

       Amanda and the kids were there. You noted it was 'the day
       we broke ground' and the kids were excited."
```

### Timeline View (Phase 4.8c)

```
┌─────────────────────────────────────────────────────────────┐
│  Life Timeline                              [2025 ▼]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●   │
│  Jan                                                   Dec  │
│                                                             │
│  Highlights:                                                │
│                                                             │
│  [Mar] Started VoiceQuote development                       │
│        📷 3 photos | 🎬 1 video                             │
│                                                             │
│  [Jun] Playa Bowls Buckeye lease signed                    │
│        📷 5 photos                                          │
│                                                             │
│  [Dec] Playa Bowls Buckeye construction begins             │
│        📷 12 photos | 🎬 2 videos                           │
│        Linked: Family, Business, Milestone                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phased Implementation

### Phase 4.8a — Storage Only (Foundation)

**Goal:** Let users upload and store media. No AI analysis yet.

**Scope:**
- [ ] Add "Media Vault" as first-class section in PKV
- [ ] Implement secure media upload (images first: .jpg, .png, .heic)
- [ ] Store media in object storage (Supabase Storage / S3 / R2)
- [ ] Create Document row for each upload with `sourceType = 'image'`
- [ ] Generate basic metadata on upload (timestamp, file type, size, user title/description)
- [ ] Simple grid UI to view uploads sorted by time
- [ ] Respect privacy tiers (Tier A: no auto-analysis)

**Why start here:**
- Collects data early for future analysis
- Low complexity — just storage
- Builds user habit of uploading to OSQR
- No API costs (no vision calls)

### Phase 4.8b — Basic Vision Extraction

**Goal:** Auto-generate captions and tags when users opt in.

**Scope:**
- [ ] On upload (or background job), send image to vision model (GPT-4V, Claude Vision, Gemini)
- [ ] Extract:
  - Short caption (1-2 sentences)
  - Tags (people count, objects, locations, mood)
  - Scene type (indoor/outdoor, event type)
- [ ] Store in `Document.textContent` (caption) and `metadata.vision`
- [ ] Create `DocumentChunk` from caption for semantic search
- [ ] Privacy-aware: Only analyze if user opts in (Tier B/C)

**API Cost Estimate:**
- GPT-4V: ~$0.01-0.03 per image
- At 100 images/month: $1-3/month per active user
- Consider: batch processing, caching, user-controlled analysis

### Phase 4.8c — Timeline + Cross-Linking

**Goal:** Connect media to life context.

**Scope:**
- [ ] Timeline view sorted by `capturedAt` (EXIF or upload date)
- [ ] Group by month/year
- [ ] Link media to:
  - Projects (PKV projects)
  - People (MediaPerson model)
  - Goals (MSC items)
  - Events/milestones
- [ ] User can manually link: "This photo is part of: Playa Bowls Buckeye"
- [ ] User can tag people: "Tag person: Mason"
- [ ] Cross-reference in chat: OSQR can surface relevant photos when answering questions

**New capabilities:**
- "Show me photos from our Playa Bowls buildout"
- "Find pictures of Mason from 2024"
- "What projects have visual documentation?"

### Phase 4.8d — Advanced Video + Life Intelligence

**Goal:** Full media comprehension and life insights.

**Scope:**
- [ ] Video support (.mp4, .mov)
- [ ] Frame sampling (1 frame per N seconds)
- [ ] Audio transcription (attach to Document)
- [ ] Video summary generation
- [ ] Life recap features:
  - "Show me my biggest wins this year"
  - "Summarize 2026 in 10 photos"
  - "What patterns do you see in my photos?"
- [ ] Health/habit inference (opt-in):
  - Exercise patterns
  - Family time frequency
  - Work vs personal balance
- [ ] Auto-journaling from photos: "December 5 was a big day — construction started, family was there"

---

## Data Model

### Extending the Document Model

The existing `Document` model already supports different source types. Media fits naturally:

```prisma
model Document {
  id               String   @id @default(cuid())
  workspaceId      String
  projectId        String?
  title            String
  sourceType       String   // 'upload' | 'chat_export' | 'note' | 'image' | 'video'
  originalFilename String?
  mimeType         String?
  textContent      String   @db.Text  // For media: AI-generated caption
  metadata         Json?    // Extended for media (see below)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  // ... existing relations
}
```

### Media-Specific Metadata Schema

```typescript
interface MediaMetadata {
  mediaType: 'image' | 'video'

  // Storage
  fileUrl: string           // Full URL to stored file
  thumbnailUrl: string      // Smaller preview

  // File info
  width: number
  height: number
  duration?: number         // For videos (seconds)
  fileSize: number          // Bytes

  // Temporal
  capturedAt?: string       // EXIF date or user-provided
  uploadedAt: string

  // AI-generated (Phase 4.8b+)
  vision?: {
    caption: string
    objects: string[]
    mood?: string
    sceneType?: string
    peopleCount?: number
    confidence: number
  }

  // User-provided
  tags: string[]
  notes?: string

  // Links (Phase 4.8c+)
  linkedProjectIds?: string[]
  linkedPersonIds?: string[]
  linkedMscItemIds?: string[]
}
```

### New Models for Phase 4.8c+

```prisma
// People tagging system
model MediaPerson {
  id          String            @id @default(cuid())
  workspaceId String
  name        String
  relationship String?          // 'spouse', 'child', 'friend', 'team', etc.
  createdAt   DateTime          @default(now())
  links       MediaPersonLink[]
  workspace   Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, name])
  @@index([workspaceId])
}

// Many-to-many: which people appear in which media
model MediaPersonLink {
  id         String      @id @default(cuid())
  documentId String      // References Document with sourceType='image'|'video'
  personId   String
  createdAt  DateTime    @default(now())
  document   Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)
  person     MediaPerson @relation(fields: [personId], references: [id], onDelete: Cascade)

  @@unique([documentId, personId])
  @@index([documentId])
  @@index([personId])
}
```

---

## Backend Architecture

### API Endpoints

#### Phase 4.8a (Storage)

```typescript
// Upload media
POST /api/media/upload
// Auth: workspace
// Payload: multipart form (file, title?, description?, tags?)
// Response: { id, fileUrl, thumbnailUrl, document }

// List media
GET /api/media/list
// Query: workspaceId, type?, dateFrom?, dateTo?, tags?, limit?, offset?
// Response: { items: Document[], total, hasMore }

// Get single media item
GET /api/media/:id
// Response: Document with full metadata

// Update media (caption, tags, notes)
PATCH /api/media/:id
// Payload: { title?, tags?, notes?, linkedProjectIds? }

// Delete media
DELETE /api/media/:id
// Also deletes from object storage
```

#### Phase 4.8b (Vision)

```typescript
// Trigger analysis for a single image
POST /api/media/:id/analyze
// Runs vision model, updates Document with caption/tags
// Response: { caption, tags, objects, mood }

// Bulk analyze (background job)
POST /api/media/analyze-batch
// Payload: { documentIds: string[] }
// Response: { queued: number, estimatedTime }
```

#### Phase 4.8c (Timeline/Links)

```typescript
// Get timeline view
GET /api/media/timeline
// Query: workspaceId, year?, groupBy=month|week|day
// Response: { groups: { period, items: Document[], highlights? }[] }

// People management
GET /api/media/people
POST /api/media/people
PATCH /api/media/people/:id
DELETE /api/media/people/:id

// Link media to person
POST /api/media/:id/link-person
// Payload: { personId }

// Link media to project
POST /api/media/:id/link-project
// Payload: { projectId }
```

### Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  User uploads image                                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Save to object storage (Supabase/S3)                    │
│     - Generate thumbnail                                     │
│     - Extract EXIF metadata                                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Create Document record                                   │
│     - sourceType = 'image'                                  │
│     - metadata = { fileUrl, thumbnailUrl, ... }             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. If Tier B/C and vision enabled:                         │
│     - Queue background job for vision analysis               │
│     - Job calls GPT-4V / Claude Vision                       │
│     - Update Document with caption, tags                     │
│     - Create DocumentChunk for semantic search               │
└─────────────────────────────────────────────────────────────┘
```

### Storage Architecture

**Recommended: Supabase Storage**
- Already integrated with auth
- CDN for fast delivery
- Signed URLs for privacy
- Reasonable pricing

**Alternative: Cloudflare R2**
- Cheaper for high volume
- S3-compatible
- No egress fees

**File Organization:**
```
/media
  /{workspaceId}
    /images
      /{year}
        /{month}
          /original/{documentId}.jpg
          /thumbnail/{documentId}.jpg
    /videos
      /{year}
        /{month}
          /original/{documentId}.mp4
          /thumbnail/{documentId}.jpg
```

---

## Privacy & Security

### Tier Integration

| Tier | Storage | Auto-Analysis | Manual Analysis |
|------|---------|---------------|-----------------|
| **Tier A** (Max Privacy) | Encrypted | Never | On-demand only |
| **Tier B** (Improve OSQR) | Standard | Opt-in | Yes |
| **Tier C** (Aggregate) | Standard | Default | Yes |

### Tier A Behavior

- Media stored encrypted at rest
- **Never** sent to external AI providers automatically
- User must explicitly request: "Analyze this photo"
- One-time vision call, results stored locally
- No batch processing

### Tier B/C Behavior

- Auto-analysis with clear opt-in
- User controls which media gets analyzed
- All analysis stays in their vault
- No raw media shared externally

### "Burn It" Button

Complete media deletion includes:
- All media files in object storage
- All Document rows with sourceType='image'|'video'
- All thumbnails
- All embeddings/chunks from captions
- All MediaPerson and MediaPersonLink records
- All metadata

**Nothing recoverable.**

---

## Cost Considerations

### Storage Costs

| Volume | Supabase | R2 |
|--------|----------|-----|
| 1 GB | ~$0.021/mo | ~$0.015/mo |
| 10 GB | ~$0.21/mo | ~$0.15/mo |
| 100 GB | ~$2.10/mo | ~$1.50/mo |

**Per-user estimate:**
- Average user: 5-10 GB/year
- Power user: 50-100 GB/year
- Cost: $0.10-$2.00/user/month

### Vision API Costs

| Provider | Cost per Image |
|----------|----------------|
| GPT-4V | $0.01-0.03 |
| Claude Vision | $0.01-0.02 |
| Gemini Vision | $0.005-0.01 |

**Per-user estimate:**
- 100 images/month analyzed: $1-3/month
- Mitigation: batch processing, caching, user-controlled

### Pricing Implications

**Option A: Include in tier pricing**
- Pro ($49/mo): 10 GB storage, 100 analyses/month
- Master ($149/mo): 100 GB storage, unlimited analyses

**Option B: Usage-based add-on**
- Base storage: $0.10/GB/month
- Vision analysis: $0.02/image
- Bundles available

**Option C: Hybrid**
- Tier includes base allocation
- Overage charged separately

---

## Monetization & Positioning

### Tier Value Props

**Pro ($49/mo):**
> "Your life's photos, searchable and connected to your goals."

**Master ($149/mo):**
> "AI that understands your visual history and surfaces insights across your entire life."

### Upsell Flow

If a Lite user tries to upload media:

```
┌─────────────────────────────────────────────────────────────┐
│  Media Vault is part of OSQR Pro.                           │
│                                                             │
│  Store your photos and videos in the same vault as your     │
│  documents. OSQR will search, organize, and cross-reference │
│  your visual memories with your goals and projects.         │
│                                                             │
│  [Start 7-day Pro Trial]  [Learn More]                      │
└─────────────────────────────────────────────────────────────┘
```

### Marketing Headlines

> **"Your memories, finally searchable."**
>
> Photos scattered across iCloud, Google, and Facebook? OSQR brings them together — and makes them meaningful.

> **"The AI that remembers your life."**
>
> Not just storage. Understanding. OSQR connects your photos to your goals, your projects, your growth.

> **"Stop scrolling. Start remembering."**
>
> Facebook shows you memories for engagement. OSQR uses them to help you think.

---

## Dependencies

### Must Be Complete Before 4.8a

- [x] PKV stable and working
- [ ] Privacy tiers fully implemented
- [ ] Object storage infrastructure set up
- [ ] File upload pipeline proven (existing PDF/DOCX upload)

### Must Be Complete Before 4.8b

- [ ] Vision API integration tested
- [ ] Background job system (for async analysis)
- [ ] Cost monitoring/alerting
- [ ] User consent flows for AI analysis

### Must Be Complete Before 4.8c

- [ ] Timeline UI components
- [ ] Project linking system mature
- [ ] People management UI
- [ ] Cross-reference in chat working

---

## Future Expansions

### Life Recaps

Annual/monthly AI-generated summaries:
- "Your 2026: 12 photos that defined your year"
- "This month in your life: family time increased 40%"
- Exportable as PDF or shareable card

### Health/Wellness Inference (Opt-in)

With sufficient photos over time:
- Exercise pattern detection
- Weight/fitness progression (if user wants)
- Family time frequency
- Work-life balance visualization

### Memory Prompts

OSQR proactively surfaces:
- "1 year ago today, you started construction on Buckeye"
- "You haven't taken photos with Mason in 3 weeks"
- "This matches a photo from your trip to [location]"

### Legacy Mode

Long-term vision:
- "Your kids' future OSQR can inherit your Media Vault"
- Generational knowledge transfer
- Family history preservation

### Voice/Audio Memories

Extend to audio files:
- Voice notes
- Podcast clips
- Meeting recordings
- Family interviews

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-09 | 0.1 | Initial spec created |

---

## Related Documents

- [ROADMAP.md](../../ROADMAP.md) - Phase 4.8
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - PKV and Document architecture
- [prisma/schema.prisma](../../prisma/schema.prisma) - Current data model
- [lib/knowledge/](../../lib/knowledge/) - Existing indexing infrastructure
