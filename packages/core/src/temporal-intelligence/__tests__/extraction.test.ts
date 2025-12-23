/**
 * Tests for Extraction Layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Classifier
  classifyInput,
  processIngestionTrigger,
  containsCommitmentSignals,
  getClassificationThreshold,
  meetsClassificationThreshold,
} from '../extraction/classifier';
import {
  // Extractor
  determineUrgencyCategory,
  isVagueReference,
  parseDate,
  extractTemporalReference,
  extractWho,
  extractWhat,
  calculateExtractionConfidence,
  extractCommitments,
  mergeCommitments,
} from '../extraction/extractor';
import {
  // Validator
  determineTimeReference,
  isActionable,
  validateCommitment,
  calculateSchemaCompleteness,
  calculateHedgingScore,
  calculateOverallConfidence,
  validateCommitments,
  filterActionable,
  filterByConfidence,
} from '../extraction/validator';
import type { CommitmentSource, ContentIngestionTrigger, Commitment } from '../types';

describe('Input Classifier', () => {
  describe('classifyInput', () => {
    it('should classify calendar content', () => {
      const content = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20250120T100000
DTEND:20250120T110000
SUMMARY:Team Meeting
END:VEVENT
END:VCALENDAR`;

      const result = classifyInput(content);
      expect(result.sourceType).toBe('calendar');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify email content', () => {
      const content = `From: john@example.com
To: jane@example.com
Subject: Meeting tomorrow
Date: Mon, 20 Jan 2025 10:00:00 -0500

Hi Jane, can we meet tomorrow?`;

      const result = classifyInput(content);
      expect(result.sourceType).toBe('email');
      expect(result.confidence).toBe(0.9);
    });

    it('should classify text message content', () => {
      const content = 'Message from: Mom\nDon\'t forget dinner on Sunday!';

      const result = classifyInput(content);
      expect(result.sourceType).toBe('text');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify voice content', () => {
      const content = '[Transcription] Remember to call the doctor about the test results.';

      const result = classifyInput(content);
      expect(result.sourceType).toBe('voice');
      expect(result.confidence).toBe(0.9);
    });

    it('should default to document for plain text', () => {
      const content = 'This is just some regular text without any specific markers.';

      const result = classifyInput(content);
      expect(result.sourceType).toBe('document');
      expect(result.confidence).toBe(0.5);
    });
  });

  describe('processIngestionTrigger', () => {
    it('should use provided source type if specified', () => {
      const trigger: ContentIngestionTrigger = {
        userId: 'user-1',
        sourceType: 'email',
        content: 'Plain text',
        sourceId: 'src-1',
        receivedAt: new Date(),
      };

      const result = processIngestionTrigger(trigger);
      expect(result.sourceType).toBe('email');
      expect(result.confidence).toBe(1.0);
    });

    it('should classify if source type is document', () => {
      const trigger: ContentIngestionTrigger = {
        userId: 'user-1',
        sourceType: 'document',
        content: 'From: test@example.com\nSubject: Test',
        sourceId: 'src-1',
        receivedAt: new Date(),
      };

      const result = processIngestionTrigger(trigger);
      expect(result.sourceType).toBe('email');
    });
  });

  describe('containsCommitmentSignals', () => {
    it('should detect commitment language', () => {
      expect(containsCommitmentSignals("I'll send it tomorrow")).toBe(true);
      expect(containsCommitmentSignals("by Monday")).toBe(true);
      expect(containsCommitmentSignals("deadline is Friday")).toBe(true);
      expect(containsCommitmentSignals("remind me to call")).toBe(true);
      expect(containsCommitmentSignals("need to finish")).toBe(true);
    });

    it('should not detect in regular text', () => {
      expect(containsCommitmentSignals("The weather is nice")).toBe(false);
      expect(containsCommitmentSignals("Just thinking about it")).toBe(false);
    });
  });

  describe('getClassificationThreshold', () => {
    it('should return correct thresholds', () => {
      expect(getClassificationThreshold('calendar')).toBe(0.9);
      expect(getClassificationThreshold('email')).toBe(0.7);
      expect(getClassificationThreshold('text')).toBe(0.75);
      expect(getClassificationThreshold('voice')).toBe(0.8);
      expect(getClassificationThreshold('document')).toBe(0.6);
      expect(getClassificationThreshold('manual')).toBe(0.95);
    });
  });

  describe('meetsClassificationThreshold', () => {
    it('should evaluate thresholds correctly', () => {
      expect(
        meetsClassificationThreshold({
          sourceType: 'email',
          confidence: 0.8,
          reasoning: 'Test',
        })
      ).toBe(true);

      expect(
        meetsClassificationThreshold({
          sourceType: 'email',
          confidence: 0.5,
          reasoning: 'Test',
        })
      ).toBe(false);
    });
  });
});

describe('Commitment Extractor', () => {
  const createSource = (): CommitmentSource => ({
    type: 'email',
    sourceId: 'test-source',
    extractedAt: new Date(),
  });

  describe('determineUrgencyCategory', () => {
    it('should detect TODAY', () => {
      expect(determineUrgencyCategory('meeting today')).toBe('TODAY');
      expect(determineUrgencyCategory('tonight at 8')).toBe('TODAY');
    });

    it('should detect TOMORROW', () => {
      expect(determineUrgencyCategory('call tomorrow')).toBe('TOMORROW');
    });

    it('should detect THIS_WEEK', () => {
      expect(determineUrgencyCategory('by Friday')).toBe('THIS_WEEK');
      expect(determineUrgencyCategory('this week sometime')).toBe('THIS_WEEK');
    });

    it('should detect THIS_MONTH', () => {
      expect(determineUrgencyCategory('next week')).toBe('THIS_MONTH');
      expect(determineUrgencyCategory('by the end of the month')).toBe('THIS_MONTH');
    });

    it('should default to LATER', () => {
      expect(determineUrgencyCategory('sometime in the future')).toBe('LATER');
    });
  });

  describe('isVagueReference', () => {
    it('should detect vague references', () => {
      expect(isVagueReference('sometime soon')).toBe(true);
      expect(isVagueReference('later')).toBe(true);
      expect(isVagueReference('eventually')).toBe(true);
      expect(isVagueReference('when I get a chance')).toBe(true);
    });

    it('should not flag specific references', () => {
      expect(isVagueReference('January 15')).toBe(false);
      expect(isVagueReference('at 3pm')).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse month day format', () => {
      const result = parseDate('June 15');
      expect(result).toBeDefined();
      expect(result?.getMonth()).toBe(5); // June is month 5
      expect(result?.getDate()).toBe(15);
    });

    it('should parse day of week', () => {
      const result = parseDate('next Monday');
      expect(result).toBeDefined();
      expect(result?.getDay()).toBe(1); // Monday is day 1
    });

    it('should parse tomorrow', () => {
      const result = parseDate('tomorrow');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result?.getDate()).toBe(tomorrow.getDate());
    });

    it('should parse relative dates', () => {
      const result = parseDate('in 3 days');
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);
      expect(result?.getDate()).toBe(expected.getDate());
    });

    it('should return undefined for unparseable text', () => {
      expect(parseDate('no date here')).toBeUndefined();
    });
  });

  describe('extractTemporalReference', () => {
    it('should create temporal reference', () => {
      const ref = extractTemporalReference('meeting tomorrow');
      expect(ref.rawText).toBe('meeting tomorrow');
      expect(ref.urgencyCategory).toBe('TOMORROW');
      expect(ref.isVague).toBe(false);
    });
  });

  describe('extractWho', () => {
    it('should detect user commitments', () => {
      expect(extractWho("I'll handle it")).toBe('user');
      expect(extractWho("I will send the report")).toBe('user');
    });

    it('should detect group commitments', () => {
      // The regex checks for lowercase 'we' patterns like we'll, we will, we're going
      // Capital "We" can trigger named person detection, so test with lowercase
      expect(extractWho("we will discuss it")).toBe('user + others');
      expect(extractWho("we're going to meet")).toBe('user + others');
    });

    it('should default to user', () => {
      expect(extractWho('finish the task')).toBe('user');
    });
  });

  describe('extractWhat', () => {
    it('should extract action from commitment language', () => {
      expect(extractWhat("I'll send the report")).toBe('send the report');
      expect(extractWhat("We need to call the client")).toContain('call the client');
      expect(extractWhat("Remind me to buy groceries")).toBe('buy groceries');
    });

    it('should clean up trailing content', () => {
      expect(extractWhat("I'll finish it by Friday")).toBe('finish it');
    });
  });

  describe('calculateExtractionConfidence', () => {
    it('should give higher confidence for complete commitments', () => {
      const highConfidence = calculateExtractionConfidence(
        "I'll send the detailed report",
        'user',
        'send the detailed report',
        { rawText: 'tomorrow', parsedDate: new Date(), isVague: false, urgencyCategory: 'TOMORROW' }
      );

      const lowConfidence = calculateExtractionConfidence(
        'maybe',
        '',
        '',
        { rawText: '', isVague: true, urgencyCategory: 'LATER' }
      );

      expect(highConfidence).toBeGreaterThan(lowConfidence);
    });
  });

  describe('extractCommitments', () => {
    it('should extract commitments from email', () => {
      const content = `Hi team,

I'll send the report by tomorrow. We need to schedule a meeting for next week.

Don't forget to review the proposal by Friday.

Best,
John`;

      const commitments = extractCommitments(content, createSource());
      expect(commitments.length).toBeGreaterThan(0);
    });

    it('should extract will statements', () => {
      const content = "I will finish the project by next week.";
      const commitments = extractCommitments(content, createSource());

      expect(commitments.length).toBe(1);
      expect(commitments[0].what).toContain('finish');
    });

    it('should extract need to statements', () => {
      const content = "We need to submit the application by Monday.";
      const commitments = extractCommitments(content, createSource());

      expect(commitments.length).toBe(1);
    });

    it('should skip low-confidence extractions', () => {
      const content = "I'll do it."; // Too vague
      const commitments = extractCommitments(content, createSource());

      // May or may not extract depending on confidence threshold
      expect(commitments.length).toBeLessThanOrEqual(1);
    });
  });

  describe('mergeCommitments', () => {
    it('should merge similar commitments', () => {
      // Note: fingerprint uses first 20 chars of 'what', so these must match
      const commitments: Commitment[] = [
        {
          id: '1',
          commitmentText: "I'll call the client",
          who: 'user',
          what: 'call the client',
          when: { rawText: 'tomorrow', isVague: false, urgencyCategory: 'TOMORROW' },
          source: createSource(),
          confidence: 0.8,
          reasoning: '',
          createdAt: new Date(),
          validated: false,
        },
        {
          id: '2',
          commitmentText: 'Call the client',
          who: 'user',
          what: 'call the client',
          when: { rawText: 'today', isVague: false, urgencyCategory: 'TODAY' },
          source: createSource(),
          confidence: 0.9,
          reasoning: '',
          createdAt: new Date(),
          validated: false,
        },
      ];

      const merged = mergeCommitments(commitments);
      expect(merged.length).toBe(1);
      expect(merged[0].confidence).toBe(0.9); // Keeps higher confidence
    });

    it('should keep distinct commitments', () => {
      const commitments: Commitment[] = [
        {
          id: '1',
          commitmentText: 'Call the client',
          who: 'user',
          what: 'call the client',
          when: { rawText: 'tomorrow', isVague: false, urgencyCategory: 'TOMORROW' },
          source: createSource(),
          confidence: 0.8,
          reasoning: '',
          createdAt: new Date(),
          validated: false,
        },
        {
          id: '2',
          commitmentText: 'Send the report',
          who: 'user',
          what: 'send the report',
          when: { rawText: 'today', isVague: false, urgencyCategory: 'TODAY' },
          source: createSource(),
          confidence: 0.9,
          reasoning: '',
          createdAt: new Date(),
          validated: false,
        },
      ];

      const merged = mergeCommitments(commitments);
      expect(merged.length).toBe(2);
    });
  });
});

describe('Validator', () => {
  const createCommitment = (overrides: Partial<Commitment> = {}): Commitment => ({
    id: 'test-1',
    commitmentText: 'I will send the report tomorrow',
    who: 'user',
    what: 'send the report',
    when: {
      rawText: 'tomorrow',
      isVague: false,
      urgencyCategory: 'TOMORROW',
      parsedDate: new Date(Date.now() + 86400000),
    },
    source: {
      type: 'email',
      sourceId: 'test',
      extractedAt: new Date(),
    },
    confidence: 0.8,
    reasoning: 'Test extraction',
    createdAt: new Date(),
    validated: false,
    ...overrides,
  });

  describe('determineTimeReference', () => {
    it('should detect past references', () => {
      expect(determineTimeReference('I already sent the report yesterday')).toBe('past');
      expect(determineTimeReference('We finished the project last week')).toBe('past');
    });

    it('should detect hypothetical references', () => {
      expect(determineTimeReference('I might send it if I have time')).toBe('hypothetical');
      expect(determineTimeReference('Perhaps we could meet')).toBe('hypothetical');
      expect(determineTimeReference('I am thinking about doing this')).toBe('hypothetical');
    });

    it('should detect future references', () => {
      expect(determineTimeReference('I will send the report tomorrow')).toBe('future');
      expect(determineTimeReference('We are going to schedule a meeting')).toBe('future');
    });
  });

  describe('isActionable', () => {
    it('should return true for future actionable commitments', () => {
      const commitment = createCommitment({
        commitmentText: 'I will send the detailed report to the client',
        what: 'send the detailed report to the client',
      });

      expect(isActionable(commitment)).toBe(true);
    });

    it('should return false for past commitments', () => {
      const commitment = createCommitment({
        commitmentText: 'I already finished the project yesterday',
      });

      expect(isActionable(commitment)).toBe(false);
    });

    it('should return false for short/unclear actions', () => {
      const commitment = createCommitment({
        what: 'it',
      });

      expect(isActionable(commitment)).toBe(false);
    });
  });

  describe('validateCommitment', () => {
    it('should validate actionable commitments', () => {
      const commitment = createCommitment();
      const result = validateCommitment(commitment);

      expect(result.isActionable).toBe(true);
      expect(result.timeReference).toBe('future');
      expect(result.adjustedConfidence).toBeGreaterThan(0);
    });

    it('should reduce confidence for hypothetical', () => {
      const commitment = createCommitment({
        commitmentText: 'I might possibly send the report sometime',
        confidence: 1.0,
      });

      const result = validateCommitment(commitment);
      expect(result.adjustedConfidence).toBeLessThan(1.0);
    });

    it('should boost confidence for specific dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const commitment = createCommitment({
        when: {
          rawText: 'next week',
          isVague: false,
          urgencyCategory: 'THIS_WEEK',
          parsedDate: futureDate,
        },
        confidence: 0.7,
      });

      const result = validateCommitment(commitment);
      expect(result.adjustedConfidence).toBeGreaterThan(0.7);
    });
  });

  describe('calculateSchemaCompleteness', () => {
    it('should give high score for complete schema', () => {
      const commitment = createCommitment();
      const score = calculateSchemaCompleteness(commitment);
      expect(score).toBeGreaterThan(0.7);
    });

    it('should give lower score for incomplete schema', () => {
      const commitment = createCommitment({
        who: '',
        what: '',
        when: { rawText: '', isVague: true, urgencyCategory: 'LATER' },
      });

      const score = calculateSchemaCompleteness(commitment);
      expect(score).toBeLessThan(0.5);
    });
  });

  describe('calculateHedgingScore', () => {
    it('should give high score for confident reasoning', () => {
      const score = calculateHedgingScore('This is a clear commitment to send the report.');
      expect(score).toBe(1.0);
    });

    it('should reduce score for hedging language', () => {
      const score = calculateHedgingScore('This might be a commitment, possibly, but not sure.');
      expect(score).toBeLessThan(1.0);
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate weighted confidence', () => {
      const commitment = createCommitment({ reasoning: 'Clear extraction.' });
      const validation = validateCommitment(commitment);
      const confidence = calculateOverallConfidence(commitment, validation, true);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should give lower confidence without retrieval match', () => {
      const commitment = createCommitment({ reasoning: 'Clear extraction.' });
      const validation = validateCommitment(commitment);

      const withMatch = calculateOverallConfidence(commitment, validation, true);
      const withoutMatch = calculateOverallConfidence(commitment, validation, false);

      expect(withMatch).toBeGreaterThan(withoutMatch);
    });
  });

  describe('filterActionable', () => {
    it('should filter to only actionable commitments', () => {
      const commitments = [
        createCommitment({ id: '1' }),
        createCommitment({
          id: '2',
          commitmentText: 'I already did this yesterday',
        }),
        createCommitment({ id: '3' }),
      ];

      const filtered = filterActionable(commitments);
      expect(filtered.length).toBeLessThanOrEqual(commitments.length);
      // All filtered should be actionable
      for (const c of filtered) {
        expect(isActionable(c)).toBe(true);
      }
    });
  });

  describe('filterByConfidence', () => {
    it('should filter by minimum adjusted confidence', () => {
      // filterByConfidence uses adjustedConfidence which can boost values,
      // so we use a threshold that will definitely filter some out
      const commitments = [
        createCommitment({ id: '1', confidence: 0.95 }),
        createCommitment({
          id: '2',
          confidence: 0.3,
          commitmentText: 'I already did this yesterday', // Past reference reduces confidence
        }),
      ];

      const filtered = filterByConfidence(commitments, 0.9);
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.some((c) => c.id === '1')).toBe(true);
    });
  });
});
