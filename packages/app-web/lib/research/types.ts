/**
 * Deep Research System Type Definitions
 *
 * @see docs/features/OSQR_DEEP_RESEARCH_SPEC.md for full specification
 *
 * Key Decisions (Dec 2024):
 * - Web search: Tavily (cost + API simplicity)
 * - Sources per model: 10-15
 * - Model failure: Complete with 2, note in synthesis
 * - Timeout: 2 min per model per phase (8 min max Tribunal)
 * - Background jobs: Inngest (Trigger.dev fallback)
 * - Tribunal quota: 3/month, separate from daily token budget
 * - Carousel: Tabs + keyboard (desktop), swipe (mobile)
 * - Export V1.5: Markdown only (PDF in V2.0)
 * - Models V1.5: Locked to Claude/GPT-4o/Gemini
 * - Research history: Dedicated /research sidebar tab
 */

// =============================================================================
// Research Templates
// =============================================================================

export type ResearchTemplate =
  | 'general'
  | 'competitor_analysis'
  | 'market_sizing'
  | 'technical_evaluation'
  | 'enterprise_account_plan' // Master only
  | 'legal_compliance' // Master only
  | 'investment_research'; // Master only

export type ResearchDepth = 'quick' | 'standard' | 'comprehensive' | 'tribunal';

export type ResearchStatus =
  | 'pending'
  | 'scoping'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TribunalPhase = 1 | 2 | 3 | 4;

export type ModelId = 'claude' | 'gpt4o' | 'gemini';

// =============================================================================
// Research Query
// =============================================================================

export interface ResearchQuery {
  original: string;
  refined: string;
  template: ResearchTemplate;
  depth: ResearchDepth;
  sourcePreferences: string[];
  timeframeFilter: string | null;
}

// =============================================================================
// Research Reports
// =============================================================================

export interface SourceReference {
  title: string;
  url: string;
  domain: string;
  publishedAt?: Date;
  confidenceScore: number; // 0-1
}

export interface ModelReport {
  model: ModelId;
  version: 1 | 2; // v1 = original, v2 = post-critique (Tribunal only)
  content: string;
  sources: SourceReference[];
  generatedAt: Date;
  tokenCount: number;
}

// =============================================================================
// Tribunal-Specific Types
// =============================================================================

export interface ModelCritique {
  critic: ModelId;
  targetModel: ModelId;
  content: string;
  keyPoints: string[];
  agreements: string[];
  disagreements: string[];
}

export interface TribunalProgress {
  phase: TribunalPhase;
  phaseLabel: string;
  percentComplete: number;
  phaseDetails: {
    phase1?: {
      claudeComplete: boolean;
      gpt4oComplete: boolean;
      geminiComplete: boolean;
      sourceCounts: Record<ModelId, number>;
    };
    phase2?: {
      critiquesComplete: number; // 0-6
    };
    phase3?: {
      revisionsComplete: number; // 0-3
    };
    phase4?: {
      synthesisStarted: boolean;
      synthesisComplete: boolean;
    };
  };
  estimatedTimeRemaining: number; // seconds
}

// =============================================================================
// Synthesis
// =============================================================================

export type ConsensusLevel = 'high' | 'medium' | 'low' | 'divergent';

export interface ResearchSynthesis {
  summary: string; // 2-3 sentence takeaway
  keyFindings: string[];
  consensusPoints: string[];
  dissentPoints: string[];
  fullReport: string;
  consensusLevel: ConsensusLevel;
  generatedAt: Date;
}

// =============================================================================
// Full Research Document
// =============================================================================

export interface ResearchDocument {
  id: string;
  userId: string;
  workspaceId: string;
  projectId?: string;

  // Query Context
  query: ResearchQuery;

  // Results
  reports: ModelReport[];

  // Critiques (Tribunal only)
  critiques: ModelCritique[] | null;

  // Synthesis
  synthesis: ResearchSynthesis;

  // Metadata
  metadata: {
    tier: 'pro' | 'master';
    mode: ResearchDepth;
    modelsUsed: ModelId[];
    executionTime: number; // ms
    tokenCost: number;
    templateUsed: ResearchTemplate;
    backgroundExecution: boolean;
  };

  // Cross-References (populated by Document Indexing)
  crossReferences: {
    relatedDocuments: string[];
    relatedConversations: string[];
    detectedEntities: string[];
    generatedArtifacts: string[]; // IDs of follow-up docs
  };

