/**
 * Research Storage - PKV Integration
 *
 * Handles persistence of research documents to the Personal Knowledge Vault.
 * Research outputs are chunked, embedded, and cross-referenced.
 *
 * @see docs/features/OSQR_DEEP_RESEARCH_SPEC.md
 */

import type {
  ResearchDocument,
  ResearchTemplate,
  ResearchDepth,
  ModelId,
} from '../types';

// =============================================================================
// Storage Interfaces
// =============================================================================

export interface StoredResearchSession {
  id: string;
  userId: string;
  workspaceId: string;
  projectId: string | null;

  // Query
  originalQuery: string;
  refinedQuery: string | null;
  template: ResearchTemplate;
  depth: ResearchDepth;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  phase: number | null;
  progress: number | null;

  // Results (serialized JSON)
  reports: string | null;
  critiques: string | null;
  synthesis: string | null;

  // Metadata
  modelsUsed: ModelId[];
  tokenCost: number | null;
  executionTime: number | null;

  // Staleness
  stalenessDecay: number;
  refreshAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTribunalUsage {
  id: string;
  userId: string;
  month: string; // 'YYYY-MM'
  sessionsUsed: number;
  packsPurchased: number;
}

// =============================================================================
// Research Storage Service (Skeleton)
// =============================================================================

/**
 * ResearchStorage
 *
 * Manages persistence of research sessions and documents.
 *
 * TODO: Implement with Prisma client
 */
export class ResearchStorage {
  /**
   * Create a new research session
   */
  async createSession(params: {
    userId: string;
    workspaceId: string;
    projectId?: string;
    query: string;
    template: ResearchTemplate;
    depth: ResearchDepth;
  }): Promise<StoredResearchSession> {
    // TODO: Create session in database
    throw new Error('Not implemented');
  }

  /**
   * Get a research session by ID
   */
  async getSession(sessionId: string): Promise<StoredResearchSession | null> {
    // TODO: Query session from database
    throw new Error('Not implemented');
  }

  /**
   * Update session status and progress
   */
  async updateProgress(
    sessionId: string,
    update: {
      status?: 'pending' | 'in_progress' | 'completed' | 'failed';
      phase?: number;
      progress?: number;
    }
  ): Promise<void> {
    // TODO: Update session in database
    throw new Error('Not implemented');
  }

  /**
   * Store completed research results
   */
  async storeResults(
    sessionId: string,
    document: ResearchDocument
  ): Promise<void> {
    // TODO: Serialize and store document
    // TODO: Trigger document indexing for PKV
    throw new Error('Not implemented');
  }

  /**
   * List research sessions for a user
   */
  async listUserSessions(
    userId: string,
    options?: {
      workspaceId?: string;
      projectId?: string;
      template?: ResearchTemplate;
      limit?: number;
      offset?: number;
    }
  ): Promise<StoredResearchSession[]> {
    // TODO: Query sessions with filters
    throw new Error('Not implemented');
  }

  /**
   * Get sessions that need refresh prompts
   */
  async getStaleResearch(userId: string): Promise<StoredResearchSession[]> {
    // TODO: Query sessions where refreshAt < now
    throw new Error('Not implemented');
  }

  /**
   * Delete a research session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // TODO: Delete session and related documents from PKV
    throw new Error('Not implemented');
  }
}

// =============================================================================
// Tribunal Usage Tracking (Skeleton)
// =============================================================================

const MONTHLY_TRIBUNAL_LIMIT = 3;

/**
 * TribunalUsageTracker
 *
 * Tracks Tribunal session usage per user per month.
 */
export class TribunalUsageTracker {
  /**
   * Check if user can use Tribunal
   */
  async canUseTribunal(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    total: number;
  }> {
    // TODO: Check usage for current month
    throw new Error('Not implemented');
  }

  /**
   * Record a Tribunal usage
   */
  async recordUsage(userId: string): Promise<void> {
    // TODO: Increment usage counter
    throw new Error('Not implemented');
  }

  /**
   * Add purchased sessions to user's quota
   */
  async addPurchasedSessions(userId: string, count: number): Promise<void> {
    // TODO: Add sessions from pack purchase
    throw new Error('Not implemented');
  }

  /**
   * Get current month's usage
   */
  async getUsage(userId: string): Promise<StoredTribunalUsage> {
    // TODO: Get or create usage record
    throw new Error('Not implemented');
  }

  /**
   * Get current month key (YYYY-MM)
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

// =============================================================================
// Document Indexing Integration (Skeleton)
// =============================================================================

/**
 * Index research document in PKV
 *
 * Chunks, embeds, and cross-references research outputs.
 */
export async function indexResearchDocument(
  document: ResearchDocument
): Promise<void> {
  // TODO: Chunk the synthesis and reports
  // TODO: Generate embeddings
  // TODO: Extract entities for cross-referencing
  // TODO: Store in document store
  throw new Error('Not implemented');
}

/**
 * Search research documents
 */
export async function searchResearch(
  userId: string,
  query: string,
  options?: {
    workspaceId?: string;
    projectId?: string;
    template?: ResearchTemplate;
    limit?: number;
  }
): Promise<ResearchDocument[]> {
  // TODO: Vector search across research documents
  throw new Error('Not implemented');
}

// =============================================================================
// Exports
// =============================================================================

export const researchStorage = new ResearchStorage();
export const tribunalUsageTracker = new TribunalUsageTracker();
