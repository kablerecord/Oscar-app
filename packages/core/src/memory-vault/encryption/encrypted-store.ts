/**
 * Encrypted Store Wrapper
 *
 * Wraps the Chroma persistence layer with encryption/decryption.
 * Content is encrypted before storage and decrypted after retrieval.
 * Embeddings and metadata remain unencrypted for vector search and filtering.
 */

import {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  isEncryptedString,
  EncryptionError,
  type EncryptedData,
} from './encryption';
import {
  getUserKey,
  getKeyById,
  hasUserKey,
  deriveSubKey,
  KEY_PURPOSES,
  type KeyPurpose,
} from './key-manager';
import { serializeMetadata } from '../chroma';

// ============================================================================
// Types
// ============================================================================

export interface EncryptedDocument {
  id: string;
  /** Encrypted content (serialized EncryptedData) */
  encryptedContent: string;
  /** Key ID used for encryption */
  keyId: string;
  /** Original embedding (unencrypted for vector search) */
  embedding?: number[];
  /** Original metadata (unencrypted for filtering) */
  metadata: Record<string, string | number | boolean>;
}

export interface EncryptionConfig {
  /** User ID for key lookup */
  userId: string;
  /** Key purpose for sub-key derivation */
  purpose: KeyPurpose;
  /** Whether encryption is enabled */
  enabled: boolean;
}

// ============================================================================
// Encryption State
// ============================================================================

let encryptionEnabled = false;
let currentUserId: string | undefined;
let currentPurpose: KeyPurpose = KEY_PURPOSES.SEMANTIC_CONTENT;

/**
 * Enable encryption for a user
 */
export async function enableEncryption(
  userId: string,
  purpose: KeyPurpose = KEY_PURPOSES.SEMANTIC_CONTENT
): Promise<void> {
  currentUserId = userId;
  currentPurpose = purpose;
  encryptionEnabled = true;

  // Ensure user has a key
  await getUserKey(userId);
}

/**
 * Disable encryption
 */
export function disableEncryption(): void {
  encryptionEnabled = false;
  currentUserId = undefined;
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled && currentUserId !== undefined;
}

/**
 * Get current encryption configuration
 */
