/**
 * OSQR Document Indexing - Semantic Chunking
 *
 * Chunks documents at semantic boundaries rather than fixed sizes.
 */

import {
  ExtractedContent,
  DocumentChunk,
  ChunkPosition,
  ChunkMetadata,
  DocumentIndexingConfig,
  DEFAULT_INDEXING_CONFIG,
} from '../types';

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate token count for text (rough approximation)
 * ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Chunking Strategies
// ============================================================================

/**
 * Chunk document by sections (when document has headings)
 */
export function chunkBySections(
  content: ExtractedContent,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] {
  const chunks: Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] = [];
  const { sections } = content.structure;

  let order = 0;
  for (const section of sections) {
    const tokens = estimateTokens(section.content);

    if (tokens <= config.maxChunkTokens) {
      // Section fits in one chunk
      chunks.push({
        content: section.content,
        position: {
          startLine: section.startLine,
          endLine: section.endLine,
          section: section.heading?.text || null,
          order: order++,
        },
        metadata: buildChunkMetadata(section.content, section.heading?.text),
      });
    } else {
      // Section too large, split by paragraphs
      const subChunks = chunkByParagraphs(
        { ...content, text: section.content },
        config,
        section.startLine,
        section.heading?.text || null,
        order
      );
      chunks.push(...subChunks);
      order += subChunks.length;
    }
  }

  return chunks;
}

/**
 * Chunk document by code blocks (when document has code)
 */
export function chunkByCodeBlocks(
  content: ExtractedContent,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] {
  const chunks: Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] = [];
  const { codeBlocks } = content;
  const lines = content.text.split('\n');

  let currentLine = 1;
  let order = 0;

  for (const codeBlock of codeBlocks) {
    // Add prose before code block
    if (currentLine < codeBlock.startLine) {
      const proseContent = lines.slice(currentLine - 1, codeBlock.startLine - 1).join('\n').trim();
      if (proseContent.length > 0 && estimateTokens(proseContent) >= config.minChunkTokens) {
        const proseChunks = chunkByParagraphs(
          { ...content, text: proseContent },
          config,
          currentLine,
          null,
          order
        );
        chunks.push(...proseChunks);
        order += proseChunks.length;
      }
    }

    // Add code block as chunk
    if (estimateTokens(codeBlock.content) >= config.minChunkTokens) {
      chunks.push({
        content: codeBlock.content,
        position: {
          startLine: codeBlock.startLine,
          endLine: codeBlock.endLine,
          section: null,
          order: order++,
        },
        metadata: {
          headingContext: [],
          codeLanguage: codeBlock.language,
          isDecision: false,
          isQuestion: false,
          isAction: false,
          tokenCount: estimateTokens(codeBlock.content),
        },
      });
    }

    currentLine = codeBlock.endLine + 1;
  }

  // Add remaining prose after last code block
  if (currentLine <= lines.length) {
    const proseContent = lines.slice(currentLine - 1).join('\n').trim();
    if (proseContent.length > 0 && estimateTokens(proseContent) >= config.minChunkTokens) {
      const proseChunks = chunkByParagraphs(
        { ...content, text: proseContent },
        config,
        currentLine,
        null,
        order
      );
      chunks.push(...proseChunks);
    }
  }

  return chunks;
}

/**
 * Chunk document by paragraphs with overlap
 */
export function chunkByParagraphs(
  content: ExtractedContent,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG,
  startLine = 1,
  sectionHeading: string | null = null,
  startOrder = 0
): Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] {
  const chunks: Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] = [];
  const paragraphs = content.text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkStartLine = startLine;
  let currentLine = startLine;
  let order = startOrder;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    const paragraphLines = paragraph.split('\n').length;

    if (currentTokens + paragraphTokens > config.maxChunkTokens && currentChunk.length > 0) {
      // Save current chunk
      const chunkContent = currentChunk.join('\n\n');
      chunks.push({
        content: chunkContent,
        position: {
          startLine: chunkStartLine,
          endLine: currentLine - 1,
          section: sectionHeading,
          order: order++,
        },
        metadata: buildChunkMetadata(chunkContent, sectionHeading),
      });

      // Start new chunk with overlap
      const overlapParagraphs = getOverlapParagraphs(currentChunk, config.chunkOverlapTokens);
      currentChunk = overlapParagraphs;
      currentTokens = estimateTokens(overlapParagraphs.join('\n\n'));
      chunkStartLine = currentLine - countLines(overlapParagraphs);
    }

    currentChunk.push(paragraph);
    currentTokens += paragraphTokens;
    currentLine += paragraphLines + 1; // +1 for paragraph separator
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join('\n\n');
    if (estimateTokens(chunkContent) >= config.minChunkTokens) {
      chunks.push({
        content: chunkContent,
        position: {
          startLine: chunkStartLine,
          endLine: currentLine - 1,
          section: sectionHeading,
          order: order++,
        },
        metadata: buildChunkMetadata(chunkContent, sectionHeading),
      });
    }
  }

  return chunks;
}

// ============================================================================
// Main Chunking Function
// ============================================================================

/**
 * Chunk a document using the appropriate strategy
 */
export function chunkDocument(
  content: ExtractedContent,
  config: DocumentIndexingConfig = DEFAULT_INDEXING_CONFIG
): Omit<DocumentChunk, 'id' | 'documentId' | 'embedding'>[] {
  // Strategy selection based on document structure
  if (content.structure.hasHeadings) {
    // Chunk by sections
    return chunkBySections(content, config);
  } else if (content.codeBlocks.length > 0) {
    // Chunk by code blocks + prose
    return chunkByCodeBlocks(content, config);
  } else {
    // Chunk by paragraphs with overlap
    return chunkByParagraphs(content, config);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildChunkMetadata(content: string, sectionHeading: string | null): ChunkMetadata {
  return {
    headingContext: sectionHeading ? [sectionHeading] : [],
    codeLanguage: null,
    isDecision: detectDecision(content),
    isQuestion: detectQuestion(content),
    isAction: detectAction(content),
    tokenCount: estimateTokens(content),
  };
}

function detectDecision(content: string): boolean {
  const patterns = [
    /\b(decided|decided to|decision|chose|chosen|selected|picked)\b/i,
    /\b(we will|we'll|going with|go with|using|use)\b/i,
    /\b(approach is|solution is|answer is|conclusion)\b/i,
  ];
  return patterns.some((p) => p.test(content));
}

function detectQuestion(content: string): boolean {
  const patterns = [
    /\?/,
    /\b(should we|how do|what if|why|when|where|which|could we)\b/i,
    /\b(question|ask|wondering|unsure|unclear)\b/i,
  ];
  return patterns.some((p) => p.test(content));
}

function detectAction(content: string): boolean {
  const patterns = [
    /\b(todo|to-do|action item|next step|follow up|follow-up)\b/i,
    /\b(need to|must|should|will|have to|going to)\b/i,
    /\b(deadline|due|by|before|until)\b/i,
    /\[\s*\]/,  // Empty checkbox
  ];
  return patterns.some((p) => p.test(content));
}

function getOverlapParagraphs(paragraphs: string[], overlapTokens: number): string[] {
  const result: string[] = [];
  let tokens = 0;

  for (let i = paragraphs.length - 1; i >= 0 && tokens < overlapTokens; i--) {
    result.unshift(paragraphs[i]);
    tokens += estimateTokens(paragraphs[i]);
  }

  return result;
}

function countLines(paragraphs: string[]): number {
  return paragraphs.reduce((sum, p) => sum + p.split('\n').length + 1, 0);
}
