#!/usr/bin/env tsx

/**
 * Index Claude Conversations
 *
 * Claude exports conversations in a clean JSON format with:
 * - conversations.json: Array of conversation objects with chat_messages
 * - memories.json: Claude's memories about the user (also valuable context)
 * - projects.json: Project-specific conversations
 *
 * This script parses each conversation and indexes them with embeddings.
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import * as fs from 'fs/promises'
import * as path from 'path'
import { TextChunker } from '../lib/knowledge/chunker'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const EMBEDDING_BATCH_SIZE = 20

interface ClaudeMessage {
  uuid: string
  text: string
  content: Array<{
    start_timestamp?: string
    stop_timestamp?: string
    type: string
    text?: string
  }>
  sender: 'human' | 'assistant'
  created_at?: string
  updated_at?: string
  attachments?: Array<{
    file_name: string
    file_type: string
    file_size: number
    extracted_content?: string
  }>
}

interface ClaudeConversation {
  uuid: string
  name: string
  summary?: string
  created_at: string
  updated_at: string
  account?: { uuid: string }
  chat_messages: ClaudeMessage[]
}

interface ClaudeMemory {
  uuid: string
  title: string
  content: string
  created_at: string
  updated_at: string
  source?: string
}

function sanitizeForJson(content: string): string {
  // Replace only LONE surrogates, not valid pairs
  let result = ''
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i)
    // High surrogate
    if (code >= 0xD800 && code <= 0xDBFF) {
      const nextCode = content.charCodeAt(i + 1)
      // Check if followed by a valid low surrogate
      if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
        // Valid pair - keep both
        result += content[i] + content[i + 1]
        i++ // Skip the low surrogate in next iteration
      } else {
        // Orphan high surrogate - replace with replacement character
        result += '\uFFFD'
      }
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      // Orphan low surrogate - replace
      result += '\uFFFD'
    } else {
      result += content[i]
    }
  }
  return result
}

function extractConversationText(conv: ClaudeConversation): string {
  const lines: string[] = []
  lines.push(`# ${conv.name}`)
  if (conv.summary) {
    lines.push(`\n**Summary:** ${conv.summary}`)
  }
  lines.push(`Created: ${conv.created_at}`)
  lines.push('')

  // Process messages in order
  for (const msg of conv.chat_messages) {
    const roleLabel = msg.sender === 'human' ? 'User' : 'Claude'
    lines.push(`**${roleLabel}:**`)

    // Get text from either the text field or content array
    let text = msg.text
    if (!text && msg.content) {
      text = msg.content
        .filter(c => c.type === 'text' && c.text)
        .map(c => c.text)
        .join('\n')
    }

    if (text) {
      lines.push(sanitizeForJson(text))
    }

    // Include attachment info if present
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        lines.push(`[Attachment: ${att.file_name} (${att.file_type})]`)
        if (att.extracted_content) {
          lines.push(sanitizeForJson(att.extracted_content.slice(0, 2000)))
        }
      }
    }

    lines.push('')
  }

  return lines.join('\n')
}

function extractMemoryText(memory: ClaudeMemory): string {
  const lines: string[] = []
  lines.push(`# Claude Memory: ${memory.title}`)
  lines.push(`Created: ${memory.created_at}`)
  if (memory.source) {
    lines.push(`Source: ${memory.source}`)
  }
  lines.push('')
  lines.push(sanitizeForJson(memory.content))
  return lines.join('\n')
}

async function main() {
  const exportDir = process.argv[2] || '/Users/kablerecord/Desktop/Personal Brand/ai models/export data/Claude/Claude Data Dec 26 2025'

  console.log('\n🤖 Claude Conversations Indexer\n')
  console.log(`📂 Export directory: ${exportDir}\n`)

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set')
    process.exit(1)
  }

  // Get workspace for target account
  const TARGET_EMAIL = 'kablerecord@gmail.com'
  const workspace = await prisma.workspace.findFirst({
    where: { owner: { email: TARGET_EMAIL } }
  })
  if (!workspace) {
    console.error(`No workspace found for ${TARGET_EMAIL}. Run: npx prisma db seed`)
    process.exit(1)
  }

  console.log(`Target account: ${TARGET_EMAIL}`)
  console.log(`Workspace: ${workspace.name}\n`)

  let totalIndexed = 0
  let totalSkipped = 0
  let totalFailed = 0
  let totalChunks = 0
  const startTime = Date.now()

  // Index conversations
  const conversationsPath = path.join(exportDir, 'conversations.json')
  try {
    console.log('Reading conversations.json...')
    const content = await fs.readFile(conversationsPath, 'utf-8')
    const conversations: ClaudeConversation[] = JSON.parse(content)
    console.log(`Found ${conversations.length} conversations\n`)

    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i]
      const title = conv.name || `Conversation ${i + 1}`

      process.stdout.write(`   [${i + 1}/${conversations.length}] ${title.slice(0, 50)}... `)

      try {
        // Check if already indexed
        const uniqueId = `claude_${conv.uuid}`
        const existing = await prisma.document.findFirst({
          where: {
            workspaceId: workspace.id,
            metadata: {
              path: ['claudeId'],
              equals: uniqueId
            }
          }
        })

        if (existing) {
          console.log('already indexed')
          totalSkipped++
          continue
        }

        // Extract text
        const text = extractConversationText(conv)

        if (text.length < 50) {
          console.log('skipped (no content)')
          totalSkipped++
          continue
        }

        // Create document
        const document = await prisma.document.create({
          data: {
            workspaceId: workspace.id,
            title: `Claude: ${title}`,
            sourceType: 'claude',
            originalFilename: `claude_${title.slice(0, 50)}.txt`,
            mimeType: 'text/plain',
            textContent: text.slice(0, 100000),
            metadata: {
              claudeId: uniqueId,
              originalTitle: title,
              summary: conv.summary || null,
              createdAt: conv.created_at,
              updatedAt: conv.updated_at,
              source: 'claude_export'
            }
          }
        })

        // Chunk the text
        const chunks = TextChunker.chunk(text, {
          maxChunkSize: 1000,
          overlapSize: 200
        })

        totalChunks += chunks.length

        // Generate embeddings in batches
        for (let j = 0; j < chunks.length; j += EMBEDDING_BATCH_SIZE) {
          const batch = chunks.slice(j, j + EMBEDDING_BATCH_SIZE)
          const texts = batch.map(c => c.content)

          const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: texts
          })

          // Store chunks with embeddings
          for (let k = 0; k < batch.length; k++) {
            const chunk = batch[k]
            const embedding = response.data[k].embedding
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
          }

          // Small delay between batches
          if (j + EMBEDDING_BATCH_SIZE < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        console.log(`${chunks.length} chunks`)
        totalIndexed++

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(`ERROR: ${msg.slice(0, 60)}`)
        totalFailed++
      }
    }
  } catch (error) {
    console.log('conversations.json not found or invalid, skipping')
  }

  // Index memories (valuable context about user)
  const memoriesPath = path.join(exportDir, 'memories.json')
  try {
    console.log('\nReading memories.json...')
    const content = await fs.readFile(memoriesPath, 'utf-8')
    const memories: ClaudeMemory[] = JSON.parse(content)
    console.log(`Found ${memories.length} memories\n`)

    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i]
      const title = memory.title || `Memory ${i + 1}`

      process.stdout.write(`   [${i + 1}/${memories.length}] ${title.slice(0, 50)}... `)

      try {
        // Check if already indexed
        const uniqueId = `claude_memory_${memory.uuid}`
        const existing = await prisma.document.findFirst({
          where: {
            workspaceId: workspace.id,
            metadata: {
              path: ['claudeId'],
              equals: uniqueId
            }
          }
        })

        if (existing) {
          console.log('already indexed')
          totalSkipped++
          continue
        }

        // Extract text
        const text = extractMemoryText(memory)

        if (text.length < 20) {
          console.log('skipped (no content)')
          totalSkipped++
          continue
        }

        // Create document
        const document = await prisma.document.create({
          data: {
            workspaceId: workspace.id,
            title: `Claude Memory: ${title}`,
            sourceType: 'claude',
            originalFilename: `claude_memory_${title.slice(0, 50)}.txt`,
            mimeType: 'text/plain',
            textContent: text,
            metadata: {
              claudeId: uniqueId,
              originalTitle: title,
              type: 'memory',
              createdAt: memory.created_at,
              updatedAt: memory.updated_at,
              source: 'claude_export'
            }
          }
        })

        // Chunk the text
        const chunks = TextChunker.chunk(text, {
          maxChunkSize: 1000,
          overlapSize: 200
        })

        totalChunks += chunks.length

        // Generate embeddings
        for (let j = 0; j < chunks.length; j += EMBEDDING_BATCH_SIZE) {
          const batch = chunks.slice(j, j + EMBEDDING_BATCH_SIZE)
          const texts = batch.map(c => c.content)

          const response = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: texts
          })

          for (let k = 0; k < batch.length; k++) {
            const chunk = batch[k]
            const embedding = response.data[k].embedding
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
          }

          if (j + EMBEDDING_BATCH_SIZE < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        console.log(`${chunks.length} chunks`)
        totalIndexed++

      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(`ERROR: ${msg.slice(0, 60)}`)
        totalFailed++
      }
    }
  } catch (error) {
    console.log('memories.json not found or invalid, skipping')
  }

  const elapsed = (Date.now() - startTime) / 1000

  console.log(`\nIndexing complete!`)
  console.log(`   Documents indexed: ${totalIndexed}`)
  console.log(`   Total chunks: ${totalChunks}`)
  console.log(`   Skipped: ${totalSkipped}`)
  console.log(`   Failed: ${totalFailed}`)
  console.log(`   Time: ${elapsed.toFixed(1)}s\n`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
