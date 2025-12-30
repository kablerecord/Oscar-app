/**
 * Tests for Feedback Content Extractor
 */

import { describe, it, expect } from 'vitest';
import { extractFeedback } from '../extractor';

describe('Feedback Extractor', () => {
  describe('extractFeedback', () => {
    describe('sentiment detection', () => {
      it('should detect positive sentiment', () => {
        const result = extractFeedback('That was really helpful!');
        expect(result.sentiment).toBe('positive');
        expect(result.sentimentConfidence).toBe('high');
      });

      it('should detect negative sentiment', () => {
        const result = extractFeedback("This isn't working for me");
        expect(result.sentiment).toBe('negative');
      });

      it('should detect neutral sentiment for explicit feedback', () => {
        const result = extractFeedback('I have some feedback about the API');
        expect(result.sentiment).toBe('neutral');
      });

      it('should detect mixed sentiment', () => {
        const result = extractFeedback('The response was helpful but also confusing');
        expect(result.sentiment).toBe('mixed');
      });
    });

    describe('category detection', () => {
      it('should categorize bug reports', () => {
        const result = extractFeedback("There's a bug in the search feature");
        expect(result.category).toBe('bug_report');
      });

      it('should categorize feature requests', () => {
        const result = extractFeedback('It would be great if you could add dark mode');
        expect(result.category).toBe('feature_request');
      });

      it('should categorize praise', () => {
        const result = extractFeedback('That was exactly what I needed!');
        expect(result.category).toBe('praise');
      });

      it('should categorize complaints', () => {
        const result = extractFeedback("I'm not happy with this response");
        expect(result.category).toBe('complaint');
      });

      it('should categorize response quality feedback', () => {
        const result = extractFeedback('Your last response was too long');
        expect(result.category).toBe('response_quality');
      });

      it('should default to general for ambiguous feedback', () => {
        const result = extractFeedback('I have some feedback');
        expect(result.category).toBe('general');
      });
    });

    describe('aspect extraction', () => {
      it('should extract response time aspect', () => {
        const result = extractFeedback('The response time is too slow');
        expect(result.aspects).toContain('response_time');
      });

      it('should extract accuracy aspect', () => {
        const result = extractFeedback('The accuracy of the results is great');
        expect(result.aspects).toContain('accuracy');
      });

      it('should extract clarity aspect', () => {
        const result = extractFeedback('The explanation was very clear');
        expect(result.aspects).toContain('clarity');
      });

      it('should extract multiple aspects', () => {
        const result = extractFeedback('The response was fast but the quality could be better');
        expect(result.aspects).toContain('speed');
        expect(result.aspects).toContain('quality');
      });

      it('should extract helpfulness aspect', () => {
        const result = extractFeedback('This was really helpful');
        expect(result.aspects).toContain('helpfulness');
      });

      it('should extract formatting aspect', () => {
        const result = extractFeedback('The format of the response is hard to read');
        expect(result.aspects).toContain('formatting');
      });

      it('should extract length aspect', () => {
        const result = extractFeedback('The response was too long');
        expect(result.aspects).toContain('length');
      });

      it('should return empty array when no aspects mentioned', () => {
        const result = extractFeedback('I have some feedback');
        expect(result.aspects).toEqual([]);
      });
    });

    describe('content cleaning', () => {
      it('should remove "Feedback:" prefix', () => {
        const result = extractFeedback('Feedback: the response was great');
        expect(result.content).toBe('The response was great');
      });

      it('should remove "I want to leave feedback" prefix', () => {
        const result = extractFeedback('I want to leave feedback: this is awesome');
        expect(result.content).toBe('This is awesome');
      });

      it('should remove "Here is my feedback" prefix', () => {
        const result = extractFeedback("Here's my feedback: love this feature");
        expect(result.content).toBe('Love this feature');
      });

      it('should remove "Bug:" prefix', () => {
        const result = extractFeedback('Bug: save button not working');
        expect(result.content).toBe('Save button not working');
      });

      it('should remove "Feature request:" prefix', () => {
        const result = extractFeedback('Feature request: add dark mode');
        expect(result.content).toBe('Add dark mode');
      });

      it('should capitalize first letter after cleaning', () => {
        const result = extractFeedback('feedback: great work');
        expect(result.content).toBe('Great work');
      });

      it('should preserve original input', () => {
        const original = 'Feedback: the response was great';
        const result = extractFeedback(original);
        expect(result.originalInput).toBe(original);
      });
    });

    describe('response reference detection', () => {
      it('should detect reference to last response', () => {
        const result = extractFeedback('That last response was helpful');
        expect(result.referencesSpecificResponse).toBe(true);
      });

      it('should detect "your response"', () => {
        const result = extractFeedback('Your response was exactly right');
        expect(result.referencesSpecificResponse).toBe(true);
      });

      it('should detect "you just said"', () => {
        const result = extractFeedback('What you just said was wrong');
        expect(result.referencesSpecificResponse).toBe(true);
      });

      it('should detect "the above"', () => {
        const result = extractFeedback('The above response needs more detail');
        expect(result.referencesSpecificResponse).toBe(true);
      });

      it('should not flag general feedback as response-specific', () => {
        const result = extractFeedback('I love using this tool');
        expect(result.referencesSpecificResponse).toBe(false);
      });

      it('should respect detectResponseFeedback config', () => {
        const result = extractFeedback('Your last response was great', {
          detectResponseFeedback: false,
        });
        expect(result.referencesSpecificResponse).toBe(false);
      });
    });
  });
});
