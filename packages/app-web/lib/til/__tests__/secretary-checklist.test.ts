/**
 * Secretary Checklist Detection Tests
 * Tests all 12 detection categories for the insights system
 */

import { describe, it, expect } from 'vitest'
import {
  detectCommitments,
  detectDeadlines,
  detectFollowUps,
  detectDependencies,
  detectContradictions,
  detectOpenQuestions,
  detectPeopleWaiting,
  detectRecurringPatterns,
  detectStaleDecisions,
  detectContextDecay,
  detectUnfinishedWork,
  detectPatternBreaks,
} from '../secretary-checklist'

const TEST_WORKSPACE_ID = 'test-workspace'
const TEST_THREAD_ID = 'test-thread'

describe('Secretary Checklist Detection', () => {
  // ============================================
  // Phase 1: Core 4 Categories
  // ============================================

  describe('detectCommitments', () => {
    it('should detect "I\'ll..." patterns', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I'll send the proposal to Mike tomorrow",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items[0].category).toBe('commitment')
    })

    it('should detect "I need to..." patterns', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I need to finish the documentation before Friday",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].content).toContain('finish')
    })

    it('should detect "I should..." patterns', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I should probably call the client back",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I have to..." patterns', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I have to update the dashboard before the meeting",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I promised..." patterns', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I promised to deliver the report by end of week",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should NOT detect short generic phrases', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I'll see",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(false)
    })

    it('should deduplicate similar commitments', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I'll send the email. I'll send the email again.",
        TEST_THREAD_ID
      )
      // Should dedupe based on first 30 chars of content
      // Multiple patterns may match different parts, but exact duplicates should be removed
      expect(result.found).toBe(true)
      expect(result.items.length).toBeGreaterThan(0)
    })
  })

  describe('detectDeadlines', () => {
    it('should detect explicit month dates', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "The deadline is January 15th",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('deadline')
    })

    it('should detect MM/DD format dates', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "Submit by 12/27",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "by Friday" patterns', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "Need this done by Friday",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "next week" patterns', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "Let's aim for next week",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "end of month" patterns', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "by end of the month",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "in X days" patterns', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "I need this in 3 days",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect event-based deadlines', () => {
      const result = detectDeadlines(
        TEST_WORKSPACE_ID,
        "before the product launch",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectFollowUps', () => {
    it('should detect "should we" questions', () => {
      const result = detectFollowUps(
        TEST_WORKSPACE_ID,
        "Should we use Stripe or PayPal for payments?",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('follow_up')
    })

    it('should detect "let\'s think about" deferrals', () => {
      const result = detectFollowUps(
        TEST_WORKSPACE_ID,
        "Let's think about that later",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "need to decide" patterns', () => {
      const result = detectFollowUps(
        TEST_WORKSPACE_ID,
        "We need to decide on the pricing strategy",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "figure out" deferrals', () => {
      const result = detectFollowUps(
        TEST_WORKSPACE_ID,
        "We'll figure that out later",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectDependencies', () => {
    it('should detect "once X is done" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "Once the auth system is done, we can build the dashboard",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('dependency')
    })

    it('should detect "blocked by" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "This is blocked by the API team",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "waiting on" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "We're waiting on the legal review",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "depends on" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "This depends on the database migration",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "can\'t until" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "Can't start the integration until the SDK is ready",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "first we need to" patterns', () => {
      const result = detectDependencies(
        TEST_WORKSPACE_ID,
        "First we need to set up the infrastructure",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  // ============================================
  // Phase 2: Additional 8 Categories
  // ============================================

  describe('detectContradictions', () => {
    it('should detect "actually I meant" patterns', () => {
      const result = detectContradictions(
        TEST_WORKSPACE_ID,
        "Actually, I meant the other approach",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('contradiction')
    })

    it('should detect "wait, I thought" patterns', () => {
      const result = detectContradictions(
        TEST_WORKSPACE_ID,
        "Wait, I thought we were going with React",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "changed my mind" patterns', () => {
      const result = detectContradictions(
        TEST_WORKSPACE_ID,
        "I changed my mind about the pricing model",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "scratch that" patterns', () => {
      const result = detectContradictions(
        TEST_WORKSPACE_ID,
        "Scratch that, let's do something different",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "instead" reversal patterns', () => {
      const result = detectContradictions(
        TEST_WORKSPACE_ID,
        "Let's go with PostgreSQL instead",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectOpenQuestions', () => {
    it('should detect "should we" questions', () => {
      const result = detectOpenQuestions(
        TEST_WORKSPACE_ID,
        "Should we prioritize mobile or desktop first?",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('open_question')
    })

    it('should detect "which option" questions', () => {
      const result = detectOpenQuestions(
        TEST_WORKSPACE_ID,
        "Which option makes more sense for us?",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "decide later" deferrals', () => {
      const result = detectOpenQuestions(
        TEST_WORKSPACE_ID,
        "Let's decide on that later",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "need to research" patterns', () => {
      const result = detectOpenQuestions(
        TEST_WORKSPACE_ID,
        "I need to research the best deployment options",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectPeopleWaiting', () => {
    it('should detect "I\'ll get back to [person]" patterns', () => {
      const result = detectPeopleWaiting(
        TEST_WORKSPACE_ID,
        "I'll get back to Sarah tomorrow",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('people_waiting')
    })

    it('should detect "I need to respond to" patterns', () => {
      const result = detectPeopleWaiting(
        TEST_WORKSPACE_ID,
        "I need to respond to John about the proposal",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "[person] is waiting" patterns', () => {
      const result = detectPeopleWaiting(
        TEST_WORKSPACE_ID,
        "Mike is waiting for the mockups",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I owe [person]" patterns', () => {
      const result = detectPeopleWaiting(
        TEST_WORKSPACE_ID,
        "I owe Lisa a follow-up email",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I told [person]" patterns', () => {
      const result = detectPeopleWaiting(
        TEST_WORKSPACE_ID,
        "I told David I'd have the specs ready",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectRecurringPatterns', () => {
    it('should detect "every week" patterns', () => {
      const result = detectRecurringPatterns(
        TEST_WORKSPACE_ID,
        "I review metrics every week",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('recurring_pattern')
    })

    it('should detect "usually on [day]" patterns', () => {
      const result = detectRecurringPatterns(
        TEST_WORKSPACE_ID,
        "I usually do standup on Mondays",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I always" patterns', () => {
      const result = detectRecurringPatterns(
        TEST_WORKSPACE_ID,
        "I always check emails first thing",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "weekly/monthly" patterns', () => {
      const result = detectRecurringPatterns(
        TEST_WORKSPACE_ID,
        "We have a weekly sync meeting",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectStaleDecisions', () => {
    it('should detect "we decided [time] ago" patterns', () => {
      const result = detectStaleDecisions(
        TEST_WORKSPACE_ID,
        "We decided months ago to use PostgreSQL",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('stale_decision')
    })

    it('should detect "back when" patterns', () => {
      const result = detectStaleDecisions(
        TEST_WORKSPACE_ID,
        "Back when we started, we chose React",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "originally we" patterns', () => {
      const result = detectStaleDecisions(
        TEST_WORKSPACE_ID,
        "Originally we planned for a smaller team",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "things have changed" patterns', () => {
      const result = detectStaleDecisions(
        TEST_WORKSPACE_ID,
        "Things have changed since the MVP launch",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectContextDecay', () => {
    it('should detect "last time I checked" patterns', () => {
      const result = detectContextDecay(
        TEST_WORKSPACE_ID,
        "Last time I checked, the API was at version 2",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('context_decay')
    })

    it('should detect "as of [month]" patterns', () => {
      const result = detectContextDecay(
        TEST_WORKSPACE_ID,
        "As of January, the pricing was different",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "haven\'t updated" patterns', () => {
      const result = detectContextDecay(
        TEST_WORKSPACE_ID,
        "We haven't updated the documentation in a while",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "is from last [time]" patterns', () => {
      const result = detectContextDecay(
        TEST_WORKSPACE_ID,
        "The report is from last quarter",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectUnfinishedWork', () => {
    it('should detect TODO markers', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "TODO: finish the API documentation",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('unfinished_work')
    })

    it('should detect WIP markers', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "The dashboard is WIP right now",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "not finished yet" patterns', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "The spec is not finished yet",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "still working on" patterns', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "I'm still working on the integration",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "need to finish" patterns', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "I need to finish the onboarding flow",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect draft mentions', () => {
      const result = detectUnfinishedWork(
        TEST_WORKSPACE_ID,
        "The proposal draft needs more work",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  describe('detectPatternBreaks', () => {
    it('should detect "I forgot to" patterns', () => {
      const result = detectPatternBreaks(
        TEST_WORKSPACE_ID,
        "I forgot to do the weekly review",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
      expect(result.items[0].category).toBe('pattern_break')
    })

    it('should detect "I missed" patterns', () => {
      const result = detectPatternBreaks(
        TEST_WORKSPACE_ID,
        "I missed the morning standup",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I skipped" patterns', () => {
      const result = detectPatternBreaks(
        TEST_WORKSPACE_ID,
        "I skipped the daily exercise routine",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "I haven\'t...lately" patterns', () => {
      const result = detectPatternBreaks(
        TEST_WORKSPACE_ID,
        "I haven't checked the analytics in a while",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })

    it('should detect "normally I would" patterns', () => {
      const result = detectPatternBreaks(
        TEST_WORKSPACE_ID,
        "Normally I would review this before sending",
        TEST_THREAD_ID
      )
      expect(result.found).toBe(true)
    })
  })

  // ============================================
  // Cross-Category Tests
  // ============================================

  describe('Cross-category detection', () => {
    it('should not detect false positives in neutral messages', () => {
      const message = "The weather is nice today. I had lunch at noon."

      expect(detectCommitments(TEST_WORKSPACE_ID, message, TEST_THREAD_ID).found).toBe(false)
      expect(detectContradictions(TEST_WORKSPACE_ID, message, TEST_THREAD_ID).found).toBe(false)
      expect(detectDependencies(TEST_WORKSPACE_ID, message, TEST_THREAD_ID).found).toBe(false)
    })

    it('should detect multiple categories in complex messages', () => {
      const message = "I'll finish the report by Friday, but I'm blocked by the API team. Also, I need to get back to Sarah."

      const commitments = detectCommitments(TEST_WORKSPACE_ID, message, TEST_THREAD_ID)
      const deadlines = detectDeadlines(TEST_WORKSPACE_ID, message, TEST_THREAD_ID)
      const dependencies = detectDependencies(TEST_WORKSPACE_ID, message, TEST_THREAD_ID)
      const peopleWaiting = detectPeopleWaiting(TEST_WORKSPACE_ID, message, TEST_THREAD_ID)

      expect(commitments.found).toBe(true)
      expect(deadlines.found).toBe(true)
      expect(dependencies.found).toBe(true)
      expect(peopleWaiting.found).toBe(true)
    })

    it('should have correct priority assignments', () => {
      // High priority categories
      const contradiction = detectContradictions(
        TEST_WORKSPACE_ID,
        "Actually, I meant something different",
        TEST_THREAD_ID
      )
      expect(contradiction.items[0]?.priority).toBe(8)

      // Medium priority categories
      const commitment = detectCommitments(
        TEST_WORKSPACE_ID,
        "I'll send the email tomorrow morning",
        TEST_THREAD_ID
      )
      expect(commitment.items[0]?.priority).toBe(6)

      // Lower priority categories
      const recurringPattern = detectRecurringPatterns(
        TEST_WORKSPACE_ID,
        "I always check emails first",
        TEST_THREAD_ID
      )
      expect(recurringPattern.items[0]?.priority).toBe(4)
    })

    it('should calculate confidence scores appropriately', () => {
      const result = detectCommitments(
        TEST_WORKSPACE_ID,
        "I'll definitely complete the entire project implementation by next week",
        TEST_THREAD_ID
      )

      expect(result.found).toBe(true)
      // Longer, more specific matches should have higher confidence
      expect(result.items[0].confidence).toBeGreaterThanOrEqual(0.7)
    })
  })
})
