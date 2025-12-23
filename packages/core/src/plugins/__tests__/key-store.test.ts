/**
 * Key Store Tests
 *
 * Tests for signing key management and chain of trust.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeKeyStore,
  isKeyStoreInitialized,
  addKey,
  getKey,
  getKeysByType,
  getActiveKeys,
  revokeKey,
  isKeyRevoked,
  isKeyExpired,
  validateKey,
  validateChainOfTrust,
  getTrustChain,
  exportKeys,
  importKeys,
  clearNonRootKeys,
  getKeyStoreStats,
} from '../key-store';
import type { SigningKey } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestKey(overrides: Partial<SigningKey> = {}): SigningKey {
  return {
    keyId: `test-key-${Date.now()}`,
    type: 'OSQR_PUBLISHER',
    publicKey: '-----BEGIN PUBLIC KEY-----\nTEST_KEY\n-----END PUBLIC KEY-----',
    holder: 'Test Holder',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    parentKeyId: 'osqr-root-2024',
    ...overrides,
  };
}

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  initializeKeyStore();
});

afterEach(() => {
  clearNonRootKeys();
});

// ============================================================================
// Initialization Tests
// ============================================================================

describe('Key Store Initialization', () => {
  it('should initialize with root key', () => {
    expect(isKeyStoreInitialized()).toBe(true);
  });

  it('should have the OSQR root key', () => {
    const rootKey = getKey('osqr-root-2024');

    expect(rootKey).toBeDefined();
    expect(rootKey?.type).toBe('OSQR_ROOT');
    expect(rootKey?.status).toBe('ACTIVE');
    expect(rootKey?.holder).toBe('OSQR Foundation');
  });

  it('should reinitialize cleanly', () => {
    addKey(createTestKey({ keyId: 'test-1' }));

    initializeKeyStore();

    expect(getKey('test-1')).toBeUndefined();
    expect(getKey('osqr-root-2024')).toBeDefined();
  });
});

// ============================================================================
// Key Management Tests
// ============================================================================

describe('Key Management', () => {
  describe('addKey', () => {
    it('should add a valid publisher key', () => {
      const key = createTestKey();

      const result = addKey(key);

      expect(result).toBe(true);
      expect(getKey(key.keyId)).toBeDefined();
    });

    it('should add a developer key with publisher parent', () => {
      const publisherKey = createTestKey({ keyId: 'publisher-1' });
      addKey(publisherKey);

      const developerKey = createTestKey({
        keyId: 'developer-1',
        type: 'DEVELOPER',
        parentKeyId: 'publisher-1',
      });

      const result = addKey(developerKey);

      expect(result).toBe(true);
    });

    it('should reject root key addition', () => {
      const rootKey = createTestKey({
        keyId: 'fake-root',
        type: 'OSQR_ROOT',
      });

      const result = addKey(rootKey);

      expect(result).toBe(false);
    });

    it('should reject key without parent', () => {
      const key = createTestKey({ parentKeyId: undefined });

      const result = addKey(key);

      expect(result).toBe(false);
    });

    it('should reject key with invalid parent', () => {
      const key = createTestKey({ parentKeyId: 'non-existent' });

      const result = addKey(key);

      expect(result).toBe(false);
    });

    it('should reject key with revoked parent', () => {
      const parentKey = createTestKey({ keyId: 'parent-1' });
      addKey(parentKey);
      revokeKey('parent-1');

      const childKey = createTestKey({
        keyId: 'child-1',
        parentKeyId: 'parent-1',
      });

      const result = addKey(childKey);

      expect(result).toBe(false);
    });
  });

  describe('getKey', () => {
    it('should get existing key', () => {
      const key = createTestKey();
      addKey(key);

      const retrieved = getKey(key.keyId);

      expect(retrieved).toEqual(key);
    });

    it('should return undefined for non-existent key', () => {
      const retrieved = getKey('non-existent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getKeysByType', () => {
    it('should get keys by type', () => {
      addKey(createTestKey({ keyId: 'pub-1', type: 'OSQR_PUBLISHER' }));
      addKey(createTestKey({ keyId: 'pub-2', type: 'OSQR_PUBLISHER' }));

      const publishers = getKeysByType('OSQR_PUBLISHER');

      expect(publishers).toHaveLength(2);
    });

    it('should return root keys', () => {
      const roots = getKeysByType('OSQR_ROOT');

      expect(roots).toHaveLength(1);
    });
  });

  describe('getActiveKeys', () => {
    it('should get only active keys', () => {
      addKey(createTestKey({ keyId: 'active-1' }));
      addKey(createTestKey({ keyId: 'active-2' }));
      const revokedKey = createTestKey({ keyId: 'revoked-1' });
      addKey(revokedKey);
      revokeKey('revoked-1');

      const activeKeys = getActiveKeys();

      // Root + 2 active
      expect(activeKeys.length).toBeGreaterThanOrEqual(2);
      expect(activeKeys.find((k) => k.keyId === 'revoked-1')).toBeUndefined();
    });
  });
});

// ============================================================================
// Key Revocation Tests
// ============================================================================

describe('Key Revocation', () => {
  it('should revoke a key', () => {
    const key = createTestKey();
    addKey(key);

    const result = revokeKey(key.keyId);

    expect(result).toBe(true);
    expect(isKeyRevoked(key.keyId)).toBe(true);
  });

  it('should not revoke root key', () => {
    const result = revokeKey('osqr-root-2024');

    expect(result).toBe(false);
  });

  it('should not revoke non-existent key', () => {
    const result = revokeKey('non-existent');

    expect(result).toBe(false);
  });

  it('should mark key status as revoked', () => {
    const key = createTestKey();
    addKey(key);
    revokeKey(key.keyId);

    const retrieved = getKey(key.keyId);

    expect(retrieved?.status).toBe('REVOKED');
  });
});

// ============================================================================
// Key Expiration Tests
// ============================================================================

describe('Key Expiration', () => {
  it('should detect expired key', () => {
    const expiredKey = createTestKey({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    expect(isKeyExpired(expiredKey)).toBe(true);
  });

  it('should detect non-expired key', () => {
    const validKey = createTestKey({
      expiresAt: new Date(Date.now() + 1000000).toISOString(),
    });

    expect(isKeyExpired(validKey)).toBe(false);
  });
});

// ============================================================================
// Key Validation Tests
// ============================================================================

describe('Key Validation', () => {
  describe('validateKey', () => {
    it('should validate active key', () => {
      const key = createTestKey();
      addKey(key);

      const result = validateKey(key.keyId);

      expect(result.valid).toBe(true);
      expect(result.key).toBeDefined();
    });

    it('should reject non-existent key', () => {
      const result = validateKey('non-existent');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('NOT_FOUND');
    });

    it('should reject revoked key', () => {
      const key = createTestKey();
      addKey(key);
      revokeKey(key.keyId);

      const result = validateKey(key.keyId);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('REVOKED');
    });

    it('should reject expired key', () => {
      const key = createTestKey({
        keyId: 'expired-key',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      // Manually add to store (bypassing validation)
      addKey(key);

      const result = validateKey('expired-key');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('EXPIRED');
    });
  });

  describe('validateChainOfTrust', () => {
    it('should validate root key', () => {
      const rootKey = getKey('osqr-root-2024')!;

      const result = validateChainOfTrust(rootKey);

      expect(result).toBe(true);
    });

    it('should validate publisher with root parent', () => {
      const key = createTestKey();
      addKey(key);

      const result = validateChainOfTrust(key);

      expect(result).toBe(true);
    });

    it('should validate developer with publisher parent', () => {
      const publisherKey = createTestKey({ keyId: 'publisher-1' });
      addKey(publisherKey);

      const developerKey = createTestKey({
        keyId: 'developer-1',
        type: 'DEVELOPER',
        parentKeyId: 'publisher-1',
      });
      addKey(developerKey);

      const result = validateChainOfTrust(developerKey);

      expect(result).toBe(true);
    });

    it('should reject broken chain', () => {
      const key = createTestKey({ parentKeyId: 'non-existent' });

      const result = validateChainOfTrust(key);

      expect(result).toBe(false);
    });
  });

  describe('getTrustChain', () => {
    it('should get chain to root', () => {
      const publisherKey = createTestKey({ keyId: 'publisher-1' });
      addKey(publisherKey);

      const developerKey = createTestKey({
        keyId: 'developer-1',
        type: 'DEVELOPER',
        parentKeyId: 'publisher-1',
      });
      addKey(developerKey);

      const chain = getTrustChain('developer-1');

      expect(chain).toHaveLength(3);
      expect(chain[0].keyId).toBe('developer-1');
      expect(chain[1].keyId).toBe('publisher-1');
      expect(chain[2].keyId).toBe('osqr-root-2024');
    });

    it('should return single element for root', () => {
      const chain = getTrustChain('osqr-root-2024');

      expect(chain).toHaveLength(1);
      expect(chain[0].keyId).toBe('osqr-root-2024');
    });
  });
});

// ============================================================================
// Import/Export Tests
// ============================================================================

describe('Import/Export', () => {
  it('should export all keys', () => {
    addKey(createTestKey({ keyId: 'key-1' }));
    addKey(createTestKey({ keyId: 'key-2' }));

    const exported = exportKeys();

    // Root + 2 added keys
    expect(exported.length).toBeGreaterThanOrEqual(3);
  });

  it('should import keys with valid chain', () => {
    const keysToImport: SigningKey[] = [
      createTestKey({ keyId: 'import-1' }),
      createTestKey({ keyId: 'import-2' }),
    ];

    clearNonRootKeys();
    const imported = importKeys(keysToImport);

    expect(imported).toBe(2);
  });

  it('should not import root keys', () => {
    const keysToImport: SigningKey[] = [
      createTestKey({
        keyId: 'fake-root',
        type: 'OSQR_ROOT',
      }),
    ];

    const imported = importKeys(keysToImport);

    expect(imported).toBe(0);
    expect(getKey('fake-root')).toBeUndefined();
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('Key Store Statistics', () => {
  it('should get accurate stats', () => {
    addKey(createTestKey({ keyId: 'active-1' }));
    addKey(createTestKey({ keyId: 'active-2' }));
    const revokedKey = createTestKey({ keyId: 'revoked-1' });
    addKey(revokedKey);
    revokeKey('revoked-1');

    const stats = getKeyStoreStats();

    expect(stats.total).toBe(4); // Root + 3
    expect(stats.active).toBe(3); // Root + 2 active
    expect(stats.revoked).toBe(1);
    expect(stats.byType.OSQR_ROOT).toBe(1);
    expect(stats.byType.OSQR_PUBLISHER).toBe(3);
  });
});
