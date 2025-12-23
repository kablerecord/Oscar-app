/**
 * Redaction Rules Engine
 *
 * Applies privacy redaction rules to memory content.
 * Supports removal, generalization, and hashing actions.
 */

import type { RedactionRule, RedactionCategory } from '../types';

/**
 * PII patterns for detection
 */
const PII_PATTERNS: Record<string, RegExp[]> = {
  ssn: [/\b\d{3}-\d{2}-\d{4}\b/, /\b\d{9}\b/],
  email: [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/],
  phone: [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    /\(\d{3}\)\s*\d{3}[-.\s]?\d{4}/,
  ],
  creditCard: [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/],
  address: [/\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/i],
  idNumber: [/\b[A-Z]{2}\d{6,8}\b/, /\b\d{2}-\d{7}\b/],
};

/**
 * Financial patterns
 */
const FINANCIAL_PATTERNS: RegExp[] = [
  /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|M|B|k|K))?\b/i,
  /\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars?|usd|eur|gbp)\b/i,
  /\b(?:revenue|profit|income|salary|net\s*worth)\s*(?:of|is|was)?\s*\$?[\d,]+/i,
  /\b(?:bank|account|routing)\s*(?:number|#)?\s*:?\s*\d+/i,
];

/**
 * Family patterns
 */
const FAMILY_PATTERNS: RegExp[] = [
  /\bmy\s+(?:wife|husband|spouse|partner|son|daughter|child|children|mom|dad|mother|father|brother|sister|grandma|grandpa|grandmother|grandfather)'?s?\s+(?:name\s+is\s+)?(\w+)/i,
  /\b(\w+),?\s+my\s+(?:wife|husband|spouse|partner|son|daughter|child|mom|dad|mother|father|brother|sister)/i,
];

/**
 * Medical patterns
 */
const MEDICAL_PATTERNS: RegExp[] = [
  /\b(?:diagnosed|suffering|condition|disease|illness|medication|prescription|doctor|hospital)\s+[\w\s]+/i,
  /\b(?:allergy|allergic)\s+to\s+[\w\s]+/i,
  /\b(?:blood\s*type|medical\s*record|health\s*insurance)\b/i,
];

/**
 * Location patterns
 */
const LOCATION_PATTERNS: RegExp[] = [
  /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd),?\s*[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/i,
  /\bgps\s*:?\s*[-\d.]+,\s*[-\d.]+/i,
  /\b(?:latitude|longitude)\s*:?\s*[-\d.]+/i,
];

/**
 * Detect if text contains patterns for a category
 */
export function detectPatterns(
  text: string,
  category: RedactionCategory
): string[] {
  const matches: string[] = [];
  let patterns: RegExp[];

  switch (category) {
    case 'pii':
      patterns = Object.values(PII_PATTERNS).flat();
      break;
    case 'financial':
      patterns = FINANCIAL_PATTERNS;
      break;
    case 'family':
      patterns = FAMILY_PATTERNS;
      break;
    case 'medical':
      patterns = MEDICAL_PATTERNS;
      break;
    case 'location':
      patterns = LOCATION_PATTERNS;
      break;
    default:
      return [];
  }

  for (const pattern of patterns) {
    const found = text.match(new RegExp(pattern, 'gi'));
    if (found) {
      matches.push(...found);
    }
  }

  return matches;
}

/**
 * Hash a string (simple hash for redaction)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `[REDACTED:${Math.abs(hash).toString(16).slice(0, 8)}]`;
}

/**
 * Generalization mappings
 */
