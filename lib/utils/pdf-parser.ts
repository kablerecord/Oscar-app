/**
 * PDF Parser with fallback support
 *
 * Primary: unpdf (faster, more modern)
 * Fallback: pdf-parse (more robust for complex PDFs)
 */

import { extractText, getDocumentProxy } from 'unpdf'

/**
 * Parse PDF buffer and extract text content
 * Tries unpdf first, falls back to pdf-parse for problematic PDFs
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  // Convert Buffer to Uint8Array for unpdf
  const uint8Array = new Uint8Array(buffer)

  try {
    // Try unpdf first (faster)
    const pdf = await getDocumentProxy(uint8Array)
    const numPages = pdf.numPages
    const { text } = await extractText(uint8Array, { mergePages: true })

    return {
      text: text.trim(),
      numPages
    }
  } catch (unpdfError) {
    // Fallback to pdf-parse for complex/problematic PDFs
    console.log('unpdf failed, trying pdf-parse fallback:', unpdfError)

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buffer)

      return {
        text: data.text.trim(),
        numPages: data.numpages
      }
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
