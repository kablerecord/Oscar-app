/**
 * Prospective Reflection - Memory Synthesis from Conversations
 *
 * Extracts facts and knowledge from conversations to create
 * new semantic memories. Handles contradiction detection and resolution.
 */

import type {
  Conversation,
  SemanticMemory,
  MemoryCategory,
  MemorySource,
  SynthesisResult,
  ReflectionResult,
} from '../types';
import * as semanticStore from '../stores/semantic.store';
import * as episodicStore from '../stores/episodic.store';
import { generateEmbedding } from '../retrieval/embedding';

/**
 * Extracted fact from conversation
 */
export interface ExtractedFact {
  content: string;
  category: MemoryCategory;
  confidence: number;
  topics: string[];
  contradicts?: string[];
  supersedes?: string[];
}

/**
 * Fact extraction patterns for different categories
 */
const EXTRACTION_PATTERNS: Record<MemoryCategory, RegExp[]> = {
  personal_info: [
    /my name is (\w+)/i,
    /i(?:'m| am) (\d+) years old/i,
    /i live in ([\w\s]+)/i,
    /i(?:'m| am) from ([\w\s]+)/i,
  ],
  business_info: [
    /i work (?:at|for) ([\w\s]+)/i,
    /my company (?:is|called) ([\w\s]+)/i,
    /i(?:'m| am) (?:a|an|the) ([\w\s]+) (?:at|for)/i,
    /our (?:company|business|startup) ([\w\s]+)/i,
  ],
  relationships: [
    /my (?:wife|husband|spouse|partner) ([\w\s]+)/i,
    /my (?:friend|colleague|coworker) ([\w\s]+)/i,
    /i work with ([\w\s]+)/i,
  ],
  projects: [
    /(?:working on|building|developing) ([\w\s]+)/i,
    /(?:project|app|product) (?:called|named) ([\w\s]+)/i,
    /launching ([\w\s]+) (?:in|by)/i,
  ],
  preferences: [
    /i (?:prefer|like|love) ([\w\s]+)/i,
    /i (?:don't like|dislike|hate) ([\w\s]+)/i,
    /i (?:always|usually|never) ([\w\s]+)/i,
  ],
  domain_knowledge: [
    /i(?:'m| am) (?:an expert|experienced) in ([\w\s]+)/i,
    /i (?:specialize|specialized) in ([\w\s]+)/i,
    /my (?:expertise|specialty) is ([\w\s]+)/i,
  ],
  decisions: [
    /i(?:'ve| have) decided to ([\w\s]+)/i,
    /we(?:'re| are) going to ([\w\s]+)/i,
    /the decision is to ([\w\s]+)/i,
  ],
  commitments: [
    /i(?:'ll| will) ([\w\s]+) by ([\w\s]+)/i,
    /i promise to ([\w\s]+)/i,
    /deadline (?:is|for) ([\w\s]+)/i,
  ],
};

/**
 * Extract facts from conversation text using pattern matching
 */
export function extractFactsFromText(
  text: string,
  sourceId: string
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  for (const [category, patterns] of Object.entries(EXTRACTION_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          facts.push({
            content: match[0].trim(),
            category: category as MemoryCategory,
            confidence: 0.7, // Pattern-based extraction has moderate confidence
            topics: extractTopics(match[0]),
          });
        }
      }
    }
  }

  return facts;
}

/**
 * Extract topics from text
 */
function extractTopics(text: string): string[] {
  // Simple keyword extraction
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'i', 'my',
    'me', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
    'them', 'this', 'that', 'these', 'those', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'as', 'and', 'or',
    'but', 'if', 'then', 'so', 'because', 'while', 'although',
  ]);

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const topics = words.filter(
    (word) => word.length > 3 && !stopWords.has(word)
  );

  // Return unique topics
  return [...new Set(topics)].slice(0, 5);
}

/**
 * Find contradicting memories for a new fact
 */
export function findContradictions(
  fact: ExtractedFact,
  existingMemories: SemanticMemory[]
): SemanticMemory[] {
  // Simple contradiction detection: same category with conflicting content
  const sameCategory = existingMemories.filter(
    (m) => m.category === fact.category
  );

  // For v1.0, detect contradictions by topic overlap with different content
  const contradictions: SemanticMemory[] = [];

  for (const memory of sameCategory) {
    const topicOverlap = fact.topics.filter((t) =>
      memory.metadata.topics.includes(t)
    );

    if (topicOverlap.length > 0) {
      // Check if content is significantly different
      const factWords = new Set(fact.content.toLowerCase().split(/\s+/));
      const memoryWords = new Set(memory.content.toLowerCase().split(/\s+/));

      let overlap = 0;
      for (const word of factWords) {
        if (memoryWords.has(word)) overlap++;
      }

      const similarity =
        overlap / Math.max(factWords.size, memoryWords.size);

      // If same topics but low similarity, might be contradiction
      if (similarity < 0.5) {
        contradictions.push(memory);
      }
    }
  }

  return contradictions;
}

/**
 * Create a semantic memory from an extracted fact
 */
export async function createMemoryFromFact(
  fact: ExtractedFact,
  conversationId: string
): Promise<SemanticMemory> {
  const { embedding } = await generateEmbedding(fact.content);

  const source: MemorySource = {
    type: 'conversation',
    sourceId: conversationId,
    timestamp: new Date(),
    confidence: fact.confidence,
  };

  const memory = semanticStore.createMemory(
    fact.content,
    fact.category,
    source,
    embedding,
    fact.confidence
  );

  // Add topics
  semanticStore.addTopics(memory.id, fact.topics);

  // Mark contradictions
  if (fact.contradicts) {
    for (const contradictedId of fact.contradicts) {
      semanticStore.markContradiction(memory.id, contradictedId);
    }
  }

  // Mark supersessions
  if (fact.supersedes) {
    for (const supersededId of fact.supersedes) {
      semanticStore.markSupersession(memory.id, supersededId);
    }
  }

  return memory;
}

/**
 * Synthesize memories from a conversation
 */
export async function synthesizeFromConversation(
  conversation: Conversation
): Promise<SynthesisResult> {
  const newMemories: SemanticMemory[] = [];
  let contradictionsResolved = 0;

  // Combine all user messages for fact extraction
  const userText = conversation.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join('\n');

  // Extract facts
  const facts = extractFactsFromText(userText, conversation.id);

  // Get existing memories for contradiction checking
  const existingMemories = semanticStore.getAllMemories();

  // Process each fact
  for (const fact of facts) {
    // Find contradictions
    const contradictions = findContradictions(fact, existingMemories);

    if (contradictions.length > 0) {
      // Determine if new fact should replace old ones
      const avgOldConfidence =
        contradictions.reduce((sum, m) => sum + m.confidence, 0) /
        contradictions.length;

      if (fact.confidence > avgOldConfidence) {
        // New fact wins - mark old ones as superseded
        fact.supersedes = contradictions.map((m) => m.id);
        contradictionsResolved += contradictions.length;
      } else {
        // Keep existing memories, don't create new one
        continue;
      }
    }

    // Create memory
    const memory = await createMemoryFromFact(fact, conversation.id);
    newMemories.push(memory);
  }

  // Generate conversation summary if not exists
  let conversationSummary = conversation.summary || '';
  if (!conversationSummary && conversation.messages.length > 0) {
    conversationSummary = generateConversationSummary(conversation);
    episodicStore.updateConversationSummary(
      conversation.id,
      conversationSummary
    );
  }

  return {
    newMemories,
    conversationSummary,
    contradictionsResolved,
  };
}

/**
 * Generate a simple conversation summary
 */
function generateConversationSummary(conversation: Conversation): string {
  const userMessages = conversation.messages.filter((m) => m.role === 'user');
  const assistantMessages = conversation.messages.filter(
    (m) => m.role === 'assistant'
  );

  if (userMessages.length === 0) {
    return 'Empty conversation.';
  }

  // Get key topics from metadata
  const topics = conversation.metadata.topics.slice(0, 3).join(', ') || 'general discussion';

  // Get sentiment
  const sentiment = conversation.metadata.sentiment;

  // Simple summary template
  const messageCount = conversation.messages.length;
  const summary = `Conversation with ${messageCount} messages about ${topics}. User sentiment was ${sentiment}.`;

  return summary;
}

/**
 * Run prospective reflection on recent conversations
 */
export async function runProspectiveReflection(
  userId: string,
  hoursBack: number = 24
): Promise<ReflectionResult> {
  const store = episodicStore.getEpisodicStore(userId);

  // Find conversations that haven't been synthesized yet
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const recentConversations = store.conversations.filter(
    (c) =>
      c.endedAt &&
      c.endedAt >= cutoffTime &&
      (!c.summary || c.summary === '')
  );

  let memoriesCreated = 0;
  let contradictionsFound = 0;

  for (const conversation of recentConversations) {
    const result = await synthesizeFromConversation(conversation);
    memoriesCreated += result.newMemories.length;
    contradictionsFound += result.contradictionsResolved;
  }

  return {
    conversationsProcessed: recentConversations.length,
    memoriesCreated,
    contradictionsFound,
  };
}

/**
 * Manually trigger synthesis for a specific conversation
 */
export async function synthesizeConversation(
  conversationId: string
): Promise<SynthesisResult | null> {
  const conversation = episodicStore.getConversation(conversationId);
  if (!conversation) return null;

  return synthesizeFromConversation(conversation);
}
