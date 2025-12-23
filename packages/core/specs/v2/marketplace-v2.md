# OSQR Marketplace Specification v2.0

---

## Metadata

| Field | Value |
|-------|-------|
| **Version** | 2.0.0 |
| **Status** | Ready for Implementation |
| **Owner** | Kable Record |
| **Created** | December 19, 2025 |
| **Target Release** | v2.0 (Post-March 2025) |
| **Dependencies** | Plugin Architecture (v1.0), Memory Vault (v1.0), Constitutional Framework (v1.0) |
| **Blocked By** | v1.0 Core Complete |
| **Enables** | Creator Economy, Revenue Generation, Network Effects |

---

## Executive Summary

The OSQR Marketplace is a creator economy platform where thought leaders, authors, coaches, and methodology creators package their frameworks into AI-delivered plugins. Unlike tool marketplaces (MCP registries) that serve developers, OSQR Marketplace serves end users who want Oscar to think and operate using proven methodologies.

**Core Philosophy:**
- OSQR is a tool - the market decides what's good
- Creators own their relationship with users (80/20 split, creator-favored)
- Oscar doesn't push plugins - users browse, choose, and install
- Two plugin types: Tool plugins (functions) and Methodology plugins (behavior/approach)

**The Moat:** While OpenAI and Anthropic build infrastructure, OSQR builds the creator ecosystem. The marketplace is the defensible asset, not the AI routing.

---

## Scope

### In Scope (v2.0)

- [ ] Marketplace UI (browse, search, filter, showcase)
- [ ] Plugin Detail Pages (description, reviews, install)
- [ ] Creator Portal (dashboard, analytics, payouts)
- [ ] Plugin Manifest System (tool vs methodology)
- [ ] Payment Infrastructure (80/20 split)
- [ ] Plugin Builder (guided creation flow)
- [ ] Review and Rating System
- [ ] Category Taxonomy
- [ ] Installed Plugin Management
- [ ] Basic Plugin Conflict Detection

### Out of Scope (Deferred to v2.5+)

