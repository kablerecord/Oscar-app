/**
 * Procedural Store - MentorScript and BriefingScript Storage
 *
 * Manages procedural memory: rules, scripts, and learned behaviors.
 * This is the "how to do things" memory type.
 * Supports optional Chroma persistence for data durability.
 */

import type {
  ProceduralStore,
  MentorScript,
  MentorRule,
  BriefingScript,
  PluginRule,
  PluginPermission,
  MemoryCategory,
} from '../types';

// In-memory storage (always used for fast access)
const mentorScripts = new Map<string, MentorScript>();
const briefingScripts = new Map<string, BriefingScript>();
const pluginRules = new Map<string, PluginRule>();

// Persistence state
let persistenceEnabled = false;
let chromaCollection: unknown = null;
let userId: string | undefined;

// Encryption state
let encryptionEnabled = false;

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Persistence Control
// ============================================================================

/**
 * Enable Chroma persistence
 * Call this after initializing Chroma to enable data durability
 * @param userIdParam - User ID for collection isolation
 * @param enableEncryptionParam - Enable encryption at rest (requires userIdParam)
 */
export async function enablePersistence(
  userIdParam?: string,
  enableEncryptionParam: boolean = false
): Promise<void> {
  const { initializeChroma, getOrCreateCollection } = await import('../chroma');

  await initializeChroma();
  userId = userIdParam;
  chromaCollection = await getOrCreateCollection('procedural', userId);
  persistenceEnabled = true;

  // Enable encryption if requested and user ID is provided
  if (enableEncryptionParam && userIdParam) {
    const { enableEncryption, KEY_PURPOSES } = await import('../encryption');
    await enableEncryption(userIdParam, KEY_PURPOSES.PROCEDURAL_RULES);
    encryptionEnabled = true;
  }

  // Load existing data from Chroma
  await loadFromChroma();
}

/**
 * Disable persistence (use in-memory only)
 */
export function disablePersistence(): void {
  persistenceEnabled = false;
  chromaCollection = null;

  if (encryptionEnabled) {
    import('../encryption').then(({ disableEncryption }) => {
      disableEncryption();
    });
    encryptionEnabled = false;
  }
}

/**
 * Check if persistence is enabled
 */
export function isPersistenceEnabled(): boolean {
  return persistenceEnabled;
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled;
}

/**
 * Load all data from Chroma into memory
 */
async function loadFromChroma(): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { queryAll, deserializeMetadata, PROCEDURAL_METADATA_SCHEMA } = await import('../chroma');

  const results = await queryAll(chromaCollection as any);

  for (const result of results) {
    const metadata = deserializeMetadata(
      result.metadata as Record<string, string | number | boolean>,
      PROCEDURAL_METADATA_SCHEMA
    );

    const docType = metadata.docType as string;

    if (docType === 'mentorScript') {
      // Decrypt mentor rules if encrypted
      let rules = (metadata.rules as MentorRule[]) || [];

      if (encryptionEnabled && metadata._encrypted === true) {
        try {
          const { decryptContent } = await import('../encryption');
          const keyId = (metadata._keyId as string) || '';

          // Decrypt each rule's text
          const decryptedRules: MentorRule[] = [];
          for (const rule of rules) {
            try {
              const decryptedRule = await decryptContent(rule.rule, keyId);
              decryptedRules.push({ ...rule, rule: decryptedRule });
            } catch (error) {
              console.error(`Failed to decrypt rule ${rule.id}:`, error);
              decryptedRules.push(rule);
            }
          }
          rules = decryptedRules;
        } catch (error) {
          console.error(`Failed to decrypt mentor script ${result.id}:`, error);
          continue;
        }
      }

      const script: MentorScript = {
        id: result.id,
        projectId: (metadata.projectId as string) || null,
        rules,
        version: metadata.version as number,
        createdAt: new Date(metadata.createdAt as string),
        updatedAt: new Date(metadata.updatedAt as string),
      };
      mentorScripts.set(script.id, script);
    } else if (docType === 'briefingScript') {
      // Decrypt briefing instructions if encrypted
      let instructions = (metadata.instructions as string[]) || [];

      if (encryptionEnabled && metadata._encrypted === true) {
        try {
          const { decryptContent } = await import('../encryption');
          const keyId = (metadata._keyId as string) || '';

          // Decrypt each instruction
          const decryptedInstructions: string[] = [];
          for (const instruction of instructions) {
            try {
              const decrypted = await decryptContent(instruction, keyId);
              decryptedInstructions.push(decrypted);
            } catch (error) {
              console.error(`Failed to decrypt instruction:`, error);
              decryptedInstructions.push(instruction);
            }
          }
          instructions = decryptedInstructions;
        } catch (error) {
          console.error(`Failed to decrypt briefing script ${result.id}:`, error);
          continue;
        }
      }

      const script: BriefingScript = {
        id: result.id,
        sessionId: metadata.sessionId as string,
        instructions,
        expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt as string) : null,
      };
      briefingScripts.set(script.id, script);
    } else if (docType === 'pluginRule') {
      const rule: PluginRule = {
        pluginId: result.id,
        rules: (metadata.rules as string[]) || [],
        permissions: (metadata.permissions as PluginPermission[]) || [],
        active: metadata.active as boolean,
      };
      pluginRules.set(rule.pluginId, rule);
    }
  }
}

