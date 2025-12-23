/**
 * OSQR Constitutional Framework - Secondary Rules Management
 *
 * Manages amendable secondary rules with version control.
 * Unlike immutable clauses, these can be modified through proper channels.
 */

import type {
  SecondaryRule,
  SecondaryRuleset,
  VersionControlledResolution,
  RulesetModifiedEvent,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

/** Initial ruleset version */
const INITIAL_VERSION = '1.0.0';

// ============================================================================
// In-Memory Store (Replace with file/database in production)
// ============================================================================

interface RulesStore {
  ruleset: SecondaryRuleset;
  listeners: Array<(event: RulesetModifiedEvent) => void>;
}

const store: RulesStore = {
  ruleset: {
    version: INITIAL_VERSION,
    lastModified: new Date().toISOString(),
    rules: [],
    changeLog: [],
  },
  listeners: [],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate ISO 8601 timestamp.
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generate a unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Increment version string (semver-style).
 */
function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1; // Increment patch version
  return parts.join('.');
}

// ============================================================================
// Rule Management
// ============================================================================

/**
 * Get the current ruleset.
 */
export function getRuleset(): SecondaryRuleset {
  return { ...store.ruleset };
}

/**
 * Get a specific rule by ID.
 */
export function getRuleById(ruleId: string): SecondaryRule | undefined {
  return store.ruleset.rules.find((r) => r.id === ruleId);
}

/**
 * Get all rules in a category.
 */
export function getRulesByCategory(
  category: SecondaryRule['category']
): SecondaryRule[] {
  return store.ruleset.rules.filter((r) => r.category === category);
}

/**
 * Add a new secondary rule.
 */
export function addRule(
  category: SecondaryRule['category'],
  rule: string,
  approvedBy: string
): SecondaryRule {
  const timestamp = getTimestamp();
  const newRule: SecondaryRule = {
    id: generateId('rule'),
    category,
    rule,
    createdAt: timestamp,
    modifiedAt: timestamp,
  };

  // Add to ruleset
  store.ruleset.rules.push(newRule);
  store.ruleset.lastModified = timestamp;
  store.ruleset.version = incrementVersion(store.ruleset.version);

  // Record the change
  const resolution: VersionControlledResolution = {
    resolutionId: generateId('res'),
    ruleId: newRule.id,
    previousValue: '',
    newValue: rule,
    reason: 'Initial creation',
    timestamp,
    approvedBy,
  };
  store.ruleset.changeLog.push(resolution);

  // Emit event
  emitRulesetModified(resolution);

  return newRule;
}

/**
 * Update an existing rule.
 */
export function updateRule(
  ruleId: string,
  newValue: string,
  reason: string,
  approvedBy: string
): SecondaryRule | null {
  const rule = store.ruleset.rules.find((r) => r.id === ruleId);
  if (!rule) {
    return null;
  }

  const timestamp = getTimestamp();
  const previousValue = rule.rule;

  // Update the rule
  rule.rule = newValue;
  rule.modifiedAt = timestamp;
  store.ruleset.lastModified = timestamp;
  store.ruleset.version = incrementVersion(store.ruleset.version);

  // Record the change
  const resolution: VersionControlledResolution = {
    resolutionId: generateId('res'),
    ruleId,
    previousValue,
    newValue,
    reason,
    timestamp,
    approvedBy,
  };
  store.ruleset.changeLog.push(resolution);

  // Emit event
  emitRulesetModified(resolution);

  return rule;
}

/**
 * Delete a rule.
 */
export function deleteRule(
  ruleId: string,
  reason: string,
  approvedBy: string
): boolean {
  const ruleIndex = store.ruleset.rules.findIndex((r) => r.id === ruleId);
  if (ruleIndex === -1) {
    return false;
  }

  const rule = store.ruleset.rules[ruleIndex];
  const timestamp = getTimestamp();

  // Remove the rule
  store.ruleset.rules.splice(ruleIndex, 1);
  store.ruleset.lastModified = timestamp;
  store.ruleset.version = incrementVersion(store.ruleset.version);

  // Record the change
  const resolution: VersionControlledResolution = {
    resolutionId: generateId('res'),
    ruleId,
    previousValue: rule.rule,
    newValue: '[DELETED]',
    reason,
    timestamp,
    approvedBy,
  };
  store.ruleset.changeLog.push(resolution);

  // Emit event
  emitRulesetModified(resolution);

  return true;
}

// ============================================================================
// Version Control
// ============================================================================

/**
 * Get the change log for a specific rule.
 */
export function getRuleHistory(ruleId: string): VersionControlledResolution[] {
  return store.ruleset.changeLog.filter((r) => r.ruleId === ruleId);
}

/**
 * Get the full change log.
 */
export function getChangeLog(): VersionControlledResolution[] {
  return [...store.ruleset.changeLog];
}

/**
 * Get the value of a rule at a specific point in time.
 */
export function getRuleAtTime(
  ruleId: string,
  targetTime: Date
): string | null {
  const targetTimestamp = targetTime.toISOString();

  // Find all changes to this rule before the target time
  const relevantChanges = store.ruleset.changeLog
    .filter((r) => r.ruleId === ruleId && r.timestamp <= targetTimestamp)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (relevantChanges.length === 0) {
    return null; // Rule didn't exist at that time
  }

  // Return the most recent value
  const lastChange = relevantChanges[relevantChanges.length - 1];
  return lastChange.newValue === '[DELETED]' ? null : lastChange.newValue;
}

/**
 * Rollback a rule to a previous version.
 */
export function rollbackRule(
  ruleId: string,
  targetResolutionId: string,
  reason: string,
  approvedBy: string
): SecondaryRule | null {
  const targetResolution = store.ruleset.changeLog.find(
    (r) => r.resolutionId === targetResolutionId && r.ruleId === ruleId
  );

  if (!targetResolution) {
    return null;
  }

  // Get the value after that resolution
  const valueToRestore = targetResolution.newValue;

  if (valueToRestore === '[DELETED]') {
    // Can't rollback to deleted state using this function
    return null;
  }

  return updateRule(
    ruleId,
    valueToRestore,
    `Rollback to ${targetResolutionId}: ${reason}`,
    approvedBy
  );
}

// ============================================================================
// Event Subscription
// ============================================================================

/**
 * Emit a ruleset modified event.
 */
function emitRulesetModified(resolution: VersionControlledResolution): void {
  const event: RulesetModifiedEvent = {
    eventType: 'RULESET_MODIFIED',
    resolution,
  };

  for (const listener of store.listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error('[SecondaryRules] Listener error:', error);
    }
  }
}

