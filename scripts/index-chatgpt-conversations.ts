#!/usr/bin/env tsx

/**
 * Index ChatGPT Conversations
 *
 * ChatGPT exports conversations in a specific JSON format that's too large
 * to index as a single document. This script parses each conversation and
 * indexes them separately with proper embeddings.
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import * as fs from 'fs/promises'
import { TextChunker } from '../lib/knowledge/chunker'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'
const EMBEDDING_BATCH_SIZE = 20

interface ChatGPTMessage {
  id: string
  message?: {
    id: string
    author: { role: string }
    content?: { parts?: string[] }
    create_time?: number
  }
  parent?: string
  children?: string[]
}

interface ChatGPTConversation {
  title: string
  create_time: number
  update_time: number
  mapping: Record<string, ChatGPTMessage>
}

async function extractConversationText(conv: ChatGPTConversation): Promise<string> {
  const lines: string[] = []
  lines.push(`# ${conv.title}`)
  lines.push(`Created: ${new Date(conv.create_time * 1000).toISOString()}`)
  lines.push('')

  // Build message order from mapping
  const messages: Array<{ role: string; content: string; time?: number }> = []

  for (const [id, node] of Object.entries(conv.mapping)) {
    if (node.message?.content?.parts) {
      const content = node.message.content.parts.join('\n').trim()
      if (content) {
        messages.push({
          role: node.message.author.role,
          content,
          time: node.message.create_time
        })
      }
    }
  }

  // Sort by time if available
  messages.sort((a, b) => (a.time || 0) - (b.time || 0))

  for (const msg of messages) {
    const roleLabel = msg.role === 'user' ? 'User' :
                      msg.role === 'assistant' ? 'ChatGPT' :
                      msg.role
    lines.push(`**${roleLabel}:**`)
    lines.push(msg.content)
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const filePath = process.argv[2] || '/Users/kablerecord/Desktop/personal brand/AI GPT/Export data/Chatgpt/Chat gpt data 12_1_25/conversations.json'

  console.log('\n🤖 ChatGPT Conversations Indexer\n')
  console.log(`📂 File: ${filePath}\n`)

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set')
    process.exit(1)
  }

  // Get workspace
  const workspace = await prisma.workspace.findFirst()
  if (!workspace) {
    console.error('❌ No workspace found. Run: npx prisma db seed')
    process.exit(1)
  }

  console.log(`📦 Workspace: ${workspace.name}\n`)

  // Read and parse file
  console.log('📖 Reading conversations file...')
  const content = await fs.readFile(filePath, 'utf-8')
  const conversations: ChatGPTConversation[] = JSON.parse(content)

  console.log(`✅ Found ${conversations.length} conversations\n`)

  let indexed = 0
  let skipped = 0
  let failed = 0
  let totalChunks = 0
  const startTime = Date.now()

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]
    const title = conv.title || `Conversation ${i + 1}`

    process.stdout.write(`   [${i + 1}/${conversations.length}] ${title.slice(0, 50)}... `)

    try {
      // Check if already indexed by title + timestamp
      const uniqueId = `chatgpt_${conv.create_time}_${title.slice(0, 50)}`
      const existing = await prisma.document.findFirst({
        where: {
          workspaceId: workspace.id,
          metadata: {
            path: ['chatgptId'],
            equals: uniqueId
          }
        }
      })

      if (existing) {
        console.log('⏭️ already indexed')
        skipped++
        continue
      }

      // Extract text
      const text = await extractConversationText(conv)

      if (text.length < 50) {
        console.log('⚠️ skipped (no content)')
        skipped++
        continue
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          workspaceId: workspace.id,
          title: `ChatGPT: ${title}`,
          sourceType: 'chatgpt',
          originalFilename: `chatgpt_${title.slice(0, 50)}.txt`,
          mimeType: 'text/plain',
          textContent: text.slice(0, 100000), // Limit stored text
          metadata: {
            chatgptId: uniqueId,
            originalTitle: title,
            createTime: conv.create_time,
            updateTime: conv.update_time,
            source: 'chatgpt_export'
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

      console.log(`✅ ${chunks.length} chunks`)
      indexed++

    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`❌ ${msg.slice(0, 50)}`)
      failed++
    }
  }

  const elapsed = (Date.now() - startTime) / 1000

  console.log(`\n🎉 Indexing complete!`)
  console.log(`   📄 Conversations indexed: ${indexed}`)
  console.log(`   📦 Total chunks: ${totalChunks}`)
  console.log(`   ⏭️ Skipped: ${skipped}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   ⏱️  Time: ${elapsed.toFixed(1)}s\n`)

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
