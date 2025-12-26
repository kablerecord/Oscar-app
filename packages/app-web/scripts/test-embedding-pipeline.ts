#!/usr/bin/env npx tsx
/**
 * Document Indexing Pipeline End-to-End Test
 *
 * Tests the full pipeline:
 * 1. Creates sample documents with known content
 * 2. Uploads via the indexing pipeline
 * 3. Verifies DocumentChunk rows with embeddings
 * 4. Runs semantic search and validates results
 * 5. Tests cross-document semantic search
 *
 * Usage: npx tsx packages/app-web/scripts/test-embedding-pipeline.ts
 */

import { PrismaClient } from '@prisma/client'
import { generateEmbedding, formatEmbeddingForPostgres } from '../lib/ai/embeddings'

const prisma = new PrismaClient()

// ============================================================================
// Sample Documents
// ============================================================================

const SAMPLE_DOC_1 = {
  title: 'test-quantum-computing-basics.md',
  content: `# Introduction to Quantum Computing

Quantum computing represents a fundamental shift in how we process information.
Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or "qubits"
that can exist in superposition - being both 0 and 1 simultaneously.

## Key Concepts

### Superposition
A qubit can be in multiple states at once until measured. This allows quantum computers
to explore many possibilities simultaneously.

### Entanglement
When qubits become entangled, the state of one qubit is correlated with another,
regardless of the distance between them. Einstein called this "spooky action at a distance."

### Quantum Gates
Like classical logic gates, quantum gates manipulate qubits. Common gates include:
- Hadamard gate (H): Creates superposition
- CNOT gate: Entangles two qubits
- Pauli gates (X, Y, Z): Rotate qubit states

## Applications
Quantum computing shows promise in:
- Cryptography and code-breaking
- Drug discovery and molecular simulation
- Optimization problems
- Machine learning acceleration
`,
}

const SAMPLE_DOC_2 = {
  title: 'test-machine-learning-fundamentals.md',
  content: `# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that enables systems to learn
and improve from experience without being explicitly programmed.

## Types of Machine Learning

### Supervised Learning
The algorithm learns from labeled training data, making predictions based on that data.
- Classification: Predicting categorical labels (spam/not spam)
- Regression: Predicting continuous values (house prices)

### Unsupervised Learning
The algorithm finds patterns in unlabeled data without predefined categories.
- Clustering: Grouping similar data points
- Dimensionality reduction: Reducing data complexity

### Reinforcement Learning
The algorithm learns by interacting with an environment and receiving rewards or penalties.
Used in robotics, game playing, and autonomous vehicles.

## Neural Networks
Inspired by biological neurons, artificial neural networks consist of:
- Input layer: Receives raw data
- Hidden layers: Process and transform data
- Output layer: Produces predictions

Deep learning uses many hidden layers to learn complex patterns.
Acceleration using GPUs and TPUs has made training large models practical.

## Key Considerations
- Feature engineering: Creating meaningful input variables
- Overfitting: When models memorize training data instead of generalizing
- Hyperparameter tuning: Optimizing model settings
`,
}

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
  details?: Record<string, unknown>
}

const results: TestResult[] = []

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string; details?: Record<string, unknown> }>
): Promise<void> {
  const start = Date.now()
  console.log(`\n🧪 Running: ${name}...`)

  try {
    const result = await testFn()
    const duration = Date.now() - start

    results.push({ name, ...result, duration })

    if (result.passed) {
      console.log(`   ✅ PASSED (${duration}ms): ${result.message}`)
    } else {
      console.log(`   ❌ FAILED (${duration}ms): ${result.message}`)
    }

    if (result.details) {
      console.log(`   📊 Details:`, JSON.stringify(result.details, null, 2))
    }
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : String(error)
    results.push({ name, passed: false, message: `Exception: ${message}`, duration })
    console.log(`   ❌ EXCEPTION (${duration}ms): ${message}`)
  }
}

// ============================================================================
// Setup & Cleanup
// ============================================================================

