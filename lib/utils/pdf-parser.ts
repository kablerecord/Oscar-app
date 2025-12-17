/**
 * PDF Parser wrapper
 *
 * The pdf-parse library has a known bug where it tries to load test fixture
 * files on import, which causes ENOENT errors in production environments.
 *
 * This wrapper provides a safe way to parse PDFs without triggering that bug.
 */

/**
 * Parse PDF buffer and extract text content
 * Uses pdf-parse with options that avoid the test file loading bug
 */
export async function parsePDF(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  // Dynamic import to ensure it only loads when needed
  // The issue is that pdf-parse's index.js has a debug code path that loads test files
  // We can work around this by using the lib directly

  try {
    // Try using pdf-parse normally first with empty render function to skip test
    const pdfParse = (await import('pdf-parse')).default

    // Pass custom page render to avoid any default behavior that might trigger test loading
    const data = await pdfParse(buffer, {
      // Max pages to parse (0 = all)
      max: 0,
      // Custom page renderer that just returns text
      pagerender: function(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
        return pageData.getTextContent().then(function(textContent) {
          let text = ''
          for (const item of textContent.items) {
            text += item.str + ' '
          }
          return text
        })
      }
    })

    return {
      text: data.text,
      numPages: data.numpages
    }
  } catch (error) {
    // If pdf-parse fails with the test file error, try alternative approach
    if (error instanceof Error && error.message.includes('ENOENT') && error.message.includes('test/data')) {
      console.warn('pdf-parse test file error encountered, using fallback parser')

      // Use pdf-parse's underlying pdf.js directly
      // This is a more direct approach that bypasses the problematic code
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

      const loadingTask = pdfjsLib.getDocument({ data: buffer })
      const pdf = await loadingTask.promise

      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: { str?: string }) => item.str || '')
          .join(' ')
        fullText += pageText + '\n'
      }

      return {
        text: fullText,
        numPages: pdf.numPages
      }
    }

    // Re-throw other errors
    throw error
  }
}
