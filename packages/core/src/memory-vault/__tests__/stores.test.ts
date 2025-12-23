/**
 * Tests for Memory Vault Stores
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as episodicStore from '../stores/episodic.store';
import * as semanticStore from '../stores/semantic.store';
import * as proceduralStore from '../stores/procedural.store';
import type { MemorySource } from '../types';

describe('Episodic Store', () => {
  beforeEach(() => {
    episodicStore.clearStore();
  });

  describe('Session Management', () => {
    it('should create a new session', () => {
      const session = episodicStore.createSession('user-123', 'web');
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(session.deviceType).toBe('web');
      expect(session.endedAt).toBeNull();
    });

    it('should get session by ID', () => {
      const created = episodicStore.createSession('user-123');
      const retrieved = episodicStore.getSession(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should end a session', () => {
      const session = episodicStore.createSession('user-123');
      const ended = episodicStore.endSession(session.id);
      expect(ended?.endedAt).not.toBeNull();
    });

    it('should get active sessions', () => {
      episodicStore.createSession('user-123');
      episodicStore.createSession('user-123');
      const ended = episodicStore.createSession('user-123');
      episodicStore.endSession(ended.id);

      const active = episodicStore.getActiveSessions('user-123');
      expect(active.length).toBe(2);
    });
  });

  describe('Conversation Management', () => {
    it('should create a conversation', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id, 'project-1');

      expect(conv.id).toBeDefined();
      expect(conv.sessionId).toBe(session.id);
      expect(conv.projectId).toBe('project-1');
      expect(conv.messages).toEqual([]);
    });

    it('should link conversation to session', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      const updatedSession = episodicStore.getSession(session.id);
      expect(updatedSession?.conversationIds).toContain(conv.id);
    });

    it('should update conversation summary', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      episodicStore.updateConversationSummary(conv.id, 'Test summary');
      const updated = episodicStore.getConversation(conv.id);
      expect(updated?.summary).toBe('Test summary');
    });
  });

  describe('Message Management', () => {
    it('should add messages to conversation', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      const msg = episodicStore.addMessage(conv.id, {
        role: 'user',
        content: 'Hello!',
        timestamp: new Date(),
        tokens: 5,
        toolCalls: null,
        utilityScore: null,
      });

      expect(msg?.id).toBeDefined();
      expect(msg?.content).toBe('Hello!');

      const messages = episodicStore.getMessages(conv.id);
      expect(messages.length).toBe(1);
    });

    it('should respect message limit', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      for (let i = 0; i < 5; i++) {
        episodicStore.addMessage(conv.id, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: new Date(),
          tokens: 5,
          toolCalls: null,
          utilityScore: null,
        });
      }

      const limited = episodicStore.getMessages(conv.id, 3);
      expect(limited.length).toBe(3);
      expect(limited[0].content).toBe('Message 2'); // Last 3 messages
    });

    it('should archive and replace messages', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      const msg1 = episodicStore.addMessage(conv.id, {
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(),
        tokens: 5,
        toolCalls: null,
        utilityScore: null,
      });

      // Archive
      episodicStore.archiveMessages(conv.id, [msg1!]);

      // Replace with new message
      const newMsg = {
        id: 'new-msg',
        role: 'system' as const,
        content: 'Summary',
        timestamp: new Date(),
        tokens: 3,
        toolCalls: null,
        utilityScore: null,
      };
      episodicStore.replaceMessages(conv.id, [newMsg]);

      const messages = episodicStore.getMessages(conv.id);
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('Summary');

      const archived = episodicStore.getArchivedMessages(conv.id);
      expect(archived.length).toBe(1);
    });
  });

  describe('Metadata Management', () => {
    it('should add entities', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      episodicStore.addEntity(conv.id, {
        name: 'John',
        type: 'person',
        mentions: 2,
      });

      const updated = episodicStore.getConversation(conv.id);
      expect(updated?.metadata.entities.length).toBe(1);
      expect(updated?.metadata.entities[0].name).toBe('John');
    });

    it('should merge duplicate entities', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      episodicStore.addEntity(conv.id, { name: 'John', type: 'person', mentions: 2 });
      episodicStore.addEntity(conv.id, { name: 'john', type: 'person', mentions: 3 });

      const updated = episodicStore.getConversation(conv.id);
      expect(updated?.metadata.entities.length).toBe(1);
      expect(updated?.metadata.entities[0].mentions).toBe(5);
    });

    it('should add commitments', () => {
      const session = episodicStore.createSession('user-123');
      const conv = episodicStore.createConversation(session.id);

      const commitment = episodicStore.addCommitment(conv.id, {
        description: 'Complete the project',
        dueDate: new Date('2025-01-01'),
        status: 'pending',
        createdAt: new Date(),
      });

      expect(commitment?.id).toBeDefined();
      const updated = episodicStore.getConversation(conv.id);
      expect(updated?.metadata.commitments.length).toBe(1);
    });
  });
});

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

  describe('Memory CRUD', () => {
    it('should create a memory', () => {
      const memory = semanticStore.createMemory(
        'User works at Acme Corp',
        'business_info',
        createSource()
      );

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('User works at Acme Corp');
      expect(memory.category).toBe('business_info');
      expect(memory.utilityScore).toBe(0.5); // Default
    });

    it('should get memory by ID', () => {
      const created = semanticStore.createMemory('Test', 'preferences', createSource());
      const retrieved = semanticStore.getMemory(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update a memory', () => {
      const memory = semanticStore.createMemory('Test', 'preferences', createSource());
      const updated = semanticStore.updateMemory(memory.id, { confidence: 0.95 });
      expect(updated?.confidence).toBe(0.95);
    });

    it('should delete a memory', () => {
      const memory = semanticStore.createMemory('Test', 'preferences', createSource());
      expect(semanticStore.deleteMemory(memory.id)).toBe(true);
      expect(semanticStore.getMemory(memory.id)).toBeNull();
    });
  });

  describe('Memory Filtering', () => {
    beforeEach(() => {
      semanticStore.createMemory('Prefers dark mode', 'preferences', createSource(), [], 0.8);
      semanticStore.createMemory('Works at Acme', 'business_info', createSource(), [], 0.9);
      semanticStore.createMemory('Likes TypeScript', 'domain_knowledge', createSource(), [], 0.7);
    });

    it('should filter by category', () => {
      const results = semanticStore.filterMemories({ categories: ['preferences'] });
      expect(results.length).toBe(1);
      expect(results[0].category).toBe('preferences');
    });

    it('should filter by minimum confidence', () => {
      const results = semanticStore.filterMemories({ minConfidence: 0.85 });
      expect(results.length).toBe(1);
      expect(results[0].category).toBe('business_info');
    });

    it('should get by category', () => {
      const results = semanticStore.getByCategory('business_info');
      expect(results.length).toBe(1);
    });
  });

  describe('Utility Scores', () => {
    it('should update utility score', () => {
      const memory = semanticStore.createMemory('Test', 'preferences', createSource());
      semanticStore.updateUtilityScore(memory.id, 0.9);

      const updated = semanticStore.getMemory(memory.id);
      expect(updated?.utilityScore).toBe(0.9);
    });

    it('should clamp utility scores to [0, 1]', () => {
      const memory = semanticStore.createMemory('Test', 'preferences', createSource());
      semanticStore.updateUtilityScore(memory.id, 1.5);

      const updated = semanticStore.getMemory(memory.id);
      expect(updated?.utilityScore).toBe(1.0);
    });

    it('should batch update utility scores', () => {
      const m1 = semanticStore.createMemory('Test 1', 'preferences', createSource());
      const m2 = semanticStore.createMemory('Test 2', 'preferences', createSource());

      const updated = semanticStore.batchUpdateUtility([
        { memoryId: m1.id, oldScore: 0.5, newScore: 0.8 },
        { memoryId: m2.id, oldScore: 0.5, newScore: 0.3 },
      ]);

      expect(updated).toBe(2);
      expect(semanticStore.getMemory(m1.id)?.utilityScore).toBe(0.8);
      expect(semanticStore.getMemory(m2.id)?.utilityScore).toBe(0.3);
    });
  });

  describe('Contradictions', () => {
    it('should mark contradictions', () => {
      const m1 = semanticStore.createMemory('User is 30', 'personal_info', createSource());
      const m2 = semanticStore.createMemory('User is 35', 'personal_info', createSource());

      semanticStore.markContradiction(m2.id, m1.id);

      const updated = semanticStore.getMemory(m2.id);
      expect(updated?.metadata.contradicts).toContain(m1.id);
    });

    it('should get contradictions', () => {
      const m1 = semanticStore.createMemory('User is 30', 'personal_info', createSource());
      const m2 = semanticStore.createMemory('User is 35', 'personal_info', createSource());
      semanticStore.markContradiction(m2.id, m1.id);

      const contradictions = semanticStore.getContradictions(m1.id);
      expect(contradictions.length).toBe(1);
      expect(contradictions[0].id).toBe(m2.id);
    });
  });
});

describe('Procedural Store', () => {
  beforeEach(() => {
    proceduralStore.clearStore();
  });

  describe('MentorScript Management', () => {
    it('should create a MentorScript', () => {
      const script = proceduralStore.createMentorScript('project-1');
      expect(script.id).toBeDefined();
      expect(script.projectId).toBe('project-1');
      expect(script.version).toBe(1);
    });

    it('should create global MentorScript', () => {
      const script = proceduralStore.createMentorScript(null);
      expect(script.projectId).toBeNull();
    });

    it('should get MentorScript for project', () => {
      proceduralStore.createMentorScript('project-1');
      const script = proceduralStore.getMentorScriptForProject('project-1');
      expect(script).not.toBeNull();
      expect(script?.projectId).toBe('project-1');
    });
  });

  describe('MentorRule Management', () => {
    it('should add rules to script', () => {
      const script = proceduralStore.createMentorScript(null);
      const rule = proceduralStore.addMentorRule(script.id, {
        rule: 'Always explain your reasoning',
        source: 'user_defined',
        priority: 5,
      });

      expect(rule?.id).toBeDefined();
      expect(rule?.rule).toBe('Always explain your reasoning');
      expect(rule?.appliedCount).toBe(0);
    });

    it('should record rule application', () => {
      const script = proceduralStore.createMentorScript(null);
      const rule = proceduralStore.addMentorRule(script.id, {
        rule: 'Test rule',
        source: 'user_defined',
        priority: 5,
      });

      proceduralStore.recordRuleApplied(script.id, rule!.id);
      proceduralStore.recordRuleApplied(script.id, rule!.id);

      const updated = proceduralStore.getMentorRule(script.id, rule!.id);
      expect(updated?.appliedCount).toBe(2);
    });

    it('should get rules by priority', () => {
      const script = proceduralStore.createMentorScript(null);
      proceduralStore.addMentorRule(script.id, { rule: 'Low', source: 'user_defined', priority: 1 });
      proceduralStore.addMentorRule(script.id, { rule: 'High', source: 'user_defined', priority: 10 });
      proceduralStore.addMentorRule(script.id, { rule: 'Medium', source: 'user_defined', priority: 5 });

      const rules = proceduralStore.getRulesByPriority(script.id);
      expect(rules[0].rule).toBe('High');
      expect(rules[2].rule).toBe('Low');
    });
  });

  describe('BriefingScript Management', () => {
    it('should create a BriefingScript', () => {
      const script = proceduralStore.createBriefingScript('session-1', [
        'Focus on TypeScript',
        'Keep responses concise',
      ]);

      expect(script.id).toBeDefined();
      expect(script.sessionId).toBe('session-1');
      expect(script.instructions.length).toBe(2);
    });

    it('should get BriefingScript for session', () => {
      proceduralStore.createBriefingScript('session-1', ['Test']);
      const script = proceduralStore.getBriefingScriptForSession('session-1');
      expect(script).not.toBeNull();
    });

    it('should add instructions', () => {
      const script = proceduralStore.createBriefingScript('session-1', []);
      proceduralStore.addBriefingInstruction(script.id, 'New instruction');

      const updated = proceduralStore.getBriefingScript(script.id);
      expect(updated?.instructions.length).toBe(1);
    });
  });

  describe('PluginRule Management', () => {
    it('should set plugin rules', () => {
      const rule = proceduralStore.setPluginRules('plugin-1', ['Rule 1', 'Rule 2'], [
        { category: 'business_info', access: 'read' },
      ]);

      expect(rule.pluginId).toBe('plugin-1');
      expect(rule.rules.length).toBe(2);
      expect(rule.active).toBe(true);
    });

    it('should check permissions', () => {
      proceduralStore.setPluginRules('plugin-1', [], [
        { category: 'business_info', access: 'read' },
      ]);

      expect(proceduralStore.checkPluginPermission('plugin-1', 'business_info', 'read')).toBe(true);
      expect(proceduralStore.checkPluginPermission('plugin-1', 'personal_info', 'read')).toBe(false);
    });

    it('should deactivate plugins', () => {
      proceduralStore.setPluginRules('plugin-1', [], []);
      proceduralStore.setPluginActive('plugin-1', false);

      expect(proceduralStore.checkPluginPermission('plugin-1', 'business_info', 'read')).toBe(false);
    });
  });
});