const GENERALIZATIONS: Record<string, (match: string) => string> = {
  financial: (match: string) => {
    // Convert specific amounts to ranges
    const amount = parseFloat(match.replace(/[^0-9.]/g, ''));
    if (amount >= 1000000000) return '[significant financial resources]';
    if (amount >= 1000000) return '[substantial financial goals]';
    if (amount >= 100000) return '[notable financial objectives]';
    if (amount >= 10000) return '[moderate financial amount]';
    return '[financial information]';
  },
  location: () => '[location information]',
  pii: () => '[personal identifier]',
  family: (match: string) => {
    // Keep relationship, remove name
    if (/wife|husband|spouse|partner/i.test(match)) return '[spouse/partner]';
    if (/son|daughter|child/i.test(match)) return '[child]';
    if (/mom|dad|mother|father/i.test(match)) return '[parent]';
    if (/brother|sister/i.test(match)) return '[sibling]';
    return '[family member]';
  },
  medical: () => '[health information]',
};

/**
 * Apply a single redaction rule to text
 */
export function applyRedactionRule(
  text: string,
  rule: RedactionRule
): { text: string; redactionsApplied: number } {
  const matches = detectPatterns(text, rule.category);
  let redactedText = text;
  let count = 0;

  for (const match of matches) {
    let replacement: string;

    switch (rule.action) {
      case 'remove':
        replacement = '';
        break;
      case 'generalize':
        const generalizer = GENERALIZATIONS[rule.category];
        replacement = generalizer ? generalizer(match) : '[redacted]';
        break;
      case 'hash':
        replacement = hashString(match);
        break;
      default:
        replacement = '[redacted]';
    }

    redactedText = redactedText.replace(match, replacement);
    count++;
  }

  return { text: redactedText, redactionsApplied: count };
}

/**
 * Apply multiple redaction rules
 */
export function applyRedactionRules(
  text: string,
  rules: RedactionRule[]
): { text: string; redactionsApplied: string[] } {
  let redactedText = text;
  const appliedCategories: string[] = [];

  for (const rule of rules) {
    const result = applyRedactionRule(redactedText, rule);
    redactedText = result.text;
    if (result.redactionsApplied > 0) {
      appliedCategories.push(rule.category);
    }
  }

  return {
    text: redactedText.trim(),
    redactionsApplied: [...new Set(appliedCategories)],
  };
}

/**
 * Get default redaction rules for a permission tier
 */
export function getDefaultRedactionRules(tier: string): RedactionRule[] {
  // Always redact these regardless of tier
  const alwaysRedact: RedactionRule[] = [
    { category: 'pii', action: 'remove' },
    { category: 'medical', action: 'remove' },
  ];

  switch (tier) {
    case 'none':
      return [
        { category: 'pii', action: 'remove' },
        { category: 'financial', action: 'remove' },
        { category: 'family', action: 'remove' },
        { category: 'medical', action: 'remove' },
        { category: 'location', action: 'remove' },
      ];
    case 'minimal':
      return [
        ...alwaysRedact,
        { category: 'financial', action: 'remove' },
        { category: 'family', action: 'remove' },
        { category: 'location', action: 'remove' },
      ];
    case 'contextual':
      return [
        ...alwaysRedact,
        { category: 'financial', action: 'generalize' },
        { category: 'family', action: 'generalize' },
        { category: 'location', action: 'generalize' },
      ];
    case 'full':
      return alwaysRedact;
    default:
      return alwaysRedact;
  }
}

/**
 * Check if text contains sensitive information
 */
export function containsSensitiveInfo(text: string): {
  hasSensitive: boolean;
  categories: RedactionCategory[];
} {
  const categories: RedactionCategory[] = [];
  const allCategories: RedactionCategory[] = [
    'pii',
    'financial',
    'family',
    'medical',
    'location',
  ];

  for (const category of allCategories) {
    const matches = detectPatterns(text, category);
    if (matches.length > 0) {
      categories.push(category);
    }
  }

  return {
    hasSensitive: categories.length > 0,
    categories,
  };
}

/**
 * Clean up text after redaction (remove empty brackets, extra spaces)
 */
export function cleanupRedactedText(text: string): string {
  return text
    .replace(/\[\s*\]/g, '') // Remove empty brackets
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .replace(/\s+([.,!?])/g, '$1') // Remove space before punctuation
    .replace(/^\s+|\s+$/g, ''); // Trim
}
