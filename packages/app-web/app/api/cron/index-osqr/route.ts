import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { TextChunker } from '@/lib/knowledge/chunker'
import * as crypto from 'crypto'

/**
 * OSQR Self-Indexer Cron Endpoint
 *
 * Indexes OSQR's own codebase and documentation into the knowledge base.
 * Uses GitHub API to fetch files - works in production without local filesystem.
 *
 * Runs daily and only indexes new or changed files (based on content hash).
 *
 * Usage:
 * - Cron job: POST /api/cron/index-osqr with CRON_SECRET header
 * - Manual: POST /api/cron/index-osqr?force=true with CRON_SECRET header
 *
 * Environment:
 * - CRON_SECRET: Required for authentication
 * - GITHUB_TOKEN: Optional, increases rate limit from 60 to 5000 requests/hour
 * - OSQR_INDEX_TARGET_EMAIL: Target account (defaults to kablerecord@gmail.com)
 *
 * If computer/server is off:
 * - Cron job simply won't run during that time
 * - Next time it runs, it will index any new/changed files
 * - No data loss, just delayed indexing
 */

// Configuration
const TARGET_EMAIL = process.env.OSQR_INDEX_TARGET_EMAIL || 'kablerecord@gmail.com'
const GITHUB_REPO = 'kablerecord/oscar-app'
const GITHUB_BRANCH = 'main'

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
  /\.ico$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.woff/,
  /\.ttf$/,
  /\.eot$/,
  /\.map$/,
]

// File types to index - expanded to include more useful files
const INDEXABLE_EXTENSIONS = ['.md', '.ts', '.tsx', '.js', '.jsx', '.json', '.prisma', '.css', '.yaml', '.yml']

// Full paths to index from repo root - comprehensive coverage
const PATHS_TO_INDEX = [
  // Root documentation
  'CLAUDE.md',
  'README.md',
  'ARCHITECTURE.md',
  'ROADMAP.md',
  'turbo.json',
  'pnpm-workspace.yaml',

  // Root docs folder
  'docs',

  // packages/app-web - the main Next.js app (FULL coverage)
  'packages/app-web/app',           // All pages and API routes
  'packages/app-web/components',    // All React components
  'packages/app-web/lib',           // All business logic
  'packages/app-web/prisma',        // Database schema
  'packages/app-web/docs',          // App-specific docs
  'packages/app-web/README.md',
  'packages/app-web/package.json',
  'packages/app-web/tsconfig.json',
  'packages/app-web/next.config.ts',
  'packages/app-web/tailwind.config.ts',

  // packages/core - the OSQR brain/engine
  'packages/core/src',              // Core source code
  'packages/core/specs',            // Specifications
  'packages/core/README.md',
  'packages/core/package.json',

  // websites/marketing - the marketing site
  'websites/marketing/src',         // Marketing site source
  'websites/marketing/README.md',
  'websites/marketing/package.json',
]

interface GitHubFile {
  path: string
  type: 'file' | 'dir'
  sha: string
  url: string
  download_url: string | null
}

interface IndexableFile {
  path: string
  relativePath: string
  filename: string
  extension: string
  category: 'documentation' | 'core-lib' | 'api' | 'config' | 'schema'
  priority: 'high' | 'medium' | 'low'
  content: string
  sha: string
}

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath))
}

function getFileCategory(relativePath: string): IndexableFile['category'] {
  if (relativePath.endsWith('.md')) return 'documentation'
  if (relativePath.includes('/lib/')) return 'core-lib'
  if (relativePath.includes('/api/')) return 'api'
  if (relativePath.includes('prisma') || relativePath.endsWith('.prisma')) return 'schema'
  if (relativePath.includes('/components/')) return 'core-lib'
  if (relativePath.includes('/src/')) return 'core-lib'
  return 'config'
}

function getFilePriority(relativePath: string): IndexableFile['priority'] {
  const highPriorityPatterns = [
    /README\.md$/,
    /ARCHITECTURE\.md$/,
    /ROADMAP\.md$/,
    /CLAUDE\.md$/,
    /\/lib\/ai\//,
    /\/lib\/til\//,
    /\/api\/oscar\//,
    /schema\.prisma$/,
    /packages\/core\//,
    /\/specs\//,
    /docs\//,
  ]

  const mediumPriorityPatterns = [
    /\/lib\//,
    /\/components\//,
    /\/api\//,
    /\/src\//,
  ]

  if (highPriorityPatterns.some(p => p.test(relativePath))) {
    return 'high'
  }
  if (mediumPriorityPatterns.some(p => p.test(relativePath))) {
    return 'medium'
  }
  return 'low'
}

async function fetchGitHubContents(
  path: string,
  token?: string
): Promise<GitHubFile[]> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OSQR-Indexer',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`

  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 404) {
      return []
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  // Single file returns object, directory returns array
  return Array.isArray(data) ? data : [data]
}

