/**
 * Bubble API Endpoint
 *
 * Provides the API for the Bubble Interface system.
 * Handles getting bubble state, suggestions, and focus mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import {
  getBubbleState,
  canShowBubble,
  recordBubbleShown,
  setFocusMode,
  getFocusMode,
  // rankSuggestions - available for future suggestion ordering
  type FocusModeType,
  type BubbleSuggestion,
} from '@/lib/osqr/bubble-wrapper';

// Request schemas
const GetStateSchema = z.object({
  workspaceId: z.string(),
});

const SetFocusModeSchema = z.object({
  workspaceId: z.string(),
  mode: z.enum(['normal', 'focus', 'zen', 'available']),
});

const RecordShownSchema = z.object({
  workspaceId: z.string(),
  bubbleId: z.string(),
});

/**
 * GET /api/oscar/bubble
 * Get current bubble state and any pending suggestions
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const userId = (session?.user as { id?: string })?.id || session?.user?.email || 'dev-user';

    // Get bubble state
    const state = getBubbleState(userId);

    // Get focus mode
    const focusMode = getFocusMode(userId);

    return NextResponse.json({
      state,
      focusMode,
      suggestions: [], // TODO: Get pending suggestions from temporal/memory
    });
  } catch (error) {
    console.error('[Bubble API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/oscar/bubble
 * Set focus mode or record bubble shown
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const userId = (session?.user as { id?: string })?.id || session?.user?.email || 'dev-user';

    // Handle set focus mode
    if (body.action === 'setFocusMode') {
      const { workspaceId, mode } = SetFocusModeSchema.parse(body);
      setFocusMode(userId, mode as FocusModeType);
      return NextResponse.json({
        success: true,
        focusMode: mode,
      });
    }

    // Handle record bubble shown
    if (body.action === 'recordShown') {
      const { workspaceId, bubbleId } = RecordShownSchema.parse(body);
      recordBubbleShown(userId);
      return NextResponse.json({
        success: true,
        bubbleId,
      });
    }

    // Handle check if can show
    if (body.action === 'canShow') {
      const { workspaceId } = GetStateSchema.parse(body);
      const canShow = canShowBubble(userId);
      return NextResponse.json({
        canShow,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Bubble API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
