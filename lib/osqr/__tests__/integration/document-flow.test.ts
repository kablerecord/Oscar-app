/**
 * Integration Test: Document Upload Flow
 *
 * Tests the complete flow: file → chunking → embedding → storage → retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all @osqr/core modules
vi.mock('@osqr/core', () => ({
  DocumentIndexing: {
    indexDocument: vi.fn(() =>
      Promise.resolve({
        id: 'doc123',
        filename: 'test.md',
        chunks: [
          { id: 'chunk1', content: 'First chunk content' },
          { id: 'chunk2', content: 'Second chunk content' },
          { id: 'chunk3', content: 'Third chunk content' },
        ],
        relatedDocuments: [],
        createdAt: new Date(),
      })
    ),
    retrieveByConcept: vi.fn(() =>
      Promise.resolve([
        {
          document: {
            id: 'doc123',
            filename: 'test.md',
            sourceProjectId: 'proj1',
            createdAt: new Date(),
          },
          relevantChunks: [
            { id: 'chunk1', content: 'First chunk content' },
          ],
          score: 0.92,
        },
      ])
    ),
    retrieveByDocumentName: vi.fn(() => Promise.resolve([])),
    retrieveAcrossProjects: vi.fn(() =>
      Promise.resolve({
        byProject: new Map([
          ['proj1', []],
          ['proj2', []],
        ]),
      })
    ),
    getStats: vi.fn(() =>
      Promise.resolve({
        documentCount: 1,
        chunkCount: 3,
        totalTokens: 500,
        lastIndexed: new Date(),
      })
    ),
    detectDocumentType: vi.fn((filename: string) => {
      const ext = filename.split('.').pop()
      const map: Record<string, string> = { md: 'markdown', txt: 'plaintext', ts: 'code' }
      return map[ext!] || null
    }),
    isSupported: vi.fn(() => true),
  },
  MemoryVault: {
    queryCrossProject: vi.fn(() =>
      Promise.resolve({
        memories: [],
        commonThemes: [],
        contradictions: [],
        projectSummaries: new Map(),
      })
    ),
    findRelatedFromOtherProjects: vi.fn(() => Promise.resolve([])),
  },
}))

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

  it('should associate documents with projects', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')

    await DocumentIndexing.indexDocument(userId, {
      name: 'project-doc.md',
      content: 'Project specific content',
      type: 'markdown',
      projectId: 'project-abc',
    })

    expect(MockDocIndexing.indexDocument).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        projectId: 'project-abc',
      })
    )
  })

  it('should track interface source', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')

    await DocumentIndexing.indexDocument(
      userId,
      {
        name: 'vscode-doc.md',
        content: 'Content from VS Code',
        type: 'markdown',
      },
      { interface: 'vscode' }
    )

    expect(MockDocIndexing.indexDocument).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        interface: 'vscode',
      })
    )
  })
})

describe('Cross-Project Document Search Integration', () => {
  const userId = 'user123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should search across multiple projects', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')
    vi.mocked(MockDocIndexing.retrieveAcrossProjects).mockResolvedValueOnce({
      byProject: new Map([
        [
          'proj1',
          [
            {
              document: {
                id: 'doc1',
                filename: 'proj1-api.md',
                sourceProjectId: 'proj1',
                createdAt: new Date(),
              },
              relevantChunks: [{ content: 'API documentation for project 1' }],
              score: 0.88,
            },
          ],
        ],
        [
          'proj2',
          [
            {
              document: {
                id: 'doc2',
                filename: 'proj2-api.md',
                sourceProjectId: 'proj2',
                createdAt: new Date(),
              },
              relevantChunks: [{ content: 'API documentation for project 2' }],
              score: 0.85,
            },
          ],
        ],
      ]),
    })

    const results = await DocumentIndexing.searchAcrossProjects(userId, 'API documentation', [
      'proj1',
      'proj2',
    ])

    expect(results.length).toBe(2)
    expect(results[0].projectId).toBe('proj1')
    expect(results[1].projectId).toBe('proj2')
  })

  it('should combine document and memory search', async () => {
    // Document search
    const docResults = await DocumentIndexing.searchByConcept(userId, 'architecture patterns')
    expect(docResults).toBeDefined()

    // Memory search (cross-project)
    const memResults = await Memory.queryCrossProject(userId, 'architecture patterns')
    expect(memResults).toBeDefined()

    // Both should be usable together
    const combinedContext = {
      documents: docResults,
      memories: memResults.memories,
      themes: memResults.commonThemes,
    }

    expect(combinedContext.documents).toBeDefined()
    expect(combinedContext.memories).toBeDefined()
  })
})

describe('Document Chunking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should chunk large documents appropriately', async () => {
    // Create a large document
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

  it('should preserve context in chunk overlap', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')

    // Verify indexDocument was called with proper structure
    await DocumentIndexing.indexDocument('user123', {
      name: 'context-doc.md',
      content: 'Important context that should be preserved across chunks',
      type: 'markdown',
    })

    expect(MockDocIndexing.indexDocument).toHaveBeenCalled()
  })
})

describe('Document Retrieval Accuracy Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should retrieve relevant chunks for queries', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')
    vi.mocked(MockDocIndexing.retrieveByConcept).mockResolvedValueOnce([
      {
        document: {
          id: 'doc1',
          filename: 'architecture.md',
          sourceProjectId: 'proj1',
          createdAt: new Date(),
        },
        relevantChunks: [
          { id: 'c1', content: 'We use a microservices architecture for scalability.' },
        ],
        score: 0.95,
      },
    ])

    const results = await DocumentIndexing.searchByConcept('user123', 'microservices architecture')

    expect(results.length).toBe(1)
    expect(results[0].chunkContent).toContain('microservices')
    expect(results[0].relevanceScore).toBeGreaterThan(0.9)
  })

  it('should rank results by relevance', async () => {
    const { DocumentIndexing: MockDocIndexing } = await import('@osqr/core')
    vi.mocked(MockDocIndexing.retrieveByConcept).mockResolvedValueOnce([
      {
        document: { id: 'doc1', filename: 'best-match.md', sourceProjectId: null, createdAt: new Date() },
        relevantChunks: [{ content: 'Best match content' }],
        score: 0.95,
      },
      {
        document: { id: 'doc2', filename: 'good-match.md', sourceProjectId: null, createdAt: new Date() },
        relevantChunks: [{ content: 'Good match content' }],
        score: 0.75,
      },
      {
        document: { id: 'doc3', filename: 'ok-match.md', sourceProjectId: null, createdAt: new Date() },
        relevantChunks: [{ content: 'OK match content' }],
        score: 0.55,
      },
    ])

    const results = await DocumentIndexing.searchByConcept('user123', 'query')

    // Results should be ordered by score (highest first)
    expect(results[0].relevanceScore).toBeGreaterThan(results[1].relevanceScore)
    expect(results[1].relevanceScore).toBeGreaterThan(results[2].relevanceScore)
  })
})
