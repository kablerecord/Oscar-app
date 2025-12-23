/**
 * Encryption Module - AES-256-GCM Encryption/Decryption
 *
 * Provides encryption at rest for Memory Vault data.
 * Uses AES-256-GCM for authenticated encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ============================================================================
// Constants
// ============================================================================

/** Algorithm for encryption */
export const ALGORITHM = 'aes-256-gcm';

/** Key length in bytes (256 bits) */
export const KEY_LENGTH = 32;

/** IV length in bytes (96 bits recommended for GCM) */
export const IV_LENGTH = 12;

/** Auth tag length in bytes */
export const AUTH_TAG_LENGTH = 16;

/** Separator for encoded ciphertext components */
export const COMPONENT_SEPARATOR = ':';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedData {
  /** Initialization vector (base64) */
  iv: string;
  /** Ciphertext (base64) */
  ciphertext: string;
  /** Authentication tag (base64) */
  authTag: string;
  /** Algorithm used */
  algorithm: string;
  /** Version for future compatibility */
  version: number;
}

export interface EncryptionKey {
  /** The key bytes (32 bytes for AES-256) */
  key: Buffer;
  /** Key ID for tracking */
  keyId: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Optional expiration */
  expiresAt?: Date;
}

export type EncryptionErrorCode =
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_KEY'
  | 'INVALID_DATA'
  | 'KEY_EXPIRED'
  | 'AUTH_FAILED';

export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly code: EncryptionErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

// ============================================================================
// Core Encryption Functions
// ============================================================================

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - The text to encrypt
 * @param key - 32-byte encryption key
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  if (!key || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Invalid key length: expected ${KEY_LENGTH} bytes, got ${key?.length ?? 0}`,
      'INVALID_KEY'
    );
  }

  try {
    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: ALGORITHM,
      version: 1,
    };
  } catch (error) {
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENCRYPTION_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 *
 * @param encryptedData - The encrypted data object
 * @param key - 32-byte encryption key
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData, key: Buffer): string {
  if (!key || key.length !== KEY_LENGTH) {
    throw new EncryptionError(
      `Invalid key length: expected ${KEY_LENGTH} bytes, got ${key?.length ?? 0}`,
      'INVALID_KEY'
    );
  }

  if (!encryptedData || !encryptedData.iv || !encryptedData.ciphertext || !encryptedData.authTag) {
    throw new EncryptionError(
      'Invalid encrypted data: missing required fields',
      'INVALID_DATA'
    );
  }

  try {
    // Decode components
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Check if it's an auth tag mismatch (tampering)
    if (error instanceof Error && error.message.includes('auth')) {
      throw new EncryptionError(
        'Decryption failed: authentication failed (data may be corrupted or tampered)',
        'AUTH_FAILED',
        error
      );
    }
    throw new EncryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DECRYPTION_FAILED',
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize encrypted data to a single string
 * Format: version:algorithm:iv:authTag:ciphertext
 */
export function serializeEncryptedData(data: EncryptedData): string {
  return [
    data.version.toString(),
    data.algorithm,
    data.iv,
    data.authTag,
    data.ciphertext,
  ].join(COMPONENT_SEPARATOR);
}

/**
 * Deserialize encrypted data from a string
 */
export function deserializeEncryptedData(serialized: string): EncryptedData {
  const parts = serialized.split(COMPONENT_SEPARATOR);

  if (parts.length < 5) {
    throw new EncryptionError(
      'Invalid serialized data format',
      'INVALID_DATA'
    );
  }

  const [versionStr, algorithm, iv, authTag, ...ciphertextParts] = parts;
  // Rejoin ciphertext in case it contained the separator
  const ciphertext = ciphertextParts.join(COMPONENT_SEPARATOR);

  const version = parseInt(versionStr, 10);
  if (isNaN(version)) {
    throw new EncryptionError(
      'Invalid version in serialized data',
      'INVALID_DATA'
    );
  }

  return {
    version,
    algorithm,
    iv,
    authTag,
    ciphertext,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Encrypt plaintext and return serialized string
 */
export function encryptToString(plaintext: string, key: Buffer): string {
  const encrypted = encrypt(plaintext, key);
  return serializeEncryptedData(encrypted);
}

/**
 * Decrypt from serialized string
 */
export function decryptFromString(serialized: string, key: Buffer): string {
  const encrypted = deserializeEncryptedData(serialized);
  return decrypt(encrypted, key);
}

/**
 * Check if a string looks like encrypted data
 */
export function isEncryptedString(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const parts = value.split(COMPONENT_SEPARATOR);
  if (parts.length < 5) return false;

  const [versionStr, algorithm] = parts;
  const version = parseInt(versionStr, 10);

  return !isNaN(version) && algorithm === ALGORITHM;
}

/**
 * Generate a random encryption key
 */
export function generateKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Derive a key ID from a key (for tracking without exposing the key)
 */
export function deriveKeyId(key: Buffer): string {
  // Use first 8 bytes of key to create a non-reversible ID
  const hash = require('crypto').createHash('sha256').update(key).digest();
  return hash.slice(0, 8).toString('hex');
}

/**
 * Validate that a key is properly formatted
 */
export function isValidKey(key: unknown): key is Buffer {
  return Buffer.isBuffer(key) && key.length === KEY_LENGTH;
}
