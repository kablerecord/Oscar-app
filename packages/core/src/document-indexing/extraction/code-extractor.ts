/**
 * OSQR Document Indexing - Code Extractor
 *
 * Extracts content and metadata from source code files.
 */

import {
  RawDocument,
  DocumentStructure,
  ExtractedMetadata,
  CodeBlock,
  Heading,
} from '../types';
import { BaseExtractor } from './base-extractor';
import { getCodeLanguage } from '../detection';

export class CodeExtractor extends BaseExtractor {
  constructor() {
    super(['code']);
  }

  async getText(document: RawDocument): Promise<string> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    // Remove single-line comments
    const withoutLineComments = content.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove Python/Ruby style comments
    const withoutHashComments = withoutBlockComments.replace(/#.*$/gm, '');

    return withoutHashComments;
  }

  async getStructure(document: RawDocument): Promise<DocumentStructure> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const lines = content.split('\n');
    const headings = this.extractFunctionHeadings(lines, document.filename);
    const sections = this.buildSections(content, headings);

    return {
      hasHeadings: headings.length > 0,
      headings,
      sections,
      paragraphCount: 0,
      listCount: 0,
    };
  }

  async getMetadata(document: RawDocument): Promise<ExtractedMetadata> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const language = getCodeLanguage(document.filename);

    return {
      title: document.filename,
      author: null,
      createdAt: document.ctime,
      modifiedAt: document.mtime,
      wordCount: content.split(/\s+/).filter((w) => w.length > 0).length,
      language: language,
      frontmatter: {
        codeLanguage: language,
        lineCount: content.split('\n').length,
        hasTests: this.detectTests(content, language),
        hasTypes: this.detectTypes(content, language),
      },
    };
  }

  async getCodeBlocks(document: RawDocument): Promise<CodeBlock[]> {
    // The entire file is a code block
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const lines = content.split('\n');
    const language = getCodeLanguage(document.filename);

    return [
      {
        language,
        content,
        startLine: 1,
        endLine: lines.length,
      },
    ];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Extract function/class definitions as "headings"
   */
  private extractFunctionHeadings(lines: string[], filename: string): Heading[] {
    const headings: Heading[] = [];
    const language = getCodeLanguage(filename);

    const patterns = this.getPatternsForLanguage(language);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          headings.push({
            level: pattern.level,
            text: match[1] || match[0],
            startLine: i + 1,
            endLine: i + 1,
          });
          break;
        }
      }
    }

    return headings;
  }

  private getPatternsForLanguage(
    language: string | null
  ): Array<{ regex: RegExp; level: number }> {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return [
          { regex: /^export\s+(?:default\s+)?class\s+(\w+)/, level: 1 },
          { regex: /^class\s+(\w+)/, level: 1 },
          { regex: /^export\s+(?:default\s+)?interface\s+(\w+)/, level: 2 },
          { regex: /^interface\s+(\w+)/, level: 2 },
          { regex: /^export\s+(?:async\s+)?function\s+(\w+)/, level: 2 },
          { regex: /^(?:async\s+)?function\s+(\w+)/, level: 2 },
          { regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/, level: 3 },
        ];
      case 'python':
        return [
          { regex: /^class\s+(\w+)/, level: 1 },
          { regex: /^def\s+(\w+)/, level: 2 },
          { regex: /^\s+def\s+(\w+)/, level: 3 },
        ];
      case 'go':
        return [
          { regex: /^type\s+(\w+)\s+struct/, level: 1 },
          { regex: /^type\s+(\w+)\s+interface/, level: 1 },
          { regex: /^func\s+\([^)]+\)\s+(\w+)/, level: 2 },
          { regex: /^func\s+(\w+)/, level: 2 },
        ];
      case 'rust':
        return [
          { regex: /^pub\s+struct\s+(\w+)/, level: 1 },
          { regex: /^struct\s+(\w+)/, level: 1 },
          { regex: /^impl\s+(\w+)/, level: 1 },
          { regex: /^pub\s+fn\s+(\w+)/, level: 2 },
          { regex: /^fn\s+(\w+)/, level: 2 },
          { regex: /^\s+pub\s+fn\s+(\w+)/, level: 3 },
          { regex: /^\s+fn\s+(\w+)/, level: 3 },
        ];
      default:
        return [
          { regex: /^class\s+(\w+)/, level: 1 },
          { regex: /^function\s+(\w+)/, level: 2 },
          { regex: /^def\s+(\w+)/, level: 2 },
        ];
    }
  }

  private detectTests(content: string, language: string | null): boolean {
    const testPatterns: Record<string, RegExp[]> = {
      typescript: [/describe\(/, /it\(/, /test\(/, /expect\(/],
      javascript: [/describe\(/, /it\(/, /test\(/, /expect\(/],
      python: [/def test_/, /class Test/, /unittest/, /pytest/],
      go: [/func Test/, /testing\.T/],
      rust: [/#\[test\]/, /#\[cfg\(test\)\]/],
    };

    const patterns = testPatterns[language || ''] || [];
    return patterns.some((p) => p.test(content));
  }

  private detectTypes(content: string, language: string | null): boolean {
    switch (language) {
      case 'typescript':
        return /:\s*\w+/.test(content) || /interface\s+/.test(content);
      case 'python':
        return /:\s*\w+\s*[=)]/.test(content) || /->/.test(content);
      case 'rust':
      case 'go':
        return true; // Statically typed
      default:
        return false;
    }
  }
}
