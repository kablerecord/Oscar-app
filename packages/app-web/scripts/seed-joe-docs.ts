/**
 * Seed EVERYTHING from oscar-app and osqr-website into Joe Kelly's workspace
 * Run with: npx tsx scripts/seed-joe-docs.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Joe's workspace ID
const WORKSPACE_ID = 'cmjagq8yv0002rihq2675m3ba'

// Directories to scan
const SCAN_DIRS = [
  '/Users/kablerecord/Desktop/oscar-app',
  '/Users/kablerecord/Desktop/osqr-website',
]

// File extensions to include
const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.prisma', '.css', '.html', '.yaml', '.yml', '.docx', '.txt']

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  '.vercel',
  '.turbo',
  'coverage',
  '__pycache__',
  '.cache',
]

// Files to skip
const SKIP_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  '.env',
  '.env.local',
  '.env.production',
]

// Simple text extraction for text files
function extractTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

// Basic DOCX text extraction
function extractDocxText(filePath: string): string {
  try {
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(filePath)
    const documentXml = zip.readAsText('word/document.xml')
    const textMatches = documentXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
    return textMatches.map((match: string) => match.replace(/<[^>]+>/g, '')).join(' ')
  } catch (error) {
    console.error(`Error extracting DOCX: ${filePath}`, error)
    return ''
  }
}

// Extract text based on file type
function extractText(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.docx') {
    return extractDocxText(filePath)
  }

  // All other text-based files
  try {
    return extractTextFile(filePath)
  } catch (error) {
    return ''
  }
}

// Create content hash for deduplication
function createHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

// Chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  const chunks: string[] = []
  const lines = text.split('\n')
  let currentChunk = ''

  for (const line of lines) {
    if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }
    currentChunk += line + '\n'
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

// Recursively find all files
function findFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.includes(entry.name)) {
        findFiles(fullPath, files)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (INCLUDE_EXTENSIONS.includes(ext) && !SKIP_FILES.includes(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

// Determine source type from path
function getSourceType(filePath: string): string {
  if (filePath.includes('osqr-website')) return 'osqr-website'
  if (filePath.includes('/docs/architecture/')) return 'osqr-architecture'
  if (filePath.includes('/docs/features/')) return 'osqr-features'
  if (filePath.includes('/docs/governance/')) return 'osqr-governance'
  if (filePath.includes('/docs/strategy/')) return 'osqr-strategy'
  if (filePath.includes('/docs/vision/')) return 'osqr-vision'
  if (filePath.includes('/docs/plugins/')) return 'osqr-plugins'
  if (filePath.includes('/docs/reference/')) return 'osqr-reference'
  if (filePath.includes('/lib/ai/')) return 'osqr-ai-core'
  if (filePath.includes('/lib/knowledge/')) return 'osqr-knowledge'
  if (filePath.includes('/lib/')) return 'osqr-lib'
  if (filePath.includes('/app/api/')) return 'osqr-api'
  if (filePath.includes('/app/')) return 'osqr-app'
  if (filePath.includes('/components/')) return 'osqr-components'
  if (filePath.includes('/Documents/')) return 'osqr-documentation'
  if (filePath.includes('/prisma/')) return 'osqr-database'
  return 'osqr-misc'
}

// Get mime type
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.prisma': 'text/plain',
    '.css': 'text/css',
    '.html': 'text/html',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  }
  return mimeTypes[ext] || 'text/plain'
}

async function main() {
  console.log('🚀 Starting FULL project upload for Joe Kelly...\n')

  // Verify workspace exists
  const workspace = await prisma.workspace.findUnique({
    where: { id: WORKSPACE_ID }
  })

  if (!workspace) {
    console.error('❌ Workspace not found!')
    return
  }

  console.log(`✅ Found workspace: ${workspace.name}\n`)

  // Find all files
  console.log('📂 Scanning directories...')
  let allFiles: string[] = []
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) {
      const files = findFiles(dir)
      allFiles = allFiles.concat(files)
      console.log(`   Found ${files.length} files in ${path.basename(dir)}`)
    }
  }
  console.log(`\n📊 Total files to process: ${allFiles.length}\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (let i = 0; i < allFiles.length; i++) {
    const filePath = allFiles[i]
    const filename = path.basename(filePath)
    const relativePath = filePath.replace('/Users/kablerecord/Desktop/', '')

    // Progress indicator
    if ((i + 1) % 50 === 0) {
      console.log(`\n📈 Progress: ${i + 1}/${allFiles.length} files processed...\n`)
    }

    try {
      // Extract text
      const textContent = extractText(filePath)

      if (!textContent || textContent.length < 20) {
        skipCount++
        continue
      }

      // Create hash
      const contentHash = createHash(textContent)

      // Check for duplicates
      const existing = await prisma.document.findFirst({
        where: {
          workspaceId: WORKSPACE_ID,
          contentHash: contentHash
        }
      })

      if (existing) {
        skipCount++
        continue
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          workspaceId: WORKSPACE_ID,
          title: relativePath,
          sourceType: getSourceType(filePath),
          originalFilename: filename,
          mimeType: getMimeType(filePath),
          textContent,
          contentHash,
          metadata: {
            originalPath: filePath,
            relativePath,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'seed-script-full'
          }
        }
      })

      // Create chunks
      const chunks = chunkText(textContent)

      if (chunks.length > 0) {
        await prisma.documentChunk.createMany({
          data: chunks.map((content, index) => ({
            documentId: document.id,
            content,
            chunkIndex: index
          }))
        })
      }

      console.log(`✅ ${relativePath} (${chunks.length} chunks)`)
      successCount++

    } catch (error: any) {
      if (!error.message?.includes('Unique constraint')) {
        console.error(`❌ ${filename}:`, error.message)
      }
      errorCount++
    }
  }

  console.log('\n========================================')
  console.log('📊 Upload Summary:')
  console.log(`   ✅ Uploaded: ${successCount}`)
  console.log(`   ⏭️  Skipped: ${skipCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('========================================\n')

  // Count totals
  const totalDocs = await prisma.document.count({
    where: { workspaceId: WORKSPACE_ID }
  })

  const totalChunks = await prisma.documentChunk.count({
    where: { document: { workspaceId: WORKSPACE_ID } }
  })

  console.log(`📚 Joe's Vault now has: ${totalDocs} documents, ${totalChunks} chunks`)
  console.log('\n🎉 Done! Joe can now ask OSQR anything about itself.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
