/**
 * Context Compaction
 *
 * Compacts conversation history to stay within token budget
 * while preserving critical information.
 */

import type {
  WorkingMemoryBuffer,
  Conversation,
  Message,
  CompactionResult,
  WindowConfig,
} from '../types';
import { DEFAULT_WINDOW_CONFIG } from '../types';
import * as episodicStore from '../stores/episodic.store';

/**
 * Compaction configuration
 */
export interface CompactionConfig {
  compactionThreshold: number; // Trigger at this % of token budget
  preserveRecentMessages: number; // Always keep last N messages
  minCompactableMessages: number; // Need at least this many to compact
}

const DEFAULT_CONFIG: CompactionConfig = {
  compactionThreshold: 0.8,
  preserveRecentMessages: 50, // Increased from 4 to preserve conversation continuity
  minCompactableMessages: 10, // Increased from 4 - don't compact until we have meaningful history
};

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if compaction is needed
 */
export function isCompactionNeeded(
  workingMemory: WorkingMemoryBuffer,
  config: Partial<CompactionConfig> = {}
): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const usageRatio = workingMemory.tokensUsed / workingMemory.tokenBudget;
  return usageRatio >= cfg.compactionThreshold;
}

/**
 * Generate a summary of messages for compaction
 * (In production, this would use an LLM)
 */
function generateMessageSummary(messages: Message[]): string {
  if (messages.length === 0) {
    return '';
  }

  // Simple summary for v1.0 - in production, use LLM
  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const topics = new Set<string>();

  // Extract keywords from messages
  for (const msg of messages) {
    const words = msg.content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    words.slice(0, 5).forEach((w) => topics.add(w));
  }

  const topicList = Array.from(topics).slice(0, 5).join(', ');

  return `[Earlier in conversation: ${userMessages.length} user messages and ${assistantMessages.length} assistant responses. Topics discussed: ${topicList || 'general discussion'}]`;
}

/**
 * Compact working memory
 */
export async function compactWorkingMemory(
  workingMemory: WorkingMemoryBuffer,
  config: Partial<CompactionConfig> = {}
): Promise<CompactionResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Check if compaction is needed
  if (!isCompactionNeeded(workingMemory, config)) {
    return {
      compacted: false,
      reason: 'under_threshold',
    };
  }

  const conversation = workingMemory.currentConversation;
  if (!conversation) {
    return {
      compacted: false,
      reason: 'no_conversation',
    };
  }

  const messages = conversation.messages;

  // Check if we have enough messages to compact
  if (messages.length < cfg.minCompactableMessages + cfg.preserveRecentMessages) {
    return {
      compacted: false,
      reason: 'insufficient_history',
    };
  }

  // Identify compactable and preserved messages
  const preserveCount = cfg.preserveRecentMessages;
  const compactableMessages = messages.slice(0, -preserveCount);
  const recentMessages = messages.slice(-preserveCount);

  // Archive compactable messages
  episodicStore.archiveMessages(conversation.id, compactableMessages);

  // Generate summary
  const summary = generateMessageSummary(compactableMessages);

  // Create summary message
  const summaryMessage: Message = {
    id: generateId('msg'),
    role: 'system',
    content: summary,
    timestamp: new Date(),
    tokens: estimateTokens(summary),
    toolCalls: null,
    utilityScore: null,
  };

  // Calculate tokens before compaction
  const tokensBefore = workingMemory.tokensUsed;

  // Update conversation with compacted messages
  episodicStore.replaceMessages(conversation.id, [
    summaryMessage,
    ...recentMessages,
  ]);

  // Update working memory
  const newTokensUsed =
    estimateTokens(summary) +
    recentMessages.reduce((sum, m) => sum + m.tokens, 0);

  workingMemory.tokensUsed = newTokensUsed;
  workingMemory.currentConversation = episodicStore.getConversation(
    conversation.id
  );

  return {
    compacted: true,
    messagesCompacted: compactableMessages.length,
    tokensSaved: tokensBefore - newTokensUsed,
  };
}

/**
 * Force compaction regardless of threshold
 */
export async function forceCompaction(
  workingMemory: WorkingMemoryBuffer,
  preserveRecent: number = 2
): Promise<CompactionResult> {
  return compactWorkingMemory(workingMemory, {
    compactionThreshold: 0, // Always trigger
    preserveRecentMessages: preserveRecent,
    minCompactableMessages: 2,
  });
}

/**
 * Get compaction preview (what would be compacted)
 */
export function getCompactionPreview(
  workingMemory: WorkingMemoryBuffer,
  config: Partial<CompactionConfig> = {}
): {
  wouldCompact: boolean;
  messagesToCompact: number;
  estimatedTokensSaved: number;
} {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!isCompactionNeeded(workingMemory, config)) {
    return {
      wouldCompact: false,
      messagesToCompact: 0,
      estimatedTokensSaved: 0,
    };
  }

  const conversation = workingMemory.currentConversation;
  if (!conversation) {
    return {
      wouldCompact: false,
      messagesToCompact: 0,
      estimatedTokensSaved: 0,
    };
  }

  const messages = conversation.messages;
  const preserveCount = cfg.preserveRecentMessages;

  if (messages.length < cfg.minCompactableMessages + preserveCount) {
    return {
      wouldCompact: false,
      messagesToCompact: 0,
      estimatedTokensSaved: 0,
    };
  }

  const compactableMessages = messages.slice(0, -preserveCount);

  const tokensToRemove = compactableMessages.reduce(
    (sum, m) => sum + m.tokens,
    0
  );

  // Estimate summary tokens (rough estimate: 10% of original)
  const summaryTokens = Math.ceil(tokensToRemove * 0.1);

  return {
    wouldCompact: true,
    messagesToCompact: compactableMessages.length,
    estimatedTokensSaved: tokensToRemove - summaryTokens,
  };
}

