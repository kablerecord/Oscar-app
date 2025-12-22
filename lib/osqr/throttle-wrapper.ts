/**
 * Throttle Wrapper - Stub Implementation
 *
 * NOTE: @osqr/core package is not yet available.
 * This file provides stub implementations.
 */

import { featureFlags } from './config';

export type Tier = 'lite' | 'pro' | 'master' | 'enterprise';
export type BudgetState = 'healthy' | 'low' | 'depleted' | 'overage';
export type UserTier = 'starter' | 'pro' | 'master' | 'enterprise';

export interface ThrottleStatus {
  tier: UserTier;
  canQuery: boolean;
  queriesRemaining: number;
  queriesTotal: number;
  budgetState: 'healthy' | 'warning' | 'depleted' | 'overage';
  statusMessage: string;
  degraded: boolean;
  upgradeAvailable: boolean;
}

export interface QueryResult {
  allowed: boolean;
  model: {
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
  } | null;
  message: string;
  degraded: boolean;
  budgetState: string;
}

export interface FeatureAccess {
  contemplateMode: boolean;
  councilMode: boolean;
  voiceMode: boolean;
  customPersona: boolean;
  prioritySupport: boolean;
}

export function canQuery(_userId: string, _tier: UserTier): boolean {
  return true; // Always allow when throttle disabled
}

export function getThrottleStatus(_userId: string, tier: UserTier): ThrottleStatus {
  return {
    tier,
    canQuery: true,
    queriesRemaining: Infinity,
    queriesTotal: Infinity,
    budgetState: 'healthy',
    statusMessage: 'Unlimited (throttle disabled)',
    degraded: false,
    upgradeAvailable: tier !== 'master' && tier !== 'enterprise',
  };
}

export async function processQuery(
  _userId: string,
  _tier: UserTier,
  _request: {
    query: string;
    estimatedTokens?: number;
    requiresReasoning?: boolean;
    isCodeGeneration?: boolean;
  }
): Promise<QueryResult> {
  return {
    allowed: true,
    model: {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      maxTokens: 4000,
    },
    message: 'Throttle disabled',
    degraded: false,
    budgetState: 'healthy',
  };
}

export function recordQuery(_userId: string, _tier: UserTier, _modelId: string): void {
  // No-op stub
}

export function getFeatureAccess(_tier: UserTier): FeatureAccess {
  return {
    contemplateMode: true,
    councilMode: true,
    voiceMode: true,
    customPersona: true,
    prioritySupport: true,
  };
}

export function hasFeature(
  _tier: UserTier,
  _feature: 'contemplateMode' | 'councilMode' | 'voiceMode' | 'customPersona' | 'prioritySupport'
): boolean {
  return true;
}

export function getDegradationMessage(_userId: string, _tier: UserTier): string {
  return '';
}

export function getUpgradePrompt(_tier: UserTier): string | null {
  return null;
}

export function getOveragePackages(): Array<{
  id: string;
  name: string;
  queries: number;
  price: number;
}> {
  return [];
}

export function purchaseOverage(
  _userId: string,
  _tier: UserTier,
  _packageId: string
): { success: boolean; queriesAdded: number; error?: string } {
  return { success: false, queriesAdded: 0, error: 'Throttle disabled' };
}

export function getUpgradePath(_tier: UserTier): UserTier | null {
  const paths: Record<UserTier, UserTier | null> = {
    starter: 'pro',
    pro: 'master',
    master: 'enterprise',
    enterprise: null,
  };
  return paths[_tier];
}

export function getBudgetStatusMessage(_userId: string, _tier: UserTier): string {
  return 'Unlimited queries available';
}

export function getQueryCountMessage(_userId: string, _tier: UserTier): string {
  return 'Unlimited queries';
}

export function addReferralBonus(_userId: string, _tier: UserTier, _bonusQueries: number): void {
  // No-op stub
}

export function getReferralBonusRemaining(_userId: string, _tier: UserTier): number {
  return 0;
}
