/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js at application startup.
 * It initializes OSQR adapters and observability systems.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize OSQR adapters
    const { initializeAdapters } = await import('@/lib/adapters')
    initializeAdapters()

    console.log('[OSQR] Instrumentation initialized')

    // Log environment configuration
    if (process.env.NODE_ENV === 'development') {
      console.log('[OSQR] Environment:', {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        nodeEnv: process.env.NODE_ENV,
      })
    }
  }
}
