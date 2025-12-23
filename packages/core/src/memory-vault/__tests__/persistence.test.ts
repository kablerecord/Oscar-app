/**
 * Tests for Chroma Persistence Layer
 *
 * Tests the persistence infrastructure without requiring a running Chroma server.
 * The stores use in-memory mode by default and optionally persist to Chroma.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as semanticStore from '../stores/semantic.store';
import * as episodicStore from '../stores/episodic.store';
import * as proceduralStore from '../stores/procedural.store';
import type { MemorySource } from '../types';
import {
  serializeMetadata,
  deserializeMetadata,
  buildCollectionName,
} from '../chroma';

describe('Persistence Layer', () => {
  describe('Metadata Serialization', () => {
    it('should serialize primitive types', () => {
      const data = {
        string: 'hello',
        number: 42,
        boolean: true,
      };

      const serialized = serializeMetadata(data);

      expect(serialized.string).toBe('hello');
      expect(serialized.number).toBe(42);
      expect(serialized.boolean).toBe(true);
    });

    it('should serialize dates as ISO strings', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const data = { createdAt: date };

      const serialized = serializeMetadata(data);

      expect(serialized.createdAt).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should serialize arrays as JSON strings', () => {
      const data = {
        topics: ['ai', 'typescript', 'testing'],
      };

      const serialized = serializeMetadata(data);

      expect(serialized.topics).toBe('["ai","typescript","testing"]');
    });

    it('should serialize objects as JSON strings', () => {
      const data = {
        source: { type: 'conversation', sourceId: 'conv-123' },
      };

      const serialized = serializeMetadata(data);

      expect(typeof serialized.source).toBe('string');
      expect(JSON.parse(serialized.source as string)).toEqual(data.source);
    });

    it('should skip null and undefined values', () => {
      const data = {
        defined: 'value',
        nullValue: null,
        undefinedValue: undefined,
      };

      const serialized = serializeMetadata(data);

      expect(serialized.defined).toBe('value');
      expect('nullValue' in serialized).toBe(false);
      expect('undefinedValue' in serialized).toBe(false);
    });
  });

  describe('Metadata Deserialization', () => {
    it('should deserialize dates with schema', () => {
      const data = {
        createdAt: '2025-01-15T10:30:00.000Z',
        name: 'test',
      };

      const deserialized = deserializeMetadata(data, {
        dates: ['createdAt'],
      });

      expect(deserialized.createdAt).toBeInstanceOf(Date);
      expect((deserialized.createdAt as Date).toISOString()).toBe(
        '2025-01-15T10:30:00.000Z'
      );
      expect(deserialized.name).toBe('test');
    });

    it('should deserialize arrays with schema', () => {
      const data = {
        topics: '["ai","typescript"]',
      };

      const deserialized = deserializeMetadata(data, {
        arrays: ['topics'],
      });

      expect(Array.isArray(deserialized.topics)).toBe(true);
      expect(deserialized.topics).toEqual(['ai', 'typescript']);
    });

    it('should deserialize objects with schema', () => {
      const data = {
        source: '{"type":"conversation","sourceId":"conv-123"}',
      };

      const deserialized = deserializeMetadata(data, {
        objects: ['source'],
      });

      expect(typeof deserialized.source).toBe('object');
      expect(deserialized.source).toEqual({
        type: 'conversation',
        sourceId: 'conv-123',
      });
    });

    it('should handle invalid JSON gracefully', () => {
      const data = {
        badArray: 'not valid json [',
        badObject: 'not valid json {',
      };

      const deserialized = deserializeMetadata(data, {
        arrays: ['badArray'],
        objects: ['badObject'],
      });

      // Should return original value if JSON parsing fails
      expect(deserialized.badArray).toBe('not valid json [');
      expect(deserialized.badObject).toBe('not valid json {');
    });
  });

  describe('Collection Naming', () => {
    it('should build collection name with prefix', () => {
      const name = buildCollectionName('semantic');
      expect(name).toBe('osqr_semantic');
    });

    it('should build collection name with user ID', () => {
      const name = buildCollectionName('semantic', 'user-123');
      expect(name).toMatch(/^osqr_semantic_user_123/);
    });

    it('should sanitize special characters in user ID', () => {
      const name = buildCollectionName('semantic', 'user@email.com');
      expect(name).not.toContain('@');
      expect(name).not.toContain('.');
    });
  });
});

describe('Store Persistence API', () => {
  describe('Semantic Store', () => {
    beforeEach(() => {
      semanticStore.clearStore();
    });

    const createSource = (): MemorySource => ({
      type: 'conversation',
      sourceId: 'conv-123',
      timestamp: new Date(),
      confidence: 0.9,
    });

    it('should report persistence as disabled by default', () => {
      expect(semanticStore.isPersistenceEnabled()).toBe(false);
    });

    it('should work in-memory without persistence', () => {
      const memory = semanticStore.createMemory(
        'Test content',
        'business_info',
        createSource()
      );

      expect(memory.id).toBeDefined();
      expect(semanticStore.getMemory(memory.id)).toEqual(memory);
    });

    it('should disable persistence on clearStore', () => {
      // After clearing, persistence should be disabled
      semanticStore.clearStore();
      expect(semanticStore.isPersistenceEnabled()).toBe(false);
    });
  });

  describe('Episodic Store', () => {
    beforeEach(() => {
      episodicStore.clearStore();
    });

    it('should report persistence as disabled by default', () => {
      expect(episodicStore.isPersistenceEnabled()).toBe(false);
    });

    it('should work in-memory without persistence', () => {
      const session = episodicStore.createSession('user-123', 'web');
      const conversation = episodicStore.createConversation(session.id);

      expect(session.id).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(episodicStore.getSession(session.id)).toEqual(session);
    });

    it('should disable persistence on clearStore', () => {
      episodicStore.clearStore();
      expect(episodicStore.isPersistenceEnabled()).toBe(false);
    });
  });

  describe('Procedural Store', () => {
    beforeEach(() => {
      proceduralStore.clearStore();
    });

    it('should report persistence as disabled by default', () => {
      expect(proceduralStore.isPersistenceEnabled()).toBe(false);
    });

    it('should work in-memory without persistence', () => {
      const script = proceduralStore.createMentorScript(null);
      const rule = proceduralStore.addMentorRule(script.id, {
        rule: 'Test rule',
        source: 'user_defined',
        priority: 5,
      });

      expect(script.id).toBeDefined();
      expect(rule?.id).toBeDefined();
      expect(proceduralStore.getMentorScript(script.id)).toEqual(script);
    });

    it('should disable persistence on clearStore', () => {
      proceduralStore.clearStore();
      expect(proceduralStore.isPersistenceEnabled()).toBe(false);
    });
  });
});

describe('Data Integrity', () => {
  beforeEach(() => {
    semanticStore.clearStore();
    episodicStore.clearStore();
    proceduralStore.clearStore();
  });

  it('should maintain data consistency between operations', () => {
    const source: MemorySource = {
      type: 'conversation',
      sourceId: 'conv-123',
      timestamp: new Date(),
      confidence: 0.9,
    };

    // Create memory
    const memory = semanticStore.createMemory(
      'Initial content',
      'business_info',
      source
    );

    // Update memory
    const updated = semanticStore.updateMemory(memory.id, {
      confidence: 0.95,
    });

    // Delete memory
    const deleted = semanticStore.deleteMemory(memory.id);

    expect(updated?.confidence).toBe(0.95);
    expect(deleted).toBe(true);
    expect(semanticStore.getMemory(memory.id)).toBeNull();
  });

  it('should handle concurrent-like operations', () => {
    // Simulate rapid successive operations
    const ids: string[] = [];

    for (let i = 0; i < 100; i++) {
      const memory = semanticStore.createMemory(
        `Memory ${i}`,
        'domain_knowledge',
        {
          type: 'conversation',
          sourceId: `conv-${i}`,
          timestamp: new Date(),
          confidence: 0.8,
        }
      );
      ids.push(memory.id);
    }

    // All should exist
    for (const id of ids) {
      expect(semanticStore.getMemory(id)).not.toBeNull();
    }

    // Delete half
    for (let i = 0; i < 50; i++) {
      semanticStore.deleteMemory(ids[i]);
    }

    // Verify state
    expect(semanticStore.getAllMemories().length).toBe(50);
  });

  it('should preserve session-conversation relationships', () => {
    const session = episodicStore.createSession('user-123', 'web');
    const conv1 = episodicStore.createConversation(session.id);
    const conv2 = episodicStore.createConversation(session.id);

    const updatedSession = episodicStore.getSession(session.id);

    expect(updatedSession?.conversationIds).toContain(conv1.id);
    expect(updatedSession?.conversationIds).toContain(conv2.id);
    expect(updatedSession?.conversationIds.length).toBe(2);
  });
});
