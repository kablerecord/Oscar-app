/**
 * OSQR Document Indexing - Base Extractor
 *
 * Abstract base class for document extractors with common functionality.
 */

import {
  DocumentExtractor,
  DocumentType,
  RawDocument,
  DocumentStructure,
  ExtractedMetadata,
  CodeBlock,
  Heading,
  Section,
} from '../types';

/**
 * Base class for document extractors
 */
export abstract class BaseExtractor implements DocumentExtractor {
  protected readonly supportedTypes: DocumentType[];

  constructor(supportedTypes: DocumentType[]) {
    this.supportedTypes = supportedTypes;
  }

  supports(filetype: DocumentType): boolean {
    return this.supportedTypes.includes(filetype);
  }

  abstract getText(document: RawDocument): Promise<string>;
  abstract getStructure(document: RawDocument): Promise<DocumentStructure>;
  abstract getMetadata(document: RawDocument): Promise<ExtractedMetadata>;
  abstract getCodeBlocks(document: RawDocument): Promise<CodeBlock[]>;

  /**
   * Count words in text
   */
  protected countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Count paragraphs in text
   */
  protected countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  }

  /**
   * Count lists in text
   */
  protected countLists(text: string): number {
    const lines = text.split('\n');
    let listCount = 0;
    let inList = false;

    for (const line of lines) {
      const isListItem = /^\s*[-*+]|\d+\.\s/.test(line);
      if (isListItem && !inList) {
        listCount++;
        inList = true;
      } else if (!isListItem && line.trim().length === 0) {
        inList = false;
      }
    }

    return listCount;
  }

  /**
   * Build sections from headings and text
   */
  protected buildSections(text: string, headings: Heading[]): Section[] {
    const lines = text.split('\n');
    const sections: Section[] = [];

    if (headings.length === 0) {
      // No headings, entire document is one section
      return [
        {
          heading: null,
          content: text,
          startLine: 1,
          endLine: lines.length,
        },
      ];
    }

    // Content before first heading
    if (headings[0].startLine > 1) {
      sections.push({
        heading: null,
        content: lines.slice(0, headings[0].startLine - 1).join('\n'),
        startLine: 1,
        endLine: headings[0].startLine - 1,
      });
    }

    // Content for each heading
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      const endLine = nextHeading ? nextHeading.startLine - 1 : lines.length;

      sections.push({
        heading,
        content: lines.slice(heading.startLine - 1, endLine).join('\n'),
        startLine: heading.startLine,
        endLine,
      });
    }

    return sections;
  }

  /**
   * Detect language of text (simple heuristic)
   */
  protected detectLanguage(text: string): string | null {
    // Simple heuristic based on common words
    const englishWords = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'and', 'or', 'but'];
    const words = text.toLowerCase().split(/\s+/).slice(0, 100);
    const englishCount = words.filter((w) => englishWords.includes(w)).length;

    if (englishCount > 5) {
      return 'en';
    }

    return null;
  }
}
