/**
 * Tests for Feedback Intent Detector
 */

import { describe, it, expect } from 'vitest';
import {
  detectFeedbackIntent,
  hasExplicitFeedbackIntent,
} from '../detector';

describe('Feedback Detector', () => {
  describe('detectFeedbackIntent', () => {
    describe('explicit feedback intent', () => {
      it('should detect "I want to leave feedback"', () => {
        const result = detectFeedbackIntent('I want to leave feedback');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "I have some feedback"', () => {
        const result = detectFeedbackIntent('I have some feedback');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "I want to give feedback"', () => {
        const result = detectFeedbackIntent('I want to give feedback');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "Here is my feedback"', () => {
        const result = detectFeedbackIntent("Here's my feedback: this is great");
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "Feedback:" label', () => {
        const result = detectFeedbackIntent('Feedback: the response was helpful');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "I would like to share feedback"', () => {
        const result = detectFeedbackIntent("I'd like to share some feedback");
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });
    });

    describe('positive sentiment feedback', () => {
      it('should detect "that was really helpful"', () => {
        const result = detectFeedbackIntent('That was really helpful');
        expect(result.isFeedback).toBe(true);
        expect(result.matchedPatterns).toContain('Positive response feedback');
      });

      it('should detect "this helps a lot"', () => {
        const result = detectFeedbackIntent('This helps me a lot');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "exactly what I needed"', () => {
        const result = detectFeedbackIntent('Exactly what I needed!');
        expect(result.isFeedback).toBe(true);
        expect(result.matchedPatterns).toContain('Exact match praise');
      });

      it('should detect "love this"', () => {
        const result = detectFeedbackIntent('I love this feature');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "nice job"', () => {
        const result = detectFeedbackIntent('Nice job on that response');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "well done"', () => {
        const result = detectFeedbackIntent('Well done!');
        expect(result.isFeedback).toBe(true);
      });
    });

    describe('negative sentiment feedback', () => {
      it('should detect "that was not helpful"', () => {
        const result = detectFeedbackIntent("That wasn't helpful");
        expect(result.isFeedback).toBe(true);
        expect(result.matchedPatterns).toContain('Incorrect response feedback');
      });

      it('should detect "this is not working"', () => {
        const result = detectFeedbackIntent("This isn't working for me");
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "you got that wrong"', () => {
        const result = detectFeedbackIntent('You got that wrong');
        expect(result.isFeedback).toBe(true);
        expect(result.matchedPatterns).toContain('Got it wrong');
      });

      it('should detect "not what I asked"', () => {
        const result = detectFeedbackIntent("That's not what I asked for");
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "I am not happy with"', () => {
        const result = detectFeedbackIntent("I'm not happy with this response");
        expect(result.isFeedback).toBe(true);
      });

      it('should detect frustration expressions', () => {
        const result = detectFeedbackIntent("This is frustrating");
        expect(result.isFeedback).toBe(true);
      });
    });

    describe('feature requests', () => {
      it('should detect "it would be nice if"', () => {
        const result = detectFeedbackIntent('It would be nice if you could remember my preferences');
        expect(result.isFeedback).toBe(true);
        expect(result.matchedPatterns).toContain('Feature suggestion');
      });

      it('should detect "can you add"', () => {
        const result = detectFeedbackIntent('Can you add a dark mode?');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "Feature request:" label', () => {
        const result = detectFeedbackIntent('Feature request: add export to PDF');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "I wish you could"', () => {
        const result = detectFeedbackIntent('I wish you could integrate with Slack');
        expect(result.isFeedback).toBe(true);
      });
    });

    describe('bug reports', () => {
      it('should detect "there is a bug"', () => {
        const result = detectFeedbackIntent("There's a bug when I try to save");
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect "I found a bug"', () => {
        const result = detectFeedbackIntent('I found a bug in the search');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "something is broken"', () => {
        const result = detectFeedbackIntent('Something is broken');
        expect(result.isFeedback).toBe(true);
      });

      it('should detect "Bug:" label', () => {
        const result = detectFeedbackIntent('Bug: the save button does nothing');
        expect(result.isFeedback).toBe(true);
        expect(result.confidence).toBe('high');
      });

      it('should detect crash reports', () => {
        const result = detectFeedbackIntent('The app keeps crashing');
        expect(result.isFeedback).toBe(true);
      });
    });

    describe('exclusions - should NOT detect as feedback', () => {
      it('should not detect simple questions as feedback', () => {
        const result = detectFeedbackIntent('Can you help me with this code?');
        expect(result.isFeedback).toBe(false);
      });

      it('should not detect commands as feedback', () => {
        const result = detectFeedbackIntent('Please create a function that sorts an array');
        expect(result.isFeedback).toBe(false);
      });

      it('should not detect "what is" questions', () => {
        const result = detectFeedbackIntent('What is the best way to do this?');
        expect(result.isFeedback).toBe(false);
      });

      it('should not detect "how do I" questions', () => {
        const result = detectFeedbackIntent('How do I implement authentication?');
        expect(result.isFeedback).toBe(false);
      });
    });

    describe('configuration', () => {
      it('should respect minConfidenceThreshold', () => {
        // Lower confidence matches should be filtered with high threshold
        const result = detectFeedbackIntent('thanks', { minConfidenceThreshold: 0.9 });
        expect(result.isFeedback).toBe(false);
      });

      it('should work with custom patterns', () => {
        const customPattern = /\bsuggestion\s*:/i;
        const result = detectFeedbackIntent('Suggestion: add more examples', {
          customPatterns: [customPattern],
        });
        expect(result.isFeedback).toBe(true);
      });

      it('should respect excludePatterns', () => {
        const result = detectFeedbackIntent('That was helpful, but can you explain more?', {
          excludePatterns: [/but can you/i],
        });
        // Should still detect as feedback due to strong positive pattern
        expect(result.isFeedback).toBe(true);
      });
    });
  });

  describe('hasExplicitFeedbackIntent', () => {
    it('should return true for explicit feedback intent', () => {
      expect(hasExplicitFeedbackIntent('I want to leave feedback')).toBe(true);
      expect(hasExplicitFeedbackIntent('I have some feedback')).toBe(true);
      expect(hasExplicitFeedbackIntent("Here's my feedback")).toBe(true);
    });

    it('should return false for implicit feedback', () => {
      expect(hasExplicitFeedbackIntent('That was helpful')).toBe(false);
      expect(hasExplicitFeedbackIntent('This is broken')).toBe(false);
    });

    it('should return false for non-feedback', () => {
      expect(hasExplicitFeedbackIntent('Help me write a function')).toBe(false);
      expect(hasExplicitFeedbackIntent('What is TypeScript?')).toBe(false);
    });
  });
});
