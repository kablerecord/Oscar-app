/**
 * Bubble Engine
 *
 * Main orchestrator for the Bubble Interface. Coordinates:
 * - Temporal item ingestion and scoring
 * - Budget management
 * - Focus mode filtering
 * - User feedback processing
 * - Item lifecycle management
 */

import type {
  TemporalItem,
  BubbleItem,
  BubbleUserState,
  BubbleEngineConfig,
  BubbleEngineState,
  UserContext,
  FocusModeName,
  BubbleFeedback,
  DeferOption,
  InterruptBudget,
  FocusModeConfig,
} from '../types';

import { DEFAULT_ENGINE_CONFIG, DEFAULT_USER_STATE, FOCUS_MODES } from '../constants';

import {
  calculateConfidenceScore,
  calculateConfidenceBreakdown,
  getVisualState,
} from '../scoring';

import {
  createInterruptBudget,
  applyResets,
  canConsumeBudget,
  consumeBudget,
  setDailyTotal,
  getBudgetUtilization,
} from '../budget/interruptBudget';

import {
  getFocusMode,
  shouldSurfaceItem,
  filterItemsForFocusMode,
  getQueuedItems,
  getEffectiveVisualState,
} from '../budget/focusMode';

import { transformToBubble } from '../generation';

import {
  processDismiss,
  processEngage,
  processDefer,
  isItemDeferred,
  getReadyDeferredItems,
  cleanupDeferredItems,
  getCategoryWeight,
} from '../feedback';

/**
 * Event types emitted by the engine
 */
export type BubbleEngineEvent =
  | { type: 'item_surfaced'; item: BubbleItem }
  | { type: 'item_dismissed'; item: BubbleItem; feedback?: BubbleFeedback }
  | { type: 'item_engaged'; item: BubbleItem }
  | { type: 'item_deferred'; item: BubbleItem; until: Date }
  | { type: 'focus_mode_changed'; mode: FocusModeName }
  | { type: 'budget_consumed'; remaining: number }
  | { type: 'budget_exhausted' }
  | { type: 'items_queued'; count: number };

/**
 * Event listener type
 */
export type BubbleEngineListener = (event: BubbleEngineEvent) => void;

/**
 * Bubble Engine class
 */
export class BubbleEngine {
  private config: BubbleEngineConfig;
  private state: BubbleEngineState;
  private listeners: Set<BubbleEngineListener> = new Set();
  private surfacedTimestamps: Map<string, number> = new Map();

  constructor(
    config: Partial<BubbleEngineConfig> = {},
    initialState?: Partial<BubbleEngineState>
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };

