/**
 * OSQR Document Indexing - Markdown Extractor
 *
 * Extracts content, structure, and metadata from Markdown documents.
 */

import {
  RawDocument,
  DocumentStructure,
  ExtractedMetadata,
  CodeBlock,
  Heading,
} from '../types';
import { BaseExtractor } from './base-extractor';

export class MarkdownExtractor extends BaseExtractor {
  constructor() {
    super(['markdown']);
  }

  async getText(document: RawDocument): Promise<string> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    // Strip frontmatter
    const withoutFrontmatter = this.stripFrontmatter(content);

    // Remove code blocks for text extraction (keep for separate processing)
    const withoutCode = withoutFrontmatter.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');

    // Remove images
    const withoutImages = withoutInlineCode.replace(/!\[.*?\]\(.*?\)/g, '');

    // Convert links to just text
    const withoutLinkSyntax = withoutImages.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove HTML tags
    const withoutHtml = withoutLinkSyntax.replace(/<[^>]+>/g, '');

    // Remove heading markers
    const withoutHeadingMarkers = withoutHtml.replace(/^#+\s*/gm, '');

    // Remove list markers
    const withoutListMarkers = withoutHeadingMarkers.replace(/^\s*[-*+]\s+/gm, '');
    const withoutNumberedList = withoutListMarkers.replace(/^\s*\d+\.\s+/gm, '');

    // Remove bold and italic markers
    const withoutBold = withoutNumberedList.replace(/\*\*([^*]+)\*\*/g, '$1');
    const withoutItalic = withoutBold.replace(/\*([^*]+)\*/g, '$1');
    const withoutUnderscoreBold = withoutItalic.replace(/__([^_]+)__/g, '$1');
    const withoutUnderscoreItalic = withoutUnderscoreBold.replace(/_([^_]+)_/g, '$1');

    // Clean up extra whitespace
    return withoutUnderscoreItalic.replace(/\n{3,}/g, '\n\n').trim();
  }

  async getStructure(document: RawDocument): Promise<DocumentStructure> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const lines = content.split('\n');
    const headings = this.extractHeadings(lines);
    const sections = this.buildSections(content, headings);

    return {
      hasHeadings: headings.length > 0,
      headings,
      sections,
      paragraphCount: this.countParagraphs(content),
      listCount: this.countLists(content),
    };
  }

  async getMetadata(document: RawDocument): Promise<ExtractedMetadata> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const frontmatter = this.extractFrontmatter(content);
    const text = await this.getText(document);

    return {
      title: frontmatter?.title || this.extractFirstHeading(content) || null,
      author: frontmatter?.author || null,
      createdAt: frontmatter?.date ? new Date(frontmatter.date) : document.ctime,
      modifiedAt: document.mtime,
      wordCount: this.countWords(text),
      language: this.detectLanguage(text),
      frontmatter,
    };
  }

  async getCodeBlocks(document: RawDocument): Promise<CodeBlock[]> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const codeBlocks: CodeBlock[] = [];
    const lines = content.split('\n');
    const regex = /^```(\w*)/;

    let inCodeBlock = false;
    let currentLanguage: string | null = null;
    let currentContent: string[] = [];
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inCodeBlock && regex.test(line)) {
        // Start of code block
        inCodeBlock = true;
        currentLanguage = line.match(regex)?.[1] || null;
        currentContent = [];
        startLine = i + 1;
      } else if (inCodeBlock && line.startsWith('```')) {
        // End of code block
        codeBlocks.push({
          language: currentLanguage,
          content: currentContent.join('\n'),
          startLine: startLine + 1, // 1-indexed
          endLine: i + 1,
        });
        inCodeBlock = false;
        currentLanguage = null;
        currentContent = [];
      } else if (inCodeBlock) {
        currentContent.push(line);
      }
    }

    return codeBlocks;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private extractHeadings(lines: string[]): Heading[] {
    const headings: Heading[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(headingRegex);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          startLine: i + 1, // 1-indexed
          endLine: i + 1,
        });
      }
    }

    return headings;
  }

  private extractFirstHeading(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  private extractFrontmatter(content: string): Record<string, unknown> | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    try {
      const yaml = frontmatterMatch[1];
      // Simple YAML parsing for common cases
      const result: Record<string, unknown> = {};
      const lines = yaml.split('\n');

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          let value: unknown = line.slice(colonIndex + 1).trim();

          // Remove quotes
          if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }

          result[key] = value;
        }
      }

      return result;
    } catch {
      return null;
    }
  }

  private stripFrontmatter(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  }
}
