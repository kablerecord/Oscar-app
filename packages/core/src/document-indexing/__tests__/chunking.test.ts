/**
 * Tests for Semantic Chunking
 */

import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  chunkBySections,
  chunkByParagraphs,
  chunkByCodeBlocks,
  chunkDocument,
} from '../chunking';
import { ExtractedContent, DEFAULT_INDEXING_CONFIG } from '../types';

describe('estimateTokens', () => {
  it('estimates tokens for simple text', () => {
    const text = 'Hello world this is a test';
    const tokens = estimateTokens(text);

    // ~4 chars per token, 26 chars = ~7 tokens
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(15);
  });

  it('handles empty strings', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('chunkBySections', () => {
  const createContent = (sections: string[]): ExtractedContent => ({
    text: sections.join('\n\n'),
    structure: {
      hasHeadings: true,
      headings: sections.map((_, i) => ({
        level: 1,
        text: `Section ${i + 1}`,
        startLine: i * 3 + 1,
        endLine: i * 3 + 1,
      })),
      sections: sections.map((content, i) => ({
        heading: {
          level: 1,
          text: `Section ${i + 1}`,
          startLine: i * 3 + 1,
          endLine: i * 3 + 1,
        },
        content,
        startLine: i * 3 + 1,
        endLine: i * 3 + 3,
      })),
      paragraphCount: sections.length,
      listCount: 0,
    },
    metadata: {
      title: 'Test',
      author: null,
      createdAt: null,
      modifiedAt: null,
      wordCount: 100,
      language: 'en',
      frontmatter: null,
    },
    codeBlocks: [],
  });

  it('creates one chunk per section for small sections', () => {
    const content = createContent([
      'First section content here.',
      'Second section with more text.',
    ]);
    const chunks = chunkBySections(content);

    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toContain('First section');
    expect(chunks[1].content).toContain('Second section');
  });

  it('sets section names in position', () => {
    const content = createContent(['Content for section one.']);
    const chunks = chunkBySections(content);

    expect(chunks[0].position.section).toBe('Section 1');
  });

  it('sets order correctly', () => {
    const content = createContent(['A', 'B', 'C']);
    const chunks = chunkBySections(content);

    expect(chunks[0].position.order).toBe(0);
    expect(chunks[1].position.order).toBe(1);
    expect(chunks[2].position.order).toBe(2);
  });
});

describe('chunkByParagraphs', () => {
  const createContent = (text: string): ExtractedContent => ({
    text,
    structure: {
      hasHeadings: false,
      headings: [],
      sections: [],
      paragraphCount: text.split('\n\n').length,
      listCount: 0,
    },
    metadata: {
      title: null,
      author: null,
      createdAt: null,
      modifiedAt: null,
      wordCount: text.split(/\s+/).length,
      language: 'en',
      frontmatter: null,
    },
    codeBlocks: [],
  });

  it('creates chunks from paragraphs', () => {
    const text = 'First paragraph here.\n\nSecond paragraph there.\n\nThird paragraph.';
    const content = createContent(text);
    const chunks = chunkByParagraphs(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('respects minimum chunk size', () => {
    const text = 'Short.';
    const content = createContent(text);
    const chunks = chunkByParagraphs(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1000,
    });

    expect(chunks.length).toBe(0);
  });
});

describe('chunkByCodeBlocks', () => {
  const createContent = (text: string, codeBlocks: ExtractedContent['codeBlocks']): ExtractedContent => ({
    text,
    structure: {
      hasHeadings: false,
      headings: [],
      sections: [],
      paragraphCount: 1,
      listCount: 0,
    },
    metadata: {
      title: null,
      author: null,
      createdAt: null,
      modifiedAt: null,
      wordCount: text.split(/\s+/).length,
      language: 'en',
      frontmatter: null,
    },
    codeBlocks,
  });

  it('separates code blocks into their own chunks', () => {
    const content = createContent(
      'Some text before.\n\n```\ncode here\n```\n\nSome text after.',
      [{ language: 'javascript', content: 'const x = 1;', startLine: 3, endLine: 5 }]
    );
    const chunks = chunkByCodeBlocks(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    const codeChunk = chunks.find((c) => c.metadata.codeLanguage !== null);
    expect(codeChunk).toBeDefined();
    expect(codeChunk?.metadata.codeLanguage).toBe('javascript');
  });
});

describe('chunkDocument', () => {
  it('uses sections strategy when headings exist', () => {
    const content: ExtractedContent = {
      text: '# Title\n\nContent here.',
      structure: {
        hasHeadings: true,
        headings: [{ level: 1, text: 'Title', startLine: 1, endLine: 1 }],
        sections: [{ heading: { level: 1, text: 'Title', startLine: 1, endLine: 1 }, content: 'Content here.', startLine: 1, endLine: 3 }],
        paragraphCount: 1,
        listCount: 0,
      },
      metadata: {
        title: 'Title',
        author: null,
        createdAt: null,
        modifiedAt: null,
        wordCount: 3,
        language: 'en',
        frontmatter: null,
      },
      codeBlocks: [],
    };

    const chunks = chunkDocument(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('detects decisions in content', () => {
    const content: ExtractedContent = {
      text: 'We decided to use TypeScript for this project.',
      structure: {
        hasHeadings: false,
        headings: [],
        sections: [],
        paragraphCount: 1,
        listCount: 0,
      },
      metadata: {
        title: null,
        author: null,
        createdAt: null,
        modifiedAt: null,
        wordCount: 8,
        language: 'en',
        frontmatter: null,
      },
      codeBlocks: [],
    };

    const chunks = chunkDocument(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    expect(chunks[0]?.metadata.isDecision).toBe(true);
  });

  it('detects questions in content', () => {
    const content: ExtractedContent = {
      text: 'What if we use a different approach?',
      structure: {
        hasHeadings: false,
        headings: [],
        sections: [],
        paragraphCount: 1,
        listCount: 0,
      },
      metadata: {
        title: null,
        author: null,
        createdAt: null,
        modifiedAt: null,
        wordCount: 7,
        language: 'en',
        frontmatter: null,
      },
      codeBlocks: [],
    };

    const chunks = chunkDocument(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    expect(chunks[0]?.metadata.isQuestion).toBe(true);
  });

  it('detects action items in content', () => {
    const content: ExtractedContent = {
      text: 'TODO: Complete the implementation by Friday.',
      structure: {
        hasHeadings: false,
        headings: [],
        sections: [],
        paragraphCount: 1,
        listCount: 0,
      },
      metadata: {
        title: null,
        author: null,
        createdAt: null,
        modifiedAt: null,
        wordCount: 6,
        language: 'en',
        frontmatter: null,
      },
      codeBlocks: [],
    };

    const chunks = chunkDocument(content, {
      ...DEFAULT_INDEXING_CONFIG,
      minChunkTokens: 1,
    });

    expect(chunks[0]?.metadata.isAction).toBe(true);
  });
});
