/**
 * OSQR Throttle System - Type Definitions
 *
 * Manages usage costs, throttling behavior, and overage pricing
 * with graceful degradation instead of hard cutoffs.
 *
 * PRICING UPDATED: December 30, 2024
 * Source of truth: https://www.osqr.app/pricing
 *
 * Current live tiers:
 * - Pro: $49/mo ($39 founder) - 75 queries/day, 5 councils/day
 * - Master: $149/mo ($119 founder) - 200 queries/day, 15 councils/day
 * - Elite: Custom (invite-only) - Unlimited with soft caps
 * - Enterprise: Custom - Team tier
 *
 * Lite tier: Planned for future (post-1,000 users), not currently visible
 * Founder pricing: First 500 users get locked pricing for life
 */

// ============================================================================
// Tier Definitions
// ============================================================================

// Note: 'lite' is kept in type for future use but not currently active/visible
// Note: 'elite' is invite-only and not publicly visible
export type Tier = 'lite' | 'pro' | 'master' | 'elite' | 'enterprise';

// Tiers that are currently active and visible to users
// Note: 'elite' is invite-only and not publicly visible
export const ACTIVE_TIERS: Tier[] = ['pro', 'master', 'enterprise'];
export const ALL_TIERS: Tier[] = ['lite', 'pro', 'master', 'elite', 'enterprise'];

export interface TierConfig {
  name: string;
  monthlyPrice: number; // Regular pricing
  futurePrice: number; // Price after founder period ends
  founderPrice: number; // Price for first 500 users
  founderCutoff: number; // Number of founder spots (500)
  isActive: boolean; // Whether this tier is currently available
  isInviteOnly?: boolean; // Whether this tier requires invitation
  documentsInVault: number;
  queriesPerDay: number;
  councilsPerDay: number; // Council sessions per day
  storageGB: number;
  // Response modes
  quickMode: boolean;
  thoughtfulMode: boolean;
  contemplateMode: boolean;
  councilMode: boolean;
  // Features
  voiceMode: boolean;
  priorityProcessing: boolean;
  weeklyReviews: boolean;
  customAgentBuilder: boolean; // Coming soon
  vscodeExtension: boolean;
  apiAccess: boolean;
  teamCollaboration: boolean; // Coming soon
  ssoSecurity: boolean;
  // Limits
  maxFileSizeMB: number;
  aiModelsAvailable: number;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  // LITE: Future tier (post-1,000 users) - NOT CURRENTLY ACTIVE
  lite: {
    name: 'Lite',
    monthlyPrice: 29, // Planned price
    futurePrice: 49,
    founderPrice: 29,
    founderCutoff: 0, // Not applicable - launches post-founder
    isActive: false, // NOT VISIBLE TO USERS
    documentsInVault: 50,
    queriesPerDay: 25,
    councilsPerDay: 0,
    storageGB: 2,
    // Response modes
    quickMode: true,
    thoughtfulMode: false,
    contemplateMode: false,
    councilMode: false,
    // Features
    voiceMode: false,
    priorityProcessing: false,
    weeklyReviews: false,
    customAgentBuilder: false,
    vscodeExtension: false,
    apiAccess: false,
    teamCollaboration: false,
    ssoSecurity: false,
    // Limits
    maxFileSizeMB: 10,
    aiModelsAvailable: 1,
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 49, // CHANGED from 99
    futurePrice: 49, // Same as monthly (no future increase planned)
    founderPrice: 39, // Founder pricing
    founderCutoff: 500, // First 500 users
    isActive: true,
    documentsInVault: 500,
    queriesPerDay: 75, // CHANGED from 100
    councilsPerDay: 5, // Council limit
    storageGB: 10,
    // Response modes
    quickMode: true,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true, // CHANGED from false - Pro now gets Council!
    // Features
    voiceMode: true,
    priorityProcessing: false,
    weeklyReviews: false,
    customAgentBuilder: false,
    vscodeExtension: true,
    apiAccess: false,
    teamCollaboration: false,
    ssoSecurity: false,
    // Limits
    maxFileSizeMB: 25,
    aiModelsAvailable: 3, // CHANGED from 2 (for Council)
  },
  master: {
    name: 'Master',
    monthlyPrice: 149, // CHANGED from 249
    futurePrice: 149, // Same as monthly
    founderPrice: 119, // Founder pricing
    founderCutoff: 500, // First 500 users
    isActive: true,
    documentsInVault: 1500,
    queriesPerDay: 200, // CHANGED from 300
    councilsPerDay: 15, // Council limit
    storageGB: 100,
    // Response modes
    quickMode: true,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true,
    // Features
    voiceMode: true,
    priorityProcessing: true,
    weeklyReviews: true,
    customAgentBuilder: true, // Coming soon
    vscodeExtension: true,
    apiAccess: false,
    teamCollaboration: false,
    ssoSecurity: false,
    // Limits
    maxFileSizeMB: 50,
    aiModelsAvailable: 4,
  },
  // ELITE: Secret, invite-only tier for power users
  elite: {
    name: 'Elite',
    monthlyPrice: 0, // Custom pricing
    futurePrice: 0, // Custom pricing
    founderPrice: 0, // Custom pricing
    founderCutoff: 0, // Not applicable
    isActive: true, // Active but invite-only
    isInviteOnly: true,
    documentsInVault: Infinity,
    queriesPerDay: Infinity, // Soft cap at 1000 (enforced separately)
    councilsPerDay: Infinity, // Soft cap at 50 (enforced separately)
    storageGB: Infinity,
    // Response modes
    quickMode: true,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true,
    // Features
    voiceMode: true,
    priorityProcessing: true,
    weeklyReviews: true,
    customAgentBuilder: true,
    vscodeExtension: true,
    apiAccess: true, // Elite gets API access
    teamCollaboration: false,
    ssoSecurity: false,
    // Limits
    maxFileSizeMB: 100,
    aiModelsAvailable: Infinity,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    futurePrice: 0,
    founderPrice: 0, // Not applicable
    founderCutoff: 0, // Not applicable
    isActive: true,
    documentsInVault: Infinity,
    queriesPerDay: Infinity,
    councilsPerDay: Infinity,
    storageGB: Infinity,
    // Response modes
    quickMode: true,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true,
    // Features
    voiceMode: true,
    priorityProcessing: true,
    weeklyReviews: true,
    customAgentBuilder: true,
    vscodeExtension: true,
    apiAccess: true,
    teamCollaboration: true, // Coming soon
    ssoSecurity: true,
    // Limits
    maxFileSizeMB: 100,
    aiModelsAvailable: Infinity,
  },
};

