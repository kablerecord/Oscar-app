/**
 * Key Manager - Per-User Encryption Key Management
 *
 * Manages encryption keys for each user. Keys are stored separately from data.
 * For v1.0, keys are stored server-side. Client-side key management is v1.5.
 */

import { randomBytes, createHash } from 'crypto';
import {
  KEY_LENGTH,
  generateKey,
  deriveKeyId,
  isValidKey,
  EncryptionError,
} from './encryption';

// ============================================================================
// Types
// ============================================================================

export interface UserKey {
  /** The encryption key */
  key: Buffer;
  /** Unique key identifier */
  keyId: string;
  /** User this key belongs to */
  userId: string;
  /** Key version for rotation */
  version: number;
  /** When the key was created */
  createdAt: Date;
  /** When the key was last used */
  lastUsedAt: Date;
  /** Optional expiration date */
  expiresAt?: Date;
  /** Whether this is the active key for the user */
  isActive: boolean;
  /** Previous key ID (for rotation tracking) */
  previousKeyId?: string;
}

export interface KeyRotationResult {
  /** New key information */
  newKey: UserKey;
  /** Old key information (now inactive) */
  oldKey: UserKey;
  /** Timestamp of rotation */
  rotatedAt: Date;
}

export interface KeyManagerConfig {
  /** Key expiration in days (0 = never expires) */
  keyExpirationDays: number;
  /** Maximum number of old keys to retain per user */
  maxRetainedKeys: number;
  /** Whether to auto-rotate expired keys */
  autoRotateExpired: boolean;
}

export const DEFAULT_KEY_MANAGER_CONFIG: KeyManagerConfig = {
  keyExpirationDays: 0, // Never expires by default
  maxRetainedKeys: 3,
  autoRotateExpired: false,
};

// ============================================================================
// Key Storage (Server-Side for v1.0)
// ============================================================================

/**
 * In-memory key storage
 * For v1.0, keys are stored in memory with optional persistence callbacks.
 * Production should use a secure key vault (AWS KMS, HashiCorp Vault, etc.)
 */
class KeyStore {
  private keys = new Map<string, UserKey[]>();
  private onPersist?: (userId: string, keys: UserKey[]) => Promise<void>;
  private onLoad?: (userId: string) => Promise<UserKey[] | null>;

  /**
   * Set persistence callbacks for production use
   */
  setPersistence(callbacks: {
    onPersist: (userId: string, keys: UserKey[]) => Promise<void>;
    onLoad: (userId: string) => Promise<UserKey[] | null>;
  }): void {
    this.onPersist = callbacks.onPersist;
    this.onLoad = callbacks.onLoad;
  }

  /**
   * Get all keys for a user
   */
  async getKeys(userId: string): Promise<UserKey[]> {
    // Check in-memory first
    if (this.keys.has(userId)) {
      return this.keys.get(userId)!;
    }

    // Try to load from persistence
    if (this.onLoad) {
      const loaded = await this.onLoad(userId);
      if (loaded) {
        this.keys.set(userId, loaded);
        return loaded;
      }
    }

    return [];
  }

  /**
   * Get the active key for a user
   */
  async getActiveKey(userId: string): Promise<UserKey | null> {
    const keys = await this.getKeys(userId);
    return keys.find((k) => k.isActive) || null;
  }

  /**
   * Get a key by ID
   */
  async getKeyById(userId: string, keyId: string): Promise<UserKey | null> {
    const keys = await this.getKeys(userId);
    return keys.find((k) => k.keyId === keyId) || null;
  }

  /**
   * Store a key
   */
  async storeKey(key: UserKey): Promise<void> {
    const keys = await this.getKeys(key.userId);

    // If this is an active key, deactivate others
    if (key.isActive) {
      for (const existingKey of keys) {
        existingKey.isActive = false;
      }
    }

    // Add or update key
    const existingIndex = keys.findIndex((k) => k.keyId === key.keyId);
    if (existingIndex >= 0) {
      keys[existingIndex] = key;
    } else {
      keys.push(key);
    }

    this.keys.set(key.userId, keys);

    // Persist if callback is set
    if (this.onPersist) {
      await this.onPersist(key.userId, keys);
    }
  }

  /**
   * Update a key's last used timestamp
   */
  async updateLastUsed(userId: string, keyId: string): Promise<void> {
    const key = await this.getKeyById(userId, keyId);
    if (key) {
      key.lastUsedAt = new Date();
      await this.storeKey(key);
    }
  }

  /**
   * Delete old keys beyond retention limit
   */
  async pruneOldKeys(userId: string, maxRetained: number): Promise<number> {
    const keys = await this.getKeys(userId);

    // Sort by version descending
    keys.sort((a, b) => b.version - a.version);

    // Keep active key and up to maxRetained inactive keys
    const toKeep: UserKey[] = [];
    let inactiveCount = 0;

    for (const key of keys) {
      if (key.isActive || inactiveCount < maxRetained) {
        toKeep.push(key);
        if (!key.isActive) inactiveCount++;
      }
    }

    const pruned = keys.length - toKeep.length;
    if (pruned > 0) {
      this.keys.set(userId, toKeep);
      if (this.onPersist) {
        await this.onPersist(userId, toKeep);
      }
    }

    return pruned;
  }

  /**
   * Clear all keys for a user (for testing or account deletion)
   */
  async clearUserKeys(userId: string): Promise<void> {
    this.keys.delete(userId);
    if (this.onPersist) {
      await this.onPersist(userId, []);
    }
  }