/**
 * Save a mentor script to Chroma
 */
async function saveMentorScriptToChroma(script: MentorScript): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  // Encrypt rules if encryption is enabled
  let rulesToStore = script.rules;
  let encryptionMetadata: Record<string, unknown> = {};

  if (encryptionEnabled) {
    try {
      const { encryptContent } = await import('../encryption');

      // Encrypt each rule's text
      const encryptedRules: MentorRule[] = [];
      let keyId = '';
      for (const rule of script.rules) {
        const encrypted = await encryptContent(rule.rule);
        keyId = encrypted.keyId;
        encryptedRules.push({ ...rule, rule: encrypted.encryptedContent });
      }
      rulesToStore = encryptedRules;

      encryptionMetadata = {
        _encrypted: true,
        _keyId: keyId,
      };
    } catch (error) {
      console.error(`Failed to encrypt mentor script ${script.id}:`, error);
      throw error;
    }
  }

  const metadata = serializeMetadata({
    docType: 'mentorScript',
    projectId: script.projectId,
    rules: rulesToStore,
    version: script.version,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
    ...encryptionMetadata,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: script.id,
    content: `MentorScript ${script.id} - ${script.rules.length} rules`,
    metadata,
  }]);
}

/**
 * Save a briefing script to Chroma
 */
async function saveBriefingScriptToChroma(script: BriefingScript): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  // Encrypt instructions if encryption is enabled
  let instructionsToStore = script.instructions;
  let encryptionMetadata: Record<string, unknown> = {};

  if (encryptionEnabled) {
    try {
      const { encryptContent } = await import('../encryption');

      // Encrypt each instruction
      const encryptedInstructions: string[] = [];
      let keyId = '';
      for (const instruction of script.instructions) {
        const encrypted = await encryptContent(instruction);
        keyId = encrypted.keyId;
        encryptedInstructions.push(encrypted.encryptedContent);
      }
      instructionsToStore = encryptedInstructions;

      encryptionMetadata = {
        _encrypted: true,
        _keyId: keyId,
      };
    } catch (error) {
      console.error(`Failed to encrypt briefing script ${script.id}:`, error);
      throw error;
    }
  }

  const metadata = serializeMetadata({
    docType: 'briefingScript',
    sessionId: script.sessionId,
    instructions: instructionsToStore,
    expiresAt: script.expiresAt,
    ...encryptionMetadata,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: script.id,
    content: `BriefingScript ${script.id}`,
    metadata,
  }]);
}

/**
 * Save a plugin rule to Chroma
 */
async function savePluginRuleToChroma(rule: PluginRule): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  const metadata = serializeMetadata({
    docType: 'pluginRule',
    rules: rule.rules,
    permissions: rule.permissions,
    active: rule.active,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: rule.pluginId,
    content: `PluginRule ${rule.pluginId} - ${rule.rules.length} rules`,
    metadata,
  }]);
}

/**
 * Delete a document from Chroma
 */
