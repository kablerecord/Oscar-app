#!/usr/bin/env tsx

/**
 * Automatic Knowledge Indexer (Non-Interactive)
 *
 * Indexes files without prompting for user input
 * NOW WITH EMBEDDING GENERATION!
 *
 * Usage: tsx scripts/auto-index.ts <directory>
 */

import 'dotenv/config'  // Load .env file FIRST
import { FileScanner } from '../lib/knowledge/file-scanner'
import { TextExtractor } from '../lib/knowledge/text-extractor'
import { TextChunker } from '../lib/knowledge/chunker'
import { prisma } from '../lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '../lib/ai/embeddings'

async function main() {
  const targetDir = process.argv[2]

  if (!targetDir) {
    console.error('❌ Please provide a directory to index')
    console.log('\nUsage: tsx scripts/auto-index.ts <directory>')
    process.exit(1)
  }

  // Verify OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment')
    console.log('   Make sure .env file exists with OPENAI_API_KEY=sk-...')
    process.exit(1)
  }
  console.log('✅ OpenAI API key loaded')

  console.log('\n🧠 OSQR Knowledge Indexer (Auto Mode)\n')
  console.log(`📂 Target directory: ${targetDir}\n`)

  // Step 1: Scan files
  console.log('🔍 Scanning files...\n')

  const files = await FileScanner.scan(targetDir, {
    extensions: ['.txt', '.md', '.json', '.pdf', '.doc', '.docx'],
  })

  console.log(`✅ Found ${files.length} files\n`)

  if (files.length === 0) {
    console.log('No files found. Exiting.')
    process.exit(0)
  }

  // Step 2: Show file summary
  const byExtension = FileScanner.groupByExtension(files)
  console.log('📊 File breakdown:')
  for (const [ext, fileList] of byExtension.entries()) {
    console.log(`   ${ext}: ${fileList.length} files`)
  }
  console.log()

  // Step 3: Find duplicates
  const duplicates = FileScanner.findDuplicates(files)
  if (duplicates.size > 0) {
    console.log(`⚠️  Found ${duplicates.size} sets of duplicate files`)
    console.log('   (Will index all files, including duplicates)\n')
  }

  // Get workspace
  const workspace = await prisma.workspace.findFirst()
  if (!workspace) {
    console.error('❌ No workspace found. Run: npm run db:seed')
    process.exit(1)
  }

  console.log('📥 Starting indexing...\n')

  let indexed = 0
  let skipped = 0
  let failed = 0
  const errors: Array<{ file: string; error: string }> = []

  for (const file of files) {
    try {
      console.log(`   Processing: ${file.filename}...`)

      // Check if already indexed by hash
      const existing = await prisma.document.findFirst({
        where: {
          metadata: {
            path: ['hash'],
            equals: file.hash,
          },
        },
      })

      if (existing) {
        console.log(`      ⏭️  Already indexed (skipping)`)
        skipped++
        continue
      }

      // Extract text
      const text = await TextExtractor.extract(file)
      const cleanText = TextExtractor.cleanText(text)

      if (!cleanText || cleanText.length < 10) {
        console.log(`      ⚠️  Skipped (no content)`)
        failed++
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

      // Store chunks WITH embeddings
      let embeddedCount = 0
      for (const chunk of chunks) {
        try {
          // Generate embedding for this chunk
          const embedding = await generateEmbedding(chunk.content)
          const vectorString = formatEmbeddingForPostgres(embedding)

          // Insert with embedding using raw SQL (Prisma doesn't support vector type)
          await prisma.$executeRawUnsafe(`
            INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "chunkIndex", "createdAt")
            VALUES (
              gen_random_uuid()::text,
              $1,
              $2,
              $3::vector,
              $4,
              NOW()
            )
          `, document.id, chunk.content, vectorString, chunk.index)

          embeddedCount++
        } catch (embeddingError) {
          // Fallback: store without embedding if embedding fails
          console.log(`      ⚠️  Embedding failed for chunk ${chunk.index}, storing without embedding`)
          await prisma.documentChunk.create({
            data: {
              documentId: document.id,
              content: chunk.content,
              chunkIndex: chunk.index,
            },
          })
        }
      }

      console.log(`      ✅ Indexed with ${chunks.length} chunks (${embeddedCount} embedded, ${cleanText.length} chars)`)
      indexed++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`      ❌ Failed: ${errorMsg}`)
      errors.push({ file: file.filename, error: errorMsg })
      failed++
    }
  }

  console.log(`\n🎉 Indexing complete!`)
  console.log(`   ✅ Indexed: ${indexed} files`)
  console.log(`   ⏭️  Skipped: ${skipped} files (already indexed)`)
  console.log(`   ❌ Failed: ${failed} files`)

  if (errors.length > 0 && errors.length <= 10) {
    console.log('\n❌ Failed files:')
    for (const err of errors) {
      console.log(`   - ${err.file}: ${err.error}`)
    }
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
