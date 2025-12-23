/**
 * OSQR Document Indexing Subsystem - Type Definitions
 *
 * Enables unified awareness across all documents, treating user organizational
 * structures as metadata/tags rather than knowledge boundaries.
 */

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType =
  | 'markdown'
  | 'plaintext'
  | 'code'
  | 'json'
  | 'yaml'
  | 'html'
  | 'pdf'
  | 'docx';

export type InterfaceType = 'web' | 'vscode' | 'mobile' | 'voice' | 'api';

// ============================================================================
// Document Events
// ============================================================================

export interface DocumentEvent {
  type: 'created' | 'modified' | 'deleted';
  documentPath: string;
  documentId?: string;
  interface: InterfaceType;
  conversationId?: string;
  projectId?: string;
  timestamp: Date;
}

// ============================================================================
// Raw Document (Input)
// ============================================================================

export interface RawDocument {
  path: string;
  filename: string;
  filetype: DocumentType;
  content: Buffer | string;
  size: number;
  mtime: Date;
  ctime: Date;
}

// ============================================================================
// Extracted Content
// ============================================================================

export interface ExtractedContent {
  text: string;
  structure: DocumentStructure;
  metadata: ExtractedMetadata;
  codeBlocks: CodeBlock[];
}

export interface DocumentStructure {
  hasHeadings: boolean;
  headings: Heading[];
  sections: Section[];
  paragraphCount: number;
  listCount: number;
}

export interface Heading {
  level: number;
  text: string;
  startLine: number;
  endLine: number;
}

export interface Section {
  heading: Heading | null;
  content: string;
  startLine: number;
  endLine: number;
}

export interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  createdAt: Date | null;
  modifiedAt: Date | null;
  wordCount: number;
  language: string | null;
  frontmatter: Record<string, unknown> | null;
}

export interface CodeBlock {
  language: string | null;
  content: string;
  startLine: number;
  endLine: number;
}

// ============================================================================
// Indexed Document
// ============================================================================

export interface IndexedDocument {
  // Identity
  id: string;
  userId: string;

  // Content
  filename: string;
  filetype: DocumentType;
  content: string; // Extracted text
  chunks: DocumentChunk[];

  // Origin Context
  sourceInterface: InterfaceType;
  sourceConversationId: string | null;
  sourceProjectId: string | null;
  sourcePath: string | null;

  // Relationships
  relatedDocuments: string[];
  relatedConversations: string[];
  parentDocument: string | null;

  // Temporal
  createdAt: Date;
  modifiedAt: Date;
  lastAccessedAt: Date;
  versionHistory: DocumentVersion[];

  // Semantic
  topics: string[];
  entities: EntityReference[];
  summary: string;

  // Utility Tracking
  retrievalCount: number;
  utilityScore: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  createdAt: Date;
  changeType: 'created' | 'modified';
  changeSummary: string | null;
}

export interface EntityReference {
  type: 'person' | 'company' | 'concept' | 'technology' | 'place';
  name: string;
  mentions: number;
  positions: number[];
}

// ============================================================================
// Document Chunks
// ============================================================================

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  position: ChunkPosition;
  metadata: ChunkMetadata;
}

export interface ChunkPosition {
  startLine: number;
  endLine: number;
  section: string | null;
  order: number;
}

export interface ChunkMetadata {
  headingContext: string[];
  codeLanguage: string | null;
  isDecision: boolean;
  isQuestion: boolean;
  isAction: boolean;
  tokenCount: number;
}

// ============================================================================
// Multi-Vector Embeddings
// ============================================================================

export interface ChunkEmbeddings {
  content: number[];
  contextual: number[];
  queryable: number[];
}

// ============================================================================
// Relationship Mapping
// ============================================================================

export interface RelationshipMap {
  conversations: ConversationLink[];
  documents: DocumentSimilarity[];
  entities: EntityReference[];
  explicitLinks: ExplicitLink[];
}

export interface ConversationLink {
  conversationId: string;
  mentions: number;
  relevance: number;
  timestamp: Date;
}

export interface DocumentSimilarity {
  documentId: string;
  similarity: number;
  sharedTopics: string[];
  sharedEntities: string[];
}

export interface ExplicitLink {
  type: 'url' | 'file_reference' | 'mention';
  target: string;
  context: string;
  position: number;
}

// ============================================================================
// Retrieval
// ============================================================================

export interface RetrievalResult {
  document: IndexedDocument;
  relevantChunks: DocumentChunk[];
  score: number;
}

export interface DocumentQueryOptions {
  embedding?: number[];
  category?: 'document' | 'document_chunk';
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ComparisonResult {
  byProject: Map<string, RetrievalResult[]>;
  commonThemes: string[];
  differences: Difference[];
}

export interface Difference {
  topic: string;
  projectA: string;
  projectB: string;
  descriptionA: string;
  descriptionB: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DocumentIndexingConfig {
  maxChunkTokens: number;
  chunkOverlapTokens: number;
  minChunkTokens: number;
  embeddingModel: string;
  embeddingDimensions: number;
  supportedTypes: DocumentType[];
  generateQuestions: boolean;
  extractEntities: boolean;
}

export const DEFAULT_INDEXING_CONFIG: DocumentIndexingConfig = {
  maxChunkTokens: 500,
  chunkOverlapTokens: 50,
  minChunkTokens: 100,
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  supportedTypes: ['markdown', 'plaintext', 'code', 'json', 'yaml', 'html', 'pdf', 'docx'],
  generateQuestions: true,
  extractEntities: true,
};

// ============================================================================
// Indexing Pipeline State
// ============================================================================

export interface IndexingProgress {
  documentId: string;
  stage: 'detection' | 'extraction' | 'chunking' | 'embedding' | 'relationships' | 'storage' | 'complete' | 'failed';
  progress: number; // 0-100
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Extractor Interface
// ============================================================================

export interface DocumentExtractor {
  supports(filetype: DocumentType): boolean;
  getText(document: RawDocument): Promise<string>;
  getStructure(document: RawDocument): Promise<DocumentStructure>;
  getMetadata(document: RawDocument): Promise<ExtractedMetadata>;
  getCodeBlocks(document: RawDocument): Promise<CodeBlock[]>;
}
