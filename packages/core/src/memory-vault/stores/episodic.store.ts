/**
 * Episodic Store - Conversation and Session Storage
 *
 * Manages episodic memory: conversations, messages, and sessions.
 * This is the "what happened" memory type.
 * Supports optional Chroma persistence for data durability.
 */

import type {
  EpisodicStore,
  Conversation,
  Message,
  Session,
  ConversationMetadata,
  Entity,
  Commitment,
  EpisodicSummary,
} from '../types';

// In-memory storage (always used for fast access)
const conversations = new Map<string, Conversation>();
const sessions = new Map<string, Session>();
const archivedMessages = new Map<string, Message[]>();

// Persistence state
let persistenceEnabled = false;
let chromaCollection: unknown = null;
let userId: string | undefined;

// Encryption state
let encryptionEnabled = false;

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Estimate token count for a string (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// Persistence Control
// ============================================================================

/**
 * Enable Chroma persistence
 * Call this after initializing Chroma to enable data durability
 * @param userIdParam - User ID for collection isolation
 * @param enableEncryptionParam - Enable encryption at rest (requires userIdParam)
 */
export async function enablePersistence(
  userIdParam?: string,
  enableEncryptionParam: boolean = false
): Promise<void> {
  const { initializeChroma, getOrCreateCollection } = await import('../chroma');

  await initializeChroma();
  userId = userIdParam;
  chromaCollection = await getOrCreateCollection('episodic', userId);
  persistenceEnabled = true;

  // Enable encryption if requested and user ID is provided
  if (enableEncryptionParam && userIdParam) {
    const { enableEncryption, KEY_PURPOSES } = await import('../encryption');
    await enableEncryption(userIdParam, KEY_PURPOSES.EPISODIC_MESSAGES);
    encryptionEnabled = true;
  }

  // Load existing data from Chroma
  await loadFromChroma();
}

/**
 * Disable persistence (use in-memory only)
 */
export function disablePersistence(): void {
  persistenceEnabled = false;
  chromaCollection = null;

  if (encryptionEnabled) {
    import('../encryption').then(({ disableEncryption }) => {
      disableEncryption();
    });
    encryptionEnabled = false;
  }
}

/**
 * Check if persistence is enabled
 */
export function isPersistenceEnabled(): boolean {
  return persistenceEnabled;
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return encryptionEnabled;
}

/**
 * Load all data from Chroma into memory
 */
async function loadFromChroma(): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { queryAll, deserializeMetadata, EPISODIC_METADATA_SCHEMA } = await import('../chroma');

  const results = await queryAll(chromaCollection as any);

  for (const result of results) {
    const metadata = deserializeMetadata(
      result.metadata as Record<string, string | number | boolean>,
      EPISODIC_METADATA_SCHEMA
    );

    const docType = metadata.docType as string;

    if (docType === 'session') {
      const session: Session = {
        id: result.id,
        userId: metadata.userId as string,
        startedAt: new Date(metadata.startedAt as string),
        endedAt: metadata.endedAt ? new Date(metadata.endedAt as string) : null,
        deviceType: metadata.deviceType as Session['deviceType'],
        conversationIds: (metadata.conversationIds as string[]) || [],
      };
      sessions.set(session.id, session);
    } else if (docType === 'conversation') {
      // Decrypt messages if encrypted
      let messages = (metadata.messages as Message[]) || [];
      let summary = (metadata.summary as string) || null;

      if (encryptionEnabled && metadata._encrypted === true) {
        try {
          const { decryptContent } = await import('../encryption');
          const keyId = (metadata._keyId as string) || '';

          // Decrypt each message content
          const decryptedMessages: Message[] = [];
          for (const msg of messages) {
            try {
              const decryptedContent = await decryptContent(msg.content, keyId);
              decryptedMessages.push({ ...msg, content: decryptedContent });
            } catch (error) {
              console.error(`Failed to decrypt message ${msg.id}:`, error);
              decryptedMessages.push(msg); // Keep original if decryption fails
            }
          }
          messages = decryptedMessages;

          // Decrypt summary if present
          if (summary) {
            try {
              summary = await decryptContent(summary, keyId);
            } catch (error) {
              console.error(`Failed to decrypt summary for ${result.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to decrypt conversation ${result.id}:`, error);
          continue;
        }
      }

      const conversation: Conversation = {
        id: result.id,
        sessionId: metadata.sessionId as string,
        projectId: (metadata.projectId as string) || null,
        messages,
        startedAt: new Date(metadata.startedAt as string),
        endedAt: metadata.endedAt ? new Date(metadata.endedAt as string) : null,
        summary,
        metadata: {
          topics: (metadata.topics as string[]) || [],
          entities: (metadata.entities as Entity[]) || [],
          commitments: (metadata.commitments as Commitment[]) || [],
          sentiment: (metadata.sentiment as ConversationMetadata['sentiment']) || 'neutral',
        },
      };
      conversations.set(conversation.id, conversation);
    }
  }
}

/**
 * Save a session to Chroma
 */
async function saveSessionToChroma(session: Session): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  const metadata = serializeMetadata({
    docType: 'session',
    userId: session.userId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    deviceType: session.deviceType,
    conversationIds: session.conversationIds,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: session.id,
    content: `Session ${session.id} - ${session.deviceType}`,
    metadata,
  }]);
}

