/**
 * Tests for Document Extraction
 */

import { describe, it, expect } from 'vitest';
import { MarkdownExtractor } from '../extraction/markdown-extractor';
import { PlainTextExtractor } from '../extraction/plaintext-extractor';
import { CodeExtractor } from '../extraction/code-extractor';
import { JsonExtractor, YamlExtractor } from '../extraction/json-extractor';
import { extractContent, getExtractor } from '../extraction';
import { RawDocument } from '../types';

describe('MarkdownExtractor', () => {
  const extractor = new MarkdownExtractor();

  const createDoc = (content: string): RawDocument => ({
    path: '/test/doc.md',
    filename: 'doc.md',
    filetype: 'markdown',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  it('extracts text without markdown syntax', async () => {
    const doc = createDoc('# Hello World\n\nThis is a **test**.');
    const text = await extractor.getText(doc);

    expect(text).not.toContain('#');
    expect(text).not.toContain('**');
    expect(text).toContain('Hello World');
    expect(text).toContain('test');
  });

  it('extracts headings from structure', async () => {
    const doc = createDoc('# Heading 1\n\n## Heading 2\n\nContent here');
    const structure = await extractor.getStructure(doc);

    expect(structure.hasHeadings).toBe(true);
    expect(structure.headings).toHaveLength(2);
    expect(structure.headings[0].level).toBe(1);
    expect(structure.headings[0].text).toBe('Heading 1');
    expect(structure.headings[1].level).toBe(2);
  });

  it('extracts code blocks', async () => {
    const doc = createDoc('```typescript\nconst x = 1;\n```');
    const codeBlocks = await extractor.getCodeBlocks(doc);

    expect(codeBlocks).toHaveLength(1);
    expect(codeBlocks[0].language).toBe('typescript');
    expect(codeBlocks[0].content).toContain('const x = 1');
  });

  it('extracts frontmatter metadata', async () => {
    const doc = createDoc('---\ntitle: Test Doc\nauthor: John\n---\n\n# Content');
    const metadata = await extractor.getMetadata(doc);

    expect(metadata.title).toBe('Test Doc');
    expect(metadata.frontmatter?.author).toBe('John');
  });

  it('counts words correctly', async () => {
    const doc = createDoc('One two three four five.');
    const metadata = await extractor.getMetadata(doc);

    expect(metadata.wordCount).toBe(5);
  });
});

describe('PlainTextExtractor', () => {
  const extractor = new PlainTextExtractor();

  const createDoc = (content: string): RawDocument => ({
    path: '/test/doc.txt',
    filename: 'doc.txt',
    filetype: 'plaintext',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  it('returns content as-is', async () => {
    const doc = createDoc('Hello World');
    const text = await extractor.getText(doc);

    expect(text).toBe('Hello World');
  });

  it('has no headings', async () => {
    const doc = createDoc('Some text here');
    const structure = await extractor.getStructure(doc);

    expect(structure.hasHeadings).toBe(false);
    expect(structure.headings).toHaveLength(0);
  });
});

describe('CodeExtractor', () => {
  const extractor = new CodeExtractor();

  const createDoc = (content: string, filename: string): RawDocument => ({
    path: `/test/${filename}`,
    filename,
    filetype: 'code',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  it('extracts function definitions as headings', async () => {
    const doc = createDoc(
      'export function hello() {\n  return "world";\n}',
      'test.ts'
    );
    const structure = await extractor.getStructure(doc);

    expect(structure.hasHeadings).toBe(true);
    expect(structure.headings.length).toBeGreaterThan(0);
  });

  it('detects test files', async () => {
    const doc = createDoc('describe("test", () => { it("works", () => {}) })', 'test.ts');
    const metadata = await extractor.getMetadata(doc);

    expect(metadata.frontmatter?.hasTests).toBe(true);
  });

  it('detects TypeScript types', async () => {
    const doc = createDoc('interface User { name: string; }', 'types.ts');
    const metadata = await extractor.getMetadata(doc);

    expect(metadata.frontmatter?.hasTypes).toBe(true);
  });
});

describe('JsonExtractor', () => {
  const extractor = new JsonExtractor();

  const createDoc = (content: string): RawDocument => ({
    path: '/test/config.json',
    filename: 'config.json',
    filetype: 'json',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  it('extracts string values', async () => {
    const doc = createDoc('{"name": "test", "value": 123}');
    const text = await extractor.getText(doc);

    expect(text).toContain('test');
  });

  it('extracts top-level keys as headings', async () => {
    const doc = createDoc('{"config": {"nested": "value"}}');
    const structure = await extractor.getStructure(doc);

    expect(structure.hasHeadings).toBe(true);
    expect(structure.headings.some(h => h.text === 'config')).toBe(true);
  });
});

describe('YamlExtractor', () => {
  const extractor = new YamlExtractor();

  const createDoc = (content: string): RawDocument => ({
    path: '/test/config.yaml',
    filename: 'config.yaml',
    filetype: 'yaml',
    content,
    size: content.length,
    mtime: new Date(),
    ctime: new Date(),
  });

  it('extracts string values', async () => {
    const doc = createDoc('name: test\nvalue: 123');
    const text = await extractor.getText(doc);

    expect(text).toContain('test');
    expect(text).toContain('123');
  });
});

describe('getExtractor', () => {
  it('returns correct extractor for markdown', () => {
    const extractor = getExtractor('markdown');
    expect(extractor).toBeInstanceOf(MarkdownExtractor);
  });

  it('returns correct extractor for code', () => {
    const extractor = getExtractor('code');
    expect(extractor).toBeInstanceOf(CodeExtractor);
  });

  it('returns null for unsupported types', () => {
    const extractor = getExtractor('pdf' as any);
    expect(extractor).toBeNull();
  });
});

describe('extractContent', () => {
  it('extracts all content components', async () => {
    const doc: RawDocument = {
      path: '/test/doc.md',
      filename: 'doc.md',
      filetype: 'markdown',
      content: '# Title\n\nParagraph text.\n\n```js\ncode();\n```',
      size: 100,
      mtime: new Date(),
      ctime: new Date(),
    };

    const content = await extractContent(doc);

    expect(content.text).toBeDefined();
    expect(content.structure).toBeDefined();
    expect(content.metadata).toBeDefined();
    expect(content.codeBlocks).toBeDefined();
  });
});