/**
 * Calculate current token usage
 */
export function calculateTokenUsage(
  workingMemory: WorkingMemoryBuffer
): {
  used: number;
  budget: number;
  percentage: number;
  remaining: number;
} {
  const { tokensUsed, tokenBudget } = workingMemory;

  return {
    used: tokensUsed,
    budget: tokenBudget,
    percentage: (tokensUsed / tokenBudget) * 100,
    remaining: tokenBudget - tokensUsed,
  };
}

/**
 * Recalculate tokens used in working memory
 */
export function recalculateTokenUsage(
  workingMemory: WorkingMemoryBuffer
): number {
  let tokens = 0;

  // Conversation messages
  if (workingMemory.currentConversation) {
    for (const msg of workingMemory.currentConversation.messages) {
      tokens += msg.tokens;
    }
  }

  // Retrieved context
  for (const retrieved of workingMemory.retrievedContext) {
    if ('content' in retrieved.memory) {
      tokens += estimateTokens(retrieved.memory.content);
    } else if ('summary' in retrieved.memory) {
      tokens += estimateTokens(retrieved.memory.summary);
    }
  }

  workingMemory.tokensUsed = tokens;
  return tokens;
}

// ============================================================================
// Working Window Computation
// ============================================================================

/**
 * Result of computing a working window
 */
export interface WorkingWindowResult {
  /** The computed window of messages */
  window: Message[];
  /** Total tokens in the window */
  tokensUsed: number;
  /** Number of messages excluded from full history */
  messagesExcluded: number;
}

/**
 * Compute the working window from full history
 *
 * This is the core function that creates a "view" into the full history
 * that will be sent to the model. The full history is NEVER modified.
 *
 * @param fullHistory - Complete message history (never modified)
 * @param config - Window configuration
 * @returns The computed window and stats
 */
export function computeWorkingWindow(
  fullHistory: Message[],
  config: Partial<WindowConfig> = {}
): WorkingWindowResult {
  const cfg: WindowConfig = { ...DEFAULT_WINDOW_CONFIG, ...config };

  if (fullHistory.length === 0) {
    return {
      window: [],
      tokensUsed: 0,
      messagesExcluded: 0,
    };
  }

  // Separate system messages if we need to preserve them
  const systemMessages: Message[] = [];
  const nonSystemMessages: Message[] = [];

  if (cfg.preserveSystemMessages) {
    for (const msg of fullHistory) {
      if (msg.role === 'system') {
        systemMessages.push(msg);
      } else {
        nonSystemMessages.push(msg);
      }
    }
  } else {
    nonSystemMessages.push(...fullHistory);
  }

  let selectedMessages: Message[];

  if (cfg.mode === 'messages') {
    // Message-based windowing: take the last N messages
    selectedMessages = nonSystemMessages.slice(-cfg.size);
  } else {
    // Token-based windowing: take as many recent messages as fit
    selectedMessages = [];
    let tokenCount = 0;

    // Start from the end and work backwards
    for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
      const msg = nonSystemMessages[i];
      if (tokenCount + msg.tokens <= cfg.size) {
        selectedMessages.unshift(msg);
        tokenCount += msg.tokens;
      } else {
        break;
      }
    }
  }

  // Combine system messages with selected messages
  // System messages go first, then selected messages in order
  const window = [...systemMessages, ...selectedMessages];

  // Calculate total tokens
  const tokensUsed = window.reduce((sum, msg) => sum + msg.tokens, 0);

  return {
    window,
    tokensUsed,
    messagesExcluded: fullHistory.length - window.length,
  };
}

/**
 * Get a summary of what's been excluded from the working window
 *
 * This can be used to generate a context summary for the model
 * about what happened earlier in the conversation.
 */
export function getExcludedMessagesSummary(
  fullHistory: Message[],
  workingWindow: Message[]
): string | null {
  const windowIds = new Set(workingWindow.map((m) => m.id));
  const excluded = fullHistory.filter((m) => !windowIds.has(m.id));

  if (excluded.length === 0) {
    return null;
  }

  // Generate a simple summary
  const userMessages = excluded.filter((m) => m.role === 'user').length;
  const assistantMessages = excluded.filter((m) => m.role === 'assistant').length;

  // Extract topics from excluded messages
  const topics = new Set<string>();
  for (const msg of excluded) {
    const words = msg.content.toLowerCase().match(/\b\w{5,}\b/g) || [];
    words.slice(0, 3).forEach((w) => topics.add(w));
  }

  const topicList = Array.from(topics).slice(0, 5).join(', ');

  return `[Earlier in this conversation: ${userMessages} user messages and ${assistantMessages} assistant responses. Topics discussed: ${topicList || 'various topics'}]`;
}
