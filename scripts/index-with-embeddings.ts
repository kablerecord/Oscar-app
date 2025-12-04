#!/usr/bin/env tsx

/**
 * Index Documents with Embeddings
 *
 * Scans a folder, extracts text, chunks it, generates embeddings, and stores everything
 * Usage: npx tsx scripts/index-with-embeddings.ts <directory>
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { FileScanner } from '../lib/knowledge/file-scanner'
import { TextExtractor } from '../lib/knowledge/text-extractor'
import { TextChunker } from '../lib/knowledge/chunker'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const EMBEDDING_BATCH_SIZE = 20 // Embed 20 chunks at a time

async function main() {
  const targetDir = process.argv[2]

  if (!targetDir) {
    console.error('❌ Please provide a directory to index')
    console.log('\nUsage: npx tsx scripts/index-with-embeddings.ts <directory>')
    process.exit(1)
  }

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set')
    process.exit(1)
  }

  console.log('\n🧠 Oscar Knowledge Indexer (with Embeddings)\n')
  console.log(`📂 Target directory: ${targetDir}\n`)

  // Scan files
  console.log('🔍 Scanning files...\n')
  const files = await FileScanner.scan(targetDir, {
    extensions: ['.txt', '.md', '.json', '.pdf', '.doc', '.docx'],
  })

  console.log(`✅ Found ${files.length} files\n`)

  if (files.length === 0) {
    console.log('No files found. Exiting.')
    process.exit(0)
  }

  // Show breakdown
  const byExtension = FileScanner.groupByExtension(files)
  console.log('📊 File breakdown:')
  for (const [ext, fileList] of byExtension.entries()) {
    console.log(`   ${ext}: ${fileList.length} files`)
  }
  console.log()

  // Get workspace
  const workspace = await prisma.workspace.findFirst()
  if (!workspace) {
    console.error('❌ No workspace found. Run: npx prisma db seed')
    process.exit(1)
  }

  console.log(`📦 Workspace: ${workspace.name}\n`)
  console.log('📥 Starting indexing with embeddings...\n')

  let filesIndexed = 0
  let filesFailed = 0
  let totalChunks = 0
  let totalEmbeddings = 0
  const startTime = Date.now()

  for (const file of files) {
    try {
      process.stdout.write(`   📄 ${file.filename}... `)

      // Extract text
      const text = await TextExtractor.extract(file)
      const cleanText = TextExtractor.cleanText(text)

      if (!cleanText || cleanText.length < 10) {
        console.log('⚠️ skipped (no content)')
        filesFailed++
        continue
      }

      // Check if already indexed (by hash)
      const existing = await prisma.document.findFirst({
        where: {
          workspaceId: workspace.id,
          metadata: {
            path: ['hash'],
            equals: file.hash,
          },
        },
      })

      if (existing) {
        console.log('⏭️ already indexed')
        continue
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          title: file.filename,
          sourceType: 'upload',
          originalFilename: file.filename,
          mimeType: file.mimeType,
          textContent: cleanText,
          metadata: {
            path: file.path,
            size: file.size,
            hash: file.hash,
            indexed: new Date().toISOString(),
          },
        },
      })

      // Chunk the document
      const chunks = TextChunker.chunk(cleanText, {
        maxChunkSize: 1000,
        overlapSize: 200,
      })

      totalChunks += chunks.length

      // Process chunks in batches for embedding
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
        const texts = batch.map(c => c.content)

        // Generate embeddings
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: texts,
        })

        // Store chunks with embeddings
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j]
          const embedding = response.data[j].embedding
          const embeddingStr = `[${embedding.join(',')}]`

          await prisma.$executeRaw`
            INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "chunkIndex", "createdAt")
            VALUES (
              ${`chunk_${document.id}_${chunk.index}`},
              ${document.id},
              ${chunk.content},
              ${embeddingStr}::vector,
              ${chunk.index},
              NOW()
            )
          `
          totalEmbeddings++
        }

        // Small delay between embedding batches
        if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`✅ ${chunks.length} chunks embedded`)
      filesIndexed++

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`❌ ${errorMsg.slice(0, 50)}`)
      filesFailed++
    }
  }

  const elapsed = (Date.now() - startTime) / 1000

  console.log(`\n🎉 Indexing complete!`)
  console.log(`   📄 Files indexed: ${filesIndexed}`)
  console.log(`   📦 Total chunks: ${totalChunks}`)
  console.log(`   🧠 Embeddings generated: ${totalEmbeddings}`)
  console.log(`   ❌ Failed: ${filesFailed}`)
  console.log(`   ⏱️  Time: ${elapsed.toFixed(1)}s\n`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
