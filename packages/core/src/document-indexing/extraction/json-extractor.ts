/**
 * OSQR Document Indexing - JSON/YAML Extractor
 */

import {
  RawDocument,
  DocumentStructure,
  ExtractedMetadata,
  CodeBlock,
  Heading,
} from '../types';
import { BaseExtractor } from './base-extractor';

export class JsonExtractor extends BaseExtractor {
  constructor() {
    super(['json']);
  }

  async getText(document: RawDocument): Promise<string> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    try {
      // Parse and extract string values
      const parsed = JSON.parse(content);
      return this.extractStrings(parsed).join('\n');
    } catch {
      return content;
    }
  }

  async getStructure(document: RawDocument): Promise<DocumentStructure> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    try {
      const parsed = JSON.parse(content);
      const headings = this.extractKeys(parsed);

      return {
        hasHeadings: headings.length > 0,
        headings,
        sections: this.buildSections(content, headings),
        paragraphCount: 0,
        listCount: 0,
      };
    } catch {
      return {
        hasHeadings: false,
        headings: [],
        sections: [],
        paragraphCount: 0,
        listCount: 0,
      };
    }
  }

  async getMetadata(document: RawDocument): Promise<ExtractedMetadata> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Invalid JSON
    }

    return {
      title: parsed?.name as string || parsed?.title as string || null,
      author: parsed?.author as string || null,
      createdAt: document.ctime,
      modifiedAt: document.mtime,
      wordCount: this.countWords(content),
      language: null,
      frontmatter: parsed ? { type: 'json', keys: Object.keys(parsed) } : null,
    };
  }

  async getCodeBlocks(document: RawDocument): Promise<CodeBlock[]> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    return [
      {
        language: 'json',
        content,
        startLine: 1,
        endLine: content.split('\n').length,
      },
    ];
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private extractStrings(obj: unknown, depth = 0): string[] {
    if (depth > 10) return []; // Prevent infinite recursion

    const strings: string[] = [];

    if (typeof obj === 'string') {
      strings.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        strings.push(...this.extractStrings(item, depth + 1));
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        strings.push(...this.extractStrings(value, depth + 1));
      }
    }

    return strings;
  }

  private extractKeys(obj: unknown, prefix = '', depth = 0): Heading[] {
    if (depth > 3) return []; // Limit depth

    const headings: Heading[] = [];

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        headings.push({
          level: depth + 1,
          text: path,
          startLine: 1, // JSON doesn't have reliable line numbers
          endLine: 1,
        });

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          headings.push(...this.extractKeys(value, path, depth + 1));
        }
      }
    }

    return headings;
  }
}

export class YamlExtractor extends BaseExtractor {
  constructor() {
    super(['yaml']);
  }

  async getText(document: RawDocument): Promise<string> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    // Simple YAML string extraction
    const lines = content.split('\n');
    const strings: string[] = [];

    for (const line of lines) {
      // Extract string values after colons
      const match = line.match(/:\s*["']?(.+?)["']?\s*$/);
      if (match && match[1] && !match[1].startsWith('{') && !match[1].startsWith('[')) {
        strings.push(match[1]);
      }
    }

    return strings.join('\n');
  }

  async getStructure(document: RawDocument): Promise<DocumentStructure> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    const lines = content.split('\n');
    const headings = this.extractYamlKeys(lines);

    return {
      hasHeadings: headings.length > 0,
      headings,
      sections: this.buildSections(content, headings),
      paragraphCount: 0,
      listCount: 0,
    };
  }

  async getMetadata(document: RawDocument): Promise<ExtractedMetadata> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    return {
      title: this.extractYamlValue(content, 'name') || this.extractYamlValue(content, 'title'),
      author: this.extractYamlValue(content, 'author'),
      createdAt: document.ctime,
      modifiedAt: document.mtime,
      wordCount: this.countWords(content),
      language: null,
      frontmatter: { type: 'yaml' },
    };
  }

  async getCodeBlocks(document: RawDocument): Promise<CodeBlock[]> {
    const content = typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');

    return [
      {
        language: 'yaml',
        content,
        startLine: 1,
        endLine: content.split('\n').length,
      },
    ];
  }

  private extractYamlKeys(lines: string[]): Heading[] {
    const headings: Heading[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s*)(\w+):/);
      if (match) {
        const indent = match[1].length;
        const level = Math.floor(indent / 2) + 1;
        headings.push({
          level: Math.min(level, 6),
          text: match[2],
          startLine: i + 1,
          endLine: i + 1,
        });
      }
    }

    return headings;
  }

  private extractYamlValue(content: string, key: string): string | null {
    const regex = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, 'm');
    const match = content.match(regex);
    return match ? match[1] : null;
  }
}