- [ ] AI-powered plugin recommendations
- [ ] Plugin bundles/collections
- [ ] Creator certification program
- [ ] Enterprise private marketplaces
- [ ] Plugin versioning/rollback UI
- [ ] Creator affiliate program
- [ ] Plugin A/B testing
- [ ] Usage-based dynamic pricing

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        OSQR MARKETPLACE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  MARKETPLACE UI │    │  CREATOR PORTAL │    │   PLUGIN    │ │
│  │                 │    │                 │    │   BUILDER   │ │
│  │  • Browse       │    │  • Dashboard    │    │             │ │
│  │  • Search       │    │  • Analytics    │    │  • Guided   │ │
│  │  • Categories   │    │  • Payouts      │    │    Flow     │ │
│  │  • Detail Page  │    │  • Versions     │    │  • Manifest │ │
│  │  • Install      │    │  • Reviews      │    │    Gen      │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘ │
│           │                      │                     │        │
│           └──────────────────────┼─────────────────────┘        │
│                                  │                              │
│                                  ▼                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    PLUGIN REGISTRY                         │ │
│  │                                                            │ │
│  │  • Manifest Storage       • Version Control               │ │
│  │  • Discovery Index        • Install Tracking              │ │
│  │  • Rating Aggregation     • Revenue Tracking              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                  │                              │
│                                  ▼                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  PAYMENT INFRASTRUCTURE                    │ │
│  │                                                            │ │
│  │  • Stripe Connect         • 80/20 Split                   │ │
│  │  • Creator Payouts        • Refund Handling               │ │
│  │  • Transaction Logs       • Tax Reporting                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OSQR CORE (v1.0)                           │
├─────────────────────────────────────────────────────────────────┤
│  Plugin Architecture │ Memory Vault │ Constitutional Framework │
└─────────────────────────────────────────────────────────────────┘
```

### Two Plugin Types

| Aspect | Tool Plugins | Methodology Plugins |
|--------|--------------|---------------------|
| **Purpose** | Add functions to Oscar | Modify Oscar's behavior/approach |
| **Manifest** | JSON-RPC 2.0 (MCP standard) | Markdown + YAML |
| **Logic** | Reactive - responds to calls | Agentic - follows mission plans |
| **Examples** | Stripe payments, Calendar sync | FGF methodology, StoryBrand framework |
| **Loading** | Full tool definition | Sharded - JIT retrieval |
| **Context Impact** | Minimal | Managed via budget (max 15%) |

---

## Implementation Checklist

### Phase 1: Plugin Registry Foundation
- [ ] Design registry database schema
- [ ] Implement manifest storage (tool + methodology types)
- [ ] Create plugin metadata API (CRUD operations)
- [ ] Build version control for plugin updates
- [ ] Implement `.well-known` discovery endpoint
- [ ] Create install/uninstall tracking

### Phase 2: Marketplace UI
- [ ] Design marketplace home page
- [ ] Implement category taxonomy
- [ ] Build search with filters (category, price, rating)
- [ ] Create showcase sections (Featured, Popular, New)
- [ ] Design plugin detail page template
- [ ] Implement review display component
- [ ] Build install button with auth check
- [ ] Create "My Plugins" management page

### Phase 3: Plugin Detail Page
- [ ] Creator profile section
- [ ] Methodology/tool description
- [ ] "What Oscar does differently" section
- [ ] Screenshot/demo carousel
- [ ] Reviews and ratings display
- [ ] Price and install CTA
- [ ] Related plugins section

### Phase 4: Creator Portal
- [ ] Creator onboarding flow
- [ ] Dashboard with key metrics
- [ ] Sales analytics (units, revenue, trends)
- [ ] Plugin management (edit, update, deprecate)
- [ ] Version management with changelog
- [ ] Review response interface
- [ ] Payout history and settings
- [ ] Stripe Connect integration

### Phase 5: Payment Infrastructure
- [ ] Stripe Connect account creation for creators
- [ ] 80/20 split logic implementation
- [ ] Purchase flow (user → OSQR → creator)
- [ ] Payout scheduling (monthly threshold)
- [ ] Refund handling workflow
- [ ] Transaction logging for disputes
- [ ] Tax document generation (1099s)

### Phase 6: Plugin Builder
- [ ] Guided questionnaire flow
- [ ] Step 1: Basic info (name, description, category)
- [ ] Step 2: Target audience definition
- [ ] Step 3: Transformation promise
- [ ] Step 4: Core principles capture (5-10)
- [ ] Step 5: Workflow steps definition
- [ ] Step 6: Elicitation questions (what to ask users)
- [ ] Step 7: Output templates
- [ ] Manifest generation from answers
- [ ] Preview mode (test plugin before submit)
- [ ] Submit for review flow

### Phase 7: Review & Rating System
- [ ] Post-use review prompt logic
- [ ] 5-star rating component
- [ ] Written review with character limits
- [ ] Review moderation queue
- [ ] Creator response capability
- [ ] Rating aggregation algorithm
- [ ] Review sorting (helpful, recent, critical)

### Phase 8: Installed Plugin Management
- [ ] "My Plugins" settings page
- [ ] Enable/disable toggle per plugin
- [ ] Per-project plugin activation
- [ ] Plugin conflict detection
- [ ] Conflict resolution UI (user chooses)
- [ ] Plugin update notifications
- [ ] Uninstall with data handling

### Phase 9: Launch & Monitoring
- [ ] Creator invite system (early access)
- [ ] FGF plugin as launch example
- [ ] Marketplace analytics dashboard
- [ ] Creator success metrics
- [ ] User satisfaction tracking
- [ ] Revenue reporting
- [ ] Bug/issue tracking integration

---

## API Contracts

### Plugin Registry API

```typescript
// GET /api/marketplace/plugins
interface PluginListRequest {
  category?: string;
  search?: string;
  sort?: 'popular' | 'new' | 'top-rated' | 'price-low' | 'price-high';
  page?: number;
  limit?: number;
}