/**
 * Subscribe to ruleset modification events.
 */
export function onRulesetModified(
  callback: (event: RulesetModifiedEvent) => void
): () => void {
  store.listeners.push(callback);

  return () => {
    const index = store.listeners.indexOf(callback);
    if (index > -1) {
      store.listeners.splice(index, 1);
    }
  };
}

// ============================================================================
// Persistence (JSON file-based for v1.0)
// ============================================================================

/**
 * Export the ruleset as JSON.
 */
export function exportRuleset(): string {
  return JSON.stringify(store.ruleset, null, 2);
}

/**
 * Import a ruleset from JSON.
 */
export function importRuleset(json: string): void {
  const imported = JSON.parse(json) as SecondaryRuleset;

  // Validate structure
  if (!imported.version || !Array.isArray(imported.rules)) {
    throw new Error('Invalid ruleset format');
  }

  store.ruleset = imported;
}

/**
 * Reset the ruleset to initial state.
 */
export function resetRuleset(): void {
  store.ruleset = {
    version: INITIAL_VERSION,
    lastModified: getTimestamp(),
    rules: [],
    changeLog: [],
  };
}

// ============================================================================
// Default Rules
// ============================================================================

/**
 * Initialize default secondary rules.
 * Call this once at startup if rules should have defaults.
 */
export function initializeDefaultRules(approvedBy: string = 'SYSTEM'): void {
  // Only initialize if empty
  if (store.ruleset.rules.length > 0) {
    return;
  }

  // Plugin boundary rules
  addRule(
    'PLUGIN_BOUNDARY',
    'Plugins cannot access PKV write operations',
    approvedBy
  );

  addRule(
    'PLUGIN_BOUNDARY',
    'Plugins must declare all capabilities at registration',
    approvedBy
  );

  addRule(
    'PLUGIN_BOUNDARY',
    'Plugin execution timeout is 30 seconds',
    approvedBy
  );

  // Data access rules
  addRule(
    'DATA_ACCESS',
    'Cross-user data access is prohibited',
    approvedBy
  );

  addRule(
    'DATA_ACCESS',
    'External network calls must use declared domains only',
    approvedBy
  );

  // Honesty tier rules
  addRule(
    'HONESTY_TIER',
    'BASE tier applies mild truth-telling always',
    approvedBy
  );

  addRule(
    'HONESTY_TIER',
    'PLUGIN tier allows honesty style customization above baseline',
    approvedBy
  );

  addRule(
    'HONESTY_TIER',
    'SUPREME_COURT tier removes politeness filters but maintains baseline honesty',
    approvedBy
  );
}
