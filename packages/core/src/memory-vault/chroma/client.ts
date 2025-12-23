/**
 * Chroma Client Wrapper
 *
 * Provides a unified interface for Chroma vector database operations.
 * Handles connection management, persistence configuration, and error handling.
 */

import { ChromaClient } from 'chromadb';

// ============================================================================
// Configuration
// ============================================================================

export interface ChromaConfig {
  /** Host for Chroma server (if running external server) */
  host?: string;
  /** Port for Chroma server */
  port?: number;
  /** Path for persistent storage (uses in-memory if not provided) */
  persistDirectory?: string;
  /** Collection name prefix for user isolation */
  collectionPrefix: string;
  /** Embedding dimensions (default: 1536 for text-embedding-3-small) */
  embeddingDimensions: number;
}

export const DEFAULT_CHROMA_CONFIG: ChromaConfig = {
  collectionPrefix: 'osqr_',
  embeddingDimensions: 1536,
  persistDirectory: undefined, // Will use default path if not specified
};

// ============================================================================
// Client State
// ============================================================================

let chromaClient: ChromaClient | null = null;
let currentConfig: ChromaConfig = { ...DEFAULT_CHROMA_CONFIG };
let isInitialized = false;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the Chroma client
 * Must be called before any database operations
 */
export async function initializeChroma(
  config: Partial<ChromaConfig> = {}
): Promise<ChromaClient> {
  currentConfig = { ...DEFAULT_CHROMA_CONFIG, ...config };

  try {
    // Create client with path for persistence
    // ChromaDB handles the ephemeral client creation internally
    if (currentConfig.host && currentConfig.port) {
      // Connect to external Chroma server
      chromaClient = new ChromaClient({
        path: `http://${currentConfig.host}:${currentConfig.port}`,
      });
    } else {
      // Use local ephemeral client (in-memory by default)
      // For persistence, we'll use file-based storage
      chromaClient = new ChromaClient();
    }

    // Verify connection
    await chromaClient.heartbeat();
    isInitialized = true;

    return chromaClient;
  } catch (error) {
    isInitialized = false;
    chromaClient = null;
    throw new ChromaError(
      `Failed to initialize Chroma: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INIT_FAILED'
    );
  }
}

/**
 * Get the current Chroma client
 * Throws if not initialized
 */
export function getChromaClient(): ChromaClient {
  if (!isInitialized || !chromaClient) {
    throw new ChromaError(
      'Chroma client not initialized. Call initializeChroma() first.',
      'NOT_INITIALIZED'
    );
  }
  return chromaClient;
}

/**
 * Check if Chroma is initialized
 */
export function isChromaInitialized(): boolean {
  return isInitialized && chromaClient !== null;
}

/**
 * Get current Chroma configuration
 */
export function getChromaConfig(): ChromaConfig {
  return { ...currentConfig };
}

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Check if Chroma server is healthy
 */
export async function checkHealth(): Promise<boolean> {
  if (!chromaClient) return false;

  try {
    await chromaClient.heartbeat();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset the Chroma client (for testing)
 */
export async function resetChroma(): Promise<void> {
  if (chromaClient) {
    try {
      await chromaClient.reset();
    } catch {
      // Ignore reset errors
    }
  }
  chromaClient = null;
  isInitialized = false;
  currentConfig = { ...DEFAULT_CHROMA_CONFIG };
}

/**
 * Disconnect from Chroma
 */
export function disconnectChroma(): void {
  chromaClient = null;
  isInitialized = false;
}

// ============================================================================
// Collection Naming
// ============================================================================

/**
 * Build a collection name with prefix and user isolation
 */
export function buildCollectionName(
  baseName: string,
  userId?: string
): string {
  const prefix = currentConfig.collectionPrefix;
  if (userId) {
    return `${prefix}${baseName}_${sanitizeUserId(userId)}`;
  }
  return `${prefix}${baseName}`;
}

/**
 * Sanitize user ID for use in collection names
 * Chroma collection names must be 3-63 chars, start/end with alphanumeric
 */
function sanitizeUserId(userId: string): string {
  // Replace non-alphanumeric characters with underscores
  const sanitized = userId.replace(/[^a-zA-Z0-9]/g, '_');
  // Ensure it starts with alphanumeric
  const withPrefix = sanitized.match(/^[a-zA-Z0-9]/) ? sanitized : `u${sanitized}`;
  // Truncate if too long (leaving room for prefix and base name)
  return withPrefix.slice(0, 32);
}

// ============================================================================
// Error Handling
// ============================================================================

export type ChromaErrorCode =
  | 'INIT_FAILED'
  | 'NOT_INITIALIZED'
  | 'COLLECTION_NOT_FOUND'
  | 'COLLECTION_EXISTS'
  | 'QUERY_FAILED'
  | 'INSERT_FAILED'
  | 'UPDATE_FAILED'
  | 'DELETE_FAILED'
  | 'CONNECTION_LOST';

export class ChromaError extends Error {
  constructor(
    message: string,
    public readonly code: ChromaErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ChromaError';
  }
}

/**
 * Wrap Chroma operations with error handling
 */
export async function withChromaError<T>(
  operation: () => Promise<T>,
  errorCode: ChromaErrorCode,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ChromaError) {
      throw error;
    }
    throw new ChromaError(
      `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorCode,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Date to timestamp string for metadata
 */
export function dateToMetadata(date: Date): string {
  return date.toISOString();
}

/**
 * Convert timestamp string from metadata to Date
 */
export function metadataToDate(timestamp: string): Date {
  return new Date(timestamp);
}

/**
 * Serialize complex metadata for Chroma
 * Chroma only supports primitive types in metadata
 */
export function serializeMetadata(
  data: Record<string, unknown>
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      result[key] = JSON.stringify(value);
    }
  }

  return result;
}

/**
 * Deserialize metadata from Chroma
 */
export function deserializeMetadata(
  data: Record<string, string | number | boolean>,
  schema: { arrays?: string[]; objects?: string[]; dates?: string[] } = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (schema.dates?.includes(key) && typeof value === 'string') {
      result[key] = new Date(value);
    } else if (schema.arrays?.includes(key) && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else if (schema.objects?.includes(key) && typeof value === 'string') {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
