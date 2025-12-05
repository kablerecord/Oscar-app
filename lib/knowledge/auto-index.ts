/**
 * Auto-Indexing Service
 *
 * This is Oscar's KEY DIFFERENTIATOR - automatically indexing everything.
 * Every conversation, profile answer, and artifact gets embedded and searchable.
 */

import { prisma } from '@/lib/db/prisma'
import { generateEmbedding, formatEmbeddingForPostgres } from '@/lib/ai/embeddings'
import { TextChunker } from './chunker'

/**
 * Index a conversation (both user message and Oscar's response)
 * Called after every Oscar response
 */
export async function indexConversation({
  workspaceId,
  threadId,
  userMessage,
  oscarResponse,
}: {
  workspaceId: string
  threadId: string
  userMessage: string
  oscarResponse: string
}): Promise<void> {
  try {
    // Create a combined document from the conversation
    const conversationText = `User: ${userMessage}\n\nOscar: ${oscarResponse}`
    const timestamp = new Date().toISOString().split('T')[0]

    // Create a document for this conversation
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        title: `Conversation: ${userMessage.slice(0, 50)}...`,
        sourceType: 'conversation',
        textContent: conversationText,
        metadata: {
          threadId,
          autoIndexed: true,
          indexedAt: new Date().toISOString(),
        },
      },
    })

    // Chunk the conversation (usually small enough to be 1-2 chunks)
    const chunks = TextChunker.chunk(conversationText, {
      maxChunkSize: 500,
      overlapSize: 50,
    })

    // Generate embeddings for each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk.content)
      const vectorString = formatEmbeddingForPostgres(embedding)

      // Insert chunk with embedding using raw SQL (Prisma doesn't support vector type directly)
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
      `, doc.id, chunk.content, vectorString, i)
    }

    console.log(`[Auto-Index] Indexed conversation: "${userMessage.slice(0, 30)}..." (${chunks.length} chunks)`)
  } catch (error) {
    // Don't throw - auto-indexing failures shouldn't break the main flow
    console.error('[Auto-Index] Failed to index conversation:', error)
  }
}

/**
 * Index a profile answer
 * Called when user answers a profile question
 */
export async function indexProfileAnswer({
  workspaceId,
  questionId,
  question,
  answer,
  category,
}: {
  workspaceId: string
  questionId: string
  question: string
  answer: string
  category: string
}): Promise<void> {
  try {
    const profileText = `Profile - ${category}\nQuestion: ${question}\nAnswer: ${answer}`

    // Create a document for this profile answer
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        title: `Profile: ${question.slice(0, 50)}`,
        sourceType: 'profile_answer',
        textContent: profileText,
        metadata: {
          questionId,
          category,
          autoIndexed: true,
          indexedAt: new Date().toISOString(),
        },
      },
    })

    // Profile answers are usually short, so single chunk
    const embedding = await generateEmbedding(profileText)
    const vectorString = formatEmbeddingForPostgres(embedding)

    await prisma.$executeRawUnsafe(`
      INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "chunkIndex", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        $1,
        $2,
        $3::vector,
        0,
        NOW()
      )
    `, doc.id, profileText, vectorString)

    console.log(`[Auto-Index] Indexed profile answer: "${question.slice(0, 30)}..."`)
  } catch (error) {
    console.error('[Auto-Index] Failed to index profile answer:', error)
  }
}

/**
 * Index an artifact (code, document, etc.)
 * Called when Oscar generates an artifact
 */
export async function indexArtifact({
  workspaceId,
  artifactId,
  title,
  content,
  type,
  description,
}: {
  workspaceId: string
  artifactId: string
  title: string
  content: string
  type: string
  description?: string
}): Promise<void> {
  try {
    const artifactText = `Artifact: ${title}\nType: ${type}${description ? `\nDescription: ${description}` : ''}\n\nContent:\n${content}`

    // Create a document for this artifact
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        title: `Artifact: ${title}`,
        sourceType: 'artifact',
        textContent: artifactText,
        metadata: {
          artifactId,
          artifactType: type,
          autoIndexed: true,
          indexedAt: new Date().toISOString(),
        },
      },
    })

    // Chunk larger artifacts
    const chunks = TextChunker.chunk(artifactText, {
      maxChunkSize: 500,
      overlapSize: 50,
    })

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await generateEmbedding(chunk.content)
      const vectorString = formatEmbeddingForPostgres(embedding)

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
      `, doc.id, chunk.content, vectorString, i)
    }

    console.log(`[Auto-Index] Indexed artifact: "${title}" (${chunks.length} chunks)`)
  } catch (error) {
    console.error('[Auto-Index] Failed to index artifact:', error)
  }
}

/**
 * Background indexing - runs indexing in background without blocking response
 */
export function indexInBackground(
  indexFn: () => Promise<void>
): void {
  // Fire and forget - don't await
  indexFn().catch((error) => {
    console.error('[Auto-Index Background] Error:', error)
  })
}
