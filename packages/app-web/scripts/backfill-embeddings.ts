#!/usr/bin/env tsx

/**
 * Embedding Backfill Script
 *
 * Generates embeddings for all DocumentChunks that don't have embeddings yet.
 * Uses batch processing to handle large numbers of chunks efficiently.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts
 */

import 'dotenv/config'  // Load .env file FIRST
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()

// Verify API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment')
  console.log('   Make sure .env file exists with OPENAI_API_KEY=sk-...')
  process.exit(1)
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const BATCH_SIZE = 50 // Process 50 chunks at a time

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  return response.data
    .sort((a, b) => a.index - b.index)
    .map(item => item.embedding)
}

/**
 * Format embedding for PostgreSQL vector type
 */
function formatForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

async function main() {
  console.log('\n🧠 OSQR Embedding Backfill\n')
  console.log(`📊 Using model: ${EMBEDDING_MODEL}`)
  console.log(`📦 Batch size: ${BATCH_SIZE}\n`)

  // Count chunks needing embeddings
  const totalChunks = await prisma.documentChunk.count()

  // Count chunks WITH embeddings using raw SQL
  const withEmbeddings = await prisma.$queryRaw<[{count: bigint}]>`
    SELECT COUNT(*) as count FROM "DocumentChunk" WHERE embedding IS NOT NULL
  `
  const chunksWithEmbeddings = Number(withEmbeddings[0].count)
  const chunksNeedingEmbeddings = totalChunks - chunksWithEmbeddings

  console.log(`📈 Total chunks: ${totalChunks}`)
  console.log(`✅ With embeddings: ${chunksWithEmbeddings}`)
  console.log(`❌ Need embeddings: ${chunksNeedingEmbeddings}`)

  if (chunksNeedingEmbeddings === 0) {
    console.log('\n✨ All chunks already have embeddings!')
    await prisma.$disconnect()
    return
  }

  console.log(`\n🚀 Starting backfill...\n`)

  let processed = 0
  let failed = 0
  const startTime = Date.now()

  // Process in batches
  while (processed < chunksNeedingEmbeddings) {
    // Fetch batch of chunks without embeddings
    const chunks = await prisma.$queryRaw<Array<{id: string, content: string}>>`
      SELECT id, content FROM "DocumentChunk"
      WHERE embedding IS NULL
      LIMIT ${BATCH_SIZE}
    `

    if (chunks.length === 0) break

    try {
      // Generate embeddings for batch
      const texts = chunks.map((c: { content: string }) => c.content)
      const embeddings = await generateEmbeddingsBatch(texts)

      // Update each chunk with its embedding
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]
        const vectorString = formatForPostgres(embedding)

        await prisma.$executeRawUnsafe(`
          UPDATE "DocumentChunk"
          SET embedding = $1::vector
          WHERE id = $2
        `, vectorString, chunk.id)
      }

      processed += chunks.length

      // Progress update
      const elapsed = (Date.now() - startTime) / 1000
      const rate = processed / elapsed
      const remaining = chunksNeedingEmbeddings - processed
      const eta = remaining / rate

      console.log(`   ✅ ${processed}/${chunksNeedingEmbeddings} (${Math.round(rate)} chunks/sec, ETA: ${Math.round(eta)}s)`)

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error) {
      console.error(`   ❌ Batch failed:`, error instanceof Error ? error.message : error)
      failed += chunks.length

      // Try processing individually on batch failure
      for (const chunk of chunks) {
        try {
          const embedding = await generateEmbedding(chunk.content)
          const vectorString = formatForPostgres(embedding)

          await prisma.$executeRawUnsafe(`
            UPDATE "DocumentChunk"
            SET embedding = $1::vector
            WHERE id = $2
          `, vectorString, chunk.id)

          processed++
          failed--
        } catch (individualError) {
          console.error(`      ❌ Chunk ${chunk.id} failed`)
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  const totalTime = (Date.now() - startTime) / 1000

  console.log(`\n🎉 Backfill complete!`)
  console.log(`   ✅ Processed: ${processed} chunks`)
  console.log(`   ❌ Failed: ${failed} chunks`)
  console.log(`   ⏱️  Time: ${Math.round(totalTime)}s`)
  console.log(`   📊 Rate: ${Math.round(processed / totalTime)} chunks/sec`)

  // Verify final count
  const finalCount = await prisma.$queryRaw<[{count: bigint}]>`
    SELECT COUNT(*) as count FROM "DocumentChunk" WHERE embedding IS NOT NULL
  `
  console.log(`\n📈 Final embedded chunks: ${finalCount[0].count}`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