interface PluginListResponse {
  plugins: PluginSummary[];
  total: number;
  page: number;
  hasMore: boolean;
}

interface PluginSummary {
  id: string;
  name: string;
  slug: string;
  type: 'tool' | 'methodology';
  description: string;
  shortDescription: string;
  category: string;
  price: number;
  currency: 'USD';
  rating: number;
  reviewCount: number;
  installCount: number;
  creator: CreatorSummary;
  thumbnailUrl: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreatorSummary {
  id: string;
  name: string;
  avatarUrl: string;
  verified: boolean;
}
```

### Plugin Detail API

```typescript
// GET /api/marketplace/plugins/:slug
interface PluginDetailResponse {
  plugin: PluginFull;
  reviews: Review[];
  relatedPlugins: PluginSummary[];
}

interface PluginFull extends PluginSummary {
  longDescription: string;
  whatOscarDoesDifferently: string;
  screenshots: string[];
  demoVideoUrl?: string;
  creator: CreatorFull;
  manifest: PluginManifest;
  changelog: ChangelogEntry[];
  requirements: string[];
  tags: string[];
}

interface CreatorFull extends CreatorSummary {
  bio: string;
  credentials: string[];
  website?: string;
  socialLinks: SocialLink[];
  pluginCount: number;
  totalInstalls: number;
}
```

### Purchase API

```typescript
// POST /api/marketplace/plugins/:id/purchase
interface PurchaseRequest {
  userId: string;
  paymentMethodId: string;
}

interface PurchaseResponse {
  success: boolean;
  transactionId: string;
  installId: string;
  receiptUrl: string;
}

// Revenue split handled server-side:
// - 80% → Creator's Stripe Connect account
// - 20% → OSQR platform account
```

### Install Management API

```typescript
// GET /api/user/plugins
interface UserPluginsResponse {
  installed: InstalledPlugin[];
}

interface InstalledPlugin {
  id: string;
  plugin: PluginSummary;
  installedAt: string;
  enabled: boolean;
  activeInProjects: string[]; // project IDs where active
  updateAvailable: boolean;
  settings: Record<string, any>;
}

// PATCH /api/user/plugins/:installId
interface UpdateInstallRequest {
  enabled?: boolean;
  activeInProjects?: string[];
  settings?: Record<string, any>;
}

// DELETE /api/user/plugins/:installId
interface UninstallResponse {
  success: boolean;
  dataHandling: 'preserved' | 'deleted';
}
```

### Creator Portal API

```typescript
// GET /api/creator/dashboard
interface CreatorDashboardResponse {
  totalRevenue: number;
  pendingPayout: number;
  nextPayoutDate: string;
  plugins: CreatorPluginStats[];
  recentSales: Sale[];
  recentReviews: Review[];
}

interface CreatorPluginStats {
  pluginId: string;
  name: string;
  installs: number;
  activeUsers: number;
  revenue: number;
  rating: number;
  reviewCount: number;
}

// GET /api/creator/analytics/:pluginId
interface PluginAnalyticsResponse {
  installs: TimeSeriesData[];
  revenue: TimeSeriesData[];
  activeUsers: TimeSeriesData[];
  sessionCount: TimeSeriesData[];
  avgSessionLength: number;
  retentionRate: number;
  topProjects: string[]; // anonymized project types
}
```

---

## Methodology Plugin Manifest Schema

```yaml
# Example: Fourth Generation Formula Plugin Manifest
# Location: /plugins/fourth-generation-formula/manifest.yaml

name: "Fourth Generation Formula"
version: "1.0.0"
type: "methodology"
slug: "fourth-generation-formula"

metadata:
  author: "Kable Record"
  authorId: "creator_kable123"
  description: "A framework for building multi-generational wealth and transferring values, skills, and assets to future generations."
  shortDescription: "Build wealth that lasts 4+ generations"
  category: "Legacy & Wealth"
  tags: ["legacy", "family", "wealth", "parenting", "transfer"]
  price: 49.00
  currency: "USD"

persona:
  role: "Fourth Generation Coach"
  style: "Direct, challenging, legacy-focused"
  focus: "Multi-generational wealth and value transfer"
  voice: "Speaks as a peer who has done the work, not a guru"

principles:
  - id: "three-percent-rule"
    content: "97% of family wealth is lost by the 4th generation. Your job is to be in the 3%."
    triggerContexts: ["legacy", "inheritance", "family business", "generational", "wealth transfer"]
    priority: 1

