/**
 * Generate embeddings for Joe Kelly's documents
 * Run with: npx tsx scripts/embed-joe-docs.ts
 *
 * Cost estimate: ~1,808 chunks × ~500 tokens avg = ~900K tokens
 * OpenAI text-embedding-3-small: $0.02/1M tokens = ~$0.02
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Joe's workspace ID
const WORKSPACE_ID = 'cmjagq8yv0002rihq2675m3ba'

// Batch size for OpenAI (max 2048, but we use smaller for reliability)
const BATCH_SIZE = 100

async function main() {
  console.log('🚀 Generating embeddings for Joe Kelly\'s documents...\n')

  // Get all chunks for Joe's workspace that don't have embeddings
  const chunks = await prisma.$queryRaw<{ id: string; content: string }[]>`
    SELECT dc.id, dc.content
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE d."workspaceId" = ${WORKSPACE_ID}
    AND dc.embedding IS NULL
    ORDER BY dc.id
  `

  console.log(`📊 Found ${chunks.length} chunks without embeddings\n`)

  if (chunks.length === 0) {
    console.log('✅ All chunks already have embeddings!')
    return
  }

  let successCount = 0
  let errorCount = 0
  const startTime = Date.now()

  // Process in batches
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`)

    try {
      // Generate embeddings for batch
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002', // Same as main app for consistency
        input: batch.map((c: { content: string }) => c.content.slice(0, 8000)), // Truncate to avoid token limit
      })

      // Update each chunk with its embedding
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = response.data[j].embedding
        const vectorString = `[${embedding.join(',')}]`

        try {
          await prisma.$executeRaw`
            UPDATE "DocumentChunk"
            SET embedding = ${vectorString}::vector
            WHERE id = ${chunk.id}
          `
          successCount++
        } catch (err) {
          console.error(`  ❌ Failed to save embedding for chunk ${chunk.id}`)
          errorCount++
        }
      }

      console.log(`  ✅ Batch ${batchNum} complete (${successCount} total)`)

      // Small delay between batches
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (err: any) {
      console.error(`  ❌ Batch ${batchNum} failed:`, err.message)
      errorCount += batch.length
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n========================================')
  console.log('📊 Embedding Summary:')
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log(`   ⏱️  Time: ${duration}s`)
  console.log('========================================\n')

  // Verify embeddings exist
  const withEmbeddings = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE d."workspaceId" = ${WORKSPACE_ID}
    AND dc.embedding IS NOT NULL
  `

  console.log(`📚 Joe's chunks with embeddings: ${withEmbeddings[0].count}`)
  console.log('\n🎉 Done! Joe can now ask semantic questions about OSQR.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