/**
 * Save a conversation to Chroma
 */
async function saveConversationToChroma(conversation: Conversation): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { upsertDocuments, serializeMetadata } = await import('../chroma');

  // Encrypt messages and summary if encryption is enabled
  let messagesToStore = conversation.messages;
  let summaryToStore = conversation.summary;
  let encryptionMetadata: Record<string, unknown> = {};

  if (encryptionEnabled) {
    try {
      const { encryptContent } = await import('../encryption');

      // Encrypt each message content
      const encryptedMessages: Message[] = [];
      let keyId = '';
      for (const msg of conversation.messages) {
        const encrypted = await encryptContent(msg.content);
        keyId = encrypted.keyId; // All messages use same key
        encryptedMessages.push({ ...msg, content: encrypted.encryptedContent });
      }
      messagesToStore = encryptedMessages;

      // Encrypt summary if present
      if (conversation.summary) {
        const encryptedSummary = await encryptContent(conversation.summary);
        summaryToStore = encryptedSummary.encryptedContent;
        keyId = encryptedSummary.keyId;
      }

      encryptionMetadata = {
        _encrypted: true,
        _keyId: keyId,
      };
    } catch (error) {
      console.error(`Failed to encrypt conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  const metadata = serializeMetadata({
    docType: 'conversation',
    sessionId: conversation.sessionId,
    projectId: conversation.projectId,
    messages: messagesToStore,
    startedAt: conversation.startedAt,
    endedAt: conversation.endedAt,
    summary: summaryToStore,
    topics: conversation.metadata.topics,
    entities: conversation.metadata.entities,
    commitments: conversation.metadata.commitments,
    sentiment: conversation.metadata.sentiment,
    ...encryptionMetadata,
  });

  await upsertDocuments(chromaCollection as any, [{
    id: conversation.id,
    content: summaryToStore || `Conversation ${conversation.id}`,
    metadata,
  }]);
}

/**
 * Delete a session from Chroma
 */
async function deleteSessionFromChroma(sessionId: string): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { deleteDocuments } = await import('../chroma');
  await deleteDocuments(chromaCollection as any, [sessionId]);
}

/**
 * Delete a conversation from Chroma
 */
async function deleteConversationFromChroma(conversationId: string): Promise<void> {
  if (!persistenceEnabled || !chromaCollection) return;

  const { deleteDocuments } = await import('../chroma');
  await deleteDocuments(chromaCollection as any, [conversationId]);
}

/**
 * Sync all in-memory data to Chroma
 */
export async function syncToChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  for (const session of sessions.values()) {
    await saveSessionToChroma(session);
  }
  for (const conversation of conversations.values()) {
    await saveConversationToChroma(conversation);
  }
}

/**
 * Reload all data from Chroma (discards in-memory changes)
 */
export async function syncFromChroma(): Promise<void> {
  if (!persistenceEnabled) return;

  sessions.clear();
  conversations.clear();
  await loadFromChroma();
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new session
 */
export function createSession(
  userIdParam: string,
  deviceType: Session['deviceType'] = 'web'
): Session {
  const session: Session = {
    id: generateId('sess'),
    userId: userIdParam,
    startedAt: new Date(),
    endedAt: null,
    deviceType,
    conversationIds: [],
  };
  sessions.set(session.id, session);

  if (persistenceEnabled) {
    saveSessionToChroma(session).catch(console.error);
  }

  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) || null;
}

/**
 * End a session
 */
export function endSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.endedAt = new Date();
  sessions.set(sessionId, session);

  if (persistenceEnabled) {
    saveSessionToChroma(session).catch(console.error);
  }

  return session;
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userIdParam: string): Session[] {
  return Array.from(sessions.values()).filter((s) => s.userId === userIdParam);
}

/**
 * Get active sessions for a user
 */
export function getActiveSessions(userIdParam: string): Session[] {
  return getUserSessions(userIdParam).filter((s) => s.endedAt === null);
}

// ============================================================================
// Conversation Management
// ============================================================================

/**
 * Create a new conversation
 */
export function createConversation(
  sessionId: string,
  projectId: string | null = null
): Conversation {
  const conversation: Conversation = {
    id: generateId('conv'),
    sessionId,
    projectId,
    messages: [],
    startedAt: new Date(),
    endedAt: null,
    summary: null,
    metadata: {
      topics: [],
      entities: [],
      commitments: [],
      sentiment: 'neutral',
    },
  };
  conversations.set(conversation.id, conversation);

  // Link to session
  const session = sessions.get(sessionId);
  if (session) {
    session.conversationIds.push(conversation.id);
    sessions.set(sessionId, session);

    if (persistenceEnabled) {
      saveSessionToChroma(session).catch(console.error);
    }
  }

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

/**
 * Get a conversation by ID
 */
export function getConversation(conversationId: string): Conversation | null {
  return conversations.get(conversationId) || null;
}

/**
 * End a conversation
 */
export function endConversation(conversationId: string): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.endedAt = new Date();
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

/**
 * Get all conversations for a session
 */
export function getSessionConversations(sessionId: string): Conversation[] {
  return Array.from(conversations.values()).filter(
    (c) => c.sessionId === sessionId
  );
}

/**
 * Get all conversations for a project
 */
export function getProjectConversations(projectId: string): Conversation[] {
  return Array.from(conversations.values()).filter(
    (c) => c.projectId === projectId
  );
}

/**
 * Update conversation summary
 */
export function updateConversationSummary(
  conversationId: string,
  summary: string
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.summary = summary;
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

/**
 * Update conversation metadata
 */
export function updateConversationMetadata(
  conversationId: string,
  metadata: Partial<ConversationMetadata>
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.metadata = { ...conversation.metadata, ...metadata };
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

// ============================================================================
// Message Management
// ============================================================================

/**
 * Add a message to a conversation
 */
export function addMessage(
  conversationId: string,
  message: Omit<Message, 'id'>
): Message | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const newMessage: Message = {
    id: generateId('msg'),
    ...message,
  };

  conversation.messages.push(newMessage);
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return newMessage;
}

/**
 * Get message history for a conversation
 */
export function getMessages(
  conversationId: string,
  limit?: number
): Message[] {
  const conversation = conversations.get(conversationId);
  if (!conversation) return [];

  const messages = conversation.messages;
  if (limit) {
    return messages.slice(-limit);
  }
  return messages;
}

/**
 * Update message utility score
 */
export function updateMessageUtility(
  conversationId: string,
  messageId: string,
  utilityScore: number
): Message | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const message = conversation.messages.find((m) => m.id === messageId);
  if (!message) return null;

  message.utilityScore = utilityScore;
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return message;
}

/**
 * Archive messages (before compaction)
 */
export function archiveMessages(
  conversationId: string,
  messages: Message[]
): void {
  const existing = archivedMessages.get(conversationId) || [];
  archivedMessages.set(conversationId, [...existing, ...messages]);
}

/**
 * Get archived messages
 */
export function getArchivedMessages(conversationId: string): Message[] {
  return archivedMessages.get(conversationId) || [];
}

/**
 * Replace messages in a conversation (for compaction)
 */
export function replaceMessages(
  conversationId: string,
  messages: Message[]
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.messages = messages;
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

// ============================================================================
// Entity & Commitment Extraction
// ============================================================================

/**
 * Add an entity to conversation metadata
 */
export function addEntity(
  conversationId: string,
  entity: Entity
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const existing = conversation.metadata.entities.find(
    (e) => e.name.toLowerCase() === entity.name.toLowerCase()
  );

  if (existing) {
    existing.mentions += entity.mentions;
  } else {
    conversation.metadata.entities.push(entity);
  }

  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

/**
 * Add a commitment to conversation metadata
 */
export function addCommitment(
  conversationId: string,
  commitment: Omit<Commitment, 'id'>
): Commitment | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const newCommitment: Commitment = {
    id: generateId('commit'),
    ...commitment,
  };

  conversation.metadata.commitments.push(newCommitment);
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return newCommitment;
}

/**
 * Update commitment status
 */
export function updateCommitmentStatus(
  conversationId: string,
  commitmentId: string,
  status: Commitment['status']
): Commitment | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const commitment = conversation.metadata.commitments.find(
    (c) => c.id === commitmentId
  );
  if (!commitment) return null;

  commitment.status = status;
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return commitment;
}

/**
 * Add topics to conversation metadata
 */
export function addTopics(
  conversationId: string,
  topics: string[]
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  const existingTopics = new Set(conversation.metadata.topics);
  topics.forEach((t) => existingTopics.add(t.toLowerCase()));
  conversation.metadata.topics = Array.from(existingTopics);

  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

/**
 * Update conversation sentiment
 */
export function updateSentiment(
  conversationId: string,
  sentiment: ConversationMetadata['sentiment']
): Conversation | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) return null;

  conversation.metadata.sentiment = sentiment;
  conversations.set(conversationId, conversation);

  if (persistenceEnabled) {
    saveConversationToChroma(conversation).catch(console.error);
  }

  return conversation;
}

// ============================================================================
// Episodic Summaries (for retrieval)
// ============================================================================

/**
 * Create an episodic summary from a conversation
 */
export function createEpisodicSummary(
  conversation: Conversation
): EpisodicSummary | null {
  if (!conversation.summary) return null;

  return {
    id: generateId('episum'),
    conversationId: conversation.id,
    summary: conversation.summary,
    topics: conversation.metadata.topics,
    timestamp: conversation.endedAt || conversation.startedAt,
  };
}

/**
 * Get recent conversation summaries
 */
export function getRecentSummaries(
  userIdParam: string,
  limit: number = 10
): EpisodicSummary[] {
  const userSessions = getUserSessions(userIdParam);
  const conversationIds = userSessions.flatMap((s) => s.conversationIds);

  const summaries: EpisodicSummary[] = [];

  for (const convId of conversationIds) {
    const conv = conversations.get(convId);
    if (conv && conv.summary) {
      const summary = createEpisodicSummary(conv);
      if (summary) summaries.push(summary);
    }
  }

  // Sort by timestamp descending and limit
  return summaries
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

// ============================================================================
// Store Management
// ============================================================================

/**
 * Get the full episodic store for a user
 */
export function getEpisodicStore(userIdParam: string): EpisodicStore {
  const userSessions = getUserSessions(userIdParam);
  const conversationIds = userSessions.flatMap((s) => s.conversationIds);

  const userConversations: Conversation[] = [];
  for (const convId of conversationIds) {
    const conv = conversations.get(convId);
    if (conv) userConversations.push(conv);
  }

  return {
    conversations: userConversations,
    sessions: userSessions,
  };
}

/**
 * Get store statistics
 */
export function getStoreStats(userIdParam: string): {
  sessionCount: number;
  conversationCount: number;
  messageCount: number;
  totalTokens: number;
} {
  const store = getEpisodicStore(userIdParam);

  let messageCount = 0;
  let totalTokens = 0;

  for (const conv of store.conversations) {
    messageCount += conv.messages.length;
    totalTokens += conv.messages.reduce((sum, m) => sum + m.tokens, 0);
  }

  return {
    sessionCount: store.sessions.length,
    conversationCount: store.conversations.length,
    messageCount,
    totalTokens,
  };
}

/**
 * Clear all data (for testing)
 */
export function clearStore(): void {
  conversations.clear();
  sessions.clear();
  archivedMessages.clear();
  persistenceEnabled = false;
  chromaCollection = null;
  encryptionEnabled = false;
}

/**
 * Export store data (for GDPR compliance)
 */
export function exportStore(userIdParam: string): EpisodicStore {
  return getEpisodicStore(userIdParam);
}

/**
 * Delete all user data (right to be forgotten)
 */
export function deleteUserData(userIdParam: string): void {
  const userSessions = getUserSessions(userIdParam);

  for (const session of userSessions) {
    for (const convId of session.conversationIds) {
      if (persistenceEnabled) {
        deleteConversationFromChroma(convId).catch(console.error);
      }
      conversations.delete(convId);
      archivedMessages.delete(convId);
    }
    if (persistenceEnabled) {
      deleteSessionFromChroma(session.id).catch(console.error);
    }
    sessions.delete(session.id);
  }
}