// ============================================================================
// Budget & Usage
// ============================================================================

export type BudgetState = 'full' | 'high' | 'medium' | 'low' | 'critical' | 'depleted';

export interface DailyBudget {
  userId: string;
  tier: Tier;
  date: string; // YYYY-MM-DD in user's timezone
  premiumQueriesUsed: number;
  premiumQueriesLimit: number;
  economyQueriesUsed: number;
  economyQueriesLimit: number; // Usually Infinity, but can be limited
  overagePurchased: number;
  referralBonus: number;
  resetAt: Date; // Midnight in user's timezone
}

export interface BudgetStatus {
  state: BudgetState;
  premiumRemaining: number;
  economyRemaining: number;
  percentRemaining: number;
  nextResetAt: Date;
  overageAvailable: boolean;
  message: string;
}

// ============================================================================
// Request Classification
// ============================================================================

export type RequestComplexity = 'low' | 'medium' | 'high' | 'very_high';

export type RequestType =
  | 'simple_question'
  | 'document_summary'
  | 'cross_document_analysis'
  | 'contemplate_query'
  | 'council_session'
  | 'followup_chat'
  | 'image_analysis';

export interface RequestClassification {
  type: RequestType;
  complexity: RequestComplexity;
  requiresPremium: boolean;
  estimatedCost: number; // In dollars
}

export const REQUEST_CLASSIFICATIONS: Record<RequestType, Omit<RequestClassification, 'estimatedCost'>> = {
  simple_question: { type: 'simple_question', complexity: 'low', requiresPremium: false },
  document_summary: { type: 'document_summary', complexity: 'medium', requiresPremium: true },
  cross_document_analysis: { type: 'cross_document_analysis', complexity: 'high', requiresPremium: true },
  contemplate_query: { type: 'contemplate_query', complexity: 'high', requiresPremium: true },
  council_session: { type: 'council_session', complexity: 'very_high', requiresPremium: true },
  followup_chat: { type: 'followup_chat', complexity: 'low', requiresPremium: false },
  image_analysis: { type: 'image_analysis', complexity: 'medium', requiresPremium: true },
};

// ============================================================================
// Model Routing
// ============================================================================

export type ModelType = 'premium' | 'economy' | 'emergency';

// Alias for test compatibility
export type ModelTier = ModelType;

export interface ModelConfig {
  id: string;
  model: string;
  tier: ModelType;
  maxTokens: number;
  temperature: number;
}

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  premium: {
    id: 'claude-sonnet',
    model: 'claude-sonnet',
    tier: 'premium',
    maxTokens: 4000,
    temperature: 0.3,
  },
  economy: {
    id: 'groq-llama-70b',
    model: 'groq-llama-70b',
    tier: 'economy',
    maxTokens: 2000,
    temperature: 0.2,
  },
  emergency: {
    id: 'gemini-flash',
    model: 'gemini-flash',
    tier: 'emergency',
    maxTokens: 500,
    temperature: 0.1,
  },
};

export interface RoutingDecision {
  modelType: ModelType;
  modelConfig: ModelConfig;
  throttled: boolean;
  degraded: boolean;
  showUpgradePrompt: boolean;
  message: string | null;
}

// ============================================================================
// Overage Packages
// ============================================================================

