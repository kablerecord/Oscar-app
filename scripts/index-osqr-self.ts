#!/usr/bin/env tsx

/**
 * OSQR Self-Indexer
 *
 * Indexes OSQR's own codebase and documentation into its knowledge base.
 * This enables OSQR to be self-aware - answering questions about its own
 * architecture, capabilities, roadmap, and implementation.
 *
 * Usage: npm run index-osqr-self
 *
 * What gets indexed:
 * - Documentation (.md files in root and docs/)
 * - Core library code (lib/*.ts files)
 * - API routes (app/api/*.ts files)
 * - Configuration files (package.json, tsconfig.json, etc.)
 *
 * What is EXCLUDED:
 * - .env files and secrets
 * - node_modules
 * - .next build artifacts
 * - Test files
 * - Generated files
 */

import * as fs from 'fs'
import * as path from 'path'
import { prisma } from '../lib/db/prisma'
import { TextChunker } from '../lib/knowledge/chunker'

// ============================================
// Configuration
// ============================================

const OSQR_ROOT = path.resolve(__dirname, '..')

// Files/patterns to ALWAYS exclude
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /\.env/,
  /\.DS_Store/,
  /\.vercel/,
  /coverage/,
  /dist/,
  /\.turbo/,
  /\.cache/,
  /pnpm-lock\.yaml/,
  /package-lock\.json/,
  /yarn\.lock/,
  /\.prisma/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /\.d\.ts$/,
  /credentials/i,
  /secret/i,
]

// File types to index
const INDEXABLE_EXTENSIONS = ['.md', '.ts', '.tsx', '.json']

// Priority docs that should always be indexed
const PRIORITY_DOCS = [
  'README.md',
  'ARCHITECTURE.md',
  'ROADMAP.md',
  'PROGRESS.md',
  'AUTONOMOUS-GUIDELINES.md',
  'KNOWLEDGE-BASE.md',
  'QUICKSTART.md',
  'PRIVACY-PHILOSOPHY.md',
  'SETUP.md',
  'ASSUMPTIONS.md',
  'BLOCKED.md',
  'TESTING-CHECKLIST.md',
  'docs/JARVIS_CAPABILITIES.md',
]

// Key code directories
const CODE_DIRECTORIES = [
  'lib/ai',
  'lib/knowledge',
  'lib/context',
  'lib/msc',
  'lib/identity',
  'lib/til',
  'lib/autonomy',
  'lib/security',
  'lib/artifacts',
  'app/api/oscar',
  'app/api/msc',
  'app/api/knowledge',
  'app/api/profile',
  'app/api/til',
  'app/api/autonomy',
]

// ============================================
// Types
// ============================================

interface IndexableFile {
  path: string
  relativePath: string
  filename: string
  extension: string
  category: 'documentation' | 'core-lib' | 'api' | 'config' | 'schema'
  priority: 'high' | 'medium' | 'low'
}

// ============================================
// File Discovery
// ============================================

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath))
}

function getFileCategory(relativePath: string): IndexableFile['category'] {
  if (relativePath.endsWith('.md')) return 'documentation'
  if (relativePath.startsWith('lib/')) return 'core-lib'
  if (relativePath.startsWith('app/api/')) return 'api'
  if (relativePath.includes('schema') || relativePath.endsWith('.prisma')) return 'schema'
  return 'config'
}

function getFilePriority(relativePath: string, filename: string): IndexableFile['priority'] {
  // Priority docs
  if (PRIORITY_DOCS.includes(relativePath) || PRIORITY_DOCS.includes(filename)) {
    return 'high'
  }
  // Core lib files
  if (relativePath.startsWith('lib/ai/') || relativePath.startsWith('lib/til/')) {
    return 'high'
  }
  // API routes
  if (relativePath.startsWith('app/api/oscar/')) {
    return 'high'
  }
  // Other lib files
  if (relativePath.startsWith('lib/')) {
    return 'medium'
  }
  return 'low'
}

