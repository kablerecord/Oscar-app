/**
 * Bulk Upload OSQR Documentation Script
 *
 * Uploads all OSQR markdown documentation to Joe Kelly's demo account
 * for semantic search demonstration.
 *
 * Usage: npx tsx scripts/bulk-upload-osqr-docs.ts
 *
 * Requirements:
 * - DATABASE_URL environment variable set
 * - OPENAI_API_KEY environment variable set
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Joe Kelly's demo account email
const TARGET_EMAIL = 'joe@osqr-demo.com'

// OSQR documentation file paths (relative to project roots)
const OSCAR_APP_ROOT = '/Users/kablerecord/Desktop/oscar-app'
const OSQR_WEBSITE_ROOT = '/Users/kablerecord/Desktop/osqr-website'

// All OSQR documentation files to upload
const OSCAR_APP_DOCS = [
  'TESTING-CHECKLIST.md',
  'ARCHITECTURE.md',
  'AUTONOMOUS-GUIDELINES.md',
  'SETUP.md',
  'ASSUMPTIONS.md',
  'QUICKSTART.md',
  'PROGRESS.md',
  '.claude/commands/autonomous.md',
  'docs/TODO-ANALYTICS-REVIEW.md',
  'docs/plugins/FOURTH-GEN-PLUGIN-SPEC.md',
  'docs/plugins/PLUGIN-TONE-CONSTRAINTS.md',
  'docs/features/AI-FEATURES.md',
  'docs/features/USER_INTELLIGENCE_ARTIFACTS.md',
  'docs/features/SUPREME-COURT-BUTTON.md',
  'docs/features/MEDIA-VAULT.md',
  'docs/features/PERSONALIZED-GREETING.md',
  'docs/features/JARVIS_CAPABILITIES.md',
  'docs/features/COUNCIL-MODE.md',
  'docs/features/META_OSQR_MODE.md',
  'docs/features/BEHAVIORAL_INTELLIGENCE_LAYER.md',
  'docs/features/BUBBLE-COMPONENT-SPEC.md',
  'docs/features/QUEUE-SYSTEM.md',
  'docs/vision/VSCODE-DEV-COMPANION.md',
  'docs/vision/PRIVACY-PHONE.md',
  'docs/vision/CREATOR_MARKETPLACE.md',
  'docs/vision/AUTONOMOUS-APP-BUILDER.md',
  'docs/vision/CREATOR_MARKETPLACE_GTM.md',
  'docs/architecture/CORE-PLUGIN-SEPARATION.md',
  'docs/architecture/AGENT-ORCHESTRATION.md',
  'docs/architecture/PRIVACY_TIERS.md',
  'docs/architecture/OSQR-IDENTITY-SURFACES.md',
  'docs/architecture/PLUGIN_ARCHITECTURE.md',
  'docs/architecture/SELF-IMPROVEMENT-ARCHITECTURE.md',
  'docs/architecture/TELEMETRY_SPEC.md',
  'docs/architecture/MULTI-MODEL-ARCHITECTURE.md',
  'docs/architecture/KNOWLEDGE_ARCHITECTURE.md',
  'docs/architecture/SAFETY_SYSTEM.md',
  'docs/governance/OSQR_PHILOSOPHY.md',
  'docs/governance/OSQR_CONSTITUTION.md',
  'docs/governance/SEPARATION_PATTERN.md',
  'docs/governance/UX_PHILOSOPHY.md',
  'docs/reference/SYSTEM_INVENTORY.md',
  'docs/reference/MOBILE-TOLERANCE.md',
  'docs/reference/CLAUDE-TIMING-REFERENCE.md',
  'docs/strategy/DEVELOPMENT-PHILOSOPHY.md',
  'docs/strategy/TOTAL-MEMORY-ARCHITECTURE.md',
  'docs/strategy/ROBOTICS-VISION.md',
  'docs/strategy/PRICING-ARCHITECTURE.md',
  'docs/strategy/LAUNCH_STRATEGY.md',
  'docs/strategy/PODCAST_SEEDING_PLAYBOOK.md',
  'docs/strategy/TRUST-PRIVACY-MANIFESTO.md',
  'docs/strategy/X-PLATFORM-VISION.md',
  'README.md',
  'BLOCKED.md',
  'ROADMAP.md',
  'Documents/osqr_phased_rollout_strategy.md',
  'Documents/osqr_documentation_first_plugin_spec.md',
  'Documents/osqr_core_index.md',
  'Documents/osqr_voice_pack_plugin_spec.md',
  'PRIVACY-PHILOSOPHY.md',
  'KNOWLEDGE-BASE.md',
]

const OSQR_WEBSITE_DOCS = [
  'THINKING_LOOP.md',
  'MEMORY_AND_PREFERENCES.md',
  'SUPREME-COURT-MODE.md',
  'README.md',
  'ROADMAP.md',
  'TEMPORAL_INTELLIGENCE_LAYER.md',
]

// Generate SHA-256 hash of content for duplicate detection
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

// Chunk text for embedding (same logic as upload route)
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  const maxChunks = Math.ceil(text.length / (chunkSize - overlap)) + 10
  let iterations = 0

  while (start < text.length && iterations < maxChunks) {
    iterations++
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > chunkSize / 2) {
        chunk = chunk.slice(0, breakPoint + 1)
      }
    }

    const trimmedChunk = chunk.trim()
    if (trimmedChunk.length > 0) {
      chunks.push(trimmedChunk)
    }

    const advance = Math.max(chunk.length - overlap, 1)
    start += advance

    if (start <= iterations - 1) {
      start = end
    }
  }

  return chunks
}

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  })
  return response.data[0].embedding
}

// Format embedding for PostgreSQL pgvector
function formatEmbeddingForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

// Generate summary using GPT-4
async function generateSummary(content: string, filename: string): Promise<{ summary: string; questions: string[] }> {
  const truncated = content.slice(0, 15000)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant analyzing OSQR documentation. Be concise but insightful.'
        },
        {
          role: 'user',
          content: `Analyze this OSQR documentation file "${filename}" and provide:
1. A brief summary (2-3 sentences) of what this document covers
2. 3 questions someone could ask about this content

Document:
---
${truncated}
---

Respond in JSON format:
{
  "summary": "Your summary here",
  "suggestedQuestions": ["Q1?", "Q2?", "Q3?"]
}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')
    return {
      summary: parsed.summary || 'OSQR documentation file.',
      questions: parsed.suggestedQuestions || []
    }
  } catch (error) {
    console.warn(`  Warning: Could not generate summary for ${filename}`)
    return {
      summary: `OSQR documentation: ${filename}`,
      questions: []
    }
  }
}

// Main upload function
async function uploadDocument(
  workspaceId: string,
  projectId: string,
  filePath: string,
  source: 'oscar-app' | 'osqr-website'
): Promise<boolean> {
  const filename = path.basename(filePath)
  const relativePath = source === 'oscar-app'
    ? filePath.replace(OSCAR_APP_ROOT + '/', '')
    : filePath.replace(OSQR_WEBSITE_ROOT + '/', '')

  console.log(`\n  Processing: ${relativePath}`)

  // Read file content
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error(`    ERROR: Could not read file: ${error}`)
    return false
  }

  if (!content.trim()) {
    console.log(`    Skipping empty file`)
    return false
  }

  // Check for duplicate
  const contentHash = generateContentHash(content)
  const existing = await prisma.document.findFirst({
    where: { workspaceId, contentHash }
  })

  if (existing) {
    console.log(`    Already uploaded (duplicate content)`)
    return false
  }

  // Generate summary
  console.log(`    Analyzing with AI...`)
  const { summary, questions } = await generateSummary(content, relativePath)

  // Create document record
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  const charCount = content.length

  const document = await prisma.document.create({
    data: {
      workspaceId,
      projectId,
      title: `[${source}] ${relativePath}`,
      textContent: content,
      contentHash,
      sourceType: 'file_upload',
      originalFilename: filename,
      metadata: {
        source,
        relativePath,
        fileType: 'text/markdown',
        wordCount,
        charCount,
        summary,
        suggestedQuestions: questions,
      }
    }
  })

  // Chunk and embed
  const chunks = chunkText(content, 1000, 100)
  console.log(`    Embedding ${chunks.length} chunks...`)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)
    const embeddingStr = formatEmbeddingForPostgres(embedding)

    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" (id, "documentId", content, "chunkIndex", embedding, "createdAt")
      VALUES (
        gen_random_uuid(),
        ${document.id},
        ${chunk},
        ${i},
        ${embeddingStr}::vector,
        NOW()
      )
    `

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
      process.stdout.write(`\r    Embedded ${i + 1}/${chunks.length} chunks`)
    }
  }

  console.log(`\n    Done! (${wordCount} words, ${chunks.length} chunks)`)
  return true
}

async function main() {
  console.log('='.repeat(60))
  console.log('OSQR Documentation Bulk Upload Script')
  console.log('='.repeat(60))
  console.log(`Target account: ${TARGET_EMAIL}`)

  // Find user and workspace
  console.log('\n1. Looking up user account...')
  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: { workspaces: true }
  })

  if (!user) {
    console.error(`ERROR: User not found: ${TARGET_EMAIL}`)
    console.log('Please ensure the account exists in the database.')
    process.exit(1)
  }

  console.log(`   Found user: ${user.name || user.email} (${user.id})`)

  if (user.workspaces.length === 0) {
    console.error('ERROR: User has no workspaces')
    process.exit(1)
  }

  const workspace = user.workspaces[0]
  console.log(`   Workspace: ${workspace.name} (${workspace.id})`)
  console.log(`   Current tier: ${workspace.tier}`)

  // Upgrade to Master tier if not already
  if (workspace.tier !== 'master') {
    console.log('\n2. Upgrading to Master tier for 1500 document limit...')
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { tier: 'master' }
    })
    console.log('   Upgraded to Master tier!')
  } else {
    console.log('\n2. Already on Master tier (1500 document limit)')
  }

  // Create or get OSQR Documentation project
  console.log('\n3. Creating documentation project...')
  let project = await prisma.project.findFirst({
    where: {
      workspaceId: workspace.id,
      name: 'OSQR Documentation'
    }
  })

  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'OSQR Documentation',
        description: 'Complete OSQR documentation for semantic search demo'
      }
    })
    console.log(`   Created project: ${project.id}`)
  } else {
    console.log(`   Using existing project: ${project.id}`)
  }

  // Count existing documents
  const existingCount = await prisma.document.count({
    where: { workspaceId: workspace.id }
  })
  console.log(`   Existing documents in workspace: ${existingCount}`)

  // Upload oscar-app docs
  console.log('\n4. Uploading oscar-app documentation...')
  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const docPath of OSCAR_APP_DOCS) {
    const fullPath = path.join(OSCAR_APP_ROOT, docPath)
    if (!fs.existsSync(fullPath)) {
      console.log(`   Skipping (not found): ${docPath}`)
      skipped++
      continue
    }

    try {
      const success = await uploadDocument(workspace.id, project.id, fullPath, 'oscar-app')
      if (success) {
        uploaded++
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`   ERROR processing ${docPath}: ${error}`)
      failed++
    }

    // Rate limiting to avoid API throttling
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Upload osqr-website docs
  console.log('\n5. Uploading osqr-website documentation...')

  for (const docPath of OSQR_WEBSITE_DOCS) {
    const fullPath = path.join(OSQR_WEBSITE_ROOT, docPath)
    if (!fs.existsSync(fullPath)) {
      console.log(`   Skipping (not found): ${docPath}`)
      skipped++
      continue
    }

    try {
      const success = await uploadDocument(workspace.id, project.id, fullPath, 'osqr-website')
      if (success) {
        uploaded++
      } else {
        skipped++
      }
    } catch (error) {
      console.error(`   ERROR processing ${docPath}: ${error}`)
      failed++
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Final count
  const finalCount = await prisma.document.count({
    where: { workspaceId: workspace.id }
  })

  console.log('\n' + '='.repeat(60))
  console.log('Upload Complete!')
  console.log('='.repeat(60))
  console.log(`Documents uploaded:  ${uploaded}`)
  console.log(`Documents skipped:   ${skipped} (duplicates or not found)`)
  console.log(`Documents failed:    ${failed}`)
  console.log(`Total in workspace:  ${finalCount}`)
  console.log('')
  console.log(`Joe can now log in at https://app.osqr.app and ask OSQR`)
  console.log(`questions about itself using semantic search!`)
  console.log('='.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
