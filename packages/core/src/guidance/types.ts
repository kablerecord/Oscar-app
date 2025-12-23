/**
 * Project Guidance System - Type Definitions
 *
 * Implements the "Mentorship-as-Code" paradigm where user preferences
 * become version-controlled, auditable artifacts.
 */

// ============================================================================
// Core Data Structures
// ============================================================================

/**
 * Source of a MentorScript item
 */
export type MentorScriptSource = 'user_defined' | 'inferred';

/**
 * Individual guidance rule
 */
export interface MentorScriptItem {
  id: string;                           // UUID
  rule: string;                         // Natural language prose
  source: MentorScriptSource;
  originalCorrection?: string;          // Present if source === 'inferred'
  promotedFromSession?: string;         // Session ID where inference occurred
  created: Date;
  appliedCount: number;
  priority: number;                     // 1-10, default 5
}

/**
 * Reference document for guidance
 */
export interface ReferenceDoc {
  path: string;                         // e.g., "/docs/api-conventions.md"
  context: string;                      // e.g., "For API design decisions"
}

/**
 * Full project guidance
 */
export interface ProjectGuidance {
  projectId: string;
  version: number;
  lastUpdated: Date;
  mentorScripts: MentorScriptItem[];
  referenceDocs: ReferenceDoc[];
}

// ============================================================================
// Version Control
// ============================================================================

/**
 * VCR action type
 */
export type VCRAction = 'add' | 'edit' | 'remove';

/**
 * Version Control Resolution - logged for every change
 */
export interface VCR {
  version: number;
  timestamp: Date;
  action: VCRAction;
  itemId: string;
  previousState?: MentorScriptItem;
  newState?: MentorScriptItem;
}

// ============================================================================
// Inference
// ============================================================================

/**
 * Proposal status
 */
export type ProposalStatus = 'pending' | 'accepted' | 'edited' | 'dismissed';

/**
 * Rule proposal shown in chat
 */
export interface RuleProposal {
  id: string;
  proposedRule: string;
  originalCorrection: string;
  sessionId: string;
  confidence: number;                   // 0-1, threshold for showing: 0.7
  status: ProposalStatus;
  timestamp: Date;
}

/**
 * Inference result from analyzing user message
 */
export interface InferenceResult {
  shouldPropose: boolean;
  proposedRule?: string;
  confidence: number;
  reasoning: string;
}

/**
 * Correction signals detected in message
 */
export interface CorrectionSignals {
  isCorrection: boolean;
  correctionType: CorrectionType;
  originalBehavior?: string;
  desiredBehavior?: string;
}

/**
 * Types of corrections
 */
export type CorrectionType =
  | 'general'
  | 'formatting'
  | 'interaction_style'
  | 'code_output'
  | 'tone';

/**
 * Temporal scope classification
 */
export interface TemporalClassification {
  explicitAlways: boolean;
  explicitNow: boolean;
  isGeneralizable: boolean;
}

// ============================================================================
// Context Budget
// ============================================================================

/**
 * Context selection result
 */
export interface ContextBudgetResult {
  loadedItems: MentorScriptItem[];
  excludedItems: MentorScriptItem[];
  totalTokensUsed: number;
  budgetPercentage: number;             // Target: ~70%
}

/**
 * Item scoring for context selection
 */
export interface ItemScore {
  item: MentorScriptItem;
  score: number;
  breakdown: {
    relevance: number;
    priority: number;
    frequency: number;
    recency: number;
  };
}

// ============================================================================
// Precedence Arbitration
// ============================================================================

/**
 * Guidance source type
 */
export type GuidanceSourceType =
  | 'constitutional'
  | 'user_mentorscript'
  | 'plugin'
  | 'briefingscript';

/**
 * Guidance source with content
 */
export interface GuidanceSource {
  type: GuidanceSourceType;
  content: string;
  sourceId: string;
}

/**
 * Merged guidance layers result
 */
export interface MergedGuidance {
  constitutional: string[];
  userMentorScript: MentorScriptItem[];
  pluginGuidance: string[];
  briefingScript: string[];
  merged: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Guidance system configuration
 */
export interface GuidanceConfig {
  contextBudgetPercent: number;         // Default: 70
  inferenceThreshold: number;           // Default: 0.7
  softLimit: number;                    // Default: 15
  hardLimit: number;                    // Default: 25
  recencyDecayDays: number;             // Default: 40
  defaultPriority: number;              // Default: 5
}

/**
 * Default configuration
 */
export const DEFAULT_GUIDANCE_CONFIG: GuidanceConfig = {
  contextBudgetPercent: 70,
  inferenceThreshold: 0.7,
  softLimit: 15,
  hardLimit: 25,
  recencyDecayDays: 40,
  defaultPriority: 5,
};

// ============================================================================
// Events
// ============================================================================

/**
 * Event types
 */
export type GuidanceEventType =
  | 'rule_applied'
  | 'rule_proposed'
  | 'guidance_changed'
  | 'proposal_accepted'
  | 'proposal_dismissed';

/**
 * Rule applied event
 */
export interface RuleAppliedEvent {
  type: 'rule_applied';
  itemId: string;
  projectId: string;
  sessionId: string;
  timestamp: Date;
}

/**
 * Rule proposal event
 */
export interface RuleProposalEvent {
  type: 'rule_proposed';
  proposal: RuleProposal;
  projectId: string;
  sessionId: string;
}

/**
 * Guidance changed event
 */
export interface GuidanceChangedEvent {
  type: 'guidance_changed';
  projectId: string;
  vcr: VCR;
}

/**
 * Union of all events
 */
export type GuidanceEvent =
  | RuleAppliedEvent
  | RuleProposalEvent
  | GuidanceChangedEvent;

// ============================================================================
// API Types
// ============================================================================

/**
 * Create item request
 */
export interface CreateItemRequest {
  rule: string;
  priority?: number;
  source?: MentorScriptSource;
  originalCorrection?: string;
  sessionId?: string;
}

/**
 * Update item request
 */
export interface UpdateItemRequest {
  rule?: string;
  priority?: number;
}

/**
 * Rollback request
 */
export interface RollbackRequest {
  targetVersion: number;
}

/**
 * Add reference doc request
 */
export interface AddReferenceDocRequest {
  path: string;
  context: string;
}