  - id: "transfer-not-give"
    content: "Transfer means they earn it. Giving means they didn't. The difference determines whether it lasts."
    triggerContexts: ["parenting", "teaching", "handoff", "inheritance"]
    priority: 2

  - id: "productive-struggle"
    content: "Comfort is the enemy of capability. Design challenges that build strength."
    triggerContexts: ["parenting", "coaching", "development", "growth"]
    priority: 3

  - id: "document-everything"
    content: "What isn't written doesn't transfer. Your Book of Builders Principles is your legacy artifact."
    triggerContexts: ["documentation", "writing", "systems", "processes"]
    priority: 4

  - id: "identity-before-action"
    content: "Who you are determines what you do. Define the builder identity first."
    triggerContexts: ["identity", "purpose", "values", "mission"]
    priority: 5

workflows:
  - id: "legacy-assessment"
    name: "Legacy Assessment"
    description: "Evaluate where you are in building transferable wealth and values"
    multiSession: false
    steps:
      - "Identify what you're building (assets, skills, values)"
      - "Identify who you're building for (which generation)"
      - "Map current transfer mechanisms"
      - "Identify gaps in documentation"
      - "Create initial action plan"
    outputTemplate: "templates/assessment-summary.md"

  - id: "book-of-builders"
    name: "Book of Builders Principles"
    description: "Create your family's legacy document"
    multiSession: true
    totalSteps: 75
    persistence: "pkv"
    steps:
      - phase: "Foundation"
        questions: 15
        focus: "Identity and values"
      - phase: "History"
        questions: 20
        focus: "Lessons learned, failures, wins"
      - phase: "Systems"
        questions: 25
        focus: "How you do things, processes"
      - phase: "Transfer"
        questions: 15
        focus: "How to teach, when to hand off"
    outputTemplate: "templates/book-of-builders.md"

templates:
  - id: "assessment-summary"
    path: "templates/assessment-summary.md"
  - id: "book-of-builders"
    path: "templates/book-of-builders.md"
  - id: "transfer-blueprint"
    path: "templates/transfer-blueprint.md"
  - id: "builders-principle"
    path: "templates/builders-principle.md"

contextBudget: 0.15  # Max 15% of context window
shardStrategy: "jit"  # Just-in-time loading based on conversation context

requirements:
  osqrVersion: ">=1.0.0"
  requiredPlugins: []
  optionalPlugins: ["calendar-integration"]
```

---

## UI Wireframes

### Marketplace Home

```
┌─────────────────────────────────────────────────────────────────┐
│  OSQR Marketplace                                    [Search 🔍]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Featured]  [Popular]  [New]  [Categories ▼]  [Price ▼]       │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  ✨ FEATURED                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Fourth Generation Formula                               │   │
│  │  "Build wealth that lasts 4+ generations"                │   │
│  │  ★★★★★ (47 reviews)  •  $49  •  By Kable Record         │   │
│  │                                              [View →]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  🔥 POPULAR THIS WEEK                                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ StoryBrand  │  │ PARA Method │  │ GTD System  │             │
│  │ Framework   │  │             │  │             │             │
│  │             │  │             │  │             │             │
│  │ ★★★★☆ (124) │  │ ★★★★★ (89)  │  │ ★★★★☆ (156) │             │
│  │ $79         │  │ $29         │  │ $39         │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  📁 CATEGORIES                                                  │
│                                                                 │
│  • Business Strategy (24)     • Writing & Content (18)         │
│  • Parenting & Legacy (12)    • Productivity (31)              │
│  • Leadership (15)            • Health & Fitness (9)           │
│  • Sales & Marketing (22)     • Spirituality (7)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Detail Page

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Marketplace                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  FOURTH GENERATION FORMULA                       │
│  │  [Icon]  │  ★★★★★ (47 reviews)  •  1,234 installs           │
│  │          │                                                   │
│  └──────────┘  $49.00                      [Install Plugin]     │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  CREATOR                                                        │
│  ┌────┐                                                         │
│  │ 👤 │  Kable Record  ✓ Verified                              │
│  └────┘  Founder, Record Enterprises                           │
│          Author of "Fourth Generation Formula"                  │
│          [View Profile]                                         │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  WHAT THIS PLUGIN DOES                                          │
│                                                                 │
│  A framework for building multi-generational wealth and         │
│  transferring values, skills, and assets to future generations. │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  WHAT OSCAR DOES DIFFERENTLY                                    │
│                                                                 │
│  With this plugin installed, Oscar:                             │
│  • Challenges you with the "3% Rule" - 97% of wealth is lost   │
│  • Focuses on TRANSFER not giving                               │
│  • Guides you through documenting your Builder's Principles     │
│  • Asks harder questions about your legacy                      │
│  • Helps create your Book of Builders                           │
│                                                                 │
│  ───────────────────────────────────────────────────────────   │
│                                                                 │
│  REVIEWS                                                        │
│                                                                 │
│  ★★★★★  "Changed how I think about what I'm building"          │
│  John D. - 2 weeks ago                                          │
│                                                                 │
│  ★★★★★  "Oscar asked me questions I'd been avoiding"           │
│  Sarah M. - 1 month ago                                         │
│                                                                 │
│  [See all 47 reviews →]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Creator Portal Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Creator Portal                              [Kable Record 👤]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Total Revenue   │  │ This Month      │  │ Next Payout     │ │
│  │ $4,823          │  │ $1,247          │  │ $987 on Jan 15  │ │
│  │ ↑ 23% vs last   │  │ 27 sales        │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  MY PLUGINS                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Fourth Generation Formula                    [Edit] [📊] │   │
│  │ $49  •  ★★★★★ (47)  •  98 installs  •  $4,823 revenue   │   │
│  │ Last updated: Dec 15, 2025                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Create New Plugin]                                          │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  RECENT ACTIVITY                                                │
│                                                                 │
│  • New sale: John D. purchased FGF - $49 (you earn $39.20)     │
│  • New review: ★★★★★ "Changed how I think..."                  │
│  • New sale: Sarah M. purchased FGF - $49 (you earn $39.20)    │
│                                                                 │
│  ═══════════════════════════════════════════════════════════   │
│  RECENT REVIEWS                                                 │
│                                                                 │
│  ★★★★★  "Changed how I think about what I'm building"          │
│  John D. - 2 weeks ago                           [Reply]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### My Plugins (User View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > My Plugins                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INSTALLED PLUGINS (3)                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Fourth Generation Formula              [On] ───●       │   │
│  │   Active in: All Projects                                │   │
│  │   Installed: Dec 1, 2025                                 │   │
│  │                                          [Manage] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ PARA Method                            [On] ───●       │   │
│  │   Active in: OSQR Project, VoiceQuote                    │   │
│  │   Installed: Nov 15, 2025                                │   │
│  │   ⚠️ Update available                    [Manage] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ StoryBrand Framework                   [Off] ●───      │   │
│  │   Active in: None (disabled)                             │   │
│  │   Installed: Oct 20, 2025                                │   │
│  │                                          [Manage] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Browse Marketplace →]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Plugin Conflict Resolution

