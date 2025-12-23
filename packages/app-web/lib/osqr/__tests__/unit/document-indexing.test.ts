/**
 * Document Indexing Wrapper Unit Tests
 *
 * Tests for document indexing, chunking, and semantic search.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as DocumentIndexingWrapper from '../../document-indexing-wrapper'

// Mock @osqr/core
vi.mock('@osqr/core', () => ({
  DocumentIndexing: {
    indexDocument: vi.fn(() =>
      Promise.resolve({
        id: 'doc123',
        filename: 'test.md',
        chunks: [
          { id: 'chunk1', content: 'First chunk' },
          { id: 'chunk2', content: 'Second chunk' },
        ],
        relatedDocuments: ['doc456'],
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
          relevantChunks: [{ id: 'chunk1', content: 'Relevant content' }],
          score: 0.85,
        },
      ])
    ),
    retrieveByDocumentName: vi.fn(() =>
      Promise.resolve([
        {
          document: {
            id: 'doc123',
            filename: 'README.md',
            sourceProjectId: null,
            createdAt: new Date(),
          },
          relevantChunks: [{ id: 'chunk1', content: 'README content' }],
          score: 1.0,
        },
      ])
    ),
    retrieveByTime: vi.fn(() =>
      Promise.resolve({
        documents: [
          {
            id: 'doc123',
            filename: 'recent.md',
            modifiedAt: new Date(),
          },
        ],
      })
    ),
    retrieveAcrossProjects: vi.fn(() =>
      Promise.resolve({
        byProject: new Map([
          [
            'proj1',
            [
              {
                document: {
                  id: 'doc1',
                  filename: 'proj1-doc.md',
                  sourceProjectId: 'proj1',
                  createdAt: new Date(),
                },
                relevantChunks: [{ content: 'Project 1 content' }],
                score: 0.9,
              },
            ],
          ],
        ]),
      })
    ),
    getStats: vi.fn(() =>
      Promise.resolve({
        documentCount: 25,
        chunkCount: 150,
        totalTokens: 45000,
        lastIndexed: new Date(),
      })
    ),
    removeFromIndex: vi.fn(() => Promise.resolve()),
    reindexDocument: vi.fn(() =>
      Promise.resolve({
        id: 'doc123',
        filename: 'updated.md',
        chunks: [{ id: 'chunk1', content: 'Updated content' }],
        relatedDocuments: [],
        createdAt: new Date(),
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
  },
}))

// Mock config
vi.mock('../../config', () => ({
  featureFlags: {
    enableDocumentIndexing: true,
    logDocumentIndexing: false,
  },
}))

describe('Document Indexing Wrapper', () => {
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
      expect(result.chunks).toBe(2)
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

    it('should associate document with project', async () => {
      await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'doc.md',
        content: 'Content',
        type: 'markdown',
        projectId: 'project123',
      })

      const { DocumentIndexing } = await import('@osqr/core')
      expect(DocumentIndexing.indexDocument).toHaveBeenCalledWith(
        expect.anything(),
        'user123',
        expect.objectContaining({
          projectId: 'project123',
        })
      )
    })

    it('should include interface type', async () => {
      await DocumentIndexingWrapper.indexDocument(
        'user123',
        {
          name: 'doc.md',
          content: 'Content',
          type: 'markdown',
        },
        { interface: 'vscode' }
      )

      const { DocumentIndexing } = await import('@osqr/core')
      expect(DocumentIndexing.indexDocument).toHaveBeenCalledWith(
        expect.anything(),
        'user123',
        expect.objectContaining({
          interface: 'vscode',
        })
      )
    })

    it('should handle indexing errors', async () => {
      const { DocumentIndexing } = await import('@osqr/core')
      vi.mocked(DocumentIndexing.indexDocument).mockRejectedValueOnce(new Error('Index failed'))

      const result = await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'doc.md',
        content: 'Content',
        type: 'markdown',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle empty content', async () => {
      const result = await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'empty.md',
        content: '',
        type: 'markdown',
      })

      expect(result).toBeDefined()
    })

    it('should handle very large content', async () => {
      const largeContent = 'x'.repeat(1000000) // 1MB
      const result = await DocumentIndexingWrapper.indexDocument('user123', {
        name: 'large.txt',
        content: largeContent,
        type: 'plaintext',
      })

      expect(result).toBeDefined()
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

    it('should include chunk content in results', async () => {
      const results = await DocumentIndexingWrapper.searchByConcept('user123', 'test')
      expect(results[0].chunkContent).toBeDefined()
    })

    it('should respect limit option', async () => {
      await DocumentIndexingWrapper.searchByConcept('user123', 'test', { limit: 5 })

      const { DocumentIndexing } = await import('@osqr/core')
      expect(DocumentIndexing.retrieveByConcept).toHaveBeenCalledWith(
        'test',
        'user123',
        expect.objectContaining({ limit: 5 })
      )
    })

    it('should handle empty results', async () => {
      const { DocumentIndexing } = await import('@osqr/core')
      vi.mocked(DocumentIndexing.retrieveByConcept).mockResolvedValueOnce([])

      const results = await DocumentIndexingWrapper.searchByConcept('user123', 'nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('searchByName', () => {
    it('should search documents by filename', async () => {
      const results = await DocumentIndexingWrapper.searchByName('user123', 'README')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].documentName).toContain('README')
    })
  })

  describe('searchByTime', () => {
    it('should search documents by time range', async () => {
      const results = await DocumentIndexingWrapper.searchByTime('user123', {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31'),
      })

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].modifiedAt).toBeDefined()
    })
  })

  describe('searchAcrossProjects', () => {
    it('should search across multiple projects', async () => {
      const results = await DocumentIndexingWrapper.searchAcrossProjects(
        'user123',
        'API design',
        ['proj1', 'proj2']
      )

      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].projectId).toBeDefined()
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

    it('should handle stats errors', async () => {
      const { DocumentIndexing } = await import('@osqr/core')
      vi.mocked(DocumentIndexing.getStats).mockRejectedValueOnce(new Error('Stats error'))

      const stats = await DocumentIndexingWrapper.getIndexingStats('user123')
      expect(stats.documentCount).toBe(0)
    })
  })

  describe('removeDocument', () => {
    it('should remove document from index', async () => {
      const success = await DocumentIndexingWrapper.removeDocument('/path/to/doc.md')
      expect(success).toBe(true)
    })

    it('should return false on error', async () => {
      const { DocumentIndexing } = await import('@osqr/core')
      vi.mocked(DocumentIndexing.removeFromIndex).mockRejectedValueOnce(new Error('Remove error'))

      const success = await DocumentIndexingWrapper.removeDocument('/path/to/doc.md')
      expect(success).toBe(false)
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
  it('should handle filenames with special characters', async () => {
    const result = await DocumentIndexingWrapper.indexDocument('user123', {
      name: 'my document (1).md',
      content: 'Content',
      type: 'markdown',
    })
    expect(result).toBeDefined()
  })

  it('should handle unicode filenames', async () => {
    const result = await DocumentIndexingWrapper.indexDocument('user123', {
      name: '文档.md',
      content: '内容',
      type: 'markdown',
    })
    expect(result).toBeDefined()
  })

  it('should handle binary content gracefully', async () => {
    const binaryContent = '\x00\x01\x02\x03'
    const result = await DocumentIndexingWrapper.indexDocument('user123', {
      name: 'binary.txt',
      content: binaryContent,
      type: 'plaintext',
    })
    expect(result).toBeDefined()
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