function discoverFiles(dir: string, basePath: string = ''): IndexableFile[] {
  const files: IndexableFile[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name

    if (shouldIgnore(fullPath) || shouldIgnore(relativePath)) {
      continue
    }

    if (entry.isDirectory()) {
      // Only recurse into relevant directories
      const shouldRecurse =
        CODE_DIRECTORIES.some((d) => relativePath.startsWith(d) || d.startsWith(relativePath)) ||
        relativePath === 'docs' ||
        relativePath === 'prisma'

      if (shouldRecurse || !basePath) {
        files.push(...discoverFiles(fullPath, relativePath))
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (INDEXABLE_EXTENSIONS.includes(ext)) {
        files.push({
          path: fullPath,
          relativePath,
          filename: entry.name,
          extension: ext,
          category: getFileCategory(relativePath),
          priority: getFilePriority(relativePath, entry.name),
        })
      }
    }
  }

  return files
}

// ============================================
// Content Extraction
// ============================================

function extractContent(file: IndexableFile): string {
  const content = fs.readFileSync(file.path, 'utf-8')

  // Add context header for code files
  if (file.extension === '.ts' || file.extension === '.tsx') {
    return `// File: ${file.relativePath}\n// Category: ${file.category}\n\n${content}`
  }

  // Add header for markdown
  if (file.extension === '.md') {
    return `<!-- Source: ${file.relativePath} -->\n\n${content}`
  }

  return content
}

function generateSummary(file: IndexableFile, content: string): string {
  const lines = content.split('\n').slice(0, 20)
  const preview = lines.join('\n').slice(0, 500)

  return `File: ${file.relativePath}
Category: ${file.category}
Priority: ${file.priority}

${preview}${content.length > 500 ? '...' : ''}`
}

// ============================================
// Indexing
// ============================================

async function indexFile(
  file: IndexableFile,
  workspaceId: string,
  content: string
): Promise<{ chunks: number }> {
  // Check if already indexed
  const existing = await prisma.document.findFirst({
    where: {
      workspaceId,
      metadata: {
        path: ['osqr_source_path'],
        equals: file.relativePath,
      },
    },
  })

  if (existing) {
    // Update existing document
    await prisma.documentChunk.deleteMany({
      where: { documentId: existing.id },
    })

    await prisma.document.update({
      where: { id: existing.id },
      data: {
        textContent: content,
        metadata: {
          osqr_source_path: file.relativePath,
          scope: 'system',
          project: 'osqr-core',
          category: file.category,
          priority: file.priority,
          indexed_at: new Date().toISOString(),
          visibility: 'internal',
        },
      },
    })

    // Re-chunk
    const chunks = TextChunker.chunk(content, {
      maxChunkSize: 1500,
      overlapSize: 200,
    })

    for (const chunk of chunks) {
      await prisma.documentChunk.create({
        data: {
          documentId: existing.id,
          content: chunk.content,
          chunkIndex: chunk.index,
        },
      })
    }

    return { chunks: chunks.length }
  }

  // Create new document
  const document = await prisma.document.create({
    data: {
      workspaceId,
      title: `[OSQR] ${file.relativePath}`,
      sourceType: 'system',
      originalFilename: file.filename,
      mimeType: file.extension === '.md' ? 'text/markdown' : 'text/typescript',
      textContent: content,
      metadata: {
        osqr_source_path: file.relativePath,
        scope: 'system',
        project: 'osqr-core',
        category: file.category,
        priority: file.priority,
        indexed_at: new Date().toISOString(),
        visibility: 'internal',
      },
    },
  })

  // Chunk and store
  const chunks = TextChunker.chunk(content, {
    maxChunkSize: 1500,
    overlapSize: 200,
  })

  for (const chunk of chunks) {
    await prisma.documentChunk.create({
      data: {
        documentId: document.id,
        content: chunk.content,
        chunkIndex: chunk.index,
      },
    })
  }

  return { chunks: chunks.length }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('\n🧠 OSQR Self-Indexer\n')
  console.log('Making OSQR aware of itself...\n')

  // Get workspace
  const workspace = await prisma.workspace.findFirst()
  if (!workspace) {
    console.error('❌ No workspace found. Run: npm run db:seed')
    process.exit(1)
  }

  console.log(`📂 Scanning: ${OSQR_ROOT}\n`)

  // Discover files
  const files = discoverFiles(OSQR_ROOT)

  // Sort by priority
  files.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  console.log(`📊 Found ${files.length} indexable files:\n`)

  const byCategory = files.reduce(
    (acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`   ${category}: ${count} files`)
  }

  const byPriority = files.reduce(
    (acc, f) => {
      acc[f.priority] = (acc[f.priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log('\n   Priority breakdown:')
  for (const [priority, count] of Object.entries(byPriority)) {
    console.log(`   ${priority}: ${count} files`)
  }

  console.log('\n📥 Indexing...\n')

  let indexed = 0
  let totalChunks = 0
  let failed = 0

  for (const file of files) {
    try {
      const content = extractContent(file)
      const result = await indexFile(file, workspace.id, content)

      const icon = file.priority === 'high' ? '⭐' : file.priority === 'medium' ? '📄' : '📝'
      console.log(`   ${icon} ${file.relativePath} (${result.chunks} chunks)`)

      indexed++
      totalChunks += result.chunks
    } catch (error) {
      console.log(`   ❌ ${file.relativePath}: ${error}`)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n🎉 OSQR Self-Indexing Complete!\n')
  console.log(`   ✅ Indexed: ${indexed} files`)
  console.log(`   📦 Total chunks: ${totalChunks}`)
  console.log(`   ❌ Failed: ${failed} files`)
  console.log('\n💡 OSQR is now self-aware. Try asking:')
  console.log('   - "What Jarvis capabilities are implemented?"')
  console.log('   - "Where is the TIL pattern detector defined?"')
  console.log('   - "What\'s in the ROADMAP for J-6?"')
  console.log('   - "How does auto-context assembly work?"\n')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
