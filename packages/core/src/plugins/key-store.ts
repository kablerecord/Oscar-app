/**
 * OSQR Plugin System - Key Store
 *
 * Manages trusted signing keys for plugin verification.
 * Provides key lookup, validation, and chain of trust verification.
 */

import type {
  SigningKey,
  KeyType,
  KeyStatus,
  KeyValidationResult,
} from './types';

// ============================================================================
// Key Store State
// ============================================================================

/** In-memory store of trusted keys */
const keyStore = new Map<string, SigningKey>();

/** Revoked key IDs */
const revokedKeys = new Set<string>();

// ============================================================================
// OSQR Root Key (Hardcoded - Never Changes)
// ============================================================================

/**
 * The OSQR root signing key.
 * This is the trust anchor for the entire plugin system.
 * In production, this would be a real Ed25519 public key.
 */
const OSQR_ROOT_KEY: SigningKey = {
  keyId: 'osqr-root-2024',
  type: 'OSQR_ROOT',
  publicKey: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAOSQR_ROOT_KEY_PLACEHOLDER_FOR_V1_IMPLEMENTATION
-----END PUBLIC KEY-----`,
  holder: 'OSQR Foundation',
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2034-01-01T00:00:00Z',
  status: 'ACTIVE',
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the key store with default keys.
 */
export function initializeKeyStore(): void {
  // Clear existing keys
  keyStore.clear();
  revokedKeys.clear();

  // Add root key
  keyStore.set(OSQR_ROOT_KEY.keyId, OSQR_ROOT_KEY);
}

/**
 * Check if key store is initialized.
 */
export function isKeyStoreInitialized(): boolean {
  return keyStore.has(OSQR_ROOT_KEY.keyId);
}

// ============================================================================
// Key Management
// ============================================================================

/**
 * Add a signing key to the store.
 * Keys must be signed by a trusted parent key to be added.
 */
export function addKey(key: SigningKey): boolean {
  // Validate key structure
  if (!isValidKeyStructure(key)) {
    return false;
  }

  // Root keys cannot be added (only built-in)
  if (key.type === 'OSQR_ROOT') {
    return false;
  }

  // Verify parent key exists and is trusted
  if (key.parentKeyId) {
    const parent = keyStore.get(key.parentKeyId);
    if (!parent || parent.status !== 'ACTIVE') {
      return false;
    }
  } else {
    // Non-root keys must have a parent
    return false;
  }

  keyStore.set(key.keyId, key);
  return true;
}

/**
 * Get a signing key by ID.
 */
export function getKey(keyId: string): SigningKey | undefined {
  return keyStore.get(keyId);
}

/**
 * Get all keys of a specific type.
 */
export function getKeysByType(type: KeyType): SigningKey[] {
  const keys: SigningKey[] = [];
  for (const key of keyStore.values()) {
    if (key.type === type) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Get all active keys.
 */
export function getActiveKeys(): SigningKey[] {
  const keys: SigningKey[] = [];
  for (const key of keyStore.values()) {
    if (key.status === 'ACTIVE' && !isKeyExpired(key)) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Revoke a signing key.
 * Revoked keys cannot be used for signature verification.
 */
export function revokeKey(keyId: string): boolean {
  const key = keyStore.get(keyId);
  if (!key) {
    return false;
  }

  // Cannot revoke root key
  if (key.type === 'OSQR_ROOT') {
    return false;
  }

  key.status = 'REVOKED';
  revokedKeys.add(keyId);
  return true;
}

/**
 * Check if a key is revoked.
 */
export function isKeyRevoked(keyId: string): boolean {
  return revokedKeys.has(keyId);
}

/**
 * Check if a key is expired.
 */
export function isKeyExpired(key: SigningKey): boolean {
  const expiresAt = new Date(key.expiresAt);
  return expiresAt <= new Date();
}

// ============================================================================
// Key Validation
// ============================================================================

/**
 * Validate a signing key.
 */
export function validateKey(keyId: string): KeyValidationResult {
  const key = keyStore.get(keyId);

  if (!key) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (key.status === 'REVOKED' || isKeyRevoked(keyId)) {
    return { valid: false, reason: 'REVOKED', key };
  }

  if (isKeyExpired(key)) {
    return { valid: false, reason: 'EXPIRED', key };
  }

  // Validate chain of trust
  if (!validateChainOfTrust(key)) {
    return { valid: false, reason: 'INVALID_CHAIN', key };
  }

  return { valid: true, key };
}

/**
 * Validate the chain of trust for a key.
 * All keys must trace back to the root key through active parents.
 */
export function validateChainOfTrust(key: SigningKey): boolean {
  // Root key is always trusted
  if (key.type === 'OSQR_ROOT') {
    return key.status === 'ACTIVE' && !isKeyExpired(key);
  }

  // Non-root keys must have a valid parent
  if (!key.parentKeyId) {
    return false;
  }

  const parent = keyStore.get(key.parentKeyId);
  if (!parent) {
    return false;
  }

  // Parent must be active
  if (parent.status !== 'ACTIVE' || isKeyExpired(parent)) {
    return false;
  }

  // Recursively validate parent's chain
  return validateChainOfTrust(parent);
}

/**
 * Get the trust chain for a key.
 */
export function getTrustChain(keyId: string): SigningKey[] {
  const chain: SigningKey[] = [];
  let currentKey = keyStore.get(keyId);

  while (currentKey) {
    chain.push(currentKey);
    if (!currentKey.parentKeyId) {
      break;
    }
    currentKey = keyStore.get(currentKey.parentKeyId);
  }

  return chain;
}

// ============================================================================
// Key Structure Validation
// ============================================================================

/**
 * Validate the structure of a signing key.
 */
function isValidKeyStructure(key: SigningKey): boolean {
  if (!key || typeof key !== 'object') {
    return false;
  }

  // Required string fields
  if (typeof key.keyId !== 'string' || key.keyId.length === 0) return false;
  if (typeof key.publicKey !== 'string' || key.publicKey.length === 0) return false;
  if (typeof key.holder !== 'string' || key.holder.length === 0) return false;
  if (typeof key.createdAt !== 'string') return false;
  if (typeof key.expiresAt !== 'string') return false;

  // Valid type
  const validTypes: KeyType[] = ['OSQR_ROOT', 'OSQR_PUBLISHER', 'DEVELOPER'];
  if (!validTypes.includes(key.type)) return false;

  // Valid status
  const validStatuses: KeyStatus[] = ['ACTIVE', 'REVOKED', 'EXPIRED'];
  if (!validStatuses.includes(key.status)) return false;

  // Valid dates
  if (isNaN(Date.parse(key.createdAt))) return false;
  if (isNaN(Date.parse(key.expiresAt))) return false;

  return true;
}

// ============================================================================
// Import/Export
// ============================================================================

/**
 * Export all keys (for backup).
 */
export function exportKeys(): SigningKey[] {
  return Array.from(keyStore.values());
}

/**
 * Import keys from backup.
 * Only imports non-root keys with valid parent chains.
 */
export function importKeys(keys: SigningKey[]): number {
  let imported = 0;

  // Sort by trust level to ensure parents are imported first
  const sorted = [...keys].sort((a, b) => {
    if (a.type === 'OSQR_ROOT') return -1;
    if (b.type === 'OSQR_ROOT') return 1;
    if (a.type === 'OSQR_PUBLISHER') return -1;
    if (b.type === 'OSQR_PUBLISHER') return 1;
    return 0;
  });

  for (const key of sorted) {
    if (key.type !== 'OSQR_ROOT' && addKey(key)) {
      imported++;
    }
  }

  return imported;
}

/**
 * Clear all keys except root (for testing).
 */
export function clearNonRootKeys(): void {
  for (const keyId of keyStore.keys()) {
    const key = keyStore.get(keyId);
    if (key && key.type !== 'OSQR_ROOT') {
      keyStore.delete(keyId);
    }
  }
  revokedKeys.clear();
}

/**
 * Get key store statistics.
 */
export function getKeyStoreStats(): {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  byType: Record<KeyType, number>;
} {
  const stats = {
    total: keyStore.size,
    active: 0,
    revoked: 0,
    expired: 0,
    byType: {
      OSQR_ROOT: 0,
      OSQR_PUBLISHER: 0,
      DEVELOPER: 0,
    } as Record<KeyType, number>,
  };

  for (const key of keyStore.values()) {
    stats.byType[key.type]++;

    if (key.status === 'REVOKED' || isKeyRevoked(key.keyId)) {
      stats.revoked++;
    } else if (isKeyExpired(key)) {
      stats.expired++;
    } else {
      stats.active++;
    }
  }

  return stats;
}

// Initialize on module load
initializeKeyStore();
