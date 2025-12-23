/**
 * Privacy Gate
 *
 * Controls plugin and component access to memory vault.
 * Enforces permission tiers and applies redaction rules.
 */

import type {
  MemoryCategory,
  PermissionTier,
  AccessDecision,
  RedactionRule,
  SanitizedSummary,
  SemanticMemory,
  PluginDataRequest,
  PrivacyDefaults,
} from '../types';
import { applyRedactionRules, getDefaultRedactionRules, containsSensitiveInfo, cleanupRedactedText } from './redaction';
import { logAccess } from './audit';

/**
 * Permission tier allowances
 */
const TIER_ALLOWANCES: Record<PermissionTier, MemoryCategory[]> = {
  none: [],
  minimal: ['preferences'],
  contextual: ['preferences', 'business_info', 'projects', 'domain_knowledge'],
  full: [
    'preferences',
    'business_info',
    'projects',
    'domain_knowledge',
    'decisions',
    'commitments',
    'relationships',
  ],
  // Note: 'personal_info' is NEVER accessible to plugins
};

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY: PrivacyDefaults = {
  piiRedaction: true,
  financialRedaction: true,
  familyRedaction: true,
  pluginAccessTier: 'contextual',
};

// User privacy settings storage
const userPrivacySettings = new Map<string, PrivacyDefaults>();

/**
 * Get user privacy settings
 */
export function getUserPrivacySettings(userId: string): PrivacyDefaults {
  return userPrivacySettings.get(userId) || { ...DEFAULT_PRIVACY };
}

/**
 * Update user privacy settings
 */
export function updateUserPrivacySettings(
  userId: string,
  settings: Partial<PrivacyDefaults>
): PrivacyDefaults {
  const current = getUserPrivacySettings(userId);
  const updated = { ...current, ...settings };
  userPrivacySettings.set(userId, updated);
  return updated;
}

/**
 * Get allowed categories for a permission tier
 */
export function getAllowedCategories(
  tier: PermissionTier,
  requested: MemoryCategory[]
): MemoryCategory[] {
  const allowed = TIER_ALLOWANCES[tier];
  return requested.filter((cat) => allowed.includes(cat));
}

/**
 * Check if access is allowed
 */
export function checkAccess(
  requesterId: string,
  requesterType: 'plugin' | 'component' | 'user',
  userId: string,
  dataCategory: MemoryCategory,
  accessType: 'read' | 'write'
): AccessDecision {
  const userSettings = getUserPrivacySettings(userId);

  // Users always have full access to their own data
  if (requesterType === 'user') {
    return {
      allowed: true,
      tier: 'full',
      redactions: [],
      reason: 'User accessing own data',
      logged: true,
    };
  }

  // Components (internal OSQR) get contextual access
  if (requesterType === 'component') {
    const componentTier: PermissionTier = 'contextual';
    const allowed = TIER_ALLOWANCES[componentTier].includes(dataCategory);

    return {
      allowed,
      tier: componentTier,
      redactions: allowed ? getDefaultRedactionRules(componentTier) : [],
      reason: allowed
        ? 'Component access granted'
        : `Category ${dataCategory} not allowed for components`,
      logged: true,
    };
  }

  // Plugins use user-configured tier
  const pluginTier = userSettings.pluginAccessTier;
  const allowed = TIER_ALLOWANCES[pluginTier].includes(dataCategory);

  // Writes are more restricted
  if (accessType === 'write') {
    // Only 'full' tier can write, and only to allowed categories
    if (pluginTier !== 'full') {
      return {
        allowed: false,
        tier: pluginTier,
        redactions: [],
        reason: 'Write access requires full permission tier',
        logged: true,
      };
    }
  }

  // personal_info is never accessible to plugins
  if (dataCategory === 'personal_info') {
    return {
      allowed: false,
      tier: pluginTier,
      redactions: [],
      reason: 'Personal info is never accessible to plugins',
      logged: true,
    };
  }

  return {
    allowed,
    tier: pluginTier,
    redactions: allowed ? getDefaultRedactionRules(pluginTier) : [],
    reason: allowed
      ? 'Plugin access granted'
      : `Category ${dataCategory} not allowed for tier ${pluginTier}`,
    logged: true,
  };
}

/**
 * Generate a sanitized summary from memories
 */
