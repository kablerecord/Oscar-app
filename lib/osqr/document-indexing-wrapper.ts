/**
 * Document Indexing Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags } from './config';

export type DocumentType =
  | 'markdown'
  | 'plaintext'
  | 'code'
  | 'json'
  | 'yaml'
  | 'html'
  | 'pdf'
  | 'docx';

export type InterfaceType = 'web' | 'vscode' | 'mobile' | 'voice' | 'api';

export interface IndexingResult {
  success: boolean;
  documentId: string;
  chunks: number;
  relationships: number;
  processingTimeMs: number;
  error?: string;
}

export interface SearchResult {
  documentId: string;
  documentName: string;
  chunkContent: string;
  relevanceScore: number;
  projectId: string | null;
  createdAt: Date;
}

export async function indexDocument(
  _userId: string,
  _document: {
    name: string;
    content: string;
    type: DocumentType;
    projectId?: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  },
  _options?: { interface?: InterfaceType }
): Promise<IndexingResult> {
  return {
    success: false,
    documentId: '',
    chunks: 0,
    relationships: 0,
    processingTimeMs: 0,
    error: 'Document indexing not available (osqr-core not installed)',
  };
}

export async function searchByConcept(
  _userId: string,
  _query: string,
  _options?: { filter?: Record<string, unknown>; limit?: number }
): Promise<SearchResult[]> {
  return [];
}

export async function searchByName(
  _userId: string,
  _documentName: string
): Promise<SearchResult[]> {
  return [];
}

export async function searchByTime(
  _userId: string,
  _options: { start: Date; end: Date }
): Promise<{ documentId: string; documentName: string; modifiedAt: Date }[]> {
  return [];
}

export async function searchAcrossProjects(
  _userId: string,
  _query: string,
  _projectIds: string[]
): Promise<{ projectId: string; results: SearchResult[] }[]> {
  return [];
}

export async function getIndexingStats(_userId: string): Promise<{
  documentCount: number;
  chunkCount: number;
  totalTokens: number;
  lastIndexed: Date | null;
}> {
  return { documentCount: 0, chunkCount: 0, totalTokens: 0, lastIndexed: null };
}

export async function removeDocument(_documentPath: string): Promise<boolean> {
  return false;
}

export async function reindexDocument(
  _userId: string,
  _documentId: string,
  _document: {
    name: string;
    content: string;
    type: DocumentType;
    projectId?: string;
    conversationId?: string;
  },
  _options?: { interface?: InterfaceType }
): Promise<IndexingResult> {
  return {
    success: false,
    documentId: _documentId,
    chunks: 0,
    relationships: 0,
    processingTimeMs: 0,
    error: 'Document indexing not available (osqr-core not installed)',
  };
}

export function detectDocumentType(filename: string): DocumentType | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, DocumentType> = {
    md: 'markdown',
    txt: 'plaintext',
    js: 'code',
    ts: 'code',
    py: 'code',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    html: 'html',
    htm: 'html',
    pdf: 'pdf',
    docx: 'docx',
  };
  return typeMap[ext || ''] || null;
}

export function isSupported(filename: string): boolean {
  return detectDocumentType(filename) !== null;
}
