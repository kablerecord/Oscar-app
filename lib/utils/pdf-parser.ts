/**
 * PDF Parser using pdfjs-dist directly
 *
 * We use pdfjs-dist directly instead of pdf-parse because pdf-parse has a bug
 * where it tries to load test fixture files at import time, causing ENOENT errors
 * in production environments.
 */

import type { TextItem } from 'pdfjs-dist/types/src/display/api'

/**
 * Parse PDF buffer and extract text content
 * Uses pdfjs-dist directly to avoid pdf-parse's test file loading bug
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  // Dynamic import to load pdfjs-dist only when needed
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Convert Buffer to Uint8Array for pdfjs-dist
  const uint8Array = new Uint8Array(buffer)

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ')
    fullText += pageText + '\n'
  }

  return {
    text: fullText.trim(),
    numPages: pdf.numPages
  }
}
