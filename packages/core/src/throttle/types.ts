/**
 * OSQR Throttle System - Type Definitions
 *
 * Manages usage costs, throttling behavior, and overage pricing
 * with graceful degradation instead of hard cutoffs.
 */

// ============================================================================
// Tier Definitions
// ============================================================================

export type Tier = 'lite' | 'pro' | 'master' | 'enterprise';

export interface TierConfig {
  name: string;
  monthlyPrice: number;
  documentsInVault: number;
  queriesPerDay: number;
  storageGB: number;
  thoughtfulMode: boolean;
  contemplateMode: boolean;
  councilMode: boolean;
  voiceMode: boolean;
  customPersona: boolean;
  prioritySupport: boolean;
  imageAnalysesPerMonth: number;
  pluginAccess: 'trial' | 'full' | 'priority';
  chatHistoryDays: number;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  lite: {
    name: 'Lite',
    monthlyPrice: 19,
    documentsInVault: 5,
    queriesPerDay: 10,
    storageGB: 1,
    thoughtfulMode: false,
    contemplateMode: false,
    councilMode: false,
    voiceMode: false,
    customPersona: false,
    prioritySupport: false,
    imageAnalysesPerMonth: 10,
    pluginAccess: 'trial',
    chatHistoryDays: 7,
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 49,
    documentsInVault: 25,
    queriesPerDay: 100,
    storageGB: 10,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: false,
    voiceMode: true,
    customPersona: false,
    prioritySupport: false,
    imageAnalysesPerMonth: 100,
    pluginAccess: 'full',
    chatHistoryDays: 30,
  },
  master: {
    name: 'Master',
    monthlyPrice: 149,
    documentsInVault: 100,
    queriesPerDay: Infinity,
    storageGB: 100,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true,
    voiceMode: true,
    customPersona: true,
    prioritySupport: true,
    imageAnalysesPerMonth: Infinity,
    pluginAccess: 'priority',
    chatHistoryDays: Infinity,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 0, // Custom pricing
    documentsInVault: Infinity,
    queriesPerDay: Infinity,
    storageGB: Infinity,
    thoughtfulMode: true,
    contemplateMode: true,
    councilMode: true,
    voiceMode: true,
    customPersona: true,
    prioritySupport: true,
    imageAnalysesPerMonth: Infinity,
    pluginAccess: 'priority',
    chatHistoryDays: Infinity,
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