### Detection Logic

```typescript
interface ConflictCheck {
  installedPlugins: InstalledPlugin[];
  activeProject?: string;
}

interface ConflictResult {
  hasConflict: boolean;
  conflictType?: 'category' | 'principle' | 'workflow' | 'context';
  conflictingPlugins?: string[];
  resolution?: 'user_choose' | 'context_switch' | 'blend';
}

function detectConflicts(check: ConflictCheck): ConflictResult {
  const activeMethodologyPlugins = check.installedPlugins
    .filter(p => p.plugin.type === 'methodology' && p.enabled);

  // No conflict if 0 or 1 methodology plugins
  if (activeMethodologyPlugins.length <= 1) {
    return { hasConflict: false };
  }

  // Check for overlapping trigger contexts
  const contextOverlap = findContextOverlap(activeMethodologyPlugins);

  if (contextOverlap.length > 0) {
    return {
      hasConflict: true,
      conflictType: 'context',
      conflictingPlugins: contextOverlap.map(p => p.id),
      resolution: 'user_choose'
    };
  }

  return { hasConflict: false };
}
```

### Resolution UI

When Oscar detects a context where multiple methodology plugins could apply:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔀 Multiple approaches available                               │
│                                                                 │
│  Your question about "building my legacy" matches:              │
│                                                                 │
│  ○ Fourth Generation Formula                                    │
│    Focus: Multi-generational wealth transfer                    │
│                                                                 │
│  ○ StoryBrand Framework                                         │
│    Focus: Clarifying your message and story                     │
│                                                                 │
│  Which approach would you like Oscar to use?                    │
│                                                                 │
│  [Use FGF]  [Use StoryBrand]  [Let Oscar decide]               │
│                                                                 │
│  ☐ Remember this choice for similar questions                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow

