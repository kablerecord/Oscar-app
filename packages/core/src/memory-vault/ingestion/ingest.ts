/**
 * External Chat Ingestion
 *
 * Accepts conversation transcripts from external sources,
 * parses them into our Message format, and queues for synthesis.
 *
 * Supported sources: Claude, ChatGPT, Slack, Discord, Email, Custom
 */

import type { Message, Conversation } from '../types';
import * as episodicStore from '../stores/episodic.store';
import { enqueue as enqueueSynthesis } from '../synthesis/queue';
import { initializeVault, getVault, endConversationForUser } from '../vault';

// ============================================================================
// Types
// ============================================================================

/**
 * Supported ingestion sources
 */
export type IngestSource = 'claude' | 'chatgpt' | 'slack' | 'discord' | 'email' | 'custom';

/**
 * Ingestion request
 */
export interface IngestRequest {
  /** Source of the conversation */
  source: IngestSource;
  /** Raw transcript (text or JSON string) */
  transcript: string;
  /** Optional metadata */
  metadata?: {
    /** Original ID from source system */
    originalId?: string;
    /** When conversation occurred */
    timestamp?: Date;
    /** Participants involved */
    participants?: string[];
    /** Link to OSQR project */
    projectId?: string;
    /** Custom tags */
    tags?: string[];
  };
  /** Transcript format */
  format?: 'raw' | 'json' | 'markdown';
}

/**
 * Ingestion result
 */
export interface IngestResult {
  success: boolean;
  conversationId?: string;
  jobId?: string;
  messageCount?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Parser interface
 */
interface ConversationParser {
  parse(transcript: string): ParsedMessage[];
}

/**
 * Parsed message (before conversion to Message type)
 */
interface ParsedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  author?: string;
}

// ============================================================================
// Parsers
// ============================================================================

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Claude conversation parser
 * Format: "Human: ...\n\nAssistant: ..."
 */
const claudeParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const pattern = /(Human|Assistant):\s*([\s\S]*?)(?=(?:Human|Assistant):|$)/gi;

    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      const role = match[1].toLowerCase() === 'human' ? 'user' : 'assistant';
      const content = match[2].trim();

      if (content) {
        messages.push({ role, content });
      }
    }

    return messages;
  },
};

/**
 * ChatGPT conversation parser
 * Supports both JSON export and text format
 */
const chatgptParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    // Try JSON first
    try {
      const data = JSON.parse(transcript);

      // ChatGPT export format
      if (data.mapping) {
        // Full ChatGPT export format
        const messages: ParsedMessage[] = [];
        const nodes = Object.values(data.mapping) as any[];

        for (const node of nodes) {
          if (node.message?.content?.parts) {
            const content = node.message.content.parts.join('');
            const role = node.message.author.role === 'user' ? 'user' : 'assistant';

            if (content.trim()) {
              messages.push({
                role,
                content,
                timestamp: node.message.create_time
                  ? new Date(node.message.create_time * 1000)
                  : undefined,
              });
            }
          }
        }

        return messages;
      }

      // Simple messages array
      if (Array.isArray(data.messages)) {
        return data.messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
        }));
      }

      // Direct array
      if (Array.isArray(data)) {
        return data.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        }));
      }
    } catch {
      // Not JSON, fall through to text parsing
    }

    // Text format: "User: ...\nAssistant: ..."
    const messages: ParsedMessage[] = [];
    const pattern = /(User|ChatGPT|Assistant):\s*([\s\S]*?)(?=(?:User|ChatGPT|Assistant):|$)/gi;

    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      const role = match[1].toLowerCase() === 'user' ? 'user' : 'assistant';
      const content = match[2].trim();

      if (content) {
        messages.push({ role, content });
      }
    }

    return messages;
  },
};

/**
 * Slack conversation parser
 * Format: "[timestamp] username: message"
 */
const slackParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    const lines = transcript.split('\n');

    for (const line of lines) {
      // Match: [time] username: message or time username: message
      const match = line.match(
        /^\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*([^:]+):\s*(.+)$/i
      );

      if (match) {
        const [, _time, author, content] = match;

        messages.push({
          role: 'user', // Slack messages are user input
          content: content.trim(),
          author: author.trim(),
        });
      }
    }

    return messages;
  },
};

/**
 * Discord conversation parser
 * Similar to Slack
 */
const discordParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    return slackParser.parse(transcript);
  },
};

/**
 * Email thread parser
 * Format: "From: ...\n" or "On ... wrote:\n"
 */
const emailParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    const messages: ParsedMessage[] = [];

    // Split by email boundaries
    const emailPattern = /(?:From:\s*[^\n]+|On\s+[^\n]+wrote:)/gi;
    const parts = transcript.split(emailPattern).filter((p) => p.trim());

    for (const part of parts) {
      const content = part.trim();
      if (content) {
        messages.push({
          role: 'user',
          content,
        });
      }
    }

    // If no patterns matched, treat as single message
    if (messages.length === 0 && transcript.trim()) {
      messages.push({
        role: 'user',
        content: transcript.trim(),
      });
    }

    return messages;
  },
};

