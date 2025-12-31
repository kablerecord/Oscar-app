/**
 * External Chat Ingestion API
 *
 * POST /api/chat/ingest
 *
 * Import conversations from external sources:
 * - Claude (Human: / Assistant: format)
 * - ChatGPT (JSON export or markdown)
 * - Slack (timestamp + username format)
 * - Custom (raw text, alternating paragraphs)
 *
 * The imported conversation is parsed, stored, and queued for synthesis.
 * Facts are extracted and become searchable memories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { MemoryVault } from '@osqr/core';
import { featureFlags } from '@/lib/osqr/config';

type IngestSource = 'claude' | 'chatgpt' | 'slack' | 'discord' | 'email' | 'custom';

interface IngestRequest {
  workspaceId: string;
  source: IngestSource;
  transcript: string;
  projectId?: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body: IngestRequest = await req.json();
    const { workspaceId, source, transcript, projectId, title, metadata } = body;

    // Validate required fields
    if (!workspaceId || !source || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, source, transcript' },
        { status: 400 }
      );
    }

    // Validate source
    const validSources: IngestSource[] = ['claude', 'chatgpt', 'slack', 'discord', 'email', 'custom'];
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify workspace ownership
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        ownerId: session.user.id,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check feature flag
    if (!featureFlags.enableMemoryVault) {
      return NextResponse.json(
        { error: 'Memory Vault feature is not enabled' },
        { status: 400 }
      );
    }

    // Use OSQR's ingestion function
    const osqrResult = await MemoryVault.ingestConversation(workspaceId, {
      source,
      transcript,
      metadata: {
        projectId,
        timestamp: new Date(),
        originalId: metadata?.originalId as string | undefined,
        participants: metadata?.participants as string[] | undefined,
        tags: metadata?.tags as string[] | undefined,
      },
    });

    if (!osqrResult.success) {
      return NextResponse.json(
        { error: osqrResult.error || 'Ingestion failed' },
        { status: 400 }
      );
    }

    // Create a ChatThread record for UI visibility
    const thread = await prisma.chatThread.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        title: title || `Imported from ${source}`,
        mode: 'imported',
        status: 'ended',
        endedAt: new Date(),
        metadata: {
          source,
          osqrConversationId: osqrResult.conversationId,
          osqrJobId: osqrResult.jobId,
          messageCount: osqrResult.messageCount,
          importedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      threadId: thread.id,
      osqrConversationId: osqrResult.conversationId,
      messageCount: osqrResult.messageCount,
      synthesisJobId: osqrResult.jobId,
      status: 'queued_for_synthesis',
    });
  } catch (error) {
    console.error('[API] Chat ingestion failed:', error);
    return NextResponse.json(
      { error: 'Failed to ingest conversation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/ingest
 *
 * Returns supported formats and example usage
 */
export async function GET() {
  return NextResponse.json({
    description: 'Import external conversations into OSQR',
    supportedSources: {
      claude: {
        description: 'Claude/Anthropic conversation format',
        example: 'Human: Hello!\n\nAssistant: Hi there!',
      },
      chatgpt: {
        description: 'ChatGPT export (JSON or markdown)',
        example: '{"messages": [{"role": "user", "content": "Hello"}]}',
      },
      slack: {
        description: 'Slack message format',
        example: '[10:30 AM] username: Hello everyone',
      },
      discord: {
        description: 'Discord message format',
        example: '[10:30] username: Hello everyone',
      },
      email: {
        description: 'Email thread format',
        example: 'From: sender@example.com\nSubject: Hello\n\nMessage content...',
      },
      custom: {
        description: 'Raw text (paragraphs alternate user/assistant)',
        example: 'User message here\n\nAssistant response here',
      },
    },
    usage: {
      method: 'POST',
      body: {
        workspaceId: 'required - your workspace ID',
        source: 'required - one of the supported sources',
        transcript: 'required - the raw conversation text',
        projectId: 'optional - link to a project',
        title: 'optional - custom title for the import',
        metadata: 'optional - additional metadata object',
      },
    },
  });
}
