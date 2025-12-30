/**
 * Tests for Feedback Analyzer (high-level API)
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeFeedback,
  isFeedback,
  isExplicitFeedback,
  analyzeMultiple,
  filterFeedback,
} from '../analyzer';

describe('Feedback Analyzer', () => {
  describe('analyzeFeedback', () => {
    it('should return complete analysis for feedback input', () => {
      const result = analyzeFeedback('That was really helpful!');

      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback).not.toBeNull();
      expect(result.feedback?.sentiment).toBe('positive');
      expect(result.feedback?.category).toBe('praise');
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should return null feedback for non-feedback input', () => {
      const result = analyzeFeedback('How do I write a function?');

      expect(result.detection.isFeedback).toBe(false);
      expect(result.feedback).toBeNull();
    });

    it('should include detection details', () => {
      const result = analyzeFeedback('I want to leave feedback: this is great');

      expect(result.detection.confidence).toBe('high');
      expect(result.detection.confidenceScore).toBeGreaterThan(0.8);
      expect(result.detection.matchedPatterns.length).toBeGreaterThan(0);
    });

    it('should extract content correctly', () => {
      const result = analyzeFeedback('Feedback: the new design is beautiful');

      expect(result.feedback?.content).toBe('The new design is beautiful');
      expect(result.feedback?.originalInput).toBe('Feedback: the new design is beautiful');
    });

    it('should detect aspects in feedback', () => {
      const result = analyzeFeedback('That was excellent! Great quality and clarity.');

      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.aspects).toContain('quality');
      expect(result.feedback?.aspects).toContain('clarity');
    });
  });

  describe('isFeedback', () => {
    it('should return true for feedback input', () => {
      expect(isFeedback('That was helpful')).toBe(true);
      expect(isFeedback('I have some feedback')).toBe(true);
      expect(isFeedback("This isn't working")).toBe(true);
    });

    it('should return false for non-feedback input', () => {
      expect(isFeedback('Help me with this code')).toBe(false);
      expect(isFeedback('What is React?')).toBe(false);
      expect(isFeedback('Please explain this')).toBe(false);
    });

    it('should respect configuration', () => {
      expect(isFeedback('thanks', { minConfidenceThreshold: 0.95 })).toBe(false);
    });
  });

  describe('isExplicitFeedback', () => {
    it('should return true only for explicit feedback intent', () => {
      expect(isExplicitFeedback('I want to give feedback')).toBe(true);
      expect(isExplicitFeedback('I have feedback')).toBe(true);
    });

    it('should return false for implicit feedback', () => {
      expect(isExplicitFeedback('That was great')).toBe(false);
      expect(isExplicitFeedback("This doesn't work")).toBe(false);
    });
  });

  describe('analyzeMultiple', () => {
    it('should analyze multiple inputs', () => {
      const inputs = [
        'That was helpful!',
        'How do I do this?',
        'I have some feedback',
      ];

      const results = analyzeMultiple(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].detection.isFeedback).toBe(true);
      expect(results[1].detection.isFeedback).toBe(false);
      expect(results[2].detection.isFeedback).toBe(true);
    });

    it('should return empty array for empty input', () => {
      const results = analyzeMultiple([]);
      expect(results).toEqual([]);
    });
  });

  describe('filterFeedback', () => {
    it('should filter to only feedback inputs', () => {
      const inputs = [
        'That was helpful!',
        'How do I do this?',
        'I have some feedback',
        'Create a function',
        'Love this feature!',
      ];

      const feedbackOnly = filterFeedback(inputs);

      expect(feedbackOnly).toHaveLength(3);
      expect(feedbackOnly).toContain('That was helpful!');
      expect(feedbackOnly).toContain('I have some feedback');
      expect(feedbackOnly).toContain('Love this feature!');
      expect(feedbackOnly).not.toContain('How do I do this?');
      expect(feedbackOnly).not.toContain('Create a function');
    });

    it('should return empty array when no feedback found', () => {
      const inputs = [
        'Help me with this',
        'What is TypeScript?',
        'Create a component',
      ];

      const feedbackOnly = filterFeedback(inputs);
      expect(feedbackOnly).toEqual([]);
    });
  });

  describe('real-world examples', () => {
    it('should handle enthusiastic positive feedback', () => {
      const result = analyzeFeedback('WOW! This is exactly what I was looking for! Amazing!');
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.sentiment).toBe('positive');
    });

    it('should handle detailed negative feedback', () => {
      const result = analyzeFeedback(
        "That response was completely wrong. You gave me Python code instead of JavaScript."
      );
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.sentiment).toBe('negative');
      expect(result.feedback?.referencesSpecificResponse).toBe(true);
    });

    it('should handle constructive feedback', () => {
      const result = analyzeFeedback(
        'The explanation was good but it would be helpful if you included more examples'
      );
      expect(result.detection.isFeedback).toBe(true);
      // Mixed because "good" is positive but "would be helpful if" suggests improvement
    });

    it('should handle feature suggestions disguised as questions', () => {
      const result = analyzeFeedback('Can you add the ability to export to CSV?');
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.category).toBe('feature_request');
    });

    it('should handle casual praise', () => {
      const result = analyzeFeedback('Nice one! Thanks!');
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.sentiment).toBe('positive');
    });

    it('should handle frustrated feedback', () => {
      const result = analyzeFeedback("This is so frustrating. It keeps getting my question wrong.");
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.sentiment).toBe('negative');
    });

    it('should handle bug reports with context', () => {
      const result = analyzeFeedback(
        "Bug: When I click the save button, nothing happens. I've tried multiple times."
      );
      expect(result.detection.isFeedback).toBe(true);
      expect(result.feedback?.category).toBe('bug_report');
      expect(result.feedback?.content).toContain("When I click the save button");
    });
  });
});
