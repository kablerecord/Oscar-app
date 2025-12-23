/**
 * OSQR Plugin System - Plugin Manager
 *
 * Manages plugin lifecycle: loading, verification, activation, and unloading.
 * Enforces cryptographic signature verification for all plugins.
 */

import type {
  PluginManifest,
  LoadedPlugin,
  PluginState,
  PluginLoadResult,
  PluginLoadOptions,
  PluginManagerConfig,
  SignatureVerificationResult,
} from './types';
import {
  DEFAULT_PLUGIN_MANAGER_CONFIG,
  PluginError,
} from './types';
import {
  verifySignature,
  hasSignature,
} from './signature';
import {
  validatePluginCapabilities,
} from '../constitutional/sandbox';

// ============================================================================
// Plugin Manager State
// ============================================================================

/** Currently loaded plugins */
const loadedPlugins = new Map<string, LoadedPlugin>();

/** Plugin manager configuration */
let config: PluginManagerConfig = { ...DEFAULT_PLUGIN_MANAGER_CONFIG };

/** Event listeners */
type PluginEventType = 'load' | 'unload' | 'error' | 'suspend';
type PluginEventListener = (event: { type: PluginEventType; pluginId: string; details?: unknown }) => void;
const eventListeners: PluginEventListener[] = [];

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configure the plugin manager.
 */
export function configurePluginManager(newConfig: Partial<PluginManagerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current plugin manager configuration.
 */
export function getPluginManagerConfig(): PluginManagerConfig {
  return { ...config };
}

/**
 * Reset configuration to defaults.
 */
export function resetPluginManagerConfig(): void {
  config = { ...DEFAULT_PLUGIN_MANAGER_CONFIG };
}

// ============================================================================
// Plugin Loading
// ============================================================================

/**
 * Load a plugin from its manifest.
 * Plugins MUST be signed to be loaded (unless skipSignatureVerification is set).
 */
export function loadPlugin(
  manifest: PluginManifest,
  options: PluginLoadOptions = {}
): PluginLoadResult {
  const { skipSignatureVerification = false, allowUntrusted = false } = options;

  // Check if already loaded
  if (loadedPlugins.has(manifest.id)) {
    return {
      success: false,
      error: `Plugin ${manifest.id} is already loaded`,
      errorCode: 'LOAD_ERROR',
    };
  }

  // Check max plugins limit
  if (loadedPlugins.size >= config.maxPlugins) {
    return {
      success: false,
      error: `Maximum plugin limit (${config.maxPlugins}) reached`,
      errorCode: 'LOAD_ERROR',
    };
  }

  // Validate manifest structure
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return {
      success: false,
      error: manifestValidation.error,
      errorCode: 'MANIFEST_INVALID',
    };
  }

  // Signature verification (required by default)
  let signatureVerification: SignatureVerificationResult;

  if (config.requireSignatures && !skipSignatureVerification) {
    // Check if signature exists
    if (!hasSignature(manifest)) {
      return {
        success: false,
        error: 'Plugin is not signed. All plugins must be cryptographically signed.',
        errorCode: 'UNSIGNED',
      };
    }

    // Verify signature
    signatureVerification = verifySignature(manifest);

    if (!signatureVerification.valid) {
      return {
        success: false,
        error: `Signature verification failed: ${signatureVerification.error}`,
        errorCode: 'INVALID_SIGNATURE',
      };
    }

    // Check if key type is trusted
    if (signatureVerification.signingKey) {
      const keyType = signatureVerification.signingKey.type;
      if (!config.trustedKeyTypes.includes(keyType) && !allowUntrusted) {
        return {
          success: false,
          error: `Signing key type '${keyType}' is not trusted`,
          errorCode: 'KEY_NOT_TRUSTED',
        };
      }
    }
  } else {
    // Skip verification (development mode)
    signatureVerification = {
      valid: true,
      details: {
        contentHashValid: true,
        signatureValid: true,
        keyTrusted: true,
        notExpired: true,
      },
    };
  }

  // Validate capabilities
  if (!validatePluginCapabilities(manifest.capabilities)) {
    return {
      success: false,
      error: 'Plugin capabilities are invalid or exceed allowed bounds',
      errorCode: 'MANIFEST_INVALID',
    };
  }

  // Create loaded plugin
  const plugin: LoadedPlugin = {
    manifest,
    state: 'ACTIVE',
    loadedAt: new Date().toISOString(),
    signatureVerification,
  };

  // Store plugin
  loadedPlugins.set(manifest.id, plugin);

  // Emit event
  emitEvent('load', manifest.id, { manifest });

  return {
    success: true,
    plugin,
  };
}

