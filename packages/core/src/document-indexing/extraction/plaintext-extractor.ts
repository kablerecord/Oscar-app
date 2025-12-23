/**
 * OSQR Document Indexing - Plain Text Extractor
 */

import {
  RawDocument,
  DocumentStructure,
  ExtractedMetadata,
  CodeBlock,
} from '../types';
import { BaseExtractor } from './base-extractor';

export class PlainTextExtractor extends BaseExtractor {
  constructor() {
    super(['plaintext']);
  }

  async getText(document: RawDocument): Promise<string> {
    return typeof document.content === 'string'
      ? document.content
      : document.content.toString('utf-8');
  }

  async getStructure(document: RawDocument): Promise<DocumentStructure> {
    const content = await this.getText(document);

    return {
      hasHeadings: false,
      headings: [],
      sections: this.buildSections(content, []),
      paragraphCount: this.countParagraphs(content),
      listCount: this.countLists(content),
    };
  }

  async getMetadata(document: RawDocument): Promise<ExtractedMetadata> {
    const text = await this.getText(document);

    return {
      title: null,
      author: null,
      createdAt: document.ctime,
      modifiedAt: document.mtime,
      wordCount: this.countWords(text),
      language: this.detectLanguage(text),
      frontmatter: null,
    };
  }

  async getCodeBlocks(_document: RawDocument): Promise<CodeBlock[]> {
    // Plain text has no code blocks
    return [];
  }
}