export function getEncryptionConfig(): EncryptionConfig | null {
  if (!encryptionEnabled || !currentUserId) return null;

  return {
    userId: currentUserId,
    purpose: currentPurpose,
    enabled: true,
  };
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypt content for storage
 *
 * @param content - Plaintext content to encrypt
 * @param userId - User ID for key lookup (uses current if not provided)
 * @param purpose - Key purpose (uses current if not provided)
 * @returns Encrypted content string and key ID
 */
export async function encryptContent(
  content: string,
  userId?: string,
  purpose?: KeyPurpose
): Promise<{ encryptedContent: string; keyId: string }> {
  const effectiveUserId = userId ?? currentUserId;
  const effectivePurpose = purpose ?? currentPurpose;

  if (!effectiveUserId) {
    throw new EncryptionError(
      'No user ID provided for encryption',
      'INVALID_KEY'
    );
  }

  // Get user's master key
  const masterKey = await getUserKey(effectiveUserId);

  // Derive sub-key for this purpose
  const subKey = deriveSubKey(masterKey, effectivePurpose);

  // Encrypt content
  const encryptedContent = encryptToString(content, subKey);

  // Get key ID from master key (for decryption lookup)
  const { deriveKeyId } = await import('./encryption');
  const keyId = deriveKeyId(masterKey);

  return { encryptedContent, keyId };
}

/**
 * Decrypt content from storage
 *
 * @param encryptedContent - Encrypted content string
 * @param keyId - Key ID used for encryption
 * @param userId - User ID for key lookup (uses current if not provided)
 * @param purpose - Key purpose (uses current if not provided)
 * @returns Decrypted plaintext content
 */
export async function decryptContent(
  encryptedContent: string,
  keyId: string,
  userId?: string,
  purpose?: KeyPurpose
): Promise<string> {
  const effectiveUserId = userId ?? currentUserId;
  const effectivePurpose = purpose ?? currentPurpose;

  if (!effectiveUserId) {
    throw new EncryptionError(
      'No user ID provided for decryption',
      'INVALID_KEY'
    );
  }

  // Try to get the specific key that was used for encryption
  let masterKey = await getKeyById(effectiveUserId, keyId);

  // Fall back to active key if specific key not found
  if (!masterKey) {
    masterKey = await getUserKey(effectiveUserId);
  }

  // Derive sub-key for this purpose
  const subKey = deriveSubKey(masterKey, effectivePurpose);

  // Decrypt content
  return decryptFromString(encryptedContent, subKey);
}

// ============================================================================
// Document Encryption/Decryption
// ============================================================================

/**
 * Encrypt a document before storing in Chroma
 */
export async function encryptDocument(
  id: string,
  content: string,
  embedding?: number[],
  metadata?: Record<string, unknown>
): Promise<EncryptedDocument> {
  if (!isEncryptionEnabled()) {
    // Return unencrypted if encryption is disabled
    return {
      id,
      encryptedContent: content,
      keyId: '',
      embedding,
      metadata: metadata ? serializeMetadata(metadata) : {},
    };
  }

  const { encryptedContent, keyId } = await encryptContent(content);

  return {
    id,
    encryptedContent,
    keyId,
    embedding,
    metadata: {
      ...(metadata ? serializeMetadata(metadata) : {}),
      _encrypted: true,
      _keyId: keyId,
    },
  };
}

/**
 * Decrypt a document retrieved from Chroma
 */
export async function decryptDocument(
  doc: EncryptedDocument
): Promise<{ id: string; content: string; embedding?: number[]; metadata: Record<string, unknown> }> {
  const { id, encryptedContent, keyId, embedding, metadata } = doc;

  // Check if document was encrypted
  const wasEncrypted = metadata._encrypted === true;

  if (!wasEncrypted) {
    // Return as-is if not encrypted
    return {
      id,
      content: encryptedContent,
      embedding,
      metadata,
    };
  }

  if (!isEncryptionEnabled()) {
    throw new EncryptionError(
      'Cannot decrypt document: encryption is not enabled',
      'DECRYPTION_FAILED'
    );
  }

  const storedKeyId = (metadata._keyId as string) || keyId;
  const content = await decryptContent(encryptedContent, storedKeyId);

  // Remove encryption metadata from returned metadata
  const { _encrypted, _keyId, ...cleanMetadata } = metadata;

  return {
    id,
    content,
    embedding,
    metadata: cleanMetadata,
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Encrypt multiple documents
 */
export async function encryptDocuments(
  documents: Array<{
    id: string;
    content: string;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>
): Promise<EncryptedDocument[]> {
  return Promise.all(
    documents.map((doc) =>
      encryptDocument(doc.id, doc.content, doc.embedding, doc.metadata)
    )
  );
}

/**
 * Decrypt multiple documents
 */
export async function decryptDocuments(
  documents: EncryptedDocument[]
): Promise<Array<{ id: string; content: string; embedding?: number[]; metadata: Record<string, unknown> }>> {
  return Promise.all(documents.map((doc) => decryptDocument(doc)));
}

// ============================================================================
// Re-encryption (for key rotation)
// ============================================================================

/**
 * Re-encrypt content with a new key
 * Used after key rotation to update stored data
 */
export async function reencryptContent(
  encryptedContent: string,
  oldKeyId: string,
  userId?: string,
  purpose?: KeyPurpose
): Promise<{ encryptedContent: string; keyId: string }> {
  // First decrypt with old key
  const plaintext = await decryptContent(encryptedContent, oldKeyId, userId, purpose);

  // Then encrypt with new (current) key
  return encryptContent(plaintext, userId, purpose);
}

/**
 * Check if content needs re-encryption (old key was used)
 */
export async function needsReencryption(
  keyId: string,
  userId?: string
): Promise<boolean> {
  const effectiveUserId = userId ?? currentUserId;
  if (!effectiveUserId) return false;

  const { getKeyMetadata } = await import('./key-manager');
  const activeKeyMeta = await getKeyMetadata(effectiveUserId);

  if (!activeKeyMeta) return false;

  // Needs re-encryption if the stored keyId doesn't match active key
  return keyId !== activeKeyMeta.keyId;
}
