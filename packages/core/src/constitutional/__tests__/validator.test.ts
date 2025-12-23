/**
 * Tests for the Output Validator.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateOutput,
  quickScreenOutput,
  detectIdentityMasking,
  evaluateHonesty,
  applyBaselineHonesty,
  detectDataLeakage,
  getSanitizedFallback,
} from '../validator';
import { clearAllViolations } from '../logging/audit';
import type { ResponseContext } from '../types';

describe('Output Validator', () => {
  const createContext = (overrides: Partial<ResponseContext> = {}): ResponseContext => ({
    requestId: 'test-request-123',
    userId: 'user-456',
    conversationId: 'conv-789',
    honestyTier: 'BASE',
    originalInput: 'What is the weather like?',
    ...overrides,
  });

  beforeEach(() => {
    clearAllViolations();
  });

  describe('detectIdentityMasking', () => {
    it('should detect claims of being human', () => {
      expect(detectIdentityMasking('I am a human just like you')).toBe(true);
      expect(detectIdentityMasking("I'm not an AI, I'm a real person")).toBe(true);
      expect(detectIdentityMasking('As a fellow human, I understand')).toBe(true);
    });

    it('should detect claims of being other AI systems', () => {
      expect(detectIdentityMasking('I am ChatGPT')).toBe(true);
      expect(detectIdentityMasking("I'm GPT-4 and I can help you")).toBe(true);
      expect(detectIdentityMasking('This is Gemini responding')).toBe(true);
    });

    it('should detect denial of being OSQR', () => {
      expect(detectIdentityMasking("I'm not OSQR")).toBe(true);
      expect(detectIdentityMasking('This is not OSQR')).toBe(true);
    });

    it('should allow normal AI acknowledgments', () => {
      expect(detectIdentityMasking('As an AI, I can help you with that')).toBe(false);
      expect(detectIdentityMasking("I'm here to assist you")).toBe(false);
      expect(detectIdentityMasking('Let me help you understand this')).toBe(false);
    });
  });

  describe('evaluateHonesty', () => {
    it('should give high score to honest outputs', () => {
      const context = createContext();
      const output = "I think this might be the answer, though I'm not certain.";
      const score = evaluateHonesty(output, context);
      expect(score).toBeGreaterThan(0.7);
    });

    it('should penalize absolute certainty claims', () => {
      const context = createContext();
      const output = 'I guarantee this is 100% correct and there is no doubt.';
      const score = evaluateHonesty(output, context);
      expect(score).toBeLessThan(0.7);
    });

    it('should penalize claims of infallibility', () => {
      const context = createContext();
      const output = "I don't make mistakes and I can do anything.";
      const score = evaluateHonesty(output, context);
      expect(score).toBeLessThan(0.5);
    });

    it('should reward uncertainty acknowledgment', () => {
      const context = createContext();
      const honest = "I believe this is correct, but I can't guarantee it.";
      const certain = 'This is definitely correct.';
      const honestScore = evaluateHonesty(honest, context);
      const certainScore = evaluateHonesty(certain, context);
      expect(honestScore).toBeGreaterThan(certainScore);
    });

    it('should reward AI acknowledgment', () => {
      const context = createContext();
      const output = 'As an AI, my knowledge has a cutoff date.';
      const score = evaluateHonesty(output, context);
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe('applyBaselineHonesty', () => {
    it('should hedge absolute guarantees', () => {
      const context = createContext();
      const output = 'I guarantee this is correct';
      const corrected = applyBaselineHonesty(output, context);
      expect(corrected).toContain('believe');
      expect(corrected).toContain('verify');
    });

    it('should soften certainty claims', () => {
      const context = createContext();
      const output = "I'm 100% sure about this";
      const corrected = applyBaselineHonesty(output, context);
      expect(corrected).not.toContain('100%');
      expect(corrected).toContain('confident');
    });

    it('should correct infallibility claims', () => {
      const context = createContext();
      const output = "I don't make mistakes";
      const corrected = applyBaselineHonesty(output, context);
      expect(corrected).toContain('AI');
      expect(corrected).toContain('mistakes');
    });

    it('should not modify already honest output', () => {
      const context = createContext();
      const output = 'I think this might help, but please verify.';
      const corrected = applyBaselineHonesty(output, context);
      expect(corrected).toBe(output);
    });
  });

  describe('detectDataLeakage', () => {
    it('should detect user ID mentions for other users', () => {
      expect(detectDataLeakage('user_id: other_user_123', 'current_user')).toBe(true);
      expect(detectDataLeakage("userId = 'different_user'", 'my_user')).toBe(true);
    });

    it('should allow mentions of current user', () => {
      expect(detectDataLeakage('user_id: current_user', 'current_user')).toBe(false);
    });

    it('should detect bulk user data exposure', () => {
      expect(detectDataLeakage('Here are all the users: User1, User2, User3', 'me')).toBe(true);
      expect(detectDataLeakage('List of users in the system:', 'me')).toBe(true);
    });

    it('should detect numbered user lists', () => {
      expect(detectDataLeakage('User 1: John, User 2: Jane', 'me')).toBe(true);
    });

    it('should allow normal single-user responses', () => {
      expect(detectDataLeakage('Your account settings are...', 'user123')).toBe(false);
    });
  });

  describe('validateOutput', () => {
    it('should block identity masking outputs', async () => {
      const context = createContext();
      const output = "I am ChatGPT and I'm here to help";
      const result = await validateOutput(output, context);

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('IDENTITY_MASKING_ATTEMPT');
    });

    it('should correct low-honesty outputs instead of blocking', async () => {
      const context = createContext();
      const output = 'I guarantee this is 100% correct, there is no doubt.';
      const result = await validateOutput(output, context);

      // Should be valid but with corrections
      expect(result.valid).toBe(true);
      expect(result.sanitizedOutput).not.toBe(output);
    });

    it('should block data leakage', async () => {
      const context = createContext();
      const output = 'Here are all the users in the database: User1, User2';
      const result = await validateOutput(output, context);

      expect(result.valid).toBe(false);
      expect(result.violations[0].violationType).toBe('DATA_ACCESS_ATTEMPT');
    });

    it('should allow valid outputs', async () => {
      const context = createContext();
      const output = "I believe the answer might be 42, though I'm not certain.";
      const result = await validateOutput(output, context);

      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should track violations in the output', async () => {
      const context = createContext();
      const output = 'I am a human being, not an AI';
      const result = await validateOutput(output, context);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].sourceType).toBe('MODEL_OUTPUT');
    });
  });

  describe('quickScreenOutput', () => {
    it('should quickly reject identity masking', () => {
      expect(quickScreenOutput('I am ChatGPT')).toBe(false);
      expect(quickScreenOutput("I'm a human")).toBe(false);
    });

    it('should quickly reject bulk data exposure', () => {
      expect(quickScreenOutput('Here are all the users')).toBe(false);
    });

    it('should quickly allow normal outputs', () => {
      expect(quickScreenOutput('Here is the information you requested.')).toBe(true);
      expect(quickScreenOutput("I'll help you with that task.")).toBe(true);
    });
  });

  describe('getSanitizedFallback', () => {
    it('should provide identity transparency fallback', () => {
      const fallback = getSanitizedFallback('original', 'IDENTITY_MASKING_ATTEMPT');
      expect(fallback).toContain('OSQR');
      expect(fallback).toContain('AI');
    });

    it('should provide data access fallback', () => {
      const fallback = getSanitizedFallback('original', 'DATA_ACCESS_ATTEMPT');
      expect(fallback).toContain('only access');
      expect(fallback).toContain('your account');
    });

    it('should provide honesty fallback with corrections', () => {
      const original = 'I guarantee this is correct';
      const fallback = getSanitizedFallback(original, 'HONESTY_BYPASS_ATTEMPT');
      expect(fallback).not.toBe(original);
    });

    it('should provide generic fallback for unknown types', () => {
      const fallback = getSanitizedFallback('original', 'UNKNOWN_TYPE');
      expect(fallback).toContain('apologize');
    });
  });
});