async function deleteFromChroma(id: string): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { deleteDocuments } = await import('../chroma');
  await deleteDocuments(chromaCollection as any, [id]);
}

/**
 * Sync all in-memory data to Chroma
 */
export async function syncToChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  for (const script of mentorScripts.values()) {
    await saveMentorScriptToChroma(script);
  }
  for (const script of briefingScripts.values()) {
    await saveBriefingScriptToChroma(script);
  }
  for (const rule of pluginRules.values()) {
    await savePluginRuleToChroma(rule);
  }
}

/**
 * Reload all data from Chroma (discards in-memory changes)
 */
export async function syncFromChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  mentorScripts.clear();
  briefingScripts.clear();
  pluginRules.clear();
  await loadFromChroma();
}

// ============================================================================
// MentorScript Management
// ============================================================================

/**
 * Create a new MentorScript
 */
export function createMentorScript(
  projectId: string | null = null
): MentorScript {
  const script: MentorScript = {
    id: generateId('mentor'),
    projectId,
    rules: [],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mentorScripts.set(script.id, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return script;
}

/**
 * Get a MentorScript by ID
 */
export function getMentorScript(scriptId: string): MentorScript | null {
  return mentorScripts.get(scriptId) || null;
}

/**
 * Get MentorScript for a project (or global)
 */
export function getMentorScriptForProject(
  projectId: string | null
): MentorScript | null {
  for (const script of mentorScripts.values()) {
    if (script.projectId === projectId) {
      return script;
    }
  }
  return null;
}

/**
 * Get all MentorScripts
 */
export function getAllMentorScripts(): MentorScript[] {
  return Array.from(mentorScripts.values());
}

/**
 * Get global MentorScript (projectId = null)
 */
export function getGlobalMentorScript(): MentorScript | null {
  return getMentorScriptForProject(null);
}

/**
 * Update MentorScript version
 */
export function incrementVersion(scriptId: string): MentorScript | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  script.version += 1;
  script.updatedAt = new Date();
  mentorScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return script;
}

// ============================================================================
// MentorRule Management
// ============================================================================

/**
 * Add a rule to a MentorScript
 */
export function addMentorRule(
  scriptId: string,
  rule: Omit<MentorRule, 'id' | 'appliedCount' | 'helpfulCount' | 'createdAt'>
): MentorRule | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  const newRule: MentorRule = {
    id: generateId('rule'),
    ...rule,
    appliedCount: 0,
    helpfulCount: 0,
    createdAt: new Date(),
  };

  script.rules.push(newRule);
  script.updatedAt = new Date();
  mentorScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return newRule;
}

/**
 * Get a rule by ID
 */
export function getMentorRule(
  scriptId: string,
  ruleId: string
): MentorRule | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  return script.rules.find((r) => r.id === ruleId) || null;
}

/**
 * Update a rule
 */
export function updateMentorRule(
  scriptId: string,
  ruleId: string,
  updates: Partial<Omit<MentorRule, 'id' | 'createdAt'>>
): MentorRule | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  const ruleIndex = script.rules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) return null;

  script.rules[ruleIndex] = { ...script.rules[ruleIndex], ...updates };
  script.updatedAt = new Date();
  mentorScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return script.rules[ruleIndex];
}

/**
 * Delete a rule
 */
export function deleteMentorRule(scriptId: string, ruleId: string): boolean {
  const script = mentorScripts.get(scriptId);
  if (!script) return false;

  const originalLength = script.rules.length;
  script.rules = script.rules.filter((r) => r.id !== ruleId);

  if (script.rules.length < originalLength) {
    script.updatedAt = new Date();
    mentorScripts.set(scriptId, script);

    if (persistenceEnabled) {
      saveMentorScriptToChroma(script).catch(console.error);
    }

    return true;
  }

  return false;
}

/**
 * Record that a rule was applied
 */
export function recordRuleApplied(
  scriptId: string,
  ruleId: string
): MentorRule | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  const rule = script.rules.find((r) => r.id === ruleId);
  if (!rule) return null;

  rule.appliedCount += 1;
  mentorScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return rule;
}

