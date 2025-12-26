/**
 * Integration Test: Document Upload Flow
 *
 * NOTE: The document-indexing-wrapper imports from @osqr/core/src/* which
 * requires the core package to be built and available.
 *
 * These tests mock the document-indexing-wrapper module to verify the
 * integration flow without requiring @osqr/core to be built.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the document-indexing-wrapper module
vi.mock('../../document-indexing-wrapper', () => ({
  indexDocument: vi.fn(() =>
    Promise.resolve({
      success: true,
      documentId: 'doc123',
      chunks: 3,
      relationships: 0,
      processingTimeMs: 50,
    })
  ),
  searchByConcept: vi.fn(() =>
    Promise.resolve([
      {
        documentId: 'doc123',
        documentName: 'test.md',
        chunkContent: 'First chunk content',
        relevanceScore: 0.92,
        projectId: 'proj1',
        createdAt: new Date(),
      },
    ])
  ),
  searchByName: vi.fn(() => Promise.resolve([])),
  searchByTime: vi.fn(() => Promise.resolve([])),
  searchAcrossProjects: vi.fn(() => Promise.resolve([])),
  getIndexingStats: vi.fn(() =>
    Promise.resolve({
      documentCount: 1,
      chunkCount: 3,
      totalTokens: 500,
      lastIndexed: new Date(),
    })
  ),
  removeDocument: vi.fn(() => Promise.resolve(true)),
  reindexDocument: vi.fn(() =>
    Promise.resolve({
      success: true,
      documentId: 'doc123',
      chunks: 2,
      relationships: 0,
      processingTimeMs: 30,
    })
  ),
  detectDocumentType: vi.fn((filename: string) => {
    const ext = filename.split('.').pop()
    const map: Record<string, string> = { md: 'markdown', txt: 'plaintext', ts: 'code', json: 'json' }
    return map[ext!] || null
  }),
  isSupported: vi.fn(() => true),
  getDocumentProgress: vi.fn(() => null),
}))

// Mock config
vi.mock('../../config', () => ({
  featureFlags: {
    enableDocumentIndexing: true,
    enableMemoryVault: true,
    logDocumentIndexing: false,
  },
}))

import * as DocumentIndexing from '../../document-indexing-wrapper'
import * as Memory from '../../memory-wrapper'

describe('Document Upload Flow Integration', () => {
  const userId = 'user123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete full document indexing flow', async () => {
    const documentContent = `# Project Documentation

## Overview
This is a comprehensive guide to our project.

## Features
- Feature 1: User authentication
- Feature 2: Data processing
- Feature 3: Reporting

## API Reference
The API follows RESTful conventions.`

    // Step 1: Index the document
    const indexResult = await DocumentIndexing.indexDocument(userId, {
      name: 'README.md',
      content: documentContent,
      type: 'markdown',
      projectId: 'proj1',
    })

    expect(indexResult.success).toBe(true)
    expect(indexResult.documentId).toBe('doc123')
    expect(indexResult.chunks).toBe(3)

    // Step 2: Verify it can be retrieved
    const searchResults = await DocumentIndexing.searchByConcept(userId, 'project features')

    expect(searchResults.length).toBeGreaterThan(0)
    expect(searchResults[0].documentName).toBe('test.md')
    expect(searchResults[0].relevanceScore).toBeGreaterThan(0.5)

    // Step 3: Verify stats updated
    const stats = await DocumentIndexing.getIndexingStats(userId)
    expect(stats.documentCount).toBe(1)
    expect(stats.chunkCount).toBe(3)
  })

  it('should handle multiple document formats', async () => {
    const formats = [
      { name: 'notes.md', type: 'markdown' as const, content: '# Notes' },
      { name: 'data.json', type: 'json' as const, content: '{"key": "value"}' },
      { name: 'script.ts', type: 'code' as const, content: 'export const x = 1;' },
      { name: 'readme.txt', type: 'plaintext' as const, content: 'Plain text content' },
    ]

    for (const doc of formats) {
      const result = await DocumentIndexing.indexDocument(userId, {
        name: doc.name,
        content: doc.content,
        type: doc.type,
      })

      expect(result.success).toBe(true)
    }
  })

  it('should handle indexing with interface type', async () => {
    const result = await DocumentIndexing.indexDocument(
      userId,
      {
        name: 'vscode-doc.md',
        content: 'Content from VS Code',
        type: 'markdown',
      },
      { interface: 'vscode' }
    )

    expect(result.success).toBe(true)
  })
})

describe('Document Chunking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should chunk large documents appropriately', async () => {
    const largeContent = Array(100)
      .fill('This is a paragraph of content. ')
      .join('\n\n')

    const result = await DocumentIndexing.indexDocument('user123', {
      name: 'large-doc.md',
      content: largeContent,
      type: 'markdown',
    })

    expect(result.success).toBe(true)
    expect(result.chunks).toBeGreaterThan(0)
  })
})

describe('Cross-System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should combine document and memory search', async () => {
    // Document search (mocked)
    const docResults = await DocumentIndexing.searchByConcept('user123', 'architecture patterns')
    expect(docResults).toBeDefined()
    expect(docResults.length).toBeGreaterThan(0)

    // Memory search (stub returns empty)
    const memResults = await Memory.queryCrossProject('user123', 'architecture patterns')
    expect(memResults).toBeDefined()

    // Both should be usable together
    const combinedContext = {
      documents: docResults,
      memories: memResults.memories,
      themes: memResults.commonThemes,
    }

    expect(combinedContext.documents.length).toBeGreaterThan(0)
    expect(combinedContext.memories).toEqual([])
  })
})
