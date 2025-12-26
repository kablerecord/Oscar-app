/**
 * Text Chunker - Splits documents into smaller chunks for embedding
 */

export interface Chunk {
  content: string
  index: number
  startChar: number
  endChar: number
  tokenEstimate: number
}

export interface ChunkOptions {
  maxChunkSize?: number // Max characters per chunk
  overlapSize?: number // Overlap between chunks for context
  preserveParagraphs?: boolean // Try to keep paragraphs together
}

export class TextChunker {
  private static readonly DEFAULT_MAX_SIZE = 1000
  private static readonly DEFAULT_OVERLAP = 200
  private static readonly CHARS_PER_TOKEN = 4 // Rough estimate

  /**
   * Split text into chunks
   */
  static chunk(text: string, options: ChunkOptions = {}): Chunk[] {
    const {
      maxChunkSize = this.DEFAULT_MAX_SIZE,
      overlapSize = this.DEFAULT_OVERLAP,
      preserveParagraphs = true,
    } = options

    if (!text || text.trim().length === 0) {
      return []
    }

    const chunks: Chunk[] = []

    if (preserveParagraphs) {
      return this.chunkByParagraphs(text, maxChunkSize, overlapSize)
    } else {
      return this.chunkBySize(text, maxChunkSize, overlapSize)
    }
  }

  /**
   * Chunk by paragraphs (preserves semantic boundaries)
   */
  private static chunkByParagraphs(
    text: string,
    maxSize: number,
    overlap: number
  ): Chunk[] {
    const paragraphs = text.split(/\n\n+/)
    const chunks: Chunk[] = []
    let currentChunk = ''
    let currentStartChar = 0
    let chunkIndex = 0

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      if (!paragraph) continue

      // If adding this paragraph exceeds max size
      if (currentChunk.length + paragraph.length > maxSize) {
        // Save current chunk if it has content
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            index: chunkIndex++,
            startChar: currentStartChar,
            endChar: currentStartChar + currentChunk.length,
            tokenEstimate: Math.ceil(currentChunk.length / this.CHARS_PER_TOKEN),
          })

          // Start new chunk with overlap from end of previous
          const overlapText = this.getOverlapText(currentChunk, overlap)
          currentChunk = overlapText + '\n\n' + paragraph
          currentStartChar += currentChunk.length - overlapText.length - paragraph.length - 2
        } else {
          // Paragraph itself is too large, split it
          const subChunks = this.chunkBySize(paragraph, maxSize, overlap)
          chunks.push(...subChunks.map((chunk, idx) => ({
            ...chunk,
            index: chunkIndex++,
          })))
          currentChunk = ''
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
        tokenEstimate: Math.ceil(currentChunk.length / this.CHARS_PER_TOKEN),
      })
    }

    return chunks
  }

  /**
   * Simple chunking by character size (no semantic awareness)
   */
  private static chunkBySize(
    text: string,
    maxSize: number,
    overlap: number
  ): Chunk[] {
    const chunks: Chunk[] = []
    let startChar = 0
    let chunkIndex = 0

    while (startChar < text.length) {
      let endChar = Math.min(startChar + maxSize, text.length)

      // Avoid splitting a surrogate pair at the end
      if (endChar < text.length) {
        const lastCode = text.charCodeAt(endChar - 1)
        // If we're ending on a high surrogate, include the low surrogate too
        if (lastCode >= 0xD800 && lastCode <= 0xDBFF) {
          endChar++
        }
      }

      let content = text.slice(startChar, endChar)

      // Skip orphan low surrogate at the start (can happen from overlap)
      if (content.length > 0) {
        const firstCode = content.charCodeAt(0)
        if (firstCode >= 0xDC00 && firstCode <= 0xDFFF) {
          content = content.slice(1)
          startChar++
        }
      }

      chunks.push({
        content: content.trim(),
        index: chunkIndex++,
        startChar,
        endChar,
        tokenEstimate: Math.ceil(content.length / this.CHARS_PER_TOKEN),
      })

      startChar += maxSize - overlap
    }

    return chunks
  }

  /**
   * Get overlap text from end of previous chunk
   */
  private static getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text

    // Try to overlap at sentence boundary
    let endPart = text.slice(-overlapSize)
    const sentenceEnd = endPart.lastIndexOf('. ')

    if (sentenceEnd > 0) {
      endPart = endPart.slice(sentenceEnd + 2)
    }

    // Ensure we don't split a surrogate pair
    // If the first char is a low surrogate (orphaned), skip it
    if (endPart.length > 0) {
      const firstCode = endPart.charCodeAt(0)
      if (firstCode >= 0xDC00 && firstCode <= 0xDFFF) {
        endPart = endPart.slice(1)
      }
    }

    return endPart
  }

  /**
   * Estimate token count for text
   */
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }
}
