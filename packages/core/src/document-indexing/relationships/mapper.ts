/**
 * OSQR Document Indexing - Relationship Mapping
 *
 * Maps relationships between documents, conversations, and entities.
 */

import {
  IndexedDocument,
  RelationshipMap,
  ConversationLink,
  DocumentSimilarity,
  EntityReference,
  ExplicitLink,
} from '../types';
import { cosineSimilarity, embed } from '../embedding';

// ============================================================================
// Relationship Mapping
// ============================================================================

/**
 * Map all relationships for a document
 */
export async function mapRelationships(
  document: IndexedDocument,
  existingDocuments: IndexedDocument[] = [],
  conversationHistory: Array<{ id: string; content: string; timestamp: Date }> = []
): Promise<RelationshipMap> {
  const [conversations, documents, entities, explicitLinks] = await Promise.all([
    findConversationReferences(document, conversationHistory),
    findSimilarDocuments(document, existingDocuments),
    extractEntities(document.content),
    findExplicitLinks(document.content),
  ]);

  return {
    conversations,
    documents,
    entities,
    explicitLinks,
  };
}

// ============================================================================
// Conversation References
// ============================================================================

/**
 * Find conversations that reference this document
 */
export async function findConversationReferences(
  document: IndexedDocument,
  conversationHistory: Array<{ id: string; content: string; timestamp: Date }> = []
): Promise<ConversationLink[]> {
  const links: ConversationLink[] = [];
  const docTerms = extractKeyTerms(document.content);

  for (const conversation of conversationHistory) {
    const mentions = countMentions(conversation.content, docTerms);
    if (mentions > 0) {
      // Calculate relevance based on term overlap and recency
      const recencyBoost = getRecencyBoost(conversation.timestamp);
      const relevance = Math.min(1, (mentions / docTerms.length) * recencyBoost);

      links.push({
        conversationId: conversation.id,
        mentions,
        relevance,
        timestamp: conversation.timestamp,
      });
    }
  }

  return links.sort((a, b) => b.relevance - a.relevance);
}

// ============================================================================
// Document Similarity
// ============================================================================

/**
 * Find similar documents by content similarity
 */
export async function findSimilarDocuments(
  document: IndexedDocument,
  existingDocuments: IndexedDocument[],
  threshold = 0.7,
  maxResults = 10
): Promise<DocumentSimilarity[]> {
  if (existingDocuments.length === 0) {
    return [];
  }

  const similarities: DocumentSimilarity[] = [];

  // Get document embedding (use first chunk or summary)
  const docEmbedding = document.chunks.length > 0
    ? document.chunks[0].embedding
    : await embed(document.summary || document.content);

  for (const existingDoc of existingDocuments) {
    if (existingDoc.id === document.id) continue;

    // Get existing document embedding
    const existingEmbedding = existingDoc.chunks.length > 0
      ? existingDoc.chunks[0].embedding
      : await embed(existingDoc.summary || existingDoc.content);

    const similarity = cosineSimilarity(docEmbedding, existingEmbedding);

    if (similarity >= threshold) {
      similarities.push({
        documentId: existingDoc.id,
        similarity,
        sharedTopics: findSharedTopics(document.topics, existingDoc.topics),
        sharedEntities: findSharedEntities(document.entities, existingDoc.entities),
      });
    }
  }

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Extract entities from document content
 */
export async function extractEntities(content: string): Promise<EntityReference[]> {
  const entities: Map<string, EntityReference> = new Map();

  // Extract patterns for different entity types

  // Person names (simple heuristic - capitalized words not at sentence start)
  const personPattern = /(?<=[.!?]\s+|\n)\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  for (const match of content.matchAll(personPattern)) {
    addEntity(entities, match[1], 'person', match.index || 0);
  }

  // Company names (look for Inc, LLC, Corp, etc.)
  const companyPattern = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:Inc|LLC|Corp|Ltd|Co)\b/g;
  for (const match of content.matchAll(companyPattern)) {
    addEntity(entities, match[1], 'company', match.index || 0);
  }

  // Technology terms (common tech patterns)
  const techPattern = /\b(React|Vue|Angular|Node\.?js|TypeScript|JavaScript|Python|Go|Rust|Docker|Kubernetes|AWS|GCP|Azure|PostgreSQL|MongoDB|Redis)\b/gi;
  for (const match of content.matchAll(techPattern)) {
    addEntity(entities, match[1], 'technology', match.index || 0);
  }

  // Concepts (terms in quotes or emphasized)
  const conceptPattern = /"([^"]+)"|'([^']+)'|\*\*([^*]+)\*\*/g;
  for (const match of content.matchAll(conceptPattern)) {
    const concept = match[1] || match[2] || match[3];
    if (concept && concept.split(/\s+/).length <= 4) {
      addEntity(entities, concept, 'concept', match.index || 0);
    }
  }

  return Array.from(entities.values());
}

