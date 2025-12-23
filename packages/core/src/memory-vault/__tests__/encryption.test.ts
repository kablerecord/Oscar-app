/**
 * Tests for Encryption at Rest
 *
 * Tests encryption/decryption, key management, and encrypted storage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString,
  generateKey,
  deriveKeyId,
  isValidKey,
  isEncryptedString,
  EncryptionError,
  serializeEncryptedData,
  deserializeEncryptedData,
  type EncryptedData,
} from '../encryption/encryption';
import {
  configureKeyManager,
  createUserKey,
  getUserKey,
  getKeyById,
  rotateUserKey,
  hasUserKey,
  deleteUserKeys,
  clearAllKeys,
  deriveSubKey,
  KEY_PURPOSES,
} from '../encryption/key-manager';
import {
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
} from '../encryption/encrypted-store';

describe('Encryption Module', () => {
  describe('Core Encryption Functions', () => {
    it('should generate a valid 256-bit key', () => {
      const key = generateKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // 256 bits = 32 bytes
      expect(isValidKey(key)).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(isValidKey(Buffer.alloc(16))).toBe(false); // Too short
      expect(isValidKey(Buffer.alloc(64))).toBe(false); // Too long
      expect(isValidKey('not a buffer' as any)).toBe(false);
    });

    it('should encrypt and decrypt plaintext', () => {
      const key = generateKey();
      const plaintext = 'Hello, World!';

      const encrypted = encrypt(plaintext, key);
      // EncryptedData returns base64 strings
      expect(typeof encrypted.ciphertext).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.authTag).toBe('string');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.version).toBe(1);

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt to and decrypt from string format', () => {
      const key = generateKey();
      const plaintext = 'Sensitive data here';

      const encryptedString = encryptToString(plaintext, key);
      expect(typeof encryptedString).toBe('string');
      expect(isEncryptedString(encryptedString)).toBe(true);

      const decrypted = decryptFromString(encryptedString, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const key = generateKey();
      const plaintext = 'Same text';

      const encrypted1 = encryptToString(plaintext, key);
      const encrypted2 = encryptToString(plaintext, key);

      // Different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to same plaintext
      expect(decryptFromString(encrypted1, key)).toBe(plaintext);
      expect(decryptFromString(encrypted2, key)).toBe(plaintext);
    });

    it('should fail decryption with wrong key', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      const plaintext = 'Secret message';

      const encrypted = encryptToString(plaintext, key1);

      expect(() => decryptFromString(encrypted, key2)).toThrow(EncryptionError);
    });

    it('should fail decryption with tampered ciphertext', () => {
      const key = generateKey();
      const plaintext = 'Important data';

      const encrypted = encrypt(plaintext, key);
      // Tamper with ciphertext (base64 string)
      const bytes = Buffer.from(encrypted.ciphertext, 'base64');
      bytes[0] ^= 0xff;
      encrypted.ciphertext = bytes.toString('base64');

      expect(() => decrypt(encrypted, key)).toThrow(EncryptionError);
    });

    it('should derive consistent key ID from key', () => {
      const key = generateKey();
      const keyId1 = deriveKeyId(key);
      const keyId2 = deriveKeyId(key);

      expect(keyId1).toBe(keyId2);
      expect(typeof keyId1).toBe('string');
      expect(keyId1.length).toBeGreaterThan(0);
    });

    it('should serialize and deserialize encrypted data', () => {
      const key = generateKey();
      const plaintext = 'Test data';

      const encrypted = encrypt(plaintext, key);
      const serialized = serializeEncryptedData(encrypted);
      const deserialized = deserializeEncryptedData(serialized);

      expect(deserialized.iv.toString('hex')).toBe(encrypted.iv.toString('hex'));
      expect(deserialized.ciphertext.toString('hex')).toBe(encrypted.ciphertext.toString('hex'));
      expect(deserialized.authTag.toString('hex')).toBe(encrypted.authTag.toString('hex'));

      const decrypted = decrypt(deserialized, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle whitespace string', () => {
      const key = generateKey();
      const plaintext = '   '; // Whitespace instead of empty

      const encrypted = encrypt(plaintext, key);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const key = generateKey();
      const plaintext = '日本語テスト 🎉 émojis and ünïcödé';

      const encrypted = encryptToString(plaintext, key);
      const decrypted = decryptFromString(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const key = generateKey();
      const plaintext = 'x'.repeat(100000); // 100KB

      const encrypted = encryptToString(plaintext, key);
      const decrypted = decryptFromString(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Key Manager', () => {
    beforeEach(async () => {
      clearAllKeys();
    });

    afterEach(() => {
      clearAllKeys();
    });

    it('should create a new user key', async () => {
      const userKey = await createUserKey('user-123');

      expect(userKey.userId).toBe('user-123');
      expect(userKey.key).toBeInstanceOf(Buffer);
      expect(userKey.key.length).toBe(32);
      expect(userKey.keyId).toBeDefined();
      expect(userKey.createdAt).toBeInstanceOf(Date);
    });

    it('should get user key (creating if needed)', async () => {
      expect(await hasUserKey('user-456')).toBe(false);

      // createUserKey explicitly creates a key
      const userKey = await createUserKey('user-456');
      expect(userKey.key).toBeInstanceOf(Buffer);
      expect(userKey.key.length).toBe(32);

      expect(await hasUserKey('user-456')).toBe(true);
    });

    it('should return same key for same user', async () => {
      const userId = 'user-same-key-test';

      // createUserKey returns the created key
      const createdKey = await createUserKey(userId);

      // getUserKey should return the same key object
      const retrievedKey = await getUserKey(userId);

      expect(retrievedKey.toString('hex')).toBe(createdKey.key.toString('hex'));
    });

    it('should return different keys for different users', async () => {
      const key1 = await getUserKey('user-a');
      const key2 = await getUserKey('user-b');

      expect(key1.toString('hex')).not.toBe(key2.toString('hex'));
    });

    it('should get key by ID', async () => {
      const userKey = await createUserKey('user-key-lookup');
      const retrieved = await getKeyById('user-key-lookup', userKey.keyId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.toString('hex')).toBe(userKey.key.toString('hex'));
    });

    it('should return null for unknown key ID', async () => {
      await createUserKey('user-existing');
      const retrieved = await getKeyById('user-existing', 'unknown-key-id');

      expect(retrieved).toBeNull();
    });

    it('should rotate user key', async () => {
      const userId = 'user-rotate-test';

      // First create a key explicitly
      const createdKey = await createUserKey(userId);
      const originalKeyHex = createdKey.key.toString('hex');

      // Rotate the key
      const result = await rotateUserKey(userId);

      expect(result.newKey.keyId).toBeDefined();
      expect(result.oldKey.keyId).toBeDefined();
      expect(result.newKey.keyId).not.toBe(result.oldKey.keyId);

      // New key should be different
      const newKey = await getUserKey(userId);
      expect(newKey.toString('hex')).not.toBe(originalKeyHex);

      // Old key should still be accessible by ID
      const oldKey = await getKeyById(userId, result.oldKey.keyId);
      expect(oldKey).not.toBeNull();
      expect(oldKey!.toString('hex')).toBe(originalKeyHex);
    });

    it('should derive sub-keys for different purposes', async () => {
      const masterKey = await getUserKey('user-subkeys');

      const subKey1 = deriveSubKey(masterKey, KEY_PURPOSES.SEMANTIC_CONTENT);
      const subKey2 = deriveSubKey(masterKey, KEY_PURPOSES.EPISODIC_MESSAGES);
      const subKey3 = deriveSubKey(masterKey, KEY_PURPOSES.PROCEDURAL_RULES);

      // All sub-keys should be valid
      expect(isValidKey(subKey1)).toBe(true);
      expect(isValidKey(subKey2)).toBe(true);
      expect(isValidKey(subKey3)).toBe(true);

      // All sub-keys should be different
      expect(subKey1.toString('hex')).not.toBe(subKey2.toString('hex'));
      expect(subKey2.toString('hex')).not.toBe(subKey3.toString('hex'));
      expect(subKey1.toString('hex')).not.toBe(subKey3.toString('hex'));

      // Same purpose should produce same sub-key
      const subKey1Again = deriveSubKey(masterKey, KEY_PURPOSES.SEMANTIC_CONTENT);
      expect(subKey1.toString('hex')).toBe(subKey1Again.toString('hex'));
    });

    it('should delete user keys', async () => {
      await createUserKey('user-delete');
      expect(await hasUserKey('user-delete')).toBe(true);

      await deleteUserKeys('user-delete');
      expect(await hasUserKey('user-delete')).toBe(false);
    });
  });

  describe('Encrypted Store', () => {
    beforeEach(() => {
      disableEncryption();
      clearAllKeys();
      configureKeyManager({ persistKeys: false });
    });

    afterEach(() => {
      disableEncryption();
      clearAllKeys();
    });

    it('should start with encryption disabled', () => {
      expect(isEncryptionEnabled()).toBe(false);
      expect(getEncryptionConfig()).toBeNull();
    });

    it('should enable and disable encryption', async () => {
      await enableEncryption('user-enable');

      expect(isEncryptionEnabled()).toBe(true);
      const config = getEncryptionConfig();
      expect(config).not.toBeNull();
      expect(config!.userId).toBe('user-enable');
      expect(config!.enabled).toBe(true);

      disableEncryption();

      expect(isEncryptionEnabled()).toBe(false);
      expect(getEncryptionConfig()).toBeNull();
    });

    it('should encrypt and decrypt content', async () => {
      await enableEncryption('user-content');

      const content = 'My secret memory content';
      const { encryptedContent, keyId } = await encryptContent(content);

      expect(encryptedContent).not.toBe(content);
      expect(keyId).toBeDefined();

      const decrypted = await decryptContent(encryptedContent, keyId);
      expect(decrypted).toBe(content);
    });

    it('should encrypt and decrypt documents', async () => {
      await enableEncryption('user-docs');

      const doc = await encryptDocument(
        'doc-1',
        'Secret document content',
        [0.1, 0.2, 0.3],
        { type: 'test', score: 0.9 }
      );

      expect(doc.id).toBe('doc-1');
      expect(doc.encryptedContent).not.toBe('Secret document content');
      expect(doc.embedding).toEqual([0.1, 0.2, 0.3]); // Embeddings not encrypted
      expect(doc.metadata._encrypted).toBe(true);
      expect(doc.metadata._keyId).toBeDefined();

      const decrypted = await decryptDocument(doc);
      expect(decrypted.id).toBe('doc-1');
      expect(decrypted.content).toBe('Secret document content');
      expect(decrypted.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(decrypted.metadata.type).toBe('test');
      expect(decrypted.metadata.score).toBe(0.9);
      // Encryption metadata should be removed
      expect(decrypted.metadata._encrypted).toBeUndefined();
      expect(decrypted.metadata._keyId).toBeUndefined();
    });

    it('should batch encrypt and decrypt documents', async () => {
      await enableEncryption('user-batch');

      const docs = [
        { id: 'doc-a', content: 'Content A', embedding: [0.1], metadata: {} },
        { id: 'doc-b', content: 'Content B', embedding: [0.2], metadata: {} },
        { id: 'doc-c', content: 'Content C', embedding: [0.3], metadata: {} },
      ];

      const encrypted = await encryptDocuments(docs);
      expect(encrypted.length).toBe(3);
      expect(encrypted[0].encryptedContent).not.toBe('Content A');

      const decrypted = await decryptDocuments(encrypted);
      expect(decrypted.length).toBe(3);
      expect(decrypted[0].content).toBe('Content A');
      expect(decrypted[1].content).toBe('Content B');
      expect(decrypted[2].content).toBe('Content C');
    });

    it('should pass through unencrypted document when encryption disabled', async () => {
      // Encryption is disabled by default
      expect(isEncryptionEnabled()).toBe(false);

      const doc = await encryptDocument(
        'doc-unenc',
        'Unencrypted content',
        [0.5],
        { type: 'test' }
      );

      expect(doc.encryptedContent).toBe('Unencrypted content');
      expect(doc.keyId).toBe('');
      expect(doc.metadata._encrypted).toBeUndefined();

      const decrypted = await decryptDocument(doc);
      expect(decrypted.content).toBe('Unencrypted content');
    });

    it('should throw when decrypting encrypted doc without encryption enabled', async () => {
      // Enable, encrypt, then disable
      await enableEncryption('user-enc-dec');
      const encrypted = await encryptDocument('doc-x', 'Secret', [], {});
      disableEncryption();

      await expect(decryptDocument(encrypted)).rejects.toThrow(EncryptionError);
    });

    it('should require user ID for encryption', async () => {
      await expect(encryptContent('test')).rejects.toThrow(EncryptionError);
    });
  });

  describe('Integration: Encryption with Different Users', () => {
    beforeEach(() => {
      disableEncryption();
      clearAllKeys();
      configureKeyManager({ persistKeys: false });
    });

    afterEach(() => {
      disableEncryption();
      clearAllKeys();
    });

    it('should encrypt data differently for different users', async () => {
      const content = 'Same content for both users';

      // User A
      await enableEncryption('user-a');
      const { encryptedContent: encA, keyId: keyIdA } = await encryptContent(content);
      disableEncryption();

      // User B
      await enableEncryption('user-b');
      const { encryptedContent: encB, keyId: keyIdB } = await encryptContent(content);
      disableEncryption();

      // Different encrypted content and key IDs
      expect(encA).not.toBe(encB);
      expect(keyIdA).not.toBe(keyIdB);

      // Each user can decrypt their own
      await enableEncryption('user-a');
      expect(await decryptContent(encA, keyIdA)).toBe(content);
      disableEncryption();

      await enableEncryption('user-b');
      expect(await decryptContent(encB, keyIdB)).toBe(content);
    });

    it('should not allow cross-user decryption', async () => {
      const content = 'User A private data';

      // User A encrypts
      await enableEncryption('user-a');
      const { encryptedContent, keyId } = await encryptContent(content);
      disableEncryption();

      // User B tries to decrypt
      await enableEncryption('user-b');
      // This should fail because user B doesn't have user A's key
      await expect(decryptContent(encryptedContent, keyId)).rejects.toThrow();
    });
  });
});