### Purchase Sequence

```
1. User clicks "Install Plugin" ($49)
           │
           ▼
2. OSQR creates Stripe PaymentIntent
   - amount: $49.00
   - application_fee_amount: $9.80 (20%)
   - transfer_data.destination: creator_stripe_account
           │
           ▼
3. User completes payment
           │
           ▼
4. Stripe webhook → OSQR
   - payment_intent.succeeded
           │
           ▼
5. OSQR:
   - Creates install record
   - Logs transaction
   - Activates plugin for user
           │
           ▼
6. Stripe automatically:
   - Transfers $39.20 to creator (80%)
   - Deposits $9.80 to OSQR (20%)
```

### Payout Schedule

| Condition | Action |
|-----------|--------|
| Creator balance ≥ $100 | Eligible for payout |
| Payout day | 15th of each month |
| New creator | First payout after 30 days |
| Refund within 7 days | Deducted from creator balance |

---

## Success Criteria

1. [ ] Marketplace loads in <2 seconds
2. [ ] Plugin install completes in <5 seconds
3. [ ] Creator receives payout within 30 days of first sale
4. [ ] Plugin search returns relevant results (>80% relevance)
5. [ ] Zero payment processing errors in first month
6. [ ] 10+ plugins live at launch
7. [ ] Creator portal shows real-time sales data
8. [ ] Plugin conflicts resolved without user confusion
9. [ ] Mobile-responsive marketplace UI
10. [ ] Review system prevents spam/abuse

---

## Open Questions

### Product Questions
- [ ] **Free plugins?** Should creators be able to offer free plugins? If so, how do we prevent low-quality spam?
- [ ] **Pricing tiers?** Should there be a max/min price? Suggested price ranges by category?
- [ ] **Trial period?** Can users try a plugin before buying? For how long?
- [ ] **Refund policy?** 7 days? 30 days? No refunds? Partial for multi-session incomplete?

### Technical Questions
- [ ] **Plugin updates?** How do users get updates? Auto-update or manual?
- [ ] **Version compatibility?** What happens when OSQR v1.5 breaks a v1.0 plugin?
- [ ] **Data migration?** If user uninstalls then reinstalls, is their progress preserved?
- [ ] **Offline access?** Can methodology plugins work offline?

### Business Questions
- [ ] **Creator vetting?** Open submission or invite-only at launch?
- [ ] **Category ownership?** Can we have "official" category partners?
- [ ] **Enterprise licensing?** Bulk purchase for teams?
- [ ] **Affiliate program?** Creators refer other creators?