export interface OveragePackage {
  id: string;
  name: string;
  price: number;
  queries: number;
  type: 'contemplate' | 'council';
  description: string;
}

export const OVERAGE_PACKAGES: OveragePackage[] = [
  {
    id: 'boost_5',
    name: '5 Queries',
    price: 5,
    queries: 5,
    type: 'contemplate',
    description: 'Quick boost of queries',
  },
  {
    id: 'boost_25',
    name: '25 Queries',
    price: 20,
    queries: 25,
    type: 'contemplate',
    description: 'Standard query pack',
  },
  {
    id: 'boost_100',
    name: '100 Queries',
    price: 60,
    queries: 100,
    type: 'contemplate',
    description: 'Power user pack',
  },
  {
    id: 'contemplate-10',
    name: '10 Contemplate Queries',
    price: 10,
    queries: 10,
    type: 'contemplate',
    description: 'Deep analysis queries',
  },
  {
    id: 'council-5',
    name: '5 Council Sessions',
    price: 12,
    queries: 5,
    type: 'council',
    description: 'Multi-perspective analysis (Pro tier)',
  },
  {
    id: 'council-10',
    name: '10 Council Sessions',
    price: 20,
    queries: 10,
    type: 'council',
    description: 'Multi-perspective analysis',
  },
];

export interface OveragePurchase {
  id: string;
  userId: string;
  packageId: string;
  purchasedAt: Date;
  queriesRemaining: number;
  expiresAt: Date | null; // null = doesn't expire
}

// ============================================================================
// Throttle Messages
// ============================================================================

export interface ThrottleMessage {
  state: BudgetState;
  message: string;
  showOptions: boolean;
  options?: ThrottleOption[];
}

export interface ThrottleOption {
  action: 'wait' | 'buy' | 'upgrade' | 'enterprise';
  label: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Plugin Trials
// ============================================================================

export interface PluginTrial {
  userId: string;
  pluginId: string;
  startedAt: Date;
  endsAt: Date;
  isActive: boolean;
}

// ============================================================================
// Referrals
// ============================================================================

export interface ReferralBonus {
  userId: string;
  referredUserId: string;
  date: string;
  bonusQueries: number;
  used: boolean;
}

// ============================================================================
// Throttle Events
// ============================================================================

export type ThrottleEventType =
  | 'budget_low'
  | 'budget_depleted'
  | 'overage_purchased'
  | 'tier_upgraded'
  | 'reset_occurred'
  | 'referral_bonus';

export interface ThrottleEvent {
  type: ThrottleEventType;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// ============================================================================
// Capability Cost Tracking
// ============================================================================

/**
 * AI capability types that can be tracked for costs
 */
export type CapabilityType =
  | 'web_search'
  | 'code_execution'
  | 'image_generation'
  | 'vision_analysis'
  | 'file_search'
  | 'deep_research'
  | 'voice_input'
  | 'voice_output';

/**
 * Cost configuration for a capability
 */
export interface CapabilityCost {
  capability: CapabilityType;
  baseCost: number;               // Base cost per use in USD
  variableCost?: {
    unit: 'token' | 'second' | 'character' | 'image';
    rate: number;                 // Cost per unit
  };
}

/**
 * Capability cost definitions
 */
export const CAPABILITY_COSTS: Record<CapabilityType, CapabilityCost> = {
  web_search: {
    capability: 'web_search',
    baseCost: 0.01,
  },
  code_execution: {
    capability: 'code_execution',
    baseCost: 0.03,
    variableCost: { unit: 'second', rate: 0.001 },
  },
  image_generation: {
    capability: 'image_generation',
    baseCost: 0.04,               // Standard 1024x1024
  },
  vision_analysis: {
    capability: 'vision_analysis',
    baseCost: 0.01,
    variableCost: { unit: 'token', rate: 0.00001 },
  },
  file_search: {
    capability: 'file_search',
    baseCost: 0.005,
  },
  deep_research: {
    capability: 'deep_research',
    baseCost: 0.20,               // Multiple searches + synthesis
  },
  voice_input: {
    capability: 'voice_input',
    baseCost: 0,
    variableCost: { unit: 'second', rate: 0.0001 },  // ~$0.006/min
  },
  voice_output: {
    capability: 'voice_output',
    baseCost: 0,
    variableCost: { unit: 'character', rate: 0.000015 },
  },
};

/**
 * Usage data for capability cost calculation
 */
export interface CapabilityUsage {
  capability: CapabilityType;
  tokens?: number;
  seconds?: number;
  characters?: number;
  images?: number;
}

/**
 * Daily capability usage record
 */
export interface DailyCapabilityUsage {
  userId: string;
  date: string;                   // YYYY-MM-DD
  usageByCapability: Record<CapabilityType, {
    count: number;                // Number of times used
    totalCost: number;            // Total cost in USD
  }>;
  totalCost: number;              // Sum of all capability costs
}
