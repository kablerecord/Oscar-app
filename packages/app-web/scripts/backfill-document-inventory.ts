/**
 * Backfill DocumentInventory for existing documents (Lightweight Version)
 *
 * This script creates basic DocumentInventory entries for existing documents
 * without computing embeddings/centroids (those can be added later).
 *
 * It generates auto-summaries using the document title and first chunk content.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-document-inventory.ts
 *
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit=N    Process only first N documents
 *   --batch=N    Batch size (default: 10)
 *   --ai         Use AI (Haiku) for summary generation (slower but better)
 */

import { prisma } from '../lib/db/prisma'
import { ProviderRegistry } from '../lib/ai/providers'

const DRY_RUN = process.argv.includes('--dry-run')
const USE_AI = process.argv.includes('--ai')
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || 0
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1] || '10')

// Stop words to filter out when extracting tags
const STOP_WORDS = new Set([
  'the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but',
  'his', 'from', 'they', 'were', 'been', 'have', 'their', 'would', 'there',
  'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'than',
  'function', 'const', 'return', 'import', 'export', 'class', 'interface',
])

/**
 * Generate summary and tags using AI (Haiku)
 */
async function generateSummaryWithAI(content: string, title: string): Promise<{ summary: string; tags: string[] }> {
  try {
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-haiku-20240307',
    })

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are a document analyzer. Given document content, provide:
1. A 2-3 sentence summary that captures the key topics and purpose
2. 3-7 topic tags (single words or short phrases) that describe the content

Respond in JSON format only:
{"summary": "...", "tags": ["tag1", "tag2", ...]}`,
        },
        {
          role: 'user',
          content: `Document Title: ${title}\n\nContent:\n${content.slice(0, 4000)}`,
        },
      ],
      maxTokens: 500,
      temperature: 0.3,
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        summary: parsed.summary || `Document: ${title}`,
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 7) : [],
      }
    }
  } catch (error) {
    console.error(`    AI summary failed, using fallback:`, error instanceof Error ? error.message : error)
  }
  return generateSimpleSummary(content, title)
}

/**
 * Generate simple summary without AI
 */
function generateSimpleSummary(content: string, title: string): { summary: string; tags: string[] } {
  // Take first 300 chars of content as summary
  const preview = content.replace(/\s+/g, ' ').trim().slice(0, 300)
  const summary = preview.length > 0 ? `${preview}...` : `Document: ${title}`

  // Extract tags from title and content
  const words = (title + ' ' + content).toLowerCase().split(/\s+/)
  const wordCounts = new Map<string, number>()

  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/g, '')
    if (cleaned.length > 4 && !STOP_WORDS.has(cleaned)) {
      wordCounts.set(cleaned, (wordCounts.get(cleaned) || 0) + 1)
    }
  }

  const tags = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)

  return { summary, tags }
}

async function backfillDocumentInventory() {
  console.log('='.repeat(60))
  console.log('DocumentInventory Backfill Script (Lightweight)')
  console.log('='.repeat(60))
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Summary generation: ${USE_AI ? 'AI (Haiku)' : 'Simple (no API calls)'}`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  if (LIMIT > 0) console.log(`Limit: ${LIMIT} documents`)
  console.log('')

  // Get existing inventory document IDs
  const existingInventory = await prisma.documentInventory.findMany({
    select: { documentId: true },
  })
  const existingDocIds = new Set(existingInventory.map(i => i.documentId))

  // Get documents that don't have inventory entries
  const allIndexedDocs = await prisma.document.findMany({
    where: {
      chunks: { some: {} }, // Has at least one chunk (indexed)
    },
    include: {
      workspace: {
        select: { ownerId: true },
      },
      chunks: {
        select: { content: true },
        take: 3, // First 3 chunks for content
        orderBy: { chunkIndex: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: LIMIT > 0 ? LIMIT : undefined,
  })

  // Filter to only those without inventory
  const documentsWithoutInventory = allIndexedDocs.filter(doc => !existingDocIds.has(doc.id))

  console.log(`Found ${documentsWithoutInventory.length} documents without inventory entries`)
  console.log('')

  if (DRY_RUN) {
    console.log('DRY RUN - Would process:')
    for (const doc of documentsWithoutInventory.slice(0, 20)) {
      console.log(`  - ${doc.title} (${doc.id})`)
    }
    if (documentsWithoutInventory.length > 20) {
      console.log(`  ... and ${documentsWithoutInventory.length - 20} more`)
    }
    await prisma.$disconnect()
    return
  }

  // Process in batches
  let processed = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < documentsWithoutInventory.length; i += BATCH_SIZE) {
    const batch = documentsWithoutInventory.slice(i, i + BATCH_SIZE)
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documentsWithoutInventory.length / BATCH_SIZE)}...`)

    for (const doc of batch) {
      try {
        const userId = doc.workspace?.ownerId
        if (!userId) {
          console.log(`  ⚠️ Skipping ${doc.title} - no userId`)
          continue
        }

        console.log(`  📄 Processing: ${doc.title.slice(0, 50)}...`)

        // Get content from chunks
        const content = doc.chunks.map(c => c.content).join('\n\n')

        // Generate summary and tags
        const { summary, tags } = USE_AI
          ? await generateSummaryWithAI(content, doc.title)
          : generateSimpleSummary(content, doc.title)

        // Create inventory entry (without embedding - can be added later)
        await prisma.documentInventory.create({
          data: {
            userId,
            documentId: doc.id,
            title: doc.title,
            fileName: doc.originalFilename || doc.title,
            fileType: doc.mimeType || 'unknown',
            uploadedAt: doc.createdAt,
            autoSummary: summary,
            topicTags: tags,
          },
        })

        processed++
        console.log(`  ✅ Done (tags: ${tags.join(', ')})`)
      } catch (error) {
        failed++
        console.error(`  ❌ Failed: ${doc.title.slice(0, 40)}`)
        console.error(`     Error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Brief pause between batches to avoid rate limits (only if using AI)
    if (USE_AI && i + BATCH_SIZE < documentsWithoutInventory.length) {
      console.log('  Waiting 1 second before next batch...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log('')
  console.log('='.repeat(60))
  console.log('Backfill Complete')
  console.log('='.repeat(60))
  console.log(`Processed: ${processed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Time: ${elapsed}s`)
  console.log('')

  // Verify results
  const inventoryCount = await prisma.documentInventory.count()
  console.log(`Total DocumentInventory entries: ${inventoryCount}`)

  await prisma.$disconnect()
}

backfillDocumentInventory().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
