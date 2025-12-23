import { claimNextTask, completeTask, failTask, type Task } from './queue'

/**
 * Task Executor (J-3 Implementation)
 *
 * Executes background tasks with proper error handling, timeouts, and progress tracking.
 */

export type TaskHandler = (task: Task, context: TaskContext) => Promise<Record<string, any> | void>

export interface TaskContext {
  updateProgress: (progress: number, message?: string) => void
  log: (message: string) => void
  checkCancelled: () => boolean
}

// Registry of task handlers
const taskHandlers = new Map<string, TaskHandler>()

/**
 * Register a handler for a task type
 */
export function registerTaskHandler(type: string, handler: TaskHandler): void {
  taskHandlers.set(type, handler)
}

/**
 * Execute a single task
 */
async function executeTask(task: Task): Promise<void> {
  const handler = taskHandlers.get(task.type)

  if (!handler) {
    await failTask(task.id, `No handler registered for task type: ${task.type}`)
    return
  }

  // Create task context
  let isCancelled = false
  const context: TaskContext = {
    updateProgress: (progress, message) => {
      console.log(`[Task ${task.id}] Progress: ${progress}%${message ? ` - ${message}` : ''}`)
      // Could update DB with progress here
    },
    log: (message) => {
      console.log(`[Task ${task.id}] ${message}`)
    },
    checkCancelled: () => isCancelled,
  }

  // Set up timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      isCancelled = true
      reject(new Error(`Task timed out after ${task.timeoutMs}ms`))
    }, task.timeoutMs)
  })

  try {
    // Race between task execution and timeout
    const result = await Promise.race([
      handler(task, context),
      timeoutPromise,
    ])

    await completeTask(task.id, result as Record<string, any> | undefined)
    console.log(`[Task ${task.id}] Completed successfully`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await failTask(task.id, errorMessage)
    console.error(`[Task ${task.id}] Failed:`, errorMessage)
  }
}

/**
 * Process pending tasks (single iteration)
 * Call this from a cron job or interval
 */
export async function processPendingTasks(maxTasks: number = 5): Promise<number> {
  let processed = 0

  for (let i = 0; i < maxTasks; i++) {
    const task = await claimNextTask()
    if (!task) break

    await executeTask(task)
    processed++
  }

  return processed
}

/**
 * Start continuous task processing
 * Returns a stop function
 */
export function startTaskProcessor(options: {
  pollIntervalMs?: number
  maxConcurrent?: number
} = {}): () => void {
  const { pollIntervalMs = 5000, maxConcurrent = 3 } = options

  let isRunning = true
  let activeCount = 0

  const poll = async () => {
    while (isRunning) {
      if (activeCount < maxConcurrent) {
        const task = await claimNextTask()
        if (task) {
          activeCount++
          executeTask(task).finally(() => activeCount--)
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }
  }

  // Start polling
  poll().catch(console.error)

  // Return stop function
  return () => {
    isRunning = false
  }
}

// ============================================
// Built-in Task Handlers
// ============================================

/**
 * Research task - OSQR researches a topic and summarizes findings
 */
registerTaskHandler('research', async (task, ctx) => {
  const { topic, depth = 'standard' } = task.payload

  ctx.log(`Starting research on: ${topic}`)
  ctx.updateProgress(10, 'Gathering sources')

  // Import OSQR for research
  const { OSQR } = await import('../ai/oscar')

  // Use OSQR in quick mode for initial research
  const researchPrompt = `Research the following topic thoroughly and provide a comprehensive summary:

Topic: ${topic}

Please include:
1. Key facts and concepts
2. Current state/trends
3. Important considerations
4. Recommended resources for further reading

Depth level: ${depth}`

  ctx.updateProgress(30, 'Consulting AI panel')

  // Note: This would need actual panel agents from the workspace
  // For now, we'll use a simplified approach
  const { ProviderRegistry } = await import('../ai/providers')

  const provider = ProviderRegistry.getProvider('anthropic', {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-5-sonnet-20241022',
  })

  ctx.updateProgress(50, 'Generating research summary')

  const result = await provider.generate({
    messages: [{ role: 'user', content: researchPrompt }],
  })

  ctx.updateProgress(100, 'Research complete')

  return {
    topic,
    summary: result,
    completedAt: new Date().toISOString(),
  }
})

/**
 * Summary update task - generates weekly/periodic summaries
 */
registerTaskHandler('summary-update', async (task, ctx) => {
  const { workspaceId, period = 'weekly' } = task.payload

  ctx.log(`Generating ${period} summary for workspace`)
  ctx.updateProgress(10, 'Gathering data')

  const { prisma } = await import('../db/prisma')

  // Get recent activity
  const periodDays = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 1
  const since = new Date()
  since.setDate(since.getDate() - periodDays)

  const [threads, mscItems, profileUpdates] = await Promise.all([
    prisma.chatThread.count({
      where: { workspaceId, createdAt: { gte: since } },
    }),
    prisma.mSCItem.findMany({
      where: { workspaceId, updatedAt: { gte: since } },
    }),
    prisma.profileAnswer.count({
      where: { workspaceId, updatedAt: { gte: since } },
    }),
  ])

  ctx.updateProgress(50, 'Compiling summary')

  const completedGoals = mscItems.filter(
    (i) => i.category === 'goal' && i.status === 'completed'
  ).length
  const activeProjects = mscItems.filter(
    (i) => i.category === 'project' && i.status === 'in_progress'
  ).length

  ctx.updateProgress(100, 'Summary complete')

  return {
    period,
    periodDays,
    conversations: threads,
    profileUpdates,
    completedGoals,
    activeProjects,
    totalMscChanges: mscItems.length,
    generatedAt: new Date().toISOString(),
  }
})

/**
 * Document processing task - processes and indexes uploaded documents
 */
registerTaskHandler('process-document', async (task, ctx) => {
  const { documentId, workspaceId } = task.payload

  ctx.log(`Processing document: ${documentId}`)
  ctx.updateProgress(10, 'Loading document')

  const { prisma } = await import('../db/prisma')

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document) {
    throw new Error('Document not found')
  }

  ctx.updateProgress(30, 'Chunking content')

  // Simple chunking (in production, use better chunking strategy)
  const chunks = chunkText(document.textContent, 1000, 100)

  ctx.updateProgress(50, 'Creating embeddings')

  // Create chunks in DB
  for (let i = 0; i < chunks.length; i++) {
    await prisma.documentChunk.create({
      data: {
        documentId,
        content: chunks[i],
        chunkIndex: i,
        // Embedding would be added here if vector search is enabled
      },
    })
    ctx.updateProgress(50 + (i / chunks.length) * 40, `Processing chunk ${i + 1}/${chunks.length}`)
  }

  ctx.updateProgress(100, 'Document processed')

  return {
    documentId,
    chunksCreated: chunks.length,
    processedAt: new Date().toISOString(),
  }
})

/**
 * Simple text chunking utility
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start = end - overlap
  }

  return chunks
}
