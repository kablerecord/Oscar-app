#!/usr/bin/env tsx

/**
 * OSQR Knowledge Indexer CLI
 *
 * Scans, organizes, and indexes your messy file collection
 * Usage: npm run index-knowledge <directory>
 */

import { FileScanner } from '../lib/knowledge/file-scanner'
import { TextExtractor } from '../lib/knowledge/text-extractor'
import { TextChunker } from '../lib/knowledge/chunker'
import { FileOrganizer } from '../lib/knowledge/organizer'
import { prisma } from '../lib/db/prisma'
import { ProviderRegistry } from '../lib/ai/providers'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve))

async function main() {
  const targetDir = process.argv[2]

  if (!targetDir) {
    console.error('❌ Please provide a directory to index')
    console.log('\nUsage: npm run index-knowledge <directory>')
    console.log('Example: npm run index-knowledge ~/Documents/ChatGPT-Exports')
    process.exit(1)
  }

  console.log('\n🧠 OSQR Knowledge Indexer\n')
  console.log(`📂 Target directory: ${targetDir}\n`)

  // Step 1: Scan files
  console.log('🔍 Step 1: Scanning files...\n')

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
    for (const [hash, fileList] of duplicates.entries()) {
      console.log(`   - ${fileList.map((f) => f.filename).join(', ')}`)
    }
    console.log()
  }

  // Step 4: AI Organization Analysis
  const shouldAnalyze = await question(
    '🤖 Run AI organization analysis? (Y/n): '
  )

  if (shouldAnalyze.toLowerCase() !== 'n') {
    console.log('\n🧠 Analyzing with AI... (this may take a minute)\n')

    try {
      const plan = await FileOrganizer.analyzeAndOrganize(files, 30)

      console.log('📁 Suggested Organization:\n')
      for (const category of plan.categories) {
        console.log(`   ${category.name} (${category.files.length} files)`)
        console.log(`      ${category.description}`)
      }

      if (plan.duplicates.length > 0) {
        console.log('\n🗑️  Duplicate Recommendations:')
        for (const dup of plan.duplicates) {
          console.log(`   Keep: ${dup.keepFile.filename}`)
          console.log(`   Reason: ${dup.reason}`)
        }
      }

      if (plan.suggestions.length > 0) {
        console.log('\n💡 Suggestions:')
        for (const suggestion of plan.suggestions) {
          console.log(`   - ${suggestion}`)
        }
      }

      console.log()
    } catch (error) {
      console.log('⚠️  AI analysis failed:', error)
      console.log('Continuing with basic indexing...\n')
    }
  }

  // Step 5: Index into database
  const shouldIndex = await question(
    `\n📥 Index ${files.length} files into OSQR's knowledge base? (Y/n): `
  )

  if (shouldIndex.toLowerCase() === 'n') {
    console.log('Indexing cancelled.')
    rl.close()
    process.exit(0)
  }

  console.log('\n📥 Indexing files...\n')

  // Get workspace for target account
  const TARGET_EMAIL = 'kablerecord@gmail.com'
  const workspace = await prisma.workspace.findFirst({
    where: { owner: { email: TARGET_EMAIL } }
  })
  if (!workspace) {
    console.error(`❌ No workspace found for ${TARGET_EMAIL}. Run: npm run db:seed`)
    rl.close()
    process.exit(1)
  }
  console.log(`👤 Target account: ${TARGET_EMAIL}`)

  let indexed = 0
  let failed = 0

  for (const file of files) {
    try {
      console.log(`   Processing: ${file.filename}...`)

      // Extract text
      const text = await TextExtractor.extract(file)
      const cleanText = TextExtractor.cleanText(text)

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

      // Chunk and embed
      const chunks = TextChunker.chunk(cleanText, {
        maxChunkSize: 1000,
        overlapSize: 200,
      })

      // Generate embeddings (using OpenAI)
      const openai = ProviderRegistry.getProvider('openai', {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'text-embedding-ada-002',
      })

      for (const chunk of chunks) {
        // Note: We need to add embedding generation to the provider
        // For now, create chunks without embeddings
        await prisma.documentChunk.create({
          data: {
            documentId: document.id,
            content: chunk.content,
            chunkIndex: chunk.index,
            // embedding: will be added with vector extension
          },
        })
      }

      console.log(`      ✅ ${chunks.length} chunks`)
      indexed++
    } catch (error) {
      console.log(`      ❌ Failed: ${error}`)
      failed++
    }
  }

  console.log(`\n🎉 Indexing complete!`)
  console.log(`   ✅ Indexed: ${indexed} files`)
  console.log(`   ❌ Failed: ${failed} files\n`)

  rl.close()
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  rl.close()
  process.exit(1)
})