  /**
   * Clear all keys (for testing)
   */
  clear(): void {
    this.keys.clear();
  }
}

// Global key store instance
const keyStore = new KeyStore();

// ============================================================================
// Key Manager Functions
// ============================================================================

let config: KeyManagerConfig = { ...DEFAULT_KEY_MANAGER_CONFIG };

/**
 * Configure the key manager
 */
export function configureKeyManager(newConfig: Partial<KeyManagerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current key manager configuration
 */
export function getKeyManagerConfig(): KeyManagerConfig {
  return { ...config };
}

/**
 * Set persistence callbacks for key storage
 */
export function setKeyPersistence(callbacks: {
  onPersist: (userId: string, keys: UserKey[]) => Promise<void>;
  onLoad: (userId: string) => Promise<UserKey[] | null>;
}): void {
  keyStore.setPersistence(callbacks);
}

/**
 * Generate and store a new key for a user
 */
export async function createUserKey(userId: string): Promise<UserKey> {
  const existingKeys = await keyStore.getKeys(userId);
  const activeKey = existingKeys.find((k) => k.isActive);

  const key = generateKey();
  const now = new Date();

  const userKey: UserKey = {
    key,
    keyId: deriveKeyId(key),
    userId,
    version: (activeKey?.version ?? 0) + 1,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: config.keyExpirationDays > 0
      ? new Date(now.getTime() + config.keyExpirationDays * 24 * 60 * 60 * 1000)
      : undefined,
    isActive: true,
    previousKeyId: activeKey?.keyId,
  };

  await keyStore.storeKey(userKey);

  // Prune old keys if needed
  if (config.maxRetainedKeys > 0) {
    await keyStore.pruneOldKeys(userId, config.maxRetainedKeys);
  }

  return userKey;
}

/**
 * Get the active encryption key for a user
 * Creates a new key if none exists
 */
export async function getUserKey(userId: string): Promise<Buffer> {
  let activeKey = await keyStore.getActiveKey(userId);

  // Check if key is expired
  if (activeKey?.expiresAt && activeKey.expiresAt < new Date()) {
    if (config.autoRotateExpired) {
      const rotationResult = await rotateUserKey(userId);
      activeKey = rotationResult.newKey;
    } else {
      throw new EncryptionError(
        `Key for user ${userId} has expired`,
        'KEY_EXPIRED'
      );
    }
  }

  // Create new key if none exists
  if (!activeKey) {
    activeKey = await createUserKey(userId);
  }

  // Update last used timestamp
  await keyStore.updateLastUsed(userId, activeKey.keyId);

  return activeKey.key;
}

/**
 * Get a specific key by ID (for decrypting old data)
 */
export async function getKeyById(
  userId: string,
  keyId: string
): Promise<Buffer | null> {
  const key = await keyStore.getKeyById(userId, keyId);
  if (!key) return null;

  await keyStore.updateLastUsed(userId, keyId);
  return key.key;
}

/**
 * Rotate a user's encryption key
 */
export async function rotateUserKey(userId: string): Promise<KeyRotationResult> {
  const oldKey = await keyStore.getActiveKey(userId);

  if (!oldKey) {
    throw new EncryptionError(
      `No active key found for user ${userId}`,
      'INVALID_KEY'
    );
  }

  // Deactivate old key
  oldKey.isActive = false;
  await keyStore.storeKey(oldKey);

  // Create new key
  const newKey = await createUserKey(userId);

  return {
    newKey,
    oldKey,
    rotatedAt: new Date(),
  };
}

/**
 * Check if a user has an active key
 */
export async function hasUserKey(userId: string): Promise<boolean> {
  const key = await keyStore.getActiveKey(userId);
  return key !== null;
}

/**
 * Get key metadata (without exposing the actual key)
 */
export async function getKeyMetadata(
  userId: string
): Promise<Omit<UserKey, 'key'> | null> {
  const key = await keyStore.getActiveKey(userId);
  if (!key) return null;

  const { key: _, ...metadata } = key;
  return metadata;
}

/**
 * Get all key metadata for a user
 */
export async function getAllKeyMetadata(
  userId: string
): Promise<Omit<UserKey, 'key'>[]> {
  const keys = await keyStore.getKeys(userId);
  return keys.map(({ key: _, ...metadata }) => metadata);
}

/**
 * Delete all keys for a user (for account deletion / right to be forgotten)
 */
export async function deleteUserKeys(userId: string): Promise<void> {
  await keyStore.clearUserKeys(userId);
}

/**
 * Clear all keys (for testing only)
 */
export function clearAllKeys(): void {
  keyStore.clear();
}

// ============================================================================
// Key Derivation (for future use)
// ============================================================================

/**
 * Derive a sub-key for a specific purpose
 * Useful for having separate keys for different data types
 */
export function deriveSubKey(masterKey: Buffer, purpose: string): Buffer {
  if (!isValidKey(masterKey)) {
    throw new EncryptionError('Invalid master key', 'INVALID_KEY');
  }

  const hash = createHash('sha256');
  hash.update(masterKey);
  hash.update(purpose);
  return hash.digest();
}

/**
 * Key purposes for sub-key derivation
 */
export const KEY_PURPOSES = {
  SEMANTIC_CONTENT: 'osqr:semantic:content',
  EPISODIC_MESSAGES: 'osqr:episodic:messages',
  PROCEDURAL_RULES: 'osqr:procedural:rules',
} as const;

export type KeyPurpose = typeof KEY_PURPOSES[keyof typeof KEY_PURPOSES];
