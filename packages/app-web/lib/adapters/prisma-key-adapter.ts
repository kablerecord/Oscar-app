/**
 * Prisma Key Persistence Adapter
 *
 * Implements key storage/retrieval for @osqr/core vault encryption.
 * Keys are wrapped (encrypted) before storage using the user's MEK.
 *
 * @see docs/BUILD-ENCRYPTION-REMEDIATION.md
 */

import { prisma } from '@/lib/db/prisma'
import { wrapKey, unwrapKey } from '@/lib/encryption/user-encryption'

export interface KeyPersistenceAdapter {
  loadKey: (userId: string, keyId: string) => Promise<Uint8Array | null>
  persistKey: (userId: string, keyId: string, key: Uint8Array) => Promise<void>
  deleteKey: (userId: string, keyId: string) => Promise<void>
  deleteAllKeys: (userId: string) => Promise<void>
  listKeys: (userId: string) => Promise<string[]>
}

/**
 * Create a Prisma-backed key persistence adapter
 *
 * @param getMasterKey Function to retrieve the user's master encryption key
 */
export function getPrismaKeyAdapter(
  getMasterKey: (userId: string) => Promise<Buffer>
): KeyPersistenceAdapter {
  return {
    async loadKey(userId: string, keyId: string): Promise<Uint8Array | null> {
      const record = await prisma.encryptedKey.findUnique({
        where: { keyId },
      })

      if (!record || record.userId !== userId) {
        return null
      }

      // Unwrap (decrypt) the key using user's master key
      const mek = await getMasterKey(userId)
      const wrappedKey = Buffer.from(record.wrappedKey, 'base64')
      const unwrapped = unwrapKey(wrappedKey, mek)
      return new Uint8Array(unwrapped)
    },

    async persistKey(
      userId: string,
      keyId: string,
      key: Uint8Array
    ): Promise<void> {
      // Wrap (encrypt) the key using user's master key
      const mek = await getMasterKey(userId)
      const wrappedKey = wrapKey(Buffer.from(key), mek)
      const wrappedKeyBase64 = wrappedKey.toString('base64')

      await prisma.encryptedKey.upsert({
        where: { keyId },
        create: {
          userId,
          keyId,
          wrappedKey: wrappedKeyBase64,
          keyType: 'vault_dek',
        },
        update: {
          wrappedKey: wrappedKeyBase64,
          rotatedAt: new Date(),
          version: { increment: 1 },
        },
      })
    },

    async deleteKey(userId: string, keyId: string): Promise<void> {
      await prisma.encryptedKey.deleteMany({
        where: { userId, keyId },
      })
    },

    async deleteAllKeys(userId: string): Promise<void> {
      await prisma.encryptedKey.deleteMany({
        where: { userId },
      })
    },

    async listKeys(userId: string): Promise<string[]> {
      const keys = await prisma.encryptedKey.findMany({
        where: { userId },
        select: { keyId: true },
      })
      return keys.map((k) => k.keyId)
    },
  }
}