async function fetchFileContent(downloadUrl: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': 'OSQR-Indexer',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(downloadUrl, { headers })

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`)
  }

  return response.text()
}

async function discoverFiles(
  basePath: string,
  token?: string
): Promise<IndexableFile[]> {
  const files: IndexableFile[] = []
  const contents = await fetchGitHubContents(basePath, token)

  for (const item of contents) {
    // Use the full GitHub path as the relative path (from repo root)
    const relativePath = item.path

    if (shouldIgnore(item.path) || shouldIgnore(relativePath)) {
      continue
    }

    if (item.type === 'dir') {
      // Recursively fetch directory contents
      const subFiles = await discoverFiles(item.path, token)
      files.push(...subFiles)
    } else if (item.type === 'file' && item.download_url) {
      const ext = '.' + item.path.split('.').pop()?.toLowerCase()

      if (INDEXABLE_EXTENSIONS.includes(ext)) {
        try {
          const content = await fetchFileContent(item.download_url, token)
          const filename = item.path.split('/').pop() || item.path

          files.push({
            path: item.path,
            relativePath,
            filename,
            extension: ext,
            category: getFileCategory(relativePath),
            priority: getFilePriority(relativePath),
            content,
            sha: item.sha,
          })
        } catch (err) {
          console.error(`Failed to fetch content for ${item.path}:`, err)
        }
      }
    }
  }

  return files
}

function formatContent(file: IndexableFile): string {
  if (file.extension === '.ts' || file.extension === '.tsx') {
    return `// File: ${file.relativePath}\n// Category: ${file.category}\n\n${file.content}`
  }

  if (file.extension === '.md') {
    return `<!-- Source: ${file.relativePath} -->\n\n${file.content}`
  }

  return file.content
}

function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

async function indexFile(
  file: IndexableFile,
  workspaceId: string,
  forceReindex: boolean
): Promise<{ action: 'created' | 'updated' | 'skipped'; chunks: number }> {
  const formattedContent = formatContent(file)
  const contentHash = computeContentHash(formattedContent)

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
    // Check if content changed by comparing hashes
    const existingHash = (existing.metadata as Record<string, unknown>)?.content_hash
    if (!forceReindex && existingHash === contentHash) {
      return { action: 'skipped', chunks: 0 }
    }

    // Update existing document
    await prisma.documentChunk.deleteMany({
      where: { documentId: existing.id },
    })

    await prisma.document.update({
      where: { id: existing.id },
      data: {
        textContent: formattedContent,
        metadata: {
          osqr_source_path: file.relativePath,
          content_hash: contentHash,
          github_sha: file.sha,
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
    const chunks = TextChunker.chunk(formattedContent, {
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

    return { action: 'updated', chunks: chunks.length }
  }

  // Create new document
  const document = await prisma.document.create({
    data: {
      workspaceId,
      title: `[OSQR] ${file.relativePath}`,
      sourceType: 'system',
      originalFilename: file.filename,
      mimeType: file.extension === '.md' ? 'text/markdown' : 'text/typescript',
      textContent: formattedContent,
      metadata: {
        osqr_source_path: file.relativePath,
        content_hash: contentHash,
        github_sha: file.sha,
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
  const chunks = TextChunker.chunk(formattedContent, {
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

  return { action: 'created', chunks: chunks.length }
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const forceReindex = searchParams.get('force') === 'true'

  try {
    // Get workspace for target account
    const workspace = await prisma.workspace.findFirst({
      where: { owner: { email: TARGET_EMAIL } },
    })

    if (!workspace) {
      return NextResponse.json(
        { error: `No workspace found for ${TARGET_EMAIL}` },
        { status: 404 }
      )
    }

    const githubToken = process.env.GITHUB_TOKEN

    console.log(`[OSQR Index] Starting GitHub-based indexing`)
    console.log(`[OSQR Index] Repo: ${GITHUB_REPO}, Branch: ${GITHUB_BRANCH}`)
    console.log(`[OSQR Index] Target: ${TARGET_EMAIL} (workspace: ${workspace.id})`)
    console.log(`[OSQR Index] Force reindex: ${forceReindex}`)
    console.log(`[OSQR Index] GitHub token: ${githubToken ? 'configured' : 'not configured (rate limited)'}`)

    const allFiles: IndexableFile[] = []

    // Index all configured paths from repo root
    for (const pathToIndex of PATHS_TO_INDEX) {
      try {
        const files = await discoverFiles(pathToIndex, githubToken)
        allFiles.push(...files)
        console.log(`[OSQR Index] Discovered ${files.length} files in ${pathToIndex}`)
      } catch (err) {
        console.log(`[OSQR Index] Skipping path ${pathToIndex}: ${err}`)
      }
    }

    // Sort by priority
    allFiles.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    console.log(`[OSQR Index] Found ${allFiles.length} indexable files`)

    const stats = {
      total: allFiles.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      totalChunks: 0,
    }

    // Index files
    for (const file of allFiles) {
      try {
        const result = await indexFile(file, workspace.id, forceReindex)

        if (result.action === 'created') {
          stats.created++
          stats.totalChunks += result.chunks
          console.log(`[OSQR Index] Created: ${file.relativePath}`)
        } else if (result.action === 'updated') {
          stats.updated++
          stats.totalChunks += result.chunks
          console.log(`[OSQR Index] Updated: ${file.relativePath}`)
        } else {
          stats.skipped++
        }
      } catch (error) {
        console.error(`[OSQR Index] Failed to index ${file.relativePath}:`, error)
        stats.failed++
      }
    }

    console.log(`[OSQR Index] Complete:`, stats)

    return NextResponse.json({
      success: true,
      target: TARGET_EMAIL,
      source: `github:${GITHUB_REPO}@${GITHUB_BRANCH}`,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[OSQR Index] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/index-osqr',
    description: 'OSQR Self-Indexer Cron Endpoint (GitHub-based)',
    source: `github:${GITHUB_REPO}@${GITHUB_BRANCH}`,
    methods: ['POST'],
    authentication: 'x-cron-secret header or Bearer token',
    parameters: {
      force: 'Set to "true" to force reindex all files regardless of content hash',
    },
    target: TARGET_EMAIL,
    note: 'Uses GitHub API - works even when your computer is off. If cron misses a run, next run will catch up.',
  })
}
