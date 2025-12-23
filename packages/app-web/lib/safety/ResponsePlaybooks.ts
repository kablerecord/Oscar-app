/**
 * Safety Response Playbooks
 *
 * Pre-written response templates for different safety scenarios.
 * These maintain OSQR's voice while handling sensitive situations appropriately.
 *
 * @see docs/SAFETY_SYSTEM.md
 */

import type { CrisisLevel, DisclaimerCategory, DisclaimerStrength } from './types'

// =============================================================================
// CRISIS RESPONSES
// =============================================================================

/**
 * Primary crisis response for self-harm/suicide signals.
 * Used when shouldIntervene is true.
 */
export const CRISIS_RESPONSE = `I'm really glad you told me what you're feeling.

You're not alone, and what you're going through matters.

I'm not a substitute for someone who can be there with you right now, but I want you to know that support is available.

**If you're in immediate danger, please contact emergency services (911 in the US).**

If you'd like to talk to someone:
- **US:** Call or text **988** (Suicide & Crisis Lifeline) — free, 24/7
- **International:** [findahelpline.com](https://findahelpline.com) has resources for most countries
- **Text:** Text "HELLO" to **741741** (Crisis Text Line)

You matter. I'm here if you want to keep talking, but please also reach out to someone who can be there with you.`

/**
 * Follow-up response if user continues after crisis response
 */
export const CRISIS_FOLLOWUP = `How are you feeling right now?

If you're still struggling, please consider reaching out to one of those resources — they're trained to help with exactly what you're going through.

I'm not going anywhere. What would be helpful right now?`

/**
 * Get crisis response based on level
 */
export function getCrisisResponse(level: CrisisLevel): string | null {
  switch (level) {
    case 'critical':
    case 'high':
      return CRISIS_RESPONSE
    case 'low':
      // For low level, we don't interrupt — just monitor
      return null
    case 'none':
      return null
  }
}

// =============================================================================
// MODEL REFUSAL WRAPPER
// =============================================================================

/**
 * Patterns that indicate the underlying model refused a request
 */