---

## Research Foundation

This specification was informed by research from the OSQR NotebookLM knowledge vault on:

- MCP (Model Context Protocol) plugin architecture
- n8n workflow and node patterns
- Marketplace network effects and critical mass
- Methodology-based vs tool-based plugin differentiation
- Context engineering and sharding strategies
- MentorScript and BriefingScript patterns
- Creator economy platforms (Gumroad, Teachable models)
- Stripe Connect for marketplace payments

---

## Appendices

### A: Category Taxonomy (Initial)

```
Business & Strategy
├── Business Strategy
├── Sales & Marketing
├── Leadership
└── Entrepreneurship

Personal Development
├── Productivity
├── Health & Fitness
├── Spirituality & Purpose
└── Relationships

Legacy & Family
├── Parenting
├── Wealth Transfer
├── Family Business
└── Estate Planning

Creative & Content
├── Writing & Content
├── Speaking & Presentation
├── Design Thinking
└── Innovation

Technical
├── Software Development
├── Product Management
├── Data & Analytics
└── AI & Automation
```

### B: Launch Plugin Candidates

| Plugin | Creator | Category | Status |
|--------|---------|----------|--------|
| Fourth Generation Formula | Kable Record | Legacy & Family | Ready |
| [Friend 1's methodology] | TBD | TBD | Invited |
| [Friend 2's methodology] | TBD | TBD | Invited |
| [Colleague framework] | TBD | TBD | Invited |

### C: File Structure

```
/src/marketplace/
├── index.ts
├── types.ts
├── api/
│   ├── plugins.ts           # Plugin CRUD
│   ├── purchases.ts         # Payment handling
│   ├── reviews.ts           # Review system
│   ├── creators.ts          # Creator portal
│   └── analytics.ts         # Usage tracking
├── components/
│   ├── MarketplaceHome.tsx
│   ├── PluginCard.tsx
│   ├── PluginDetail.tsx
│   ├── CategoryNav.tsx
│   ├── SearchBar.tsx
│   ├── ReviewList.tsx
│   ├── InstallButton.tsx
│   └── MyPlugins.tsx
├── creator-portal/
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   ├── PluginEditor.tsx
│   ├── PayoutHistory.tsx
│   └── ReviewManager.tsx
├── plugin-builder/
│   ├── BuilderFlow.tsx
│   ├── steps/
│   │   ├── BasicInfo.tsx
│   │   ├── Audience.tsx
│   │   ├── Principles.tsx
│   │   ├── Workflows.tsx
│   │   └── Preview.tsx
│   └── manifest-generator.ts
├── services/
│   ├── stripe.ts            # Payment processing
│   ├── registry.ts          # Plugin registry
│   ├── conflict-resolver.ts # Conflict detection
│   └── analytics.ts         # Usage tracking
└── __tests__/
    ├── plugins.test.ts
    ├── purchases.test.ts
    ├── conflict-resolver.test.ts
    └── manifest-generator.test.ts
```

### D: Glossary

| Term | Definition |
|------|------------|
| **Methodology Plugin** | Plugin that modifies Oscar's behavior, approach, and questioning patterns |
| **Tool Plugin** | Plugin that adds functional capabilities (MCP-based) |
| **Sharding** | Breaking methodology context into smaller pieces for JIT loading |
| **JIT Loading** | Just-in-time retrieval of only relevant plugin context |
| **Context Budget** | Maximum percentage of context window a plugin can consume |
| **Creator Portal** | Dashboard where plugin creators manage their plugins and revenue |
| **Plugin Builder** | Guided flow for creating methodology plugins without coding |
| **MRP** | Merge-Readiness Pack - evidence bundle for quality verification |
| **Trigger Context** | Keywords/topics that activate specific plugin principles |

---

**End of Specification**

*Document Version: 2.0.0*
*Format: OSQR Standardized Implementation Spec*
*Status: Ready for Implementation (Post v1.0)*
*Next Review: When v1.0 Complete*