function addEntity(
  entities: Map<string, EntityReference>,
  name: string,
  type: EntityReference['type'],
  position: number
): void {
  const normalizedName = name.trim();
  const existing = entities.get(normalizedName.toLowerCase());

  if (existing) {
    existing.mentions++;
    existing.positions.push(position);
  } else {
    entities.set(normalizedName.toLowerCase(), {
      type,
      name: normalizedName,
      mentions: 1,
      positions: [position],
    });
  }
}

// ============================================================================
// Explicit Link Detection
// ============================================================================

/**
 * Find explicit links in document content
 */
export async function findExplicitLinks(content: string): Promise<ExplicitLink[]> {
  const links: ExplicitLink[] = [];

  // URLs
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  for (const match of content.matchAll(urlPattern)) {
    links.push({
      type: 'url',
      target: match[0],
      context: getContext(content, match.index || 0),
      position: match.index || 0,
    });
  }

  // File references
  const filePattern = /(?:\.\/|\.\.\/|\/)?[\w-]+(?:\/[\w-]+)*\.\w{2,4}/g;
  for (const match of content.matchAll(filePattern)) {
    // Skip URLs
    if (!match[0].startsWith('http')) {
      links.push({
        type: 'file_reference',
        target: match[0],
        context: getContext(content, match.index || 0),
        position: match.index || 0,
      });
    }
  }

  // Mentions (@username, #tag)
  const mentionPattern = /[@#][\w-]+/g;
  for (const match of content.matchAll(mentionPattern)) {
    links.push({
      type: 'mention',
      target: match[0],
      context: getContext(content, match.index || 0),
      position: match.index || 0,
    });
  }

  return links;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractKeyTerms(content: string): string[] {
  // Simple term extraction - in production would use TF-IDF or similar
  const words = content.toLowerCase().split(/\s+/);
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our', 'you',
    'your', 'he', 'she', 'him', 'her', 'his', 'hers',
  ]);

  const terms = words
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i);

  return terms.slice(0, 20);
}

function countMentions(content: string, terms: string[]): number {
  const lowerContent = content.toLowerCase();
  return terms.filter((term) => lowerContent.includes(term)).length;
}

function getRecencyBoost(timestamp: Date): number {
  const daysSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0.5, 1 - daysSince / 365);
}

function findSharedTopics(topicsA: string[], topicsB: string[]): string[] {
  const setB = new Set(topicsB.map((t) => t.toLowerCase()));
  return topicsA.filter((t) => setB.has(t.toLowerCase()));
}

function findSharedEntities(
  entitiesA: EntityReference[],
  entitiesB: EntityReference[]
): string[] {
  const namesB = new Set(entitiesB.map((e) => e.name.toLowerCase()));
  return entitiesA
    .filter((e) => namesB.has(e.name.toLowerCase()))
    .map((e) => e.name);
}

function getContext(content: string, position: number, contextLength = 50): string {
  const start = Math.max(0, position - contextLength);
  const end = Math.min(content.length, position + contextLength);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}