const REFUSAL_PATTERNS = [
  /I cannot|I can't|I'm not able to/i,
  /I won't be able to/i,
  /I'm (not )?designed to decline/i,
  /against my (guidelines|programming|policies)/i,
  /I (don't|do not) feel comfortable/i,
  /I'm unable to (help|assist|provide)/i,
  /I must (decline|refuse)/i,
  /This (request|type of request) (is )?(goes )?against/i,
  /I can't (help|assist) with (that|this)/i,
  /not something I('m| am) able to/i,
]

/**
 * Check if a response is a model refusal
 */
export function isModelRefusal(response: string): boolean {
  // Don't check very long responses (refusals are usually short)
  if (response.length > 1000) return false

  return REFUSAL_PATTERNS.some((pattern) => pattern.test(response))
}

/**
 * OSQR's refusal response that wraps model refusals
 * Maintains OSQR's helpful, non-judgmental personality
 */
export const REFUSAL_WRAPPER = `I can't help with that specific request, but I want to be useful.

If there's a different angle on this topic I can help with, or a related question that would be valuable, I'm happy to try.

What are you ultimately trying to accomplish? Maybe I can help you get there a different way.`

/**
 * Wrap a model refusal in OSQR's voice
 */
export function wrapRefusal(originalResponse: string): string {
  // Check if already wrapped (avoid double-wrapping)
  if (originalResponse.includes("I can't help with that specific request")) {
    return originalResponse
  }

  return REFUSAL_WRAPPER
}

// =============================================================================
// DISCLAIMERS
// =============================================================================

/**
 * Disclaimer templates by category and strength
 */
export const DISCLAIMERS: Record<DisclaimerCategory, Record<DisclaimerStrength, string>> = {
  medical: {
    soft: "\n\n---\n*I'm not a doctor — please verify this with a healthcare professional.*",
    strong: `

---

**Important:** This is general information, not medical advice. Please consult a healthcare professional before making any medical decisions. If this is urgent, contact your doctor or go to an emergency room.`,
  },

  legal: {
    soft: "\n\n---\n*Laws vary by jurisdiction — consider consulting a lawyer for your specific situation.*",
    strong: `

---

**Important:** This is general information, not legal advice. Laws vary significantly by location and situation. Please consult a qualified attorney before taking action.`,
  },

  financial: {
    soft: "\n\n---\n*Consider consulting a financial advisor for personalized advice.*",
    strong: `

---

**Important:** This is general information, not financial advice. Your situation is unique. Please consult a qualified financial advisor before making significant financial decisions.`,
  },
}

/**
 * Patterns that trigger disclaimers (not refusals — these are valid topics)
 */
const DISCLAIMER_TRIGGERS: Record<DisclaimerCategory, RegExp[]> = {
  medical: [
    /\b(diagnosis|diagnose|symptoms?|medication|dosage|treatment|drug interaction|side effect)\b/i,
    /\bshould i (take|stop taking|increase|decrease|start|continue)\b/i,
    /\b(prescription|medicine|drug|pill|supplement)\b/i,
    /\b(medical|health) (advice|condition|problem|issue)\b/i,
  ],

  legal: [
    /\b(sue|lawsuit|legal action|contract|liability|rights|settlement)\b/i,
    /\bis (this|it|that) legal\b/i,
    /\b(lawyer|attorney|court|judge|prosecution|defense)\b/i,
    /\b(criminal|civil|lawsuit|litigation)\b/i,
    /\b(copyright|trademark|patent|intellectual property)\b/i,
  ],

  financial: [
    /\b(invest|investment|stock|bond|crypto|bitcoin|retirement|401k|ira)\b/i,
    /\bshould i (buy|sell|invest|put money)\b/i,
    /\b(tax|taxes|deduction|refund|irs|audit)\b/i,
    /\b(mortgage|loan|debt|credit|bankruptcy)\b/i,
    /\b(financial (planning|advice|decision))\b/i,
  ],
}

/**
 * Detect which disclaimer category (if any) applies to a message
 */
export function detectDisclaimerCategory(message: string): DisclaimerCategory | null {
  const categories: DisclaimerCategory[] = ['medical', 'legal', 'financial']

  for (const category of categories) {
    const patterns = DISCLAIMER_TRIGGERS[category]
    if (patterns.some((pattern) => pattern.test(message))) {
      return category
    }
  }

  return null
}

/**
 * Determine disclaimer strength based on message content
 */
export function getDisclaimerStrength(message: string, category: DisclaimerCategory): DisclaimerStrength {
  // Strong disclaimer triggers
  const strongTriggers: Record<DisclaimerCategory, RegExp[]> = {
    medical: [
      /\bshould i (take|stop|start|change)\b/i,
      /\b(dosage|how much|how many|overdose)\b/i,
      /\b(emergency|urgent|serious|dangerous)\b/i,
    ],
    legal: [
      /\b(sue|lawsuit|court|judge)\b/i,
      /\bshould i\b/i,
      /\b(arrest|criminal|prosecution)\b/i,
    ],
    financial: [
      /\bshould i (buy|sell|invest)\b/i,
      /\b(all my|life savings|retirement)\b/i,
      /\b(crypto|bitcoin|stock (market|pick))\b/i,
    ],
  }

  const triggers = strongTriggers[category]
  if (triggers.some((pattern) => pattern.test(message))) {
    return 'strong'
  }

  return 'soft'
}

/**
 * Get the appropriate disclaimer for a message (if needed)
 */
export function getDisclaimer(message: string): string | null {
  const category = detectDisclaimerCategory(message)
  if (!category) return null

  const strength = getDisclaimerStrength(message, category)
  return DISCLAIMERS[category][strength]
}

/**
 * Add disclaimer to a response if needed
 */
export function addDisclaimerIfNeeded(response: string, userMessage: string): string {
  const disclaimer = getDisclaimer(userMessage)
  if (!disclaimer) return response

  // Don't add disclaimer if response already has one
  if (response.includes('not medical advice') ||
      response.includes('not legal advice') ||
      response.includes('not financial advice') ||
      response.includes('consult a') ||
      response.includes('healthcare professional') ||
      response.includes('qualified attorney') ||
      response.includes('financial advisor')) {
    return response
  }

  return response + disclaimer
}