export function generateSanitizedSummary(
  memories: SemanticMemory[],
  tier: PermissionTier,
  customRedactions?: RedactionRule[]
): SanitizedSummary {
  if (memories.length === 0) {
    return {
      content: 'No relevant information available.',
      categories: [],
      confidence: 1,
      redactionsApplied: [],
    };
  }

  // Get redaction rules
  const redactions = customRedactions || getDefaultRedactionRules(tier);

  // Combine memory contents
  const combinedContent = memories.map((m) => m.content).join(' ');

  // Apply redactions
  const { text: redactedContent, redactionsApplied } = applyRedactionRules(
    combinedContent,
    redactions
  );

  // Clean up
  const cleanedContent = cleanupRedactedText(redactedContent);

  // Get unique categories
  const categories = [...new Set(memories.map((m) => m.category))];

  // Calculate confidence (average of memory confidences)
  const confidence =
    memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length;

  return {
    content: cleanedContent,
    categories,
    confidence,
    redactionsApplied,
  };
}

/**
 * Process a plugin data request
 */
export function processPluginRequest(
  request: PluginDataRequest,
  userId: string,
  memories: SemanticMemory[]
): SanitizedSummary {
  const { pluginId, requestedCategories, purpose } = request;

  // Get user settings
  const userSettings = getUserPrivacySettings(userId);
  const tier = userSettings.pluginAccessTier;

  // Filter to allowed categories
  const allowedCategories = getAllowedCategories(tier, requestedCategories);

  // Filter memories by allowed categories
  const allowedMemories = memories.filter((m) =>
    allowedCategories.includes(m.category)
  );

  // Generate summary
  const summary = generateSanitizedSummary(allowedMemories, tier);

  // Log access
  logAccess({
    requesterId: pluginId,
    requesterType: 'plugin',
    userId,
    categoriesRequested: requestedCategories,
    categoriesProvided: allowedCategories,
    redactionsApplied: summary.redactionsApplied,
  });

  // If no allowed categories, return denial message
  if (allowedCategories.length === 0) {
    return {
      content: `No user data available for ${purpose}.`,
      categories: [],
      confidence: 1,
      redactionsApplied: ['all'],
    };
  }

  return summary;
}

/**
 * Generate a contextual summary for a specific purpose
 */
export function generateContextualSummary(
  memories: SemanticMemory[],
  purpose: string,
  tier: PermissionTier
): string {
  const summary = generateSanitizedSummary(memories, tier);

  if (!summary.content || summary.content === 'No relevant information available.') {
    return `Unable to provide context for: ${purpose}`;
  }

  // Format as contextual brief
  const categoryList = summary.categories.join(', ');
  return `Context for ${purpose} (from ${categoryList}): ${summary.content}`;
}

/**
 * Check if content is safe to share
 */
export function isContentSafeToShare(
  content: string,
  tier: PermissionTier
): { safe: boolean; reasons: string[] } {
  const sensitive = containsSensitiveInfo(content);

  if (!sensitive.hasSensitive) {
    return { safe: true, reasons: [] };
  }

  const reasons: string[] = [];

  // Check each sensitive category against tier
  for (const category of sensitive.categories) {
    if (category === 'pii' || category === 'medical') {
      reasons.push(`Contains ${category} that must be redacted`);
    } else if (tier === 'none' || tier === 'minimal') {
      reasons.push(`Contains ${category} not allowed for tier ${tier}`);
    }
  }

  return {
    safe: reasons.length === 0,
    reasons,
  };
}

/**
 * Get privacy compliance report
 */
export function getPrivacyComplianceReport(userId: string): {
  settings: PrivacyDefaults;
  protectedCategories: MemoryCategory[];
  accessibleCategories: MemoryCategory[];
} {
  const settings = getUserPrivacySettings(userId);
  const tier = settings.pluginAccessTier;

  const allCategories: MemoryCategory[] = [
    'personal_info',
    'business_info',
    'relationships',
    'projects',
    'preferences',
    'domain_knowledge',
    'decisions',
    'commitments',
  ];

  const accessibleCategories = TIER_ALLOWANCES[tier];
  const protectedCategories = allCategories.filter(
    (cat) => !accessibleCategories.includes(cat)
  );

  return {
    settings,
    protectedCategories,
    accessibleCategories,
  };
}

/**
 * Clear user privacy settings
 */
export function clearUserPrivacySettings(userId: string): void {
  userPrivacySettings.delete(userId);
}
