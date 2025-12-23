/**
 * PDF Parser with fallback support
 *
 * Primary: unpdf (faster, more modern)
 * Fallback: pdfjs-dist (more robust for complex PDFs)
 */

import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Parse PDF using pdfjs-dist directly (more robust fallback)
 * Uses dynamic import to ensure proper ESM/CJS interop
 */
async function parsePDFWithPdfjs(uint8Array: Uint8Array): Promise<{ text: string; numPages: number }> {
  // Dynamic import for better ESM/CJS compatibility
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise
  const numPages = pdf.numPages

  let fullText = ''
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || '')
      .join(' ')
    fullText += pageText + '\n'
  }

  return {
    text: fullText.trim(),
    numPages
  }
}

/**
 * Parse PDF buffer and extract text content
 * Tries unpdf first, falls back to pdfjs-dist for problematic PDFs
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  try {
    // Try unpdf first (faster)
    // Create a fresh Uint8Array - unpdf may transfer/consume it
    const uint8Array = new Uint8Array(buffer)
    const pdf = await getDocumentProxy(uint8Array)
    const numPages = pdf.numPages
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })

    return {
      text: text.trim(),
      numPages
    }
  } catch (unpdfError) {
    // Fallback to pdfjs-dist for complex/problematic PDFs
    // unpdf may have transferred/consumed the original array, so create a fresh one
    console.log('unpdf failed, trying pdfjs-dist fallback:', unpdfError)

    try {
      // Create a fresh Uint8Array from the original buffer
      const freshUint8Array = new Uint8Array(buffer)
      return await parsePDFWithPdfjs(freshUint8Array)
    } catch (fallbackError) {
      // Both parsers failed - provide helpful error message
      const errorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)

      if (errorMessage.includes('password') || errorMessage.includes('encrypt')) {
        throw new Error('This PDF is password-protected. Please remove the password and try again.')
      }

      throw new Error(
        'Unable to extract text from this PDF. The file may be corrupted, image-only (scanned), or use unsupported features. ' +
        'Try re-saving as a simpler PDF or converting to DOCX/TXT.'
      )
    }
  }
}
