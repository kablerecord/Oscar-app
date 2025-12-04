import { ProviderRegistry } from '../ai/providers'
import type { ScannedFile } from './file-scanner'
import { TextExtractor } from './text-extractor'

export interface FileCategory {
  name: string
  description: string
  files: ScannedFile[]
}

export interface OrganizationPlan {
  categories: FileCategory[]
  duplicates: Array<{
    files: ScannedFile[]
    keepFile: ScannedFile
    reason: string
  }>
  suggestions: string[]
}

/**
 * AI-Powered File Organizer
 * Analyzes messy file collections and proposes organized structure
 */
export class FileOrganizer {
  private static readonly ANALYSIS_SYSTEM_PROMPT = `You are an expert file organization AI assistant.

Your job is to analyze a collection of files and propose a logical, clean organization structure.

When analyzing files:
1. Identify themes, topics, and natural groupings
2. Suggest category names that are clear and intuitive
3. Detect duplicates and outdated versions
4. Recommend which files to keep vs archive
5. Propose meaningful folder structures

Output your analysis as JSON with this structure:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "What files belong here",
      "suggestedFiles": ["filename1.txt", "filename2.md"]
    }
  ],
  "duplicates": [
    {
      "files": ["file1.txt", "file1-copy.txt"],
      "keepFile": "file1.txt",
      "reason": "Most recent version"
    }
  ],
  "suggestions": [
    "Rename 'untitled-3.txt' to something more descriptive",
    "Consider merging related notes into a single document"
  ]
}

Be practical, clear, and helpful. Think like a professional archivist.`

  /**
   * Analyze a collection of files and propose organization
   */
  static async analyzeAndOrganize(
    files: ScannedFile[],
    sampleSize: number = 50
  ): Promise<OrganizationPlan> {
    // Sample files for analysis (analyzing all could be expensive)
    const sampled = this.sampleFiles(files, sampleSize)

    // Extract text content from sampled files
    const fileContents = await Promise.all(
      sampled.map(async (file) => {
        try {
          const text = await TextExtractor.extract(file)
          const preview = text.slice(0, 500) // First 500 chars
          return {
            filename: file.filename,
            path: file.path,
            size: file.size,
            modified: file.modified.toISOString(),
            preview: TextExtractor.cleanText(preview),
          }
        } catch (error) {
          return {
            filename: file.filename,
            path: file.path,
            size: file.size,
            modified: file.modified.toISOString(),
            preview: '[Unable to extract text]',
          }
        }
      })
    )

    // Build analysis prompt
    const prompt = `Analyze this collection of ${files.length} files (showing ${sampled.length} samples):

${JSON.stringify(fileContents, null, 2)}

Propose a logical organization structure with categories, identify duplicates, and provide suggestions for improvement.`

    // Get AI analysis
    const provider = ProviderRegistry.getProvider('anthropic', {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-sonnet-20241022',
    })

    const response = await provider.generate({
      messages: [
        { role: 'system', content: this.ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent categorization
    })

    // Parse AI response
    try {
      const analysis = JSON.parse(this.extractJSON(response))

      // Map suggested files back to full file objects
      const categories: FileCategory[] = analysis.categories.map((cat: any) => ({
        name: cat.name,
        description: cat.description,
        files: files.filter((f) =>
          cat.suggestedFiles?.some((sf: string) =>
            f.filename.includes(sf) || f.path.includes(sf)
          )
        ),
      }))

      const duplicates = analysis.duplicates?.map((dup: any) => ({
        files: files.filter((f) => dup.files?.includes(f.filename)),
        keepFile: files.find((f) => f.filename === dup.keepFile)!,
        reason: dup.reason,
      })) || []

      return {
        categories,
        duplicates,
        suggestions: analysis.suggestions || [],
      }
    } catch (error) {
      console.error('Failed to parse AI organization response:', error)
      // Return basic categorization by file type
      return this.basicOrganization(files)
    }
  }

  /**
   * Sample files for analysis (don't analyze everything)
   */
  private static sampleFiles(files: ScannedFile[], maxSample: number): ScannedFile[] {
    if (files.length <= maxSample) return files

    // Stratified sampling: get diverse sample
    const sorted = [...files].sort((a, b) => b.size - a.size)
    const step = Math.floor(files.length / maxSample)
    const sampled: ScannedFile[] = []

    for (let i = 0; i < files.length && sampled.length < maxSample; i += step) {
      sampled.push(sorted[i])
    }

    return sampled
  }

  /**
   * Extract JSON from AI response (handles markdown code blocks)
   */
  private static extractJSON(text: string): string {
    // Try to find JSON in markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return jsonMatch[1]
    }

    // Try to find raw JSON
    const rawMatch = text.match(/\{[\s\S]*\}/)
    if (rawMatch) {
      return rawMatch[0]
    }

    return text
  }

  /**
   * Fallback: Basic organization by file extension
   */
  private static basicOrganization(files: ScannedFile[]): OrganizationPlan {
    const extensionMap = new Map<string, ScannedFile[]>()

    files.forEach((file) => {
      const ext = file.extension || 'other'
      const existing = extensionMap.get(ext) || []
      existing.push(file)
      extensionMap.set(ext, existing)
    })

    const categories: FileCategory[] = Array.from(extensionMap.entries()).map(
      ([ext, files]) => ({
        name: `${ext.replace('.', '').toUpperCase()} Files`,
        description: `Files with ${ext} extension`,
        files,
      })
    )

    return {
      categories,
      duplicates: [],
      suggestions: ['Use AI analysis for better categorization (requires API key)'],
    }
  }
}