/**
 * Record that a rule application was helpful
 */
export function recordRuleHelpful(
  scriptId: string,
  ruleId: string
): MentorRule | null {
  const script = mentorScripts.get(scriptId);
  if (!script) return null;

  const rule = script.rules.find((r) => r.id === ruleId);
  if (!rule) return null;

  rule.helpfulCount += 1;
  mentorScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveMentorScriptToChroma(script).catch(console.error);
  }

  return rule;
}

/**
 * Get rules sorted by priority
 */
export function getRulesByPriority(scriptId: string): MentorRule[] {
  const script = mentorScripts.get(scriptId);
  if (!script) return [];

  return [...script.rules].sort((a, b) => b.priority - a.priority);
}

/**
 * Get rules sorted by effectiveness (helpful/applied ratio)
 */
export function getRulesByEffectiveness(scriptId: string): MentorRule[] {
  const script = mentorScripts.get(scriptId);
  if (!script) return [];

  return [...script.rules].sort((a, b) => {
    const aEffectiveness =
      a.appliedCount > 0 ? a.helpfulCount / a.appliedCount : 0;
    const bEffectiveness =
      b.appliedCount > 0 ? b.helpfulCount / b.appliedCount : 0;
    return bEffectiveness - aEffectiveness;
  });
}

// ============================================================================
// BriefingScript Management
// ============================================================================

/**
 * Create a new BriefingScript
 */
export function createBriefingScript(
  sessionId: string,
  instructions: string[],
  expiresAt: Date | null = null
): BriefingScript {
  const script: BriefingScript = {
    id: generateId('brief'),
    sessionId,
    instructions,
    expiresAt,
  };

  briefingScripts.set(script.id, script);

  if (persistenceEnabled) {
    saveBriefingScriptToChroma(script).catch(console.error);
  }

  return script;
}

/**
 * Get a BriefingScript by ID
 */
export function getBriefingScript(scriptId: string): BriefingScript | null {
  return briefingScripts.get(scriptId) || null;
}

/**
 * Get BriefingScript for a session
 */
export function getBriefingScriptForSession(
  sessionId: string
): BriefingScript | null {
  for (const script of briefingScripts.values()) {
    if (script.sessionId === sessionId) {
      // Check if expired
      if (script.expiresAt && script.expiresAt < new Date()) {
        if (persistenceEnabled) {
          deleteFromChroma(script.id).catch(console.error);
        }
        briefingScripts.delete(script.id);
        return null;
      }
      return script;
    }
  }
  return null;
}

/**
 * Add instruction to a BriefingScript
 */
export function addBriefingInstruction(
  scriptId: string,
  instruction: string
): BriefingScript | null {
  const script = briefingScripts.get(scriptId);
  if (!script) return null;

  script.instructions.push(instruction);
  briefingScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveBriefingScriptToChroma(script).catch(console.error);
  }

  return script;
}

/**
 * Remove instruction from a BriefingScript
 */
export function removeBriefingInstruction(
  scriptId: string,
  index: number
): BriefingScript | null {
  const script = briefingScripts.get(scriptId);
  if (!script || index < 0 || index >= script.instructions.length) return null;

  script.instructions.splice(index, 1);
  briefingScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveBriefingScriptToChroma(script).catch(console.error);
  }

  return script;
}

/**
 * Update BriefingScript expiration
 */
export function updateBriefingExpiration(
  scriptId: string,
  expiresAt: Date | null
): BriefingScript | null {
  const script = briefingScripts.get(scriptId);
  if (!script) return null;

  script.expiresAt = expiresAt;
  briefingScripts.set(scriptId, script);

  if (persistenceEnabled) {
    saveBriefingScriptToChroma(script).catch(console.error);
  }

  return script;
}

/**
 * Delete expired BriefingScripts
 */
export function cleanupExpiredBriefings(): number {
  const now = new Date();
  let deleted = 0;

  for (const [id, script] of briefingScripts) {
    if (script.expiresAt && script.expiresAt < now) {
      if (persistenceEnabled) {
        deleteFromChroma(id).catch(console.error);
      }
      briefingScripts.delete(id);
      deleted++;
    }
  }

  return deleted;
}

