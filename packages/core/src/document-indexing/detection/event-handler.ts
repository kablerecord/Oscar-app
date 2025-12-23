/**
 * OSQR Document Indexing - Event Detection
 *
 * Handles document creation, modification, and deletion events from all interfaces.
 */

import { DocumentEvent, InterfaceType } from '../types';

// ============================================================================
// Event Handlers
// ============================================================================

export type DocumentEventHandler = (event: DocumentEvent) => Promise<void>;

const eventHandlers: DocumentEventHandler[] = [];

/**
 * Register a handler for document events
 */
export function onDocumentEvent(handler: DocumentEventHandler): () => void {
  eventHandlers.push(handler);
  return () => {
    const index = eventHandlers.indexOf(handler);
    if (index >= 0) {
      eventHandlers.splice(index, 1);
    }
  };
}

/**
 * Emit a document event to all registered handlers
 */
export async function emitDocumentEvent(event: DocumentEvent): Promise<void> {
  const results = await Promise.allSettled(
    eventHandlers.map((handler) => handler(event))
  );

  // Log any failures
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Document event handler ${index} failed:`, result.reason);
    }
  });
}

// ============================================================================
// Event Creation Helpers
// ============================================================================

/**
 * Create a document created event
 */
export function createDocumentCreatedEvent(
  documentPath: string,
  interfaceType: InterfaceType,
  options: {
    documentId?: string;
    conversationId?: string;
    projectId?: string;
  } = {}
): DocumentEvent {
  return {
    type: 'created',
    documentPath,
    interface: interfaceType,
    timestamp: new Date(),
    ...options,
  };
}

/**
 * Create a document modified event
 */
export function createDocumentModifiedEvent(
  documentPath: string,
  interfaceType: InterfaceType,
  options: {
    documentId?: string;
    conversationId?: string;
    projectId?: string;
  } = {}
): DocumentEvent {
  return {
    type: 'modified',
    documentPath,
    interface: interfaceType,
    timestamp: new Date(),
    ...options,
  };
}

/**
 * Create a document deleted event
 */
export function createDocumentDeletedEvent(
  documentPath: string,
  interfaceType: InterfaceType,
  documentId?: string
): DocumentEvent {
  return {
    type: 'deleted',
    documentPath,
    documentId,
    interface: interfaceType,
    timestamp: new Date(),
  };
}

// ============================================================================
// File Extension Detection
// ============================================================================

import { DocumentType } from '../types';

const EXTENSION_MAP: Record<string, DocumentType> = {
  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdx': 'markdown',

  // Plain text
  '.txt': 'plaintext',
  '.text': 'plaintext',

  // Code
  '.ts': 'code',
  '.tsx': 'code',
  '.js': 'code',
  '.jsx': 'code',
  '.py': 'code',
  '.rb': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.java': 'code',
  '.kt': 'code',
  '.swift': 'code',
  '.c': 'code',
  '.cpp': 'code',
  '.h': 'code',
  '.hpp': 'code',
  '.cs': 'code',
  '.php': 'code',
  '.sh': 'code',
  '.bash': 'code',
  '.zsh': 'code',
  '.sql': 'code',
  '.vue': 'code',
  '.svelte': 'code',

  // Data
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',

  // HTML
  '.html': 'html',
  '.htm': 'html',

  // Documents
  '.pdf': 'pdf',
  '.docx': 'docx',
};

/**
 * Detect document type from file path
 */
export function detectDocumentType(filePath: string): DocumentType | null {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext) return null;
  return EXTENSION_MAP[ext] || null;
}

/**
 * Check if a file type is supported
 */
export function isSupported(filePath: string): boolean {
  return detectDocumentType(filePath) !== null;
}

/**
 * Get the code language from file extension
 */
export function getCodeLanguage(filePath: string): string | null {
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext) return null;

  const LANG_MAP: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.rb': 'ruby',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.php': 'php',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'zsh',
    '.sql': 'sql',
    '.vue': 'vue',
    '.svelte': 'svelte',
  };

  return LANG_MAP[ext] || null;
}
