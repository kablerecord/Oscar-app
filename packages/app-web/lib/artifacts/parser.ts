import type { ArtifactBlock, ArtifactType, ParsedResponse } from './types'

/**
 * Parse OSQR's response to extract artifacts
 *
 * OSQR will output artifacts in this format:
 *
 * Here's the code you requested:
 *
 * <artifact type="code" title="User Authentication" language="typescript">
 * export function authenticate(user: User) {
 *   // ... code here
 * }
 * </artifact>
 *
 * This function handles user authentication...
 */
export function parseArtifacts(response: string): ParsedResponse {
  const artifacts: ArtifactBlock[] = []
  let text = response

  // Regex to match artifact blocks
  const artifactRegex = /<artifact\s+type="([^"]+)"\s+title="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+description="([^"]*)")?\s*>([\s\S]*?)<\/artifact>/gi

  let match
  while ((match = artifactRegex.exec(response)) !== null) {
    const [fullMatch, type, title, language, description, content] = match

    artifacts.push({
      type: type as ArtifactType,
      title,
      content: content.trim(),
      language: language || undefined,
      description: description || undefined,
    })

    // Remove the artifact from text (replace with a placeholder reference)
    text = text.replace(fullMatch, `\n[Artifact: ${title}]\n`)
  }

  return {
    text: text.trim(),
    artifacts,
  }
}

/**
 * Detect if a response likely contains artifact-worthy content
 * Used to prompt OSQR to format as artifacts when appropriate
 */
export function shouldSuggestArtifact(content: string): ArtifactType | null {
  // Check for code blocks
  if (content.includes('```')) {
    const codeBlockMatch = content.match(/```(\w+)?/)
    if (codeBlockMatch) {
      return 'CODE'
    }
  }

  // Check for mermaid diagrams
  if (content.includes('```mermaid') || content.includes('graph ') || content.includes('sequenceDiagram')) {
    return 'DIAGRAM'
  }

  // Check for HTML content
  if (content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<body')) {
    return 'HTML'
  }

  // Check for SVG
  if (content.includes('<svg')) {
    return 'SVG'
  }

  // Check for JSON structure
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      JSON.parse(content.trim())
      return 'JSON'
    } catch {
      // Not valid JSON
    }
  }

  // Check for markdown document indicators
  if (content.includes('# ') && content.length > 500) {
    return 'DOCUMENT'
  }

  return null
}

/**
 * Format content as an artifact block (for system prompts)
 */
export function formatAsArtifact(
  type: ArtifactType,
  title: string,
  content: string,
  options?: { language?: string; description?: string }
): string {
  const languageAttr = options?.language ? ` language="${options.language}"` : ''
  const descriptionAttr = options?.description ? ` description="${options.description}"` : ''

  return `<artifact type="${type}" title="${title}"${languageAttr}${descriptionAttr}>
${content}
</artifact>`
}

/**
 * Convert legacy code blocks to artifacts
 * Useful for upgrading old responses
 */
export function convertCodeBlocksToArtifacts(response: string): string {
  let result = response
  let artifactCount = 0

  // Match code blocks with language identifier
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g

  result = result.replace(codeBlockRegex, (match, language, code) => {
    artifactCount++
    const title = `Code ${artifactCount}`
    return formatAsArtifact('CODE', title, code.trim(), { language })
  })

  return result
}
