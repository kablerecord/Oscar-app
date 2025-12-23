/**
 * Encryption Module
 *
 * Provides encryption at rest for Memory Vault data.
 * - AES-256-GCM authenticated encryption
 * - Per-user key management
 * - Key rotation support
 */

// Core encryption
export {
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  serializeEncryptedData,
  deserializeEncryptedData,
  isEncryptedString,
  generateKey,
  deriveKeyId,
  isValidKey,
  EncryptionError,
  type EncryptedData,
  type EncryptionKey,
  type EncryptionErrorCode,
} from './encryption';

// Key management
export {
  configureKeyManager,
  getKeyManagerConfig,
  setKeyPersistence,
  createUserKey,
  getUserKey,
  getKeyById,
  rotateUserKey,
  hasUserKey,
  getKeyMetadata,
  getAllKeyMetadata,
  deleteUserKeys,
  clearAllKeys,
  deriveSubKey,
  KEY_PURPOSES,
  DEFAULT_KEY_MANAGER_CONFIG,
  type UserKey,
  type KeyRotationResult,
  type KeyManagerConfig,
  type KeyPurpose,
} from './key-manager';

// Encrypted store wrapper
export {
  enableEncryption,
  disableEncryption,
  isEncryptionEnabled,
  getEncryptionConfig,
  encryptContent,
  decryptContent,
  encryptDocument,
  decryptDocument,
  encryptDocuments,
  decryptDocuments,
  reencryptContent,
  needsReencryption,
  type EncryptedDocument,
  type EncryptionConfig,
} from './encrypted-store';
