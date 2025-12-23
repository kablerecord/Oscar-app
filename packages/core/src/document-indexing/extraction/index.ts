/**
 * OSQR Document Indexing - Extraction Module
 */

import {
  DocumentExtractor,
  DocumentType,
  RawDocument,
  ExtractedContent,
} from '../types';
import { MarkdownExtractor } from './markdown-extractor';
import { PlainTextExtractor } from './plaintext-extractor';
import { CodeExtractor } from './code-extractor';
import { JsonExtractor, YamlExtractor } from './json-extractor';

// ============================================================================
// Extractor Registry
// ============================================================================

const extractors: DocumentExtractor[] = [
  new MarkdownExtractor(),
  new PlainTextExtractor(),
  new CodeExtractor(),
  new JsonExtractor(),
  new YamlExtractor(),
];

/**
 * Get the appropriate extractor for a document type
 */
export function getExtractor(filetype: DocumentType): DocumentExtractor | null {
  return extractors.find((e) => e.supports(filetype)) || null;
}

/**
 * Extract content from a document
 */
export async function extractContent(document: RawDocument): Promise<ExtractedContent> {
  const extractor = getExtractor(document.filetype);

  if (!extractor) {
    throw new Error(`No extractor available for file type: ${document.filetype}`);
  }

  const [text, structure, metadata, codeBlocks] = await Promise.all([
    extractor.getText(document),
    extractor.getStructure(document),
    extractor.getMetadata(document),
    extractor.getCodeBlocks(document),
  ]);

  return {
    text,
    structure,
    metadata,
    codeBlocks,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { BaseExtractor } from './base-extractor';
export { MarkdownExtractor } from './markdown-extractor';
export { PlainTextExtractor } from './plaintext-extractor';
export { CodeExtractor } from './code-extractor';
export { JsonExtractor, YamlExtractor } from './json-extractor';
