import * as fs from 'fs/promises'
import * as path from 'path'
import { createHash } from 'crypto'

export interface ScannedFile {
  path: string
  filename: string
  extension: string
  size: number
  created: Date
  modified: Date
  hash: string // For duplicate detection
  mimeType?: string
}

export interface ScanOptions {
  extensions?: string[] // Filter by extensions (e.g., ['.txt', '.md', '.pdf'])
  maxDepth?: number // Limit recursion depth
  ignorePatterns?: string[] // Patterns to ignore (e.g., ['node_modules', '.git'])
}

/**
 * File Scanner - Recursively scans directories for files
 */
export class FileScanner {
  private static readonly DEFAULT_IGNORE = [
    'node_modules',
    '.git',
    '.next',
    '.DS_Store',
    'dist',
    'build',
    '__pycache__',
  ]

  /**
   * Scan a directory and return all files
   */
  static async scan(dirPath: string, options: ScanOptions = {}): Promise<ScannedFile[]> {
    const {
      extensions,
      maxDepth = 10,
      ignorePatterns = this.DEFAULT_IGNORE,
    } = options

    const files: ScannedFile[] = []

    const scanRecursive = async (currentPath: string, depth: number) => {
      if (depth > maxDepth) return

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name)

          // Skip ignored patterns
          if (ignorePatterns.some((pattern) => entry.name.includes(pattern))) {
            continue
          }

          if (entry.isDirectory()) {
            await scanRecursive(fullPath, depth + 1)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()

            // Filter by extension if specified
            if (extensions && !extensions.includes(ext)) {
              continue
            }

            try {
              const stats = await fs.stat(fullPath)
              const content = await fs.readFile(fullPath)
              const hash = createHash('sha256').update(content).digest('hex')

              files.push({
                path: fullPath,
                filename: entry.name,
                extension: ext,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                hash,
                mimeType: this.getMimeType(ext),
              })
            } catch (error) {
              console.warn(`Failed to scan file ${fullPath}:`, error)
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${currentPath}:`, error)
      }
    }

    await scanRecursive(dirPath, 0)
    return files
  }

  /**
   * Find duplicate files by hash
   */
  static findDuplicates(files: ScannedFile[]): Map<string, ScannedFile[]> {
    const hashMap = new Map<string, ScannedFile[]>()

    for (const file of files) {
      const existing = hashMap.get(file.hash) || []
      existing.push(file)
      hashMap.set(file.hash, existing)
    }

    // Filter to only duplicates (hash appears more than once)
    const duplicates = new Map<string, ScannedFile[]>()
    for (const [hash, fileList] of hashMap.entries()) {
      if (fileList.length > 1) {
        duplicates.set(hash, fileList)
      }
    }

    return duplicates
  }

  /**
   * Group files by extension
   */
  static groupByExtension(files: ScannedFile[]): Map<string, ScannedFile[]> {
    const groups = new Map<string, ScannedFile[]>()

    for (const file of files) {
      const ext = file.extension || 'no-extension'
      const existing = groups.get(ext) || []
      existing.push(file)
      groups.set(ext, existing)
    }

    return groups
  }

  /**
   * Get basic MIME type from extension
   */
  private static getMimeType(ext: string): string | undefined {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.json': 'application/json',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.py': 'text/x-python',
      '.html': 'text/html',
      '.css': 'text/css',
    }

    return mimeTypes[ext]
  }
}
