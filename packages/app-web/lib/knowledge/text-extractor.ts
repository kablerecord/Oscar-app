import * as fs from 'fs/promises'
import { ScannedFile } from './file-scanner'

/**
 * Text Extractor - Extracts readable text from various file formats
 */
export class TextExtractor {
  /**
   * Extract text from a file based on its type
   */
  static async extract(file: ScannedFile): Promise<string> {
    const ext = file.extension.toLowerCase()

    switch (ext) {
      case '.txt':
      case '.md':
      case '.json':
      case '.js':
      case '.ts':
      case '.py':
      case '.html':
      case '.css':
      case '.xml':
      case '.yaml':
      case '.yml':
      case '.sh':
      case '.sql':
        return this.extractPlainText(file.path)

      case '.pdf':
        return this.extractPdf(file.path)

      case '.doc':
      case '.docx':
        return this.extractWord(file.path)

      default:
        // Try plain text extraction as fallback
        try {
          return await this.extractPlainText(file.path)
        } catch {
          throw new Error(`Unsupported file type: ${ext}`)
        }
    }
  }

  /**
   * Extract plain text files
   */
  private static async extractPlainText(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  }

  /**
   * Extract text from PDF
   */
  private static async extractPdf(filePath: string): Promise<string> {
    try {
      // Use our custom PDF parser that avoids pdf-parse's test file bug
      const { parsePDF } = await import('@/lib/utils/pdf-parser')
      const dataBuffer = await fs.readFile(filePath)
      const data = await parsePDF(dataBuffer)
      return data.text
    } catch (error) {
      throw new Error(`Failed to extract PDF: ${error}`)
    }
  }

  /**
   * Extract text from Word documents
   */
  private static async extractWord(filePath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    } catch (error) {
      throw new Error(`Failed to extract Word document: ${error}`)
    }
  }

  /**
   * Clean and normalize extracted text
   */
  static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .trim()
  }
}