async function setupTestWorkspace(): Promise<string> {
  // First, try to find an existing workspace we can use
  let workspace = await prisma.workspace.findFirst({
    where: { name: 'Embedding Pipeline Test Workspace' },
  })

  if (workspace) {
    console.log(`   Using existing test workspace: ${workspace.id}`)
    return workspace.id
  }

  // Try to find any existing workspace to use
  const existingWorkspace = await prisma.workspace.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (existingWorkspace) {
    console.log(`   Using existing workspace: ${existingWorkspace.id} (${existingWorkspace.name})`)
    return existingWorkspace.id
  }

  // Need to create a test user first, then workspace
  console.log('   No existing workspace found, creating test user and workspace...')

  // Create test user
  let testUser = await prisma.user.findFirst({
    where: { email: 'test-embedding-pipeline@osqr.test' },
  })

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: 'test-embedding-pipeline@osqr.test',
        name: 'Embedding Pipeline Test User',
      },
    })
    console.log(`   Created test user: ${testUser.id}`)
  }

  // Create test workspace
  workspace = await prisma.workspace.create({
    data: {
      name: 'Embedding Pipeline Test Workspace',
      ownerId: testUser.id,
      tier: 'pro', // Need pro tier for document uploads
    },
  })
  console.log(`   Created test workspace: ${workspace.id}`)

  return workspace.id
}

async function cleanupTestDocuments(workspaceId: string): Promise<void> {
  // Delete test documents (cascade will delete chunks)
  const deleted = await prisma.document.deleteMany({
    where: {
      workspaceId,
      title: { startsWith: 'test-' },
    },
  })
  console.log(`   Cleaned up ${deleted.count} existing test documents`)
}

// ============================================================================
// Core Pipeline Functions (Direct DB operations for testing)
// ============================================================================

async function uploadDocumentDirect(
  workspaceId: string,
  title: string,
  content: string
): Promise<{ documentId: string; chunkCount: number }> {
  // Create or get project
  let project = await prisma.project.findFirst({
    where: { workspaceId, name: 'Test Uploads' },
  })

  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Test Uploads',
        description: 'Documents uploaded by embedding pipeline test',
      },
    })
  }

  // Create document
  const document = await prisma.document.create({
    data: {
      workspaceId,
      projectId: project.id,
      title,
      textContent: content,
      sourceType: 'test_upload',
      originalFilename: title,
      metadata: { testDocument: true },
    },
  })

  // Chunk the content (1000 chars, 100 overlap - same as production)
  const chunks = chunkText(content, 1000, 100)

  // Generate embeddings and store chunks
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
  }

  return { documentId: document.id, chunkCount: chunks.length }
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    let chunk = text.slice(start, end)

    // Try to break at sentence boundaries
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

    start += Math.max(chunk.length - overlap, 1)
    if (chunks.length > 100) break // Safety limit
  }

  return chunks
}

interface SearchResult {
  id: string
  content: string
  documentId: string
  documentTitle: string
  similarity: number
}

async function semanticSearch(
  workspaceId: string,
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query)
  const embeddingStr = formatEmbeddingForPostgres(queryEmbedding)

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      dc.id,
      dc.content,
      dc."documentId",
      d.title as "documentTitle",
      1 - (dc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE d."workspaceId" = ${workspaceId}
      AND dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  return results
}

// ============================================================================
// Tests
// ============================================================================