    this.state = {
      items: initialState?.items ?? [],
      userState: initialState?.userState ?? { ...DEFAULT_USER_STATE },
      focusMode: initialState?.focusMode ?? FOCUS_MODES.available,
      budget: initialState?.budget ?? createInterruptBudget(
        this.config.budget.defaultDaily
      ),
      context: initialState?.context ?? {
        activeProject: null,
        recentTopics: [],
        recentEntities: [],
        activeTask: null,
        currentTime: Date.now(),
      },
    };
  }

  /**
   * Subscribe to engine events
   */
  subscribe(listener: BubbleEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: BubbleEngineEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Get current engine state
   */
  getState(): BubbleEngineState {
    return { ...this.state };
  }

  /**
   * Get all current items
   */
  getItems(): BubbleItem[] {
    return [...this.state.items];
  }

  /**
   * Get surfaced items (filtered by focus mode)
   */
  getSurfacedItems(): BubbleItem[] {
    return this.state.items.filter(
      (item) =>
        item.state === 'surfaced' &&
        shouldSurfaceItem(item, this.state.focusMode.name)
    );
  }

  /**
   * Get queued items (in DND mode)
   */
  getQueuedItems(): BubbleItem[] {
    return getQueuedItems(this.state.items, this.state.focusMode.name);
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): { daily: number; hourly: number; remaining: number } {
    const utilization = getBudgetUtilization(this.state.budget);
    return {
      ...utilization,
      remaining: this.state.budget.daily.remaining,
    };
  }

  /**
   * Update user context
   */
  updateContext(context: Partial<UserContext>): void {
    this.state.context = {
      ...this.state.context,
      ...context,
      currentTime: Date.now(),
    };

    // Re-score items with new context
    this.rescoreAllItems();
  }

  /**
   * Set focus mode
   */
  setFocusMode(mode: FocusModeName): void {
    this.state.focusMode = getFocusMode(mode);
    this.state.userState.preferences.focusMode = mode;

    this.emit({ type: 'focus_mode_changed', mode });

    // Check for queued items
    const queued = this.getQueuedItems();
    if (queued.length > 0) {
      this.emit({ type: 'items_queued', count: queued.length });
    }
  }

  /**
   * Get current focus mode
   */
  getFocusMode(): FocusModeConfig {
    return { ...this.state.focusMode };
  }

  /**
   * Set daily budget
   */
  setDailyBudget(total: number): void {
    this.state.budget = setDailyTotal(this.state.budget, total);
    this.state.userState.preferences.dailyBudget = total;
  }

  /**
   * Ingest a temporal item
   */
  ingest(item: TemporalItem): BubbleItem | null {
    // Check if already processed or deferred
    if (this.state.items.some((i) => i.temporalItemId === item.id)) {
      return null;
    }

    if (isItemDeferred(this.state.userState, item.id)) {
      return null;
    }

    // Calculate confidence score
    const score = calculateConfidenceScore(
      item,
      this.state.context,
      this.state.userState.history,
      this.state.userState,
      this.config.weights
    );

    // Transform to bubble item
    const bubbleItem = transformToBubble(item, score);

    // Add to items list
    this.state.items.push(bubbleItem);

    // Try to surface
    this.trySurface(bubbleItem);

    return bubbleItem;
  }

  /**
   * Ingest multiple items
   */
  ingestBatch(items: TemporalItem[]): BubbleItem[] {
    const results: BubbleItem[] = [];

    for (const item of items) {
      const result = this.ingest(item);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Try to surface an item
   */
  private trySurface(item: BubbleItem): boolean {
    // Check score threshold
    if (item.confidenceScore < this.config.thresholds.passive) {
      return false;
    }

    // Check focus mode
    if (!shouldSurfaceItem(item, this.state.focusMode.name)) {
      return false;
    }

    // Check budget
    const budgetCheck = canConsumeBudget(
      this.state.budget,
      item,
      this.state.focusMode.name
    );

    if (!budgetCheck.allowed) {
      if (budgetCheck.reason === 'daily_budget_exhausted') {
        this.emit({ type: 'budget_exhausted' });
      }
      return false;
    }

    // Consume budget
    this.state.budget = consumeBudget(
      this.state.budget,
      item,
      this.state.focusMode.name
    );

    // Update item state
    item.state = 'surfaced';
    item.surfacedAt = Date.now();
    this.surfacedTimestamps.set(item.id, Date.now());

    // Emit events
    this.emit({ type: 'item_surfaced', item });
    this.emit({
      type: 'budget_consumed',
      remaining: this.state.budget.daily.remaining,
    });

    return true;
  }

  /**
   * Dismiss an item
   */
  dismiss(itemId: string, feedback?: BubbleFeedback | null): void {
    const item = this.findItem(itemId);
    if (!item) return;

    const surfacedAt = this.surfacedTimestamps.get(itemId) ?? item.surfacedAt ?? Date.now();
    const timeToAction = Date.now() - surfacedAt;

    // Update state
    item.state = 'dismissed';

    // Process feedback
    this.state.userState = processDismiss(
      this.state.userState,
      item,
      timeToAction,
      feedback
    );

    this.emit({ type: 'item_dismissed', item, feedback: feedback ?? undefined });
  }

  /**
   * Engage with an item
   */
  engage(itemId: string): void {
    const item = this.findItem(itemId);
    if (!item) return;

    const surfacedAt = this.surfacedTimestamps.get(itemId) ?? item.surfacedAt ?? Date.now();
    const timeToAction = Date.now() - surfacedAt;

    // Update state
    item.state = 'engaged';

    // Process engagement
    this.state.userState = processEngage(this.state.userState, item, timeToAction);

    this.emit({ type: 'item_engaged', item });
  }

  /**
   * Defer an item
   */
  defer(itemId: string, until: DeferOption): void {
    const item = this.findItem(itemId);
    if (!item) return;

    const surfacedAt = this.surfacedTimestamps.get(itemId) ?? item.surfacedAt ?? Date.now();
    const timeToAction = Date.now() - surfacedAt;

    // Update state
    item.state = 'deferred';

    // Process deferral
    this.state.userState = processDefer(
      this.state.userState,
      item,
      timeToAction,
      until
    );

    // Get actual defer date
    const deferDate = this.state.userState.deferred.find(
      (d) => d.itemId === item.temporalItemId
    )?.deferredUntil;

    this.emit({
      type: 'item_deferred',
      item,
      until: deferDate ?? new Date(),
    });
  }

  /**
   * Find an item by ID
   */
  private findItem(itemId: string): BubbleItem | undefined {
    return this.state.items.find((i) => i.id === itemId);
  }

  /**
   * Re-score all items (e.g., after context change)
   */
  private rescoreAllItems(): void {
    for (const item of this.state.items) {
      if (item.state !== 'pending' && item.state !== 'surfaced') {
        continue;
      }

      if (!item.temporalItem) {
        continue;
      }

      const newScore = calculateConfidenceScore(
        item.temporalItem,
        this.state.context,
        this.state.userState.history,
        this.state.userState,
        this.config.weights
      );

      item.confidenceScore = newScore;
    }

    // Sort by score
    this.state.items.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Check for deferred items ready to resurface
   */
  checkDeferredItems(): BubbleItem[] {
    const ready = getReadyDeferredItems(this.state.userState);
    const resurfaced: BubbleItem[] = [];

    for (const deferred of ready) {
      // Find original item
      const item = this.state.items.find(
        (i) => i.temporalItemId === deferred.itemId
      );

      if (item && item.state === 'deferred') {
        item.state = 'pending';
        this.trySurface(item);
        resurfaced.push(item);
      }
    }

    // Cleanup processed deferrals
    this.state.userState = cleanupDeferredItems(this.state.userState);

    return resurfaced;
  }

  /**
   * Apply budget resets (call periodically)
   */
  applyResets(): void {
    this.state.budget = applyResets(this.state.budget);
  }

  /**
   * Get confidence breakdown for an item
   */
  getConfidenceBreakdown(itemId: string): ReturnType<typeof calculateConfidenceBreakdown> | null {
    const item = this.findItem(itemId);
    if (!item?.temporalItem) return null;

    return calculateConfidenceBreakdown(
      item.temporalItem,
      this.state.context,
      this.state.userState.history,
      this.state.userState,
      this.config.weights
    );
  }

  /**
   * Get visual state for an item
   */
  getItemVisualState(itemId: string): string | null {
    const item = this.findItem(itemId);
    if (!item) return null;

    return getEffectiveVisualState(item, this.state.focusMode.name);
  }

  /**
   * Clear all items
   */
  clearItems(): void {
    this.state.items = [];
    this.surfacedTimestamps.clear();
  }

  /**
   * Export user state for persistence
   */
  exportUserState(): BubbleUserState {
    return { ...this.state.userState };
  }

  /**
   * Import user state (from persistence)
   */
  importUserState(userState: BubbleUserState): void {
    this.state.userState = { ...userState };
    this.state.focusMode = getFocusMode(userState.preferences.focusMode);
    this.state.budget = createInterruptBudget(userState.preferences.dailyBudget);

    // Restore budget state
    this.state.budget.daily.used = userState.budget.daily.used;
    this.state.budget.daily.remaining =
      userState.budget.daily.total - userState.budget.daily.used;
    this.state.budget.daily.lastReset = new Date(userState.budget.daily.lastReset);
  }

  /**
   * Get category weight
   */
  getCategoryWeight(category: string): number {
    return getCategoryWeight(this.state.userState, category as any);
  }
}

/**
 * Create a new BubbleEngine instance
 */
export function createBubbleEngine(
  config?: Partial<BubbleEngineConfig>,
  initialState?: Partial<BubbleEngineState>
): BubbleEngine {
  return new BubbleEngine(config, initialState);
}

export default BubbleEngine;