/**
 * Validate a plugin manifest structure.
 */
function validateManifest(manifest: PluginManifest): { valid: boolean; error?: string } {
  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, error: 'Manifest must be an object' };
  }

  // Required string fields
  if (typeof manifest.id !== 'string' || manifest.id.length === 0) {
    return { valid: false, error: 'Manifest must have a non-empty id' };
  }
  if (typeof manifest.version !== 'string') {
    return { valid: false, error: 'Manifest must have a version' };
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    return { valid: false, error: 'Manifest must have a non-empty name' };
  }
  if (typeof manifest.description !== 'string') {
    return { valid: false, error: 'Manifest must have a description' };
  }
  if (typeof manifest.author !== 'string') {
    return { valid: false, error: 'Manifest must have an author' };
  }
  if (typeof manifest.entryPoint !== 'string') {
    return { valid: false, error: 'Manifest must have an entryPoint' };
  }
  if (typeof manifest.minOsqrVersion !== 'string') {
    return { valid: false, error: 'Manifest must have a minOsqrVersion' };
  }

  // Capabilities must exist
  if (!manifest.capabilities || typeof manifest.capabilities !== 'object') {
    return { valid: false, error: 'Manifest must have capabilities' };
  }

  return { valid: true };
}

// ============================================================================
// Plugin Unloading
// ============================================================================

/**
 * Unload a plugin by ID.
 */
export function unloadPlugin(pluginId: string): boolean {
  const plugin = loadedPlugins.get(pluginId);

  if (!plugin) {
    return false;
  }

  // Update state before removal
  plugin.state = 'UNLOADED';

  // Remove from store
  loadedPlugins.delete(pluginId);

  // Emit event
  emitEvent('unload', pluginId);

  return true;
}

/**
 * Unload all plugins.
 */
export function unloadAllPlugins(): number {
  const count = loadedPlugins.size;
  const pluginIds = Array.from(loadedPlugins.keys());

  for (const pluginId of pluginIds) {
    unloadPlugin(pluginId);
  }

  return count;
}

// ============================================================================
// Plugin State Management
// ============================================================================

/**
 * Get a loaded plugin by ID.
 */
export function getPlugin(pluginId: string): LoadedPlugin | undefined {
  return loadedPlugins.get(pluginId);
}

/**
 * Get all loaded plugins.
 */
export function getLoadedPlugins(): LoadedPlugin[] {
  return Array.from(loadedPlugins.values());
}

/**
 * Get plugins by state.
 */
export function getPluginsByState(state: PluginState): LoadedPlugin[] {
  return Array.from(loadedPlugins.values()).filter((p) => p.state === state);
}

/**
 * Check if a plugin is loaded.
 */
export function isPluginLoaded(pluginId: string): boolean {
  return loadedPlugins.has(pluginId);
}

/**
 * Suspend a plugin (temporarily disable).
 */
export function suspendPlugin(pluginId: string): boolean {
  const plugin = loadedPlugins.get(pluginId);

  if (!plugin || plugin.state !== 'ACTIVE') {
    return false;
  }

  plugin.state = 'SUSPENDED';
  emitEvent('suspend', pluginId);

  return true;
}

/**
 * Resume a suspended plugin.
 */
export function resumePlugin(pluginId: string): boolean {
  const plugin = loadedPlugins.get(pluginId);

  if (!plugin || plugin.state !== 'SUSPENDED') {
    return false;
  }

  plugin.state = 'ACTIVE';
  emitEvent('load', pluginId, { resumed: true });

  return true;
}

