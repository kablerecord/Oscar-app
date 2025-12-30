/**
 * End Conversation API
 *
 * POST /api/chat/threads/[threadId]/end
 *
 * Ends a conversation and triggers the Learning Layer to:
 * 1. Extract facts from the conversation
 * 2. Store them as searchable memories
 * 3. Update the conversation summary
 *
 * Options:
 * - synthesizeImmediately: true = wait for extraction, false = queue for background
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { MemoryVault } from '@osqr/core';
import { featureFlags } from '@/lib/osqr/config';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = await params;

    // Parse options
    let options: { synthesizeImmediately?: boolean } = {};
    try {
      options = await req.json();
    } catch {
      // Empty body is fine, use defaults
    }

    const synthesizeImmediately = options.synthesizeImmediately ?? false;

    // Verify thread ownership
    const thread = await prisma.chatThread.findFirst({
      where: {
        id: threadId,
        workspace: { userId: session.user.id },
      },
      include: {
        workspace: true,
        messages: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Check if already ended
    if (thread.status === 'ended' || thread.status === 'archived') {
      return NextResponse.json({
        success: true,
        alreadyEnded: true,
        endedAt: thread.endedAt,
      });
    }

    // Skip OSQR processing if feature flag is off
    let osqrResult: { success: boolean; queued?: boolean; synthesisResult?: unknown } = {
      success: true,
    };

    if (featureFlags.enableMemoryVault && thread.messages.length > 0) {
      // End conversation in OSQR Learning Layer
      osqrResult = await MemoryVault.endConversationForUser(thread.workspace.id, {
        synthesizeImmediately,
      });
    }

    // Update thread status in database
    const updatedThread = await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      threadId,
      endedAt: updatedThread.endedAt,
      messageCount: thread.messages.length,
      synthesized: osqrResult.synthesisResult ? true : false,
      queued: osqrResult.queued || false,
    });
  } catch (error) {
    console.error('[API] End conversation failed:', error);
    return NextResponse.json(
      { error: 'Failed to end conversation' },
      { status: 500 }
    );
  }
}
