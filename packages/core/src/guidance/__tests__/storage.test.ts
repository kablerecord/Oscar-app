/**
 * Tests for Guidance Storage Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Guidance repository
  getProjectGuidance,
  createProjectGuidance,
  ensureProjectGuidance,
  addMentorScriptItem,
  updateMentorScriptItem,
  removeMentorScriptItem,
  getMentorScriptItem,
  incrementAppliedCount,
  batchIncrementAppliedCount,
  addReferenceDoc,
  removeReferenceDoc,
  rollbackToVersion,
  getItemsBySource,
  getItemsByPriority,
  getItemsByUsage,
  isAtSoftLimit,
  isAtHardLimit,
  clearProjectGuidance,
  clearAllGuidance,
  // VCR repository
  logVCR,
  getVCRHistory,
  getVCRHistoryReversed,
  getVCRByVersion,
  getLatestVCR,
  getVCRsForItem,
  getVCRsSinceVersion,
  getVCRsByAction,
  countVCRsByAction,
  getCurrentVersion,
  versionExists,
  getAvailableVersions,
  clearVCRHistory,
  clearAllVCRHistory,
} from '../storage';
import type { CreateItemRequest, UpdateItemRequest } from '../types';

describe('Guidance Storage', () => {
  const projectId = 'test-project';

  beforeEach(() => {
    clearAllGuidance();
    clearAllVCRHistory();
  });

  describe('ProjectGuidance CRUD', () => {
    it('should return null for non-existent project', () => {
      expect(getProjectGuidance('non-existent')).toBeNull();
    });

    it('should create project guidance', () => {
      const guidance = createProjectGuidance(projectId);

      expect(guidance.projectId).toBe(projectId);
      expect(guidance.version).toBe(0);
      expect(guidance.mentorScripts).toHaveLength(0);
      expect(guidance.referenceDocs).toHaveLength(0);
    });

    it('should return existing guidance', () => {
      createProjectGuidance(projectId);
      const guidance = getProjectGuidance(projectId);

      expect(guidance).not.toBeNull();
      expect(guidance?.projectId).toBe(projectId);
    });

    it('should ensure guidance exists', () => {
      const guidance = ensureProjectGuidance(projectId);
      expect(guidance.projectId).toBe(projectId);

      // Should return same instance
      const guidance2 = ensureProjectGuidance(projectId);
      expect(guidance2.version).toBe(guidance.version);
    });
  });

  describe('MentorScript Items', () => {
    it('should add a mentor script item', () => {
      const request: CreateItemRequest = {
        rule: 'Always search codebase first',
        priority: 7,
      };

      const item = addMentorScriptItem(projectId, request);

      expect(item.id).toBeDefined();
      expect(item.rule).toBe(request.rule);
      expect(item.priority).toBe(7);
      expect(item.source).toBe('user_defined');
      expect(item.appliedCount).toBe(0);
    });

    it('should add item with default priority', () => {
      const request: CreateItemRequest = { rule: 'Test rule' };
      const item = addMentorScriptItem(projectId, request);

      expect(item.priority).toBe(5); // Default
    });

    it('should add inferred item', () => {
      const request: CreateItemRequest = {
        rule: 'Ask before debugging',
        source: 'inferred',
        originalCorrection: 'I wanted you to ask first',
        sessionId: 'session-123',
      };

      const item = addMentorScriptItem(projectId, request);

      expect(item.source).toBe('inferred');
      expect(item.originalCorrection).toBe(request.originalCorrection);
      expect(item.promotedFromSession).toBe('session-123');
    });

    it('should get a specific item', () => {
      const request: CreateItemRequest = { rule: 'Test rule' };
      const added = addMentorScriptItem(projectId, request);

      const retrieved = getMentorScriptItem(projectId, added.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(added.id);
      expect(retrieved?.rule).toBe(added.rule);
    });

    it('should update an item', () => {
      const request: CreateItemRequest = { rule: 'Original rule' };
      const added = addMentorScriptItem(projectId, request);

      const updateRequest: UpdateItemRequest = {
        rule: 'Updated rule',
        priority: 9,
      };
      const updated = updateMentorScriptItem(projectId, added.id, updateRequest);

      expect(updated).not.toBeNull();
      expect(updated?.rule).toBe('Updated rule');
      expect(updated?.priority).toBe(9);
    });

    it('should clamp priority to valid range', () => {
      const added = addMentorScriptItem(projectId, { rule: 'Test' });

      updateMentorScriptItem(projectId, added.id, { priority: 15 });
      let item = getMentorScriptItem(projectId, added.id);
      expect(item?.priority).toBe(10); // Clamped to max

      updateMentorScriptItem(projectId, added.id, { priority: -5 });
      item = getMentorScriptItem(projectId, added.id);
      expect(item?.priority).toBe(1); // Clamped to min
    });

    it('should remove an item', () => {
      const added = addMentorScriptItem(projectId, { rule: 'To remove' });

      const vcr = removeMentorScriptItem(projectId, added.id);

      expect(vcr).not.toBeNull();
      expect(vcr?.action).toBe('remove');
      expect(getMentorScriptItem(projectId, added.id)).toBeNull();
    });

    it('should return null when removing non-existent item', () => {
      ensureProjectGuidance(projectId);
      const vcr = removeMentorScriptItem(projectId, 'non-existent');
      expect(vcr).toBeNull();
    });

    it('should increment applied count', () => {
      const added = addMentorScriptItem(projectId, { rule: 'Test' });

      expect(added.appliedCount).toBe(0);

      const count1 = incrementAppliedCount(projectId, added.id);
      expect(count1).toBe(1);

      const count2 = incrementAppliedCount(projectId, added.id);
      expect(count2).toBe(2);
    });

    it('should batch increment applied counts', () => {
      const item1 = addMentorScriptItem(projectId, { rule: 'Rule 1' });
      const item2 = addMentorScriptItem(projectId, { rule: 'Rule 2' });

      const updated = batchIncrementAppliedCount(projectId, [item1.id, item2.id]);

      expect(updated).toBe(2);
      expect(getMentorScriptItem(projectId, item1.id)?.appliedCount).toBe(1);
      expect(getMentorScriptItem(projectId, item2.id)?.appliedCount).toBe(1);
    });
  });

  describe('Reference Documents', () => {
    it('should add a reference document', () => {
      const doc = addReferenceDoc(projectId, '/docs/api.md', 'API conventions');

      expect(doc.path).toBe('/docs/api.md');
      expect(doc.context).toBe('API conventions');
    });

    it('should remove a reference document', () => {
      addReferenceDoc(projectId, '/docs/api.md', 'API');

      const removed = removeReferenceDoc(projectId, '/docs/api.md');
      expect(removed).toBe(true);

      // Try removing again
      const removedAgain = removeReferenceDoc(projectId, '/docs/api.md');
      expect(removedAgain).toBe(false);
    });
  });

  describe('Querying Items', () => {
    beforeEach(() => {
      addMentorScriptItem(projectId, {
        rule: 'User rule 1',
        priority: 5,
        source: 'user_defined',
      });
      addMentorScriptItem(projectId, {
        rule: 'Inferred rule',
        priority: 8,
        source: 'inferred',
      });
      addMentorScriptItem(projectId, {
        rule: 'User rule 2',
        priority: 3,
        source: 'user_defined',
      });
    });

    it('should get items by source', () => {
      const userItems = getItemsBySource(projectId, 'user_defined');
      expect(userItems).toHaveLength(2);

      const inferredItems = getItemsBySource(projectId, 'inferred');
      expect(inferredItems).toHaveLength(1);
    });

    it('should get items sorted by priority', () => {
      const items = getItemsByPriority(projectId);

      expect(items).toHaveLength(3);
      expect(items[0].priority).toBe(8);
      expect(items[1].priority).toBe(5);
      expect(items[2].priority).toBe(3);
    });

    it('should get items sorted by usage', () => {
      const guidance = getProjectGuidance(projectId)!;
      const items = guidance.mentorScripts;

      // Increment counts
      incrementAppliedCount(projectId, items[2].id);
      incrementAppliedCount(projectId, items[2].id);
      incrementAppliedCount(projectId, items[0].id);

      const byUsage = getItemsByUsage(projectId);

      expect(byUsage[0].appliedCount).toBe(2);
      expect(byUsage[1].appliedCount).toBe(1);
      expect(byUsage[2].appliedCount).toBe(0);
    });
  });

  describe('Limits', () => {
    it('should detect soft limit', () => {
      for (let i = 0; i < 15; i++) {
        addMentorScriptItem(projectId, { rule: `Rule ${i}` });
      }

      expect(isAtSoftLimit(projectId)).toBe(true);
    });

    it('should detect hard limit', () => {
      for (let i = 0; i < 25; i++) {
        addMentorScriptItem(projectId, { rule: `Rule ${i}` });
      }

      expect(isAtHardLimit(projectId)).toBe(true);
    });

    it('should throw when exceeding hard limit', () => {
      for (let i = 0; i < 25; i++) {
        addMentorScriptItem(projectId, { rule: `Rule ${i}` });
      }

      expect(() => {
        addMentorScriptItem(projectId, { rule: 'One more' });
      }).toThrow('hard limit');
    });
  });

  describe('Rollback', () => {
    it('should rollback to previous version', () => {
      // Add items
      addMentorScriptItem(projectId, { rule: 'Rule 1' }); // v1
      addMentorScriptItem(projectId, { rule: 'Rule 2' }); // v2
      addMentorScriptItem(projectId, { rule: 'Rule 3' }); // v3

      let guidance = getProjectGuidance(projectId);
      expect(guidance?.mentorScripts).toHaveLength(3);
      expect(guidance?.version).toBe(3);

      // Rollback to v1
      guidance = rollbackToVersion(projectId, 1);

      expect(guidance).not.toBeNull();
      expect(guidance?.version).toBe(1);
      expect(guidance?.mentorScripts).toHaveLength(1);
    });

    it('should rollback edit to previous state', () => {
      const item = addMentorScriptItem(projectId, { rule: 'Original' }); // v1
      updateMentorScriptItem(projectId, item.id, { rule: 'Modified' }); // v2

      expect(getMentorScriptItem(projectId, item.id)?.rule).toBe('Modified');

      rollbackToVersion(projectId, 1);

      expect(getMentorScriptItem(projectId, item.id)?.rule).toBe('Original');
    });

    it('should restore removed item on rollback', () => {
      const item = addMentorScriptItem(projectId, { rule: 'To restore' }); // v1
      removeMentorScriptItem(projectId, item.id); // v2

      expect(getMentorScriptItem(projectId, item.id)).toBeNull();

      rollbackToVersion(projectId, 1);

      expect(getMentorScriptItem(projectId, item.id)?.rule).toBe('To restore');
    });
  });
});

describe('VCR Repository', () => {
  const projectId = 'test-project';

  beforeEach(() => {
    clearAllVCRHistory();
  });

  it('should log VCR entries', () => {
    const vcr = logVCR(projectId, 1, 'add', 'item-1', undefined, {
      id: 'item-1',
      rule: 'Test',
      source: 'user_defined',
      created: new Date(),
      appliedCount: 0,
      priority: 5,
    });

    expect(vcr.version).toBe(1);
    expect(vcr.action).toBe('add');
    expect(vcr.itemId).toBe('item-1');
  });

  it('should get VCR history', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'edit', 'item-1');
    logVCR(projectId, 3, 'remove', 'item-1');

    const history = getVCRHistory(projectId);
    expect(history).toHaveLength(3);
  });

  it('should get VCR history reversed', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'edit', 'item-1');

    const reversed = getVCRHistoryReversed(projectId);
    expect(reversed[0].version).toBe(2);
    expect(reversed[1].version).toBe(1);
  });

  it('should get VCR by version', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'edit', 'item-1');

    const vcr = getVCRByVersion(projectId, 2);
    expect(vcr?.action).toBe('edit');
  });

  it('should get latest VCR', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'edit', 'item-1');
    logVCR(projectId, 3, 'remove', 'item-1');

    const latest = getLatestVCR(projectId);
    expect(latest?.version).toBe(3);
  });

  it('should get VCRs for item', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'add', 'item-2');
    logVCR(projectId, 3, 'edit', 'item-1');

    const vcrs = getVCRsForItem(projectId, 'item-1');
    expect(vcrs).toHaveLength(2);
  });

  it('should get VCRs since version', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'add', 'item-2');
    logVCR(projectId, 3, 'edit', 'item-1');

    const vcrs = getVCRsSinceVersion(projectId, 1);
    expect(vcrs).toHaveLength(2);
    expect(vcrs[0].version).toBe(2);
  });

  it('should get VCRs by action', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'add', 'item-2');
    logVCR(projectId, 3, 'edit', 'item-1');

    const addVcrs = getVCRsByAction(projectId, 'add');
    expect(addVcrs).toHaveLength(2);
  });

  it('should count VCRs by action', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'add', 'item-2');
    logVCR(projectId, 3, 'edit', 'item-1');
    logVCR(projectId, 4, 'remove', 'item-2');

    const counts = countVCRsByAction(projectId);
    expect(counts.add).toBe(2);
    expect(counts.edit).toBe(1);
    expect(counts.remove).toBe(1);
  });

  it('should get current version', () => {
    expect(getCurrentVersion(projectId)).toBe(0);

    logVCR(projectId, 1, 'add', 'item-1');
    expect(getCurrentVersion(projectId)).toBe(1);

    logVCR(projectId, 2, 'edit', 'item-1');
    expect(getCurrentVersion(projectId)).toBe(2);
  });

  it('should check if version exists', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 3, 'edit', 'item-1'); // Skip v2

    expect(versionExists(projectId, 1)).toBe(true);
    expect(versionExists(projectId, 2)).toBe(false);
    expect(versionExists(projectId, 3)).toBe(true);
  });

  it('should get available versions', () => {
    logVCR(projectId, 1, 'add', 'item-1');
    logVCR(projectId, 2, 'edit', 'item-1');
    logVCR(projectId, 3, 'remove', 'item-1');

    const versions = getAvailableVersions(projectId);
    expect(versions).toEqual([1, 2, 3]);
  });
});
