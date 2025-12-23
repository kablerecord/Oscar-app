#!/usr/bin/env tsx

/**
 * Generate Embeddings for All Document Chunks
 *
 * This script:
 * 1. Finds all chunks without embeddings
 * 2. Generates embeddings using OpenAI
 * 3. Updates the database with vector embeddings
 *
 * Usage: npx tsx scripts/generate-embeddings.ts
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const BATCH_SIZE = 50 // Process 50 chunks at a time
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'

async function main() {
  console.log('\n🧠 OSQR Embedding Generator\n')

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set in environment')
    process.exit(1)
  }

  // Count total chunks and chunks needing embeddings
  const totalChunks = await prisma.documentChunk.count()

  // Since we can't query on Unsupported type, we'll use raw SQL
  const chunksWithEmbeddings = await prisma.$queryRaw<[{count: bigint}]>`
    SELECT COUNT(*) as count FROM "DocumentChunk" WHERE embedding IS NOT NULL
  `
  const embeddedCount = Number(chunksWithEmbeddings[0].count)
  const needsEmbedding = totalChunks - embeddedCount

  console.log(`📊 Status:`)
  console.log(`   Total chunks: ${totalChunks}`)
  console.log(`   Already embedded: ${embeddedCount}`)
  console.log(`   Need embedding: ${needsEmbedding}\n`)

  if (needsEmbedding === 0) {
    console.log('✅ All chunks already have embeddings!')
    await prisma.$disconnect()
    return
  }

  // Estimate cost (ada-002 is ~$0.0001 per 1K tokens, ~4 chars per token)
  const avgChunkSize = 1000 // chars
  const estimatedTokens = (needsEmbedding * avgChunkSize) / 4
  const estimatedCost = (estimatedTokens / 1000) * 0.0001
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} (rough estimate)\n`)

  // Process in batches
  let processed = 0
  let failed = 0
  const startTime = Date.now()

  console.log(`🚀 Starting embedding generation...\n`)

  while (processed + failed < needsEmbedding) {
    // Get next batch of chunks without embeddings
    const chunks = await prisma.$queryRaw<Array<{id: string, content: string}>>`
      SELECT id, content
      FROM "DocumentChunk"
      WHERE embedding IS NULL
      LIMIT ${BATCH_SIZE}
    `

    if (chunks.length === 0) break

    try {
      // Generate embeddings for batch
      const texts = chunks.map(c => c.content)

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      })

      // Update each chunk with its embedding
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = response.data[i].embedding
        const embeddingStr = `[${embedding.join(',')}]`

        await prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET embedding = ${embeddingStr}::vector
          WHERE id = ${chunk.id}
        `
      }

      processed += chunks.length
      const elapsed = (Date.now() - startTime) / 1000
      const rate = processed / elapsed
      const remaining = needsEmbedding - processed - failed
      const eta = remaining / rate

      // Progress update
      const progress = ((processed + failed) / needsEmbedding * 100).toFixed(1)
      process.stdout.write(`\r   Progress: ${progress}% | Processed: ${processed} | Failed: ${failed} | Rate: ${rate.toFixed(1)}/s | ETA: ${formatTime(eta)}   `)

    } catch (error) {
      console.error(`\n❌ Batch error:`, error)
      failed += chunks.length

      // Mark these as failed by setting a placeholder (we'll retry later)
      // For now, just skip them
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5s on error
    }

    // Small delay between batches to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const totalTime = (Date.now() - startTime) / 1000
  console.log(`\n\n🎉 Embedding generation complete!`)
  console.log(`   Processed: ${processed}`)
  console.log(`   Failed: ${failed}`)
  console.log(`   Time: ${formatTime(totalTime)}\n`)

  await prisma.$disconnect()
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