  // Temporal
  createdAt: Date;
  stalenessConfig: {
    decayDays: number;
    refreshPromptAt: Date;
    autoRefresh: boolean;
    triggers: string[]; // e.g., 'leadership_change', 'acquisition'
  };

  // User Engagement (analytics)
  engagement: {
    viewedSummary: boolean;
    viewedFullReport: boolean;
    carouselItemsViewed: ModelId[];
    critiquesViewed: boolean;
    actionsTaken: string[];
  };
}

// =============================================================================
// Template Definitions
// =============================================================================

export interface TemplateDefinition {
  id: ResearchTemplate;
  name: string;
  description: string;
  defaultStaleness: number; // days
  requiredTier: 'pro' | 'master';
  scopingQuestions: string[];
  outputStructure: string; // Markdown template
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface InitiateResearchRequest {
  query: string;
  template?: ResearchTemplate;
  depth?: ResearchDepth;
  workspaceId: string;
  projectId?: string;
  runInBackground?: boolean;
}

export interface InitiateResearchResponse {
  sessionId: string;
  status: ResearchStatus;
  scopingQuestions?: string[];
  estimatedTime?: number; // seconds
}

export interface ResearchProgressResponse {
  sessionId: string;
  status: ResearchStatus;
  progress: TribunalProgress | null;
  partialResults?: Partial<ResearchDocument>;
}

export interface ResearchCompleteResponse {
  sessionId: string;
  document: ResearchDocument;
  suggestedActions: string[];
}

// =============================================================================
// Tribunal Usage Tracking
// =============================================================================

export interface TribunalUsage {
  userId: string;
  month: string; // 'YYYY-MM'
  sessionsUsed: number;
  sessionsIncluded: number; // default 3
  packsPurchased: number;
  totalAvailable: number;
}

export interface TribunalPackPurchase {
  packSize: 1 | 5 | 10;
  price: number; // $5, $20, $35
  pricePerSession: number;
}

export const TRIBUNAL_PACKS: TribunalPackPurchase[] = [
  { packSize: 1, price: 5, pricePerSession: 5.0 },
  { packSize: 5, price: 20, pricePerSession: 4.0 },
  { packSize: 10, price: 35, pricePerSession: 3.5 },
];

// =============================================================================
// Configuration Constants
// =============================================================================

/** Web search provider for research */
export const SEARCH_PROVIDER = 'tavily' as const;

/** Target sources per model query */
export const SOURCES_PER_MODEL = { min: 10, max: 15 };

/** Timeout per model per phase in milliseconds */
export const MODEL_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/** Maximum Tribunal execution time */
export const TRIBUNAL_MAX_TIME_MS = 8 * 60 * 1000; // 8 minutes

/** Models locked for V1.5 */
export const TRIBUNAL_MODELS: ModelId[] = ['claude', 'gpt4o', 'gemini'];

/** Monthly Tribunal sessions included with Master tier */
export const TRIBUNAL_MONTHLY_INCLUDED = 3;

// =============================================================================
// API Endpoints
// =============================================================================

export const RESEARCH_API = {
  /** POST - Initiate new research */
  INITIATE: '/api/oscar/research',

  /** GET - Get research results */
  GET_RESULTS: (id: string) => `/api/oscar/research/${id}`,

  /** GET - Poll progress for background research */
  GET_STATUS: (id: string) => `/api/oscar/research/${id}/status`,

  /** POST - Cancel in-progress research */
  CANCEL: (id: string) => `/api/oscar/research/${id}/cancel`,

  /** GET - List available templates */
  TEMPLATES: '/api/oscar/research/templates',

  /** GET - Check Tribunal sessions remaining */
  TRIBUNAL_USAGE: '/api/oscar/research/tribunal/usage',

  /** POST - Purchase Tribunal pack (Stripe) */
  TRIBUNAL_PURCHASE: '/api/oscar/research/tribunal/purchase',
} as const;

// =============================================================================
// Model Failure Handling
// =============================================================================

export interface ModelFailure {
  model: ModelId;
  phase: TribunalPhase;
  error: string;
  timestamp: Date;
}

export interface TribunalWithFailures {
  completedModels: ModelId[];
  failedModels: ModelFailure[];
  /** True if at least 2 models completed */
  canSynthesize: boolean;
}

/**
 * Minimum models required to complete Tribunal.
 * If fewer succeed, Tribunal fails entirely.
 */
export const TRIBUNAL_MIN_MODELS = 2;
