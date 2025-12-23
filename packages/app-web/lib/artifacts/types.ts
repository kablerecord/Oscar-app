/**
 * OSQR Artifact System
 *
 * Artifacts are structured outputs that can be rendered, previewed, and exported.
 * Unlike plain text responses, artifacts have:
 * - A specific type (code, document, diagram, etc.)
 * - A title
 * - Renderable content
 * - Version history (optional)
 */

export type ArtifactType =
  | 'code'           // Source code (any language)
  | 'document'       // Markdown/text documents
  | 'diagram'        // Mermaid diagrams
  | 'html'           // HTML/CSS/JS (renderable)
  | 'svg'            // SVG graphics
  | 'json'           // Structured JSON data
  | 'csv'            // Tabular data
  | 'react'          // React component (preview in sandbox)

export interface Artifact {
  id: string
  type: ArtifactType
  title: string
  content: string
  language?: string      // For code artifacts (typescript, python, etc.)
  description?: string   // Brief explanation
  createdAt: Date
  updatedAt: Date
  version: number
  messageId?: string     // Link to the message that created it
  threadId?: string      // Link to the conversation
}

export interface ArtifactBlock {
  type: ArtifactType
  title: string
  content: string
  language?: string
  description?: string
}

export interface ParsedResponse {
  text: string                    // Regular text content
  artifacts: ArtifactBlock[]      // Extracted artifacts
}

// Artifact markers that OSQR will use in responses
export const ARTIFACT_MARKERS = {
  // Format: <artifact type="code" title="My Code" language="typescript">
  openTag: /<artifact\s+type="([^"]+)"\s+title="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+description="([^"]*)")?>/gi,
  closeTag: /<\/artifact>/gi,
}
