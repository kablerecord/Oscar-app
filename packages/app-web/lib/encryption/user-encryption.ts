/**
 * Per-User Encryption Layer (v1.1)
 *
 * Provides end-to-end encryption for user data with:
 * - Per-user encryption keys derived from user password
 * - AES-256-GCM for symmetric encryption
 * - Cryptographic deletion (delete key = delete all data)
 * - Key wrapping for secure storage
 *
 * Architecture:
 * 1. User's password -> PBKDF2 -> Master Key (never stored)
 * 2. Master Key encrypts Data Encryption Key (DEK)
 * 3. DEK encrypts actual user data
 * 4. Encrypted DEK stored in database
 * 5. On account deletion, DEK is destroyed = data is cryptographically deleted
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const PBKDF2_ITERATIONS = 100000

export interface EncryptedData {
  ciphertext: string // Base64 encoded
  iv: string // Base64 encoded
  authTag: string // Base64 encoded
}

export interface WrappedKey {
  encryptedDEK: string // Base64 encoded
  iv: string // Base64 encoded
  authTag: string // Base64 encoded
  salt: string // Base64 encoded (for PBKDF2)
}

/**
 * Derive a master key from user's password using PBKDF2
 * This key is used to encrypt/decrypt the DEK
 */
export function deriveMasterKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  )
}

/**
 * Generate a new Data Encryption Key (DEK)
 * This key is used to encrypt actual user data
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(KEY_LENGTH)
}

/**
 * Generate a salt for key derivation
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH)
}

/**
 * Wrap (encrypt) the DEK with the master key
 * The wrapped key is safe to store in the database
 */
export function wrapDEK(dek: Buffer, masterKey: Buffer): WrappedKey {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv)

  const encrypted = Buffer.concat([
    cipher.update(dek),
    cipher.final(),
  ])

  return {
    encryptedDEK: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    salt: '', // Salt will be set by the caller
  }
}

/**
 * Unwrap (decrypt) the DEK using the master key
 */
export function unwrapDEK(wrappedKey: WrappedKey, masterKey: Buffer): Buffer {
  const iv = Buffer.from(wrappedKey.iv, 'base64')
  const authTag = Buffer.from(wrappedKey.authTag, 'base64')
  const encryptedDEK = Buffer.from(wrappedKey.encryptedDEK, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encryptedDEK),
    decipher.final(),
  ])
}

/**
 * Encrypt user data with the DEK
 */
export function encryptData(plaintext: string, dek: Buffer): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, dek, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

/**
 * Decrypt user data with the DEK
 */
export function decryptData(encryptedData: EncryptedData, dek: Buffer): string {
  const iv = Buffer.from(encryptedData.iv, 'base64')
  const authTag = Buffer.from(encryptedData.authTag, 'base64')
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Create encryption keys for a new user
 * Returns the wrapped DEK that should be stored in the database
 */
export function createUserEncryption(password: string): {
  wrappedKey: WrappedKey
  dek: Buffer // For immediate use, do not persist this directly
} {
  const salt = generateSalt()
  const masterKey = deriveMasterKey(password, salt)
  const dek = generateDEK()
  const wrapped = wrapDEK(dek, masterKey)
  wrapped.salt = salt.toString('base64')

  return {
    wrappedKey: wrapped,
    dek,
  }
}

/**
 * Recover DEK for an existing user (on login)
 */
export function recoverUserDEK(password: string, wrappedKey: WrappedKey): Buffer {
  const salt = Buffer.from(wrappedKey.salt, 'base64')
  const masterKey = deriveMasterKey(password, salt)
  return unwrapDEK(wrappedKey, masterKey)
}

/**
 * Wrap (encrypt) a key with the master key (MEK)
 * Returns concatenated: iv (12 bytes) + ciphertext + authTag (16 bytes)
 * Used by prisma-key-adapter for vault DEK persistence
 */
export function wrapKey(key: Buffer, mek: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, mek, iv)

  const encrypted = Buffer.concat([cipher.update(key), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Concatenate: iv + ciphertext + authTag
  return Buffer.concat([iv, encrypted, authTag])
}

/**
 * Unwrap (decrypt) a key using the master key (MEK)
 * Expects concatenated format: iv (12 bytes) + ciphertext + authTag (16 bytes)
 * Used by prisma-key-adapter for vault DEK persistence
 */
export function unwrapKey(wrappedKey: Buffer, mek: Buffer): Buffer {
  const iv = wrappedKey.subarray(0, IV_LENGTH)
  const authTag = wrappedKey.subarray(wrappedKey.length - AUTH_TAG_LENGTH)
  const ciphertext = wrappedKey.subarray(
    IV_LENGTH,
    wrappedKey.length - AUTH_TAG_LENGTH
  )

  const decipher = crypto.createDecipheriv(ALGORITHM, mek, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Generate a vault DEK for a user
 * This key encrypts all vault data
 */
export function generateVaultDEK(): Buffer {
  return crypto.randomBytes(KEY_LENGTH)
}

/**
 * Re-encrypt DEK with new password (for password change)
 */
export function rewrapDEK(
  dek: Buffer,
  newPassword: string
): WrappedKey {
  const newSalt = generateSalt()
  const newMasterKey = deriveMasterKey(newPassword, newSalt)
  const wrapped = wrapDEK(dek, newMasterKey)
  wrapped.salt = newSalt.toString('base64')
  return wrapped
}

/**
 * Encryption service for use in API routes
 * Handles session-based DEK caching
 */
export class UserEncryptionService {
  private dekCache: Map<string, { dek: Buffer; expiresAt: number }> = new Map()
  private readonly DEK_TTL = 30 * 60 * 1000 // 30 minutes

  /**
   * Get DEK for a user, either from cache or by unwrapping
   */
  async getDEK(
    userId: string,
    password: string,
    wrappedKey: WrappedKey
  ): Promise<Buffer> {
    // Check cache first
    const cached = this.dekCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      // Extend TTL on access
      cached.expiresAt = Date.now() + this.DEK_TTL
      return cached.dek
    }

    // Unwrap DEK
    const dek = recoverUserDEK(password, wrappedKey)

    // Cache it
    this.dekCache.set(userId, {
      dek,
      expiresAt: Date.now() + this.DEK_TTL,
    })

    return dek
  }

  /**
   * Clear DEK from cache (on logout)
   */
  clearDEK(userId: string): void {
    this.dekCache.delete(userId)
  }

  /**
   * Clean up expired DEKs periodically
   */
  cleanupExpiredDEKs(): void {
    const now = Date.now()
    for (const [userId, cached] of this.dekCache.entries()) {
      if (cached.expiresAt < now) {
        // Securely clear the buffer before deleting
        cached.dek.fill(0)
        this.dekCache.delete(userId)
      }
    }
  }
}

// Singleton instance
export const encryptionService = new UserEncryptionService()

// Cleanup expired DEKs every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    encryptionService.cleanupExpiredDEKs()
  }, 5 * 60 * 1000)
}