/**
 * Custom/generic parser
 * Alternates roles between paragraphs
 */
const customParser: ConversationParser = {
  parse(transcript: string): ParsedMessage[] {
    const paragraphs = transcript.split(/\n\n+/).filter((p) => p.trim());

    return paragraphs.map((content, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: content.trim(),
    }));
  },
};

/**
 * Parser registry
 */
const parsers: Record<IngestSource, ConversationParser> = {
  claude: claudeParser,
  chatgpt: chatgptParser,
  slack: slackParser,
  discord: discordParser,
  email: emailParser,
  custom: customParser,
};

// ============================================================================
// Ingestion Functions
// ============================================================================

/**
 * Ingest a single conversation
 */
export async function ingestConversation(
  userId: string,
  request: IngestRequest
): Promise<IngestResult> {
  const warnings: string[] = [];

  try {
    // 1. Parse transcript into messages
    const parser = parsers[request.source];
    const parsedMessages = parser.parse(request.transcript);

    if (parsedMessages.length === 0) {
      return { success: false, error: 'no_messages_parsed' };
    }

    // 2. Get or create vault
    let vault = getVault(userId);
    if (!vault) {
      vault = await initializeVault(userId);
    }

    // 3. Create conversation
    const projectId = request.metadata?.projectId || null;
    const conversationId = vault.startConversation(projectId);

    // 4. Add messages
    const timestamp = request.metadata?.timestamp || new Date();
    let messageCount = 0;

    for (let i = 0; i < parsedMessages.length; i++) {
      const parsed = parsedMessages[i];

      // Calculate timestamp offset (spread messages over time)
      const msgTimestamp = new Date(
        timestamp.getTime() + i * 1000 // 1 second between messages
      );

      const message: Omit<Message, 'id'> = {
        role: parsed.role,
        content: parsed.content,
        timestamp: parsed.timestamp || msgTimestamp,
        tokens: estimateTokens(parsed.content),
        toolCalls: null,
        utilityScore: null,
      };

      const stored = vault.addMessage(message);
      if (stored) {
        messageCount++;
      }
    }

    // 5. Add metadata to conversation
    const conversation = episodicStore.getConversation(conversationId);
    if (conversation) {
      // Add import source tag
      const tags = [`imported_from_${request.source}`];
      if (request.metadata?.tags) {
        tags.push(...request.metadata.tags);
      }

      episodicStore.addTopics(conversationId, tags);

      // Store external ID for deduplication
      if (request.metadata?.originalId) {
        (conversation as any).externalId = request.metadata.originalId;
      }

      // Add participant info
      if (request.metadata?.participants) {
        for (const participant of request.metadata.participants) {
          episodicStore.addEntity(conversationId, {
            name: participant,
            type: 'person',
            mentions: 1,
          });
        }
      }
    }

    // 6. End conversation and queue for synthesis
    const endResult = await endConversationForUser(userId);
    const jobId = endResult.queued ? endResult.jobId : undefined;

    return {
      success: true,
      conversationId,
      jobId,
      messageCount,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('[Ingestion] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'ingestion_failed',
    };
  }
}

/**
 * Ingest multiple conversations in batch
 */
export async function ingestBatch(
  userId: string,
  requests: IngestRequest[]
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const request of requests) {
    const result = await ingestConversation(userId, request);
    results.push(result);
  }

  return results;
}

/**
 * Check for duplicate ingestion
 */
export function checkDuplicate(
  userId: string,
  source: IngestSource,
  originalId: string
): boolean {
  const store = episodicStore.getEpisodicStore(userId);

  for (const conversation of store.conversations) {
    if ((conversation as any).externalId === originalId) {
      return true;
    }
  }

  return false;
}

/**
 * Get ingestion statistics for a user
 */
export function getIngestionStats(userId: string): {
  totalImported: number;
  bySource: Record<IngestSource, number>;
} {
  const store = episodicStore.getEpisodicStore(userId);
  const stats = {
    totalImported: 0,
    bySource: {
      claude: 0,
      chatgpt: 0,
      slack: 0,
      discord: 0,
      email: 0,
      custom: 0,
    } as Record<IngestSource, number>,
  };

  for (const conversation of store.conversations) {
    for (const topic of conversation.metadata.topics) {
      if (topic.startsWith('imported_from_')) {
        const source = topic.replace('imported_from_', '') as IngestSource;
        if (source in stats.bySource) {
          stats.bySource[source]++;
          stats.totalImported++;
        }
        break;
      }
    }
  }

  return stats;
}

