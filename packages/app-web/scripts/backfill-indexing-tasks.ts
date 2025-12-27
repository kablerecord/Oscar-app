/**
 * Backfill Indexing Tasks Script
 *
 * This script creates background indexing tasks for all documents
 * that don't have any chunks (embeddings).
 *
 * Use this to:
 * 1. Initialize indexing for the 1,223 existing documents
 * 2. Recover from any indexing failures
 * 3. Re-queue failed tasks
 *
 * Usage:
 *   npx tsx scripts/backfill-indexing-tasks.ts
 *
 * Options:
 *   --dry-run      Show what would be queued without actually queuing
 *   --workspace=X  Only backfill for a specific workspace
 *   --limit=N      Limit number of documents to queue (default: all)
 *   --priority=X   Priority for tasks: low, normal, high (default: low)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Args {
  dryRun: boolean
  workspaceId?: string
  limit?: number
  priority: 'low' | 'normal' | 'high'
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = {
    dryRun: false,
    priority: 'low',
  }

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true
    } else if (arg.startsWith('--workspace=')) {
      result.workspaceId = arg.split('=')[1]
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--priority=')) {
      const p = arg.split('=')[1] as 'low' | 'normal' | 'high'
      if (['low', 'normal', 'high'].includes(p)) {
        result.priority = p
      }
    }
  }

  return result
}

async function main() {
  const args = parseArgs()

  console.log('🔍 Backfill Indexing Tasks')
  console.log('─'.repeat(50))
  console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Priority: ${args.priority}`)
  if (args.workspaceId) console.log(`Workspace: ${args.workspaceId}`)
  if (args.limit) console.log(`Limit: ${args.limit}`)
  console.log('─'.repeat(50))

  // Find all documents without chunks
  const whereClause: Record<string, unknown> = {
    chunks: { none: {} }
  }
  if (args.workspaceId) {
    whereClause.workspaceId = args.workspaceId
  }

  const unindexedDocs = await prisma.document.findMany({
    where: whereClause,
    select: {
      id: true,
      workspaceId: true,
      title: true,
      textContent: true,
    },
    orderBy: { createdAt: 'asc' },
    take: args.limit,
  })

  console.log(`\n📄 Found ${unindexedDocs.length} unindexed documents\n`)

  if (unindexedDocs.length === 0) {
    console.log('✅ All documents are indexed!')
    return
  }

  // Check for existing pending/running tasks
  const existingTasks = await prisma.backgroundTask.findMany({
    where: {
      type: 'index-document',
      status: { in: ['pending', 'running'] }
    },
    select: {
      payload: true
    }
  })

  const existingDocIds = new Set(
    existingTasks.map(t => (t.payload as { documentId?: string })?.documentId).filter(Boolean)
  )

  console.log(`📋 Found ${existingTasks.length} existing pending/running tasks\n`)

  let queuedCount = 0
  let skippedCount = 0
  let emptyCount = 0

  for (const doc of unindexedDocs) {
    // Skip if already has a pending/running task
    if (existingDocIds.has(doc.id)) {
      skippedCount++
      continue
    }

    // Skip empty documents
    if (!doc.textContent?.trim()) {
      emptyCount++
      console.log(`⚠️  Skipping empty: "${doc.title}"`)
      continue
    }

    if (args.dryRun) {
      console.log(`📝 Would queue: "${doc.title}"`)
      queuedCount++
    } else {
      try {
        await prisma.backgroundTask.create({
          data: {
            type: 'index-document',
            payload: {
              documentId: doc.id,
              workspaceId: doc.workspaceId,
            },
            workspaceId: doc.workspaceId,
            status: 'pending',
            priority: args.priority,
            scheduledFor: new Date(),
            maxRetries: 3,
            timeoutMs: 300000, // 5 minutes
            retries: 0,
          }
        })
        queuedCount++
        console.log(`✅ Queued: "${doc.title}"`)
      } catch (error) {
        console.error(`❌ Failed to queue "${doc.title}":`, error)
      }
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('📊 Summary:')
  console.log(`   ${args.dryRun ? 'Would queue' : 'Queued'}: ${queuedCount}`)
  console.log(`   Skipped (already queued): ${skippedCount}`)
  console.log(`   Skipped (empty): ${emptyCount}`)
  console.log('─'.repeat(50))

  if (args.dryRun) {
    console.log('\n💡 Run without --dry-run to actually create tasks')
  } else {
    console.log('\n✅ Backfill complete!')
    console.log('📌 Tasks will be processed by the cron job or task processor')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
