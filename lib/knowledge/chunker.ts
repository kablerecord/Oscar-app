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
      const endChar = Math.min(startChar + maxSize, text.length)
      const content = text.slice(startChar, endChar)

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
    const endPart = text.slice(-overlapSize)
    const sentenceEnd = endPart.lastIndexOf('. ')

    if (sentenceEnd > 0) {
      return endPart.slice(sentenceEnd + 2)
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
