/**
 * PDF Parser using unpdf
 *
 * We use unpdf instead of pdfjs-dist because pdfjs-dist requires browser APIs
 * like DOMMatrix that don't exist in Node.js server environments.
 *
 * unpdf is a Node.js-compatible PDF text extraction library.
 */

import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Parse PDF buffer and extract text content
 * Uses unpdf which is Node.js compatible (no browser APIs required)
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  // Convert Buffer to Uint8Array for unpdf
  const uint8Array = new Uint8Array(buffer)

  // Get document proxy to get page count
  const pdf = await getDocumentProxy(uint8Array)
  const numPages = pdf.numPages

  // Extract text from all pages
  const { text } = await extractText(uint8Array, { mergePages: true })

  return {
    text: text.trim(),
    numPages
  }
}