async function main() {
  console.log('=' .repeat(70))
  console.log('  DOCUMENT INDEXING PIPELINE - END-TO-END TEST')
  console.log('=' .repeat(70))
  console.log(`\n📅 Started: ${new Date().toISOString()}`)

  let workspaceId: string

  // Setup
  console.log('\n📦 SETUP')
  console.log('-'.repeat(70))

  try {
    workspaceId = await setupTestWorkspace()
    await cleanupTestDocuments(workspaceId)
  } catch (error) {
    console.error('❌ Setup failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  }

  // Test 1: Upload Document 1 and verify chunks created
  console.log('\n📋 TEST SUITE: Document Upload & Embedding')
  console.log('-'.repeat(70))

  let doc1Id: string = ''
  let doc1ChunkCount: number = 0

  await runTest('Upload Document 1 (Quantum Computing)', async () => {
    const result = await uploadDocumentDirect(workspaceId, SAMPLE_DOC_1.title, SAMPLE_DOC_1.content)
    doc1Id = result.documentId
    doc1ChunkCount = result.chunkCount

    return {
      passed: result.chunkCount > 0,
      message: `Created ${result.chunkCount} chunks for document`,
      details: { documentId: result.documentId, chunkCount: result.chunkCount },
    }
  })

  // Test 2: Verify embeddings exist
  await runTest('Verify Document 1 has embeddings', async () => {
    const chunks = await prisma.$queryRaw<{ total: number; with_embedding: number }[]>`
      SELECT
        COUNT(*)::int as total,
        COUNT(embedding)::int as with_embedding
      FROM "DocumentChunk"
      WHERE "documentId" = ${doc1Id}
    `

    const { total, with_embedding } = chunks[0]
    const allHaveEmbeddings = total > 0 && total === with_embedding

    return {
      passed: allHaveEmbeddings,
      message: allHaveEmbeddings
        ? `All ${total} chunks have embeddings`
        : `Only ${with_embedding}/${total} chunks have embeddings`,
      details: { total, with_embedding },
    }
  })

  // Test 3: Verify embedding dimensions
  await runTest('Verify embedding dimensions (1536-dim)', async () => {
    const result = await prisma.$queryRaw<{ dim: number }[]>`
      SELECT vector_dims(embedding) as dim
      FROM "DocumentChunk"
      WHERE "documentId" = ${doc1Id}
      LIMIT 1
    `

    const dim = result[0]?.dim

    return {
      passed: dim === 1536,
      message: dim === 1536
        ? `Embeddings are correct dimension (1536)`
        : `Unexpected embedding dimension: ${dim}`,
      details: { dimension: dim },
    }
  })

  // Test 4: Upload Document 2
  let doc2Id: string = ''

  await runTest('Upload Document 2 (Machine Learning)', async () => {
    const result = await uploadDocumentDirect(workspaceId, SAMPLE_DOC_2.title, SAMPLE_DOC_2.content)
    doc2Id = result.documentId

    return {
      passed: result.chunkCount > 0,
      message: `Created ${result.chunkCount} chunks for document`,
      details: { documentId: result.documentId, chunkCount: result.chunkCount },
    }
  })

  // Test 5: Semantic search within Document 1
  console.log('\n📋 TEST SUITE: Semantic Search')
  console.log('-'.repeat(70))

  await runTest('Semantic search: "What is superposition in quantum computing?"', async () => {
    const results = await semanticSearch(
      workspaceId,
      'What is superposition in quantum computing?',
      3
    )

    // Should find quantum computing content
    const foundQuantum = results.some(r =>
      r.documentTitle.includes('quantum') ||
      r.content.toLowerCase().includes('superposition')
    )

    return {
      passed: foundQuantum && results.length > 0,
      message: foundQuantum
        ? `Found relevant content (top match: ${Math.round(results[0]?.similarity * 100)}% similarity)`
        : 'Did not find quantum computing content',
      details: {
        topResults: results.slice(0, 2).map(r => ({
          title: r.documentTitle,
          similarity: Math.round(r.similarity * 100) + '%',
          preview: r.content.slice(0, 100) + '...',
        })),
      },
    }
  })

  // Test 6: Semantic search for ML content
  await runTest('Semantic search: "How do neural networks learn?"', async () => {
    const results = await semanticSearch(
      workspaceId,
      'How do neural networks learn?',
      3
    )

    // Should find ML content
    const foundML = results.some(r =>
      r.documentTitle.includes('machine-learning') ||
      r.content.toLowerCase().includes('neural')
    )

    return {
      passed: foundML && results.length > 0,
      message: foundML
        ? `Found relevant content (top match: ${Math.round(results[0]?.similarity * 100)}% similarity)`
        : 'Did not find machine learning content',
      details: {
        topResults: results.slice(0, 2).map(r => ({
          title: r.documentTitle,
          similarity: Math.round(r.similarity * 100) + '%',
          preview: r.content.slice(0, 100) + '...',
        })),
      },
    }
  })

  // Test 7: Cross-document semantic search
  console.log('\n📋 TEST SUITE: Cross-Document Search')
  console.log('-'.repeat(70))

  await runTest('Cross-document search: verify both documents are searchable', async () => {
    // Run two separate searches - one targeting each document's unique content
    // This verifies BOTH documents are properly indexed and searchable

    // Query 1: Should find quantum document (entanglement is unique to quantum doc)
    const quantumResults = await semanticSearch(
      workspaceId,
      'quantum entanglement between particles',
      3
    )

    // Query 2: Should find ML document (supervised learning is unique to ML doc)
    const mlResults = await semanticSearch(
      workspaceId,
      'supervised and unsupervised machine learning classification',
      3
    )

    const foundQuantum = quantumResults.some(r => r.documentTitle.includes('quantum'))
    const foundML = mlResults.some(r => r.documentTitle.includes('machine-learning'))
    const bothSearchable = foundQuantum && foundML

    return {
      passed: bothSearchable,
      message: bothSearchable
        ? `Both documents are searchable (quantum: ${Math.round(quantumResults[0]?.similarity * 100)}%, ML: ${Math.round(mlResults[0]?.similarity * 100)}%)`
        : `Missing document: quantum=${foundQuantum}, ML=${foundML}`,
      details: {
        quantumTopResult: quantumResults[0] ? {
          title: quantumResults[0].documentTitle,
          similarity: Math.round(quantumResults[0].similarity * 100) + '%',
        } : null,
        mlTopResult: mlResults[0] ? {
          title: mlResults[0].documentTitle,
          similarity: Math.round(mlResults[0].similarity * 100) + '%',
        } : null,
      },
    }
  })

  // Test 8: Verify semantic relevance (quantum query should rank quantum doc higher)
  await runTest('Semantic relevance: quantum query ranks quantum doc first', async () => {
    const results = await semanticSearch(
      workspaceId,
      'qubits and quantum entanglement',
      5
    )

    const topResult = results[0]
    const isQuantumFirst = topResult?.documentTitle.includes('quantum')

    return {
      passed: isQuantumFirst,
      message: isQuantumFirst
        ? `Correct: Quantum document ranked first (${Math.round(topResult.similarity * 100)}% similarity)`
        : `Incorrect: ${topResult?.documentTitle} ranked first instead of quantum doc`,
      details: {
        rankings: results.slice(0, 3).map((r, i) => ({
          rank: i + 1,
          title: r.documentTitle,
          similarity: Math.round(r.similarity * 100) + '%',
        })),
      },
    }
  })

  // Test 9: Database state verification
  console.log('\n📋 TEST SUITE: Database Verification')
  console.log('-'.repeat(70))

  await runTest('Final database state verification', async () => {
    const stats = await prisma.$queryRaw<{
      total_chunks: number
      chunks_with_embeddings: number
      unique_documents: number
    }[]>`
      SELECT
        COUNT(*)::int as total_chunks,
        COUNT(embedding)::int as chunks_with_embeddings,
        COUNT(DISTINCT "documentId")::int as unique_documents
      FROM "DocumentChunk"
      WHERE "documentId" IN (${doc1Id}, ${doc2Id})
    `

    const { total_chunks, chunks_with_embeddings, unique_documents } = stats[0]
    const allEmbedded = total_chunks === chunks_with_embeddings

    return {
      passed: allEmbedded && unique_documents === 2,
      message: allEmbedded
        ? `All ${total_chunks} chunks across ${unique_documents} documents have embeddings`
        : `Missing embeddings: ${chunks_with_embeddings}/${total_chunks}`,
      details: { total_chunks, chunks_with_embeddings, unique_documents },
    }
  })

  // Summary
  console.log('\n' + '='.repeat(70))
  console.log('  TEST SUMMARY')
  console.log('='.repeat(70))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

  console.log(`\n  Total Tests: ${results.length}`)
  console.log(`  ✅ Passed:   ${passed}`)
  console.log(`  ❌ Failed:   ${failed}`)
  console.log(`  ⏱️  Duration: ${(totalDuration / 1000).toFixed(2)}s`)

  if (failed > 0) {
    console.log('\n  Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - ${r.name}: ${r.message}`)
    })
  }

  console.log('\n' + '='.repeat(70))

  // Cleanup option
  console.log('\n💡 To clean up test data, run:')
  console.log(`   npx tsx -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.document.deleteMany({where:{title:{startsWith:'test-'}}}).then(r => console.log('Deleted', r.count, 'docs')).finally(() => p.\\$disconnect())"`)

  await prisma.$disconnect()

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  prisma.$disconnect()
  process.exit(1)
})