// ============================================================================
// PluginRule Management
// ============================================================================

/**
 * Create or update plugin rules
 */
export function setPluginRules(
  pluginId: string,
  rules: string[],
  permissions: PluginPermission[],
  active: boolean = true
): PluginRule {
  const pluginRule: PluginRule = {
    pluginId,
    rules,
    permissions,
    active,
  };

  pluginRules.set(pluginId, pluginRule);

  if (persistenceEnabled) {
    savePluginRuleToChroma(pluginRule).catch(console.error);
  }

  return pluginRule;
}

/**
 * Get plugin rules
 */
export function getPluginRules(pluginId: string): PluginRule | null {
  return pluginRules.get(pluginId) || null;
}

/**
 * Get all plugin rules
 */
export function getAllPluginRules(): PluginRule[] {
  return Array.from(pluginRules.values());
}

/**
 * Get active plugin rules
 */
export function getActivePluginRules(): PluginRule[] {
  return Array.from(pluginRules.values()).filter((r) => r.active);
}

/**
 * Activate/deactivate a plugin
 */
export function setPluginActive(pluginId: string, active: boolean): boolean {
  const rule = pluginRules.get(pluginId);
  if (!rule) return false;

  rule.active = active;
  pluginRules.set(pluginId, rule);

  if (persistenceEnabled) {
    savePluginRuleToChroma(rule).catch(console.error);
  }

  return true;
}

/**
 * Check if plugin has permission for a category
 */
export function checkPluginPermission(
  pluginId: string,
  category: MemoryCategory,
  accessType: 'read' | 'write'
): boolean {
  const rule = pluginRules.get(pluginId);
  if (!rule || !rule.active) return false;

  const permission = rule.permissions.find((p) => p.category === category);
  if (!permission) return false;

  if (accessType === 'read') {
    return permission.access === 'read' || permission.access === 'write';
  }
  return permission.access === 'write';
}

/**
 * Delete plugin rules
 */
export function deletePluginRules(pluginId: string): boolean {
  const deleted = pluginRules.delete(pluginId);

  if (deleted && persistenceEnabled) {
    deleteFromChroma(pluginId).catch(console.error);
  }

  return deleted;
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Get the full procedural store
 */
export function getProceduralStore(): ProceduralStore {
  return {
    mentorScripts: Array.from(mentorScripts.values()),
    briefingScripts: Array.from(briefingScripts.values()),
    pluginRules: Array.from(pluginRules.values()),
  };
}

/**
 * Get store statistics
 */
export function getStoreStats(): {
  mentorScriptCount: number;
  totalRuleCount: number;
  briefingScriptCount: number;
  pluginRuleCount: number;
  activePluginCount: number;
} {
  const allMentorScripts = Array.from(mentorScripts.values());
  const totalRuleCount = allMentorScripts.reduce(
    (sum, s) => sum + s.rules.length,
    0
  );
  const activePluginCount = Array.from(pluginRules.values()).filter(
    (r) => r.active
  ).length;

  return {
    mentorScriptCount: allMentorScripts.length,
    totalRuleCount,
    briefingScriptCount: briefingScripts.size,
    pluginRuleCount: pluginRules.size,
    activePluginCount,
  };
}

/**
 * Clear all data (for testing)
 */
export function clearStore(): void {
  mentorScripts.clear();
  briefingScripts.clear();
  pluginRules.clear();
  persistenceEnabled = false;
  chromaCollection = null;
  encryptionEnabled = false;
}

/**
 * Export store data (for GDPR compliance)
 */
export function exportStore(): ProceduralStore {
  return getProceduralStore();
}

/**
 * Delete all user procedural data
 */
export function deleteAllData(): void {
  if (persistenceEnabled) {
    for (const id of mentorScripts.keys()) {
      deleteFromChroma(id).catch(console.error);
    }
    for (const id of briefingScripts.keys()) {
      deleteFromChroma(id).catch(console.error);
    }
    for (const id of pluginRules.keys()) {
      deleteFromChroma(id).catch(console.error);
    }
  }

  mentorScripts.clear();
  briefingScripts.clear();
  pluginRules.clear();
}
