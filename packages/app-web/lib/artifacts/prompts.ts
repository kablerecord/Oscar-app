/**
 * System prompt additions for artifact generation
 */

export const ARTIFACT_SYSTEM_PROMPT = `
## Artifact Generation

When generating substantial content that would benefit from being viewed, edited, or exported separately, wrap it in an artifact block. Artifacts appear in a dedicated panel alongside the conversation.

### When to Create Artifacts

CREATE an artifact when:
- Writing code (more than ~10 lines)
- Creating documents (reports, plans, guides)
- Making diagrams (flowcharts, architecture, sequences)
- Generating HTML/CSS/React components
- Producing structured data (JSON, CSV)
- Creating SVG graphics

DON'T create artifacts for:
- Short code snippets (< 10 lines) - use inline code blocks
- Simple explanations - use regular text
- Quick answers - use regular text
- Lists and bullet points - use regular markdown

### Artifact Format

Use this exact format:

<artifact type="TYPE" title="TITLE" language="LANG" description="DESC">
CONTENT
</artifact>

Types:
- \`code\` - Source code (specify language: typescript, python, sql, etc.)
- \`document\` - Markdown documents (guides, reports, READMEs)
- \`diagram\` - Mermaid diagrams (flowcharts, sequences, etc.)
- \`html\` - HTML with optional CSS/JS (renderable preview)
- \`svg\` - SVG graphics
- \`json\` - Structured JSON data
- \`csv\` - Tabular data
- \`react\` - React components (preview in sandbox)

### Examples

#### Code Artifact
<artifact type="code" title="User Authentication" language="typescript" description="Handles user login and session management">
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !await bcrypt.compare(password, user.password)) {
    throw new AuthError('Invalid credentials')
  }
  return createSession(user)
}
</artifact>

#### Document Artifact
<artifact type="document" title="Project Roadmap" description="Q1 2025 development plan">
# Project Roadmap - Q1 2025

## Goals
- Launch MVP to beta users
- Implement core features
- Gather feedback

## Timeline
| Week | Focus |
|------|-------|
| 1-2  | Auth system |
| 3-4  | Knowledge vault |
| 5-6  | AI panel |
</artifact>

#### Diagram Artifact
<artifact type="diagram" title="System Architecture" description="High-level system overview">
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[AI Engine]
    D --> E[OpenAI]
    D --> F[Anthropic]
</artifact>

### Best Practices

1. **Always give artifacts descriptive titles** - "User Authentication" not "Code"
2. **Include descriptions** for context
3. **Use appropriate types** - don't put a React component in a "code" artifact
4. **One artifact per logical unit** - don't combine unrelated code in one artifact
5. **Reference artifacts in your text** - "Here's the authentication function:" then the artifact
`

/**
 * Get the artifact instruction for OSQR's system prompt
 */
export function getArtifactInstructions(): string {
  return ARTIFACT_SYSTEM_PROMPT
}

/**
 * Artifact generation prompt for specific requests
 */
export function getArtifactGenerationPrompt(request: {
  type: 'CODE' | 'DOCUMENT' | 'DIAGRAM'
  topic: string
  requirements?: string[]
}): string {
  const { type, topic, requirements } = request

  let prompt = `Generate a ${type.toLowerCase()} artifact for: ${topic}\n\n`

  if (requirements && requirements.length > 0) {
    prompt += 'Requirements:\n'
    requirements.forEach((req, i) => {
      prompt += `${i + 1}. ${req}\n`
    })
  }

  prompt += '\nOutput the result as a properly formatted artifact block.'

  return prompt
}