/**
 * Mark a plugin as failed.
 */
export function markPluginFailed(pluginId: string, error: string): boolean {
  const plugin = loadedPlugins.get(pluginId);

  if (!plugin) {
    return false;
  }

  plugin.state = 'FAILED';
  plugin.error = error;
  emitEvent('error', pluginId, { error });

  return true;
}

// ============================================================================
// Plugin Queries
// ============================================================================

/**
 * Get plugin count.
 */
export function getPluginCount(): number {
  return loadedPlugins.size;
}

/**
 * Get plugin stats.
 */
export function getPluginStats(): {
  total: number;
  active: number;
  suspended: number;
  failed: number;
  byAuthor: Record<string, number>;
} {
  const stats = {
    total: loadedPlugins.size,
    active: 0,
    suspended: 0,
    failed: 0,
    byAuthor: {} as Record<string, number>,
  };

  for (const plugin of loadedPlugins.values()) {
    if (plugin.state === 'ACTIVE') stats.active++;
    if (plugin.state === 'SUSPENDED') stats.suspended++;
    if (plugin.state === 'FAILED') stats.failed++;

    const author = plugin.manifest.author;
    stats.byAuthor[author] = (stats.byAuthor[author] || 0) + 1;
  }

  return stats;
}

/**
 * Find plugins by capability.
 */
export function findPluginsWithCapability(
  capability: keyof import('./types').PluginManifest['capabilities']
): LoadedPlugin[] {
  return Array.from(loadedPlugins.values()).filter((plugin) => {
    const caps = plugin.manifest.capabilities as Record<string, unknown>;
    const value = caps[capability];

    // Boolean capabilities
    if (typeof value === 'boolean') return value;

    // Array capabilities
    if (Array.isArray(value)) return value.length > 0;

    return false;
  });
}

// ============================================================================
// Event System
// ============================================================================

/**
 * Subscribe to plugin events.
 */
export function onPluginEvent(listener: PluginEventListener): () => void {
  eventListeners.push(listener);
  return () => {
    const index = eventListeners.indexOf(listener);
    if (index >= 0) {
      eventListeners.splice(index, 1);
    }
  };
}

/**
 * Emit a plugin event.
 */
function emitEvent(type: PluginEventType, pluginId: string, details?: unknown): void {
  const event = { type, pluginId, details };
  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener errors
    }
  }
}

/**
 * Clear all event listeners (for testing).
 */
export function clearEventListeners(): void {
  eventListeners.length = 0;
}

// ============================================================================
// Verification Utilities
// ============================================================================

/**
 * Verify a plugin manifest without loading.
 */
export function verifyPlugin(manifest: PluginManifest): SignatureVerificationResult {
  return verifySignature(manifest);
}

/**
 * Check if a plugin would be allowed to load.
 */
export function canLoadPlugin(manifest: PluginManifest): {
  allowed: boolean;
  reason?: string;
} {
  // Check if already loaded
  if (loadedPlugins.has(manifest.id)) {
    return { allowed: false, reason: 'Plugin already loaded' };
  }

  // Check max plugins
  if (loadedPlugins.size >= config.maxPlugins) {
    return { allowed: false, reason: 'Maximum plugin limit reached' };
  }

  // Validate manifest
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return { allowed: false, reason: manifestValidation.error };
  }

  // Check signature if required
  if (config.requireSignatures) {
    if (!hasSignature(manifest)) {
      return { allowed: false, reason: 'Plugin not signed' };
    }

    const verification = verifySignature(manifest);
    if (!verification.valid) {
      return { allowed: false, reason: verification.error };
    }
  }

  return { allowed: true };
}

// ============================================================================
// Reset (for testing)
// ============================================================================

/**
 * Reset plugin manager state (for testing).
 */
export function resetPluginManager(): void {
  loadedPlugins.clear();
  eventListeners.length = 0;
  config = { ...DEFAULT_PLUGIN_MANAGER_CONFIG };
}
