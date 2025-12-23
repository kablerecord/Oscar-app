/**
 * Memory Vault Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags } from './config';

export interface MemorySearchResult {
  content: string;
  relevanceScore: number;
  category: string;
  createdAt: Date;
  source: string;
}

export interface ContextBundle {
  memories: MemorySearchResult[];
  episodicContext: string[];
  retrievalTimeMs: number;
}

export interface CrossProjectResult {
  memories: Array<{
    memory: MemorySearchResult;
    relevance: number;
    project: string | null;
  }>;
  commonThemes: string[];
  contradictions: Array<{
    memoryId: string;
    contradictingMemoryId: string;
    topic: string;
    claimA: string;
    claimB: string;
    confidence: number;
  }>;
  projectSummaries: Map<string, string>;
}

export interface SourceContext {
  projectId: string | null;
  conversationId: string | null;
  documentId: string | null;
  interface: 'web' | 'vscode' | 'mobile' | 'voice' | 'api';
  timestamp: Date;
}

export function initializeVault(_workspaceId: string): void {
  // No-op stub
}

export async function getContextForQuery(
  _query: string,
  _workspaceId: string,
  _options?: {
    maxMemories?: number;
    categories?: string[];
    minRelevance?: number;
  }
): Promise<ContextBundle> {
  return {
    memories: [],
    episodicContext: [],
    retrievalTimeMs: 0,
  };
}

export function storeMessage(
  _conversationId: string,
  _role: 'user' | 'assistant',
  _content: string
): void {
  // No-op stub
}

export async function searchMemories(
  _workspaceId: string,
  _query: string,
  _filters?: Record<string, unknown>
): Promise<MemorySearchResult[]> {
  return [];
}

export function formatMemoriesForPrompt(_memories: MemorySearchResult[]): string {
  return '';
}

export function formatEpisodicForPrompt(_episodic: string[]): string {
  return '';
}

export async function getFormattedContext(
  _query: string,
  _workspaceId: string
): Promise<string> {
  return '';
}

export function storeMessageWithContext(
  _conversationId: string,
  _role: 'user' | 'assistant',
  _content: string,
  _context: SourceContext
): void {
  // No-op stub
}

export async function queryCrossProject(
  _workspaceId: string,
  _query: string,
  _options?: {
    projectIds?: string[];
    includeConversations?: boolean;
    includeDocuments?: boolean;
    timeRange?: { start: Date; end: Date };
    limit?: number;
    detectContradictions?: boolean;
  }
): Promise<CrossProjectResult> {
  return {
    memories: [],
    commonThemes: [],
    contradictions: [],
    projectSummaries: new Map(),
  };
}

export async function findRelatedFromOtherProjects(
  _currentProjectId: string,
  _query: string,
  _limit?: number
): Promise<MemorySearchResult[]> {
  return [];
}

export function formatCrossProjectForPrompt(
  _results: CrossProjectResult,
  _currentProjectId?: string
): string {
  return '';
}

export async function getContextWithCrossProject(
  _query: string,
  _workspaceId: string,
  _options?: {
    currentProjectId?: string;
    maxMemories?: number;
    categories?: string[];
    minRelevance?: number;
    includeCrossProject?: boolean;
  }
): Promise<ContextBundle & { crossProjectContext?: string }> {
  return {
    memories: [],
    episodicContext: [],
    retrievalTimeMs: 0,
  };
}

export function getCrossProjectStats(): {
  memoriesWithContext: number;
  totalCrossReferences: number;
  unresolvedContradictions: number;
} {
  return {
    memoriesWithContext: 0,
    totalCrossReferences: 0,
    unresolvedContradictions: 0,
  };
}
