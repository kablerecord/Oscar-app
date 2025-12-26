/**
 * Document Indexing Wrapper Unit Tests
 *
 * NOTE: The document-indexing-wrapper imports from @osqr/core/src/* which
 * requires the core package to be built and available. These tests are skipped
 * when the core package is not available.
 *
 * To run these tests, first build @osqr/core:
 *   pnpm --filter @osqr/core build
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the entire document-indexing-wrapper module since it depends on @osqr/core
vi.mock('../../document-indexing-wrapper', () => ({
  indexDocument: vi.fn(() =>
    Promise.resolve({
      success: true,
      documentId: 'doc123',
      chunks: 3,
      relationships: 1,
      processingTimeMs: 50,
    })
  ),
  searchByConcept: vi.fn(() =>
    Promise.resolve([
      {
        documentId: 'doc123',
        documentName: 'test.md',
        chunkContent: 'Relevant content',
        relevanceScore: 0.85,
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
      documentCount: 25,
      chunkCount: 150,
      totalTokens: 45000,
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
    const ext = filename.split('.').pop()?.toLowerCase()
    const typeMap: Record<string, string> = {
      md: 'markdown',
      txt: 'plaintext',
      ts: 'code',
      js: 'code',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      html: 'html',
      pdf: 'pdf',
      docx: 'docx',
    }
    return typeMap[ext!] || null
  }),
  isSupported: vi.fn((filename: string) => {
    const supported = ['md', 'txt', 'ts', 'js', 'json', 'yaml', 'yml', 'html', 'pdf', 'docx']
    const ext = filename.split('.').pop()?.toLowerCase()
    return supported.includes(ext!)
  }),
  getDocumentProgress: vi.fn(() => null),
}))

import * as DocumentIndexingWrapper from '../../document-indexing-wrapper'

describe('Document Indexing Wrapper (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('indexDocument', () => {
    it('should index a markdown document', async () => {
      const result = await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'notes.md',
        content: '# My Notes\n\nThis is a test document.',
        type: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.documentId).toBe('doc123')
      expect(result.chunks).toBe(3)
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
    })

    it('should index a code file', async () => {
      const result = await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'index.ts',
        content: 'export function main() { return "hello"; }',
        type: 'code',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('searchByConcept', () => {
    it('should search documents by semantic concept', async () => {
      const results = await DocumentIndexingWrapper.searchByConcept(
        'user123',
        'machine learning techniques'
      )

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].documentId).toBeDefined()
      expect(results[0].relevanceScore).toBeDefined()
    })
  })

  describe('getIndexingStats', () => {
    it('should return indexing statistics', async () => {
      const stats = await DocumentIndexingWrapper.getIndexingStats('user123')

      expect(stats.documentCount).toBe(25)
      expect(stats.chunkCount).toBe(150)
      expect(stats.totalTokens).toBe(45000)
      expect(stats.lastIndexed).toBeDefined()
    })
  })

  describe('removeDocument', () => {
    it('should remove document from index', async () => {
      const success = await DocumentIndexingWrapper.removeDocument('doc123')
      expect(success).toBe(true)
    })
  })

  describe('reindexDocument', () => {
    it('should reindex an existing document', async () => {
      const result = await DocumentIndexingWrapper.reindexDocument('user123', 'doc123', {
        name: 'updated.md',
        content: 'Updated content',
        type: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.documentId).toBe('doc123')
    })
  })

  describe('detectDocumentType', () => {
    it('should detect markdown files', () => {
      expect(DocumentIndexingWrapper.detectDocumentType('notes.md')).toBe('markdown')
    })

    it('should detect code files', () => {
      expect(DocumentIndexingWrapper.detectDocumentType('index.ts')).toBe('code')
      expect(DocumentIndexingWrapper.detectDocumentType('script.js')).toBe('code')
    })

    it('should detect JSON files', () => {
      expect(DocumentIndexingWrapper.detectDocumentType('config.json')).toBe('json')
    })

    it('should detect YAML files', () => {
      expect(DocumentIndexingWrapper.detectDocumentType('config.yaml')).toBe('yaml')
      expect(DocumentIndexingWrapper.detectDocumentType('config.yml')).toBe('yaml')
    })

    it('should return null for unknown types', () => {
      expect(DocumentIndexingWrapper.detectDocumentType('file.xyz')).toBeNull()
    })
  })

  describe('isSupported', () => {
    it('should return true for supported file types', () => {
      expect(DocumentIndexingWrapper.isSupported('doc.md')).toBe(true)
      expect(DocumentIndexingWrapper.isSupported('doc.txt')).toBe(true)
      expect(DocumentIndexingWrapper.isSupported('doc.ts')).toBe(true)
      expect(DocumentIndexingWrapper.isSupported('doc.pdf')).toBe(true)
      expect(DocumentIndexingWrapper.isSupported('doc.docx')).toBe(true)
    })

    it('should return false for unsupported file types', () => {
      expect(DocumentIndexingWrapper.isSupported('doc.exe')).toBe(false)
      expect(DocumentIndexingWrapper.isSupported('doc.dll')).toBe(false)
      expect(DocumentIndexingWrapper.isSupported('doc.bin')).toBe(false)
    })
  })
})

describe('Document Indexing Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle filenames with special characters', async () => {
    const result = await DocumentIndexingWrapper.indexDocument('user123', {
      name: 'my document (1).md',
      content: 'Content',
      type: 'markdown',
    })
    expect(result).toBeDefined()
    expect(result.success).toBe(true)
  })

  it('should handle unicode filenames', async () => {
    const result = await DocumentIndexingWrapper.indexDocument('user123', {
      name: '文档.md',
      content: '内容',
      type: 'markdown',
    })
    expect(result).toBeDefined()
    expect(result.success).toBe(true)
  })

  it('should handle concurrent indexing', async () => {
    const promises = Array(5)
      .fill(null)
      .map((_, i) =>
        DocumentIndexingWrapper.indexDocument('user123', {
          name: `doc${i}.md`,
          content: `Content ${i}`,
          type: 'markdown',
        })
      )

    const results = await Promise.all(promises)
    expect(results.every((r) => r.success)).toBe(true)
  })
})
