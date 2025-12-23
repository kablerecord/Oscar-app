/**
 * Plugin Manager Tests
 *
 * Tests for plugin loading, signature verification, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadPlugin,
  unloadPlugin,
  unloadAllPlugins,
  getPlugin,
  getLoadedPlugins,
  isPluginLoaded,
  suspendPlugin,
  resumePlugin,
  markPluginFailed,
  getPluginCount,
  getPluginStats,
  onPluginEvent,
  clearEventListeners,
  verifyPlugin,
  canLoadPlugin,
  resetPluginManager,
  configurePluginManager,
  resetPluginManagerConfig,
} from '../plugin-manager';
import {
  initializeKeyStore,
  addKey,
} from '../key-store';
import {
  createTestSignature,
  hashManifestContent,
} from '../signature';
import type { PluginManifest, SigningKey } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  const baseManifest = {
    id: `test-plugin-${Date.now()}`,
    version: '1.0.0',
    name: 'Test Plugin',
    description: 'A test plugin',
    author: 'Test Author',
    homepage: 'https://example.com',
    entryPoint: 'index.js',
    minOsqrVersion: '1.0.0',
    capabilities: {
      pluginId: `test-plugin-${Date.now()}`,
      version: '1.0.0',
      signature: '',
      canModifyCommunicationStyle: false,
      canOverrideHonestyTier: false,
      canInjectKnowledge: false,
      canAddTools: [],
      canAdjustProactivity: false,
      pkvReadAccess: false,
      pkvWriteAccess: false as const,
      networkDomains: [],
      fileSystemPaths: [],
    },
    ...overrides,
  };

  // Add signature if not provided
  if (!overrides.signature) {
    const { signature: _, ...manifestWithoutSig } = baseManifest;
    const testSig = createTestSignature(manifestWithoutSig as Omit<PluginManifest, 'signature'>);
    return { ...baseManifest, signature: testSig };
  }

  return baseManifest as PluginManifest;
}

function createPublisherKey(): SigningKey {
  return {
    keyId: 'test-publisher-key',
    type: 'OSQR_PUBLISHER',
    publicKey: '-----BEGIN PUBLIC KEY-----\nTEST_KEY\n-----END PUBLIC KEY-----',
    holder: 'Test Publisher',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    parentKeyId: 'osqr-root-2024',
  };
}

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  resetPluginManager();
  resetPluginManagerConfig();
  initializeKeyStore();
  // Add a test publisher key
  addKey(createPublisherKey());
});

afterEach(() => {
  clearEventListeners();
});

// ============================================================================
// Plugin Loading Tests
// ============================================================================

describe('Plugin Loading', () => {
  describe('loadPlugin', () => {
    it('should load a valid signed plugin', () => {
      const manifest = createTestManifest();

      const result = loadPlugin(manifest);

      expect(result.success).toBe(true);
      expect(result.plugin).toBeDefined();
      expect(result.plugin?.manifest.id).toBe(manifest.id);
      expect(result.plugin?.state).toBe('ACTIVE');
    });

    it('should reject unsigned plugins when signatures are required', () => {
      const manifest = createTestManifest();
      // Remove signature
      (manifest as any).signature = undefined;

      const result = loadPlugin(manifest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNSIGNED');
      expect(result.error).toContain('not signed');
    });

    it('should allow unsigned plugins when skipSignatureVerification is true', () => {
      const manifest = createTestManifest();
      (manifest as any).signature = undefined;

      const result = loadPlugin(manifest, { skipSignatureVerification: true });

      expect(result.success).toBe(true);
      expect(result.plugin).toBeDefined();
    });

    it('should reject plugins with invalid signatures', () => {
      const manifest = createTestManifest();
      // Tamper with content hash (must be valid 64-char hex)
      manifest.signature.contentHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const result = loadPlugin(manifest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('should reject already loaded plugins', () => {
      const manifest = createTestManifest();

      loadPlugin(manifest);
      const result = loadPlugin(manifest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already loaded');
    });

    it('should reject plugins when max limit is reached', () => {
      configurePluginManager({ maxPlugins: 2 });

      loadPlugin(createTestManifest({ id: 'plugin-1' }));
      loadPlugin(createTestManifest({ id: 'plugin-2' }));
      const result = loadPlugin(createTestManifest({ id: 'plugin-3' }));

      expect(result.success).toBe(false);
      expect(result.error).toContain('limit');
    });

    it('should reject plugins with invalid manifest', () => {
      const manifest = createTestManifest();
      (manifest as any).id = '';

      const result = loadPlugin(manifest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MANIFEST_INVALID');
    });

    it('should record signature verification result', () => {
      const manifest = createTestManifest();

      const result = loadPlugin(manifest);

      expect(result.plugin?.signatureVerification).toBeDefined();
      expect(result.plugin?.signatureVerification.valid).toBe(true);
    });
  });

  describe('Signature Verification', () => {
    it('should verify content hash matches manifest', () => {
      const manifest = createTestManifest();
      const expectedHash = hashManifestContent(manifest);

      expect(manifest.signature.contentHash).toBe(expectedHash);
    });

    it('should detect content tampering', () => {
      const manifest = createTestManifest();
      // Tamper with manifest after signing
      manifest.description = 'Tampered description';

      const result = loadPlugin(manifest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('hash mismatch');
    });

    it('should verify with verifyPlugin without loading', () => {
      const manifest = createTestManifest();

      const result = verifyPlugin(manifest);

      expect(result.valid).toBe(true);
      expect(result.details?.contentHashValid).toBe(true);
    });
  });
});

// ============================================================================
// Plugin Unloading Tests
// ============================================================================

describe('Plugin Unloading', () => {
  it('should unload a loaded plugin', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const result = unloadPlugin(manifest.id);

    expect(result).toBe(true);
    expect(isPluginLoaded(manifest.id)).toBe(false);
  });

  it('should return false for non-existent plugin', () => {
    const result = unloadPlugin('non-existent');

    expect(result).toBe(false);
  });

  it('should unload all plugins', () => {
    loadPlugin(createTestManifest({ id: 'plugin-1' }));
    loadPlugin(createTestManifest({ id: 'plugin-2' }));

    const count = unloadAllPlugins();

    expect(count).toBe(2);
    expect(getPluginCount()).toBe(0);
  });
});

// ============================================================================
// Plugin State Management Tests
// ============================================================================

describe('Plugin State Management', () => {
  it('should suspend an active plugin', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const result = suspendPlugin(manifest.id);
    const plugin = getPlugin(manifest.id);

    expect(result).toBe(true);
    expect(plugin?.state).toBe('SUSPENDED');
  });

  it('should resume a suspended plugin', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);
    suspendPlugin(manifest.id);

    const result = resumePlugin(manifest.id);
    const plugin = getPlugin(manifest.id);

    expect(result).toBe(true);
    expect(plugin?.state).toBe('ACTIVE');
  });

  it('should mark a plugin as failed', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const result = markPluginFailed(manifest.id, 'Test error');
    const plugin = getPlugin(manifest.id);

    expect(result).toBe(true);
    expect(plugin?.state).toBe('FAILED');
    expect(plugin?.error).toBe('Test error');
  });

  it('should not suspend non-active plugin', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);
    suspendPlugin(manifest.id);

    const result = suspendPlugin(manifest.id);

    expect(result).toBe(false);
  });

  it('should not resume non-suspended plugin', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const result = resumePlugin(manifest.id);

    expect(result).toBe(false);
  });
});

// ============================================================================
// Plugin Query Tests
// ============================================================================

describe('Plugin Queries', () => {
  it('should get plugin by ID', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const plugin = getPlugin(manifest.id);

    expect(plugin).toBeDefined();
    expect(plugin?.manifest.id).toBe(manifest.id);
  });

  it('should return undefined for non-existent plugin', () => {
    const plugin = getPlugin('non-existent');

    expect(plugin).toBeUndefined();
  });

  it('should get all loaded plugins', () => {
    loadPlugin(createTestManifest({ id: 'plugin-1' }));
    loadPlugin(createTestManifest({ id: 'plugin-2' }));

    const plugins = getLoadedPlugins();

    expect(plugins).toHaveLength(2);
  });

  it('should check if plugin is loaded', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    expect(isPluginLoaded(manifest.id)).toBe(true);
    expect(isPluginLoaded('non-existent')).toBe(false);
  });

  it('should get plugin stats', () => {
    loadPlugin(createTestManifest({ id: 'plugin-1', author: 'Author A' }));
    loadPlugin(createTestManifest({ id: 'plugin-2', author: 'Author A' }));
    loadPlugin(createTestManifest({ id: 'plugin-3', author: 'Author B' }));
    suspendPlugin('plugin-2');
    markPluginFailed('plugin-3', 'Error');

    const stats = getPluginStats();

    expect(stats.total).toBe(3);
    expect(stats.active).toBe(1);
    expect(stats.suspended).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.byAuthor['Author A']).toBe(2);
    expect(stats.byAuthor['Author B']).toBe(1);
  });

  it('should check if plugin can be loaded', () => {
    const manifest = createTestManifest();

    const check = canLoadPlugin(manifest);

    expect(check.allowed).toBe(true);
  });

  it('should report why plugin cannot be loaded', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const check = canLoadPlugin(manifest);

    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('already loaded');
  });
});

// ============================================================================
// Event System Tests
// ============================================================================

describe('Event System', () => {
  it('should emit load event when plugin is loaded', () => {
    const events: any[] = [];
    onPluginEvent((e) => events.push(e));

    const manifest = createTestManifest();
    loadPlugin(manifest);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('load');
    expect(events[0].pluginId).toBe(manifest.id);
  });

  it('should emit unload event when plugin is unloaded', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const events: any[] = [];
    onPluginEvent((e) => events.push(e));
    unloadPlugin(manifest.id);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('unload');
  });

  it('should emit error event when plugin fails', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const events: any[] = [];
    onPluginEvent((e) => events.push(e));
    markPluginFailed(manifest.id, 'Test error');

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    expect(events[0].details.error).toBe('Test error');
  });

  it('should emit suspend event when plugin is suspended', () => {
    const manifest = createTestManifest();
    loadPlugin(manifest);

    const events: any[] = [];
    onPluginEvent((e) => events.push(e));
    suspendPlugin(manifest.id);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('suspend');
  });

  it('should allow unsubscribing from events', () => {
    const events: any[] = [];
    const unsubscribe = onPluginEvent((e) => events.push(e));

    loadPlugin(createTestManifest({ id: 'plugin-1' }));
    unsubscribe();
    loadPlugin(createTestManifest({ id: 'plugin-2' }));

    expect(events).toHaveLength(1);
  });
});

// ============================================================================
// Configuration Tests
// ============================================================================

describe('Configuration', () => {
  it('should allow disabling signature requirements', () => {
    configurePluginManager({ requireSignatures: false });

    const manifest = createTestManifest();
    (manifest as any).signature = undefined;

    const result = loadPlugin(manifest);

    expect(result.success).toBe(true);
  });

  it('should respect max plugins limit', () => {
    configurePluginManager({ maxPlugins: 1 });

    loadPlugin(createTestManifest({ id: 'plugin-1' }));
    const result = loadPlugin(createTestManifest({ id: 'plugin-2' }));

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Security Tests
// ============================================================================

describe('Security', () => {
  it('should reject plugins with pkvWriteAccess true', () => {
    const manifest = createTestManifest();
    (manifest.capabilities as any).pkvWriteAccess = true;
    // Update signature for new content
    const { signature: _, ...manifestWithoutSig } = manifest;
    manifest.signature = createTestSignature(manifestWithoutSig as Omit<PluginManifest, 'signature'>);

    const result = loadPlugin(manifest);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('MANIFEST_INVALID');
  });

  it('should require valid capabilities structure', () => {
    const manifest = createTestManifest();
    (manifest as any).capabilities = 'invalid';

    const result = loadPlugin(manifest);

    expect(result.success).toBe(false);
  });
});
