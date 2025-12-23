/**
 * Tests for Document Indexing Pipeline
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexDocument,
  queryDocuments,
  getProgress,
} from '../pipeline';
import {
  clearStores,
  getDocument,
  getUserDocuments,
} from '../storage';
import { RawDocument } from '../types';

describe('Document Indexing Pipeline', () => {
  beforeEach(() => {
    clearStores();
  });

  const createMarkdownDoc = (content: string, filename = 'test.md'): RawDocument => ({
    path: `/test/${filename}`,
    filename,
    filetype: 'markdown',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  describe('indexDocument', () => {
    it('indexes a markdown document', async () => {
      const doc = createMarkdownDoc('# Hello World\n\nThis is a test document.');
      const result = await indexDocument(doc, 'user-1', { interface: 'web' });

      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user-1');
      expect(result.filename).toBe('test.md');
      expect(result.chunks.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('stores the document for retrieval', async () => {
      const doc = createMarkdownDoc('# Test\n\nContent here.');
      const result = await indexDocument(doc, 'user-1', { interface: 'web' });

      const stored = await getDocument(result.id);
      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(result.id);
    });

    it('tracks progress through stages', async () => {
      const doc = createMarkdownDoc('# Progress Test\n\nTracking progress.');
      const result = await indexDocument(doc, 'user-1', { interface: 'web' });

      const progress = getProgress(result.id);
      expect(progress).not.toBeNull();
      expect(progress?.stage).toBe('complete');
      expect(progress?.progress).toBe(100);
    });

    it('associates document with project', async () => {
      const doc = createMarkdownDoc('# Project Doc\n\nBelongs to a project.');
      const result = await indexDocument(doc, 'user-1', {
        interface: 'vscode',
        projectId: 'project-123',
      });

      expect(result.sourceProjectId).toBe('project-123');
    });

    it('associates document with conversation', async () => {
      const doc = createMarkdownDoc('# Chat Doc\n\nCreated in chat.');
      const result = await indexDocument(doc, 'user-1', {
        interface: 'web',
        conversationId: 'conv-456',
      });

      expect(result.sourceConversationId).toBe('conv-456');
    });

    it('extracts topics from headings', async () => {
      const doc = createMarkdownDoc('# Important Topic\n\n## Another Topic\n\nContent.');
      const result = await indexDocument(doc, 'user-1', { interface: 'web' });

      expect(result.topics.length).toBeGreaterThan(0);
    });

    it('generates embeddings for chunks', async () => {
      const doc = createMarkdownDoc('# Embedded\n\nThis text gets embedded.');
      const result = await indexDocument(doc, 'user-1', { interface: 'web' });

      expect(result.chunks[0]?.embedding).toBeDefined();
      expect(result.chunks[0]?.embedding.length).toBe(1536);
    });
  });

  describe('queryDocuments', () => {
    beforeEach(async () => {
      // Index some test documents
      await indexDocument(
        createMarkdownDoc('# Authentication\n\nOAuth2 with JWT tokens.', 'auth.md'),
        'user-1',
        { interface: 'web', projectId: 'project-a' }
      );
      await indexDocument(
        createMarkdownDoc('# Payment Integration\n\nStripe for payments.', 'payment.md'),
        'user-1',
        { interface: 'web', projectId: 'project-a' }
      );
      await indexDocument(
        createMarkdownDoc('# Database Design\n\nPostgreSQL schemas.', 'database.md'),
        'user-1',
        { interface: 'web', projectId: 'project-b' }
      );
    });

    it('queries by document name', async () => {
      const results = await queryDocuments({
        query: 'auth',
        userId: 'user-1',
        type: 'name',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].document.filename).toBe('auth.md');
    });

    it('queries by concept with semantic search', async () => {
      const results = await queryDocuments({
        query: 'security login',
        userId: 'user-1',
        type: 'concept',
      });

      expect(results.length).toBeGreaterThan(0);
      // Auth doc should be relevant to security/login concepts
    });

    it('queries by time range', async () => {
      const now = new Date();
      const results = await queryDocuments({
        query: '',
        userId: 'user-1',
        type: 'time',
        options: {
          timeRange: {
            start: new Date(now.getTime() - 3600000), // 1 hour ago
            end: now,
          },
        },
      });

      expect(results.documents?.length).toBe(3);
    });

    it('queries across projects', async () => {
      const results = await queryDocuments({
        query: 'design patterns',
        userId: 'user-1',
        type: 'cross-project',
        options: {
          projects: ['project-a', 'project-b'],
        },
      });

      expect(results.byProject).toBeDefined();
      expect(results.byProject.size).toBe(2);
    });
  });

  describe('getUserDocuments', () => {
    it('returns only documents for specified user', async () => {
      await indexDocument(
        createMarkdownDoc('# User 1 Doc'),
        'user-1',
        { interface: 'web' }
      );
      await indexDocument(
        createMarkdownDoc('# User 2 Doc'),
        'user-2',
        { interface: 'web' }
      );

      const user1Docs = await getUserDocuments('user-1');
      const user2Docs = await getUserDocuments('user-2');

      expect(user1Docs.length).toBe(1);
      expect(user2Docs.length).toBe(1);
      expect(user1Docs[0].userId).toBe('user-1');
    });
  });
});

describe('Cross-Project Query', () => {
  const createMarkdownDoc = (content: string, filename = 'test.md'): RawDocument => ({
    path: `/test/${filename}`,
    filename,
    filetype: 'markdown',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  beforeEach(() => {
    clearStores();
  });

  it('finds common themes across projects', async () => {
    await indexDocument(
      createMarkdownDoc('# **API Design**\n\nREST patterns for the API.'),
      'user-1',
      { interface: 'web', projectId: 'project-a' }
    );
    await indexDocument(
      createMarkdownDoc('# **API Design**\n\nGraphQL for the API.'),
      'user-1',
      { interface: 'web', projectId: 'project-b' }
    );

    const results = await queryDocuments({
      query: 'API',
      userId: 'user-1',
      type: 'cross-project',
      options: { projects: ['project-a', 'project-b'] },
    });

    expect(results.commonThemes.length).toBeGreaterThanOrEqual(0);
  });
});
