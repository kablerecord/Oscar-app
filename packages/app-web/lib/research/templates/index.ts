/**
 * Research Templates
 *
 * Structured output formats for common research types.
 * Templates ensure consistent, actionable artifacts.
 */

import type { ResearchTemplate, TemplateDefinition } from '../types';

// =============================================================================
// Template Registry
// =============================================================================

export const TEMPLATE_REGISTRY: Record<ResearchTemplate, TemplateDefinition> = {
  general: {
    id: 'general',
    name: 'General Research',
    description: 'Freeform research on any topic',
    defaultStaleness: 180,
    requiredTier: 'pro',
    scopingQuestions: [
      'What specific aspects are you most interested in?',
      'What time period is most relevant?',
      'Are there particular sources you trust or want excluded?',
    ],
    outputStructure: `
# Research: {{topic}}

## Executive Summary
{{summary}}

## Key Findings
{{findings}}

## Detailed Analysis
{{analysis}}

## Sources
{{sources}}

## Limitations & Gaps
{{limitations}}
    `.trim(),
  },

  competitor_analysis: {
    id: 'competitor_analysis',
    name: 'Competitor Analysis',
    description: 'Structured competitive landscape assessment',
    defaultStaleness: 90,
    requiredTier: 'pro',
    scopingQuestions: [
      'Which specific competitors should I focus on?',
      'What dimensions matter most? (pricing, features, positioning, etc.)',
      'What market or segment are we comparing within?',
    ],
    outputStructure: `
# Competitor Analysis: {{market}}

## Competitive Landscape Overview
{{overview}}

## Competitor Profiles
{{profiles}}

## Feature Comparison Matrix
{{matrix}}

## Pricing Analysis
{{pricing}}

## Strategic Implications
{{implications}}

## Sources
{{sources}}
    `.trim(),
  },

  market_sizing: {
    id: 'market_sizing',
    name: 'Market Sizing',
    description: 'TAM/SAM/SOM with methodology',
    defaultStaleness: 180,
    requiredTier: 'pro',
    scopingQuestions: [
      'What product or service are we sizing the market for?',
      'What geography should I focus on?',
      'What customer segments are in scope?',
    ],
    outputStructure: `
# Market Sizing: {{market}}

## Executive Summary
{{summary}}

## Total Addressable Market (TAM)
{{tam}}

## Serviceable Addressable Market (SAM)
{{sam}}

## Serviceable Obtainable Market (SOM)
{{som}}

## Growth Projections
{{growth}}

## Methodology & Assumptions
{{methodology}}

## Sources
{{sources}}
    `.trim(),
  },

  technical_evaluation: {
    id: 'technical_evaluation',
    name: 'Technical Evaluation',
    description: 'Tech stack/tool comparison',
    defaultStaleness: 120,
    requiredTier: 'pro',
    scopingQuestions: [
      'What specific technologies or tools should I evaluate?',
      'What are your primary evaluation criteria?',
      'What constraints exist? (budget, team skills, infrastructure)',
    ],
    outputStructure: `
# Technical Evaluation: {{technologies}}

## Executive Summary
{{summary}}

## Evaluation Criteria
{{criteria}}

## Technology Profiles
{{profiles}}

## Comparison Matrix
{{matrix}}

## Recommendation
{{recommendation}}

## Migration/Implementation Considerations
{{implementation}}

## Sources
{{sources}}
    `.trim(),
  },

  enterprise_account_plan: {
    id: 'enterprise_account_plan',
    name: 'Enterprise Account Plan',
    description: 'Full account strategy document',
    defaultStaleness: 90,
    requiredTier: 'master',
    scopingQuestions: [
      'What company are we researching?',
      "What's your product/service you'd be selling them?",
      'Any existing relationship or cold outreach?',
      "What's your ideal entry point - department or use case?",
    ],
    outputStructure: `
# Enterprise Account Plan: {{company}}

## Executive Summary
{{summary}}

## Company Snapshot
- Industry: {{industry}}
- Revenue (est): {{revenue}}
- Employees: {{employees}}
- Locations: {{locations}}
- Growth trajectory: {{growth}}
- Key news/developments: {{news}}

## Decision Makers & Champions
{{stakeholders}}

## Priority Pain Points
{{painPoints}}

## Wedge Pilot Recommendation
{{wedge}}

## Proof Plan (90-Day Pilot)
{{proofPlan}}

## Objection Handling
{{objections}}

## Outreach Sequence
{{outreach}}

## Next Artifacts to Generate
{{nextArtifacts}}

## Sources & Confidence
{{sources}}
    `.trim(),
  },

  legal_compliance: {
    id: 'legal_compliance',
    name: 'Legal/Compliance Research',
    description: 'Regulatory landscape assessment',
    defaultStaleness: 90,
    requiredTier: 'master',
    scopingQuestions: [
      'What specific regulations or compliance areas?',
      'What jurisdictions are in scope?',
      'What industry or use case context?',
    ],
    outputStructure: `
# Legal/Compliance Research: {{topic}}

## Executive Summary
{{summary}}

## Regulatory Landscape
{{landscape}}

## Key Requirements
{{requirements}}

## Compliance Checklist
{{checklist}}

## Risk Assessment
{{risks}}

## Recommended Actions
{{actions}}

## Important Caveats
*This research is informational only and does not constitute legal advice.*

## Sources
{{sources}}
    `.trim(),
  },

  investment_research: {
    id: 'investment_research',
    name: 'Investment Research',
    description: 'Company/opportunity analysis',
    defaultStaleness: 30,
    requiredTier: 'master',
    scopingQuestions: [
      'What company or investment opportunity?',
      'What investment thesis are you exploring?',
      'What time horizon are you considering?',
    ],
    outputStructure: `
# Investment Research: {{target}}

## Executive Summary
{{summary}}

## Company Overview
{{overview}}

## Financial Analysis
{{financials}}

## Competitive Position
{{competitive}}

## Growth Drivers
{{growth}}

## Risk Factors
{{risks}}

## Valuation Considerations
{{valuation}}

## Key Metrics to Watch
{{metrics}}

## Important Caveats
*This research is informational only and does not constitute investment advice.*

## Sources
{{sources}}
    `.trim(),
  },
};

// =============================================================================
// Template Helpers
// =============================================================================

export function getTemplate(id: ResearchTemplate): TemplateDefinition {
  return TEMPLATE_REGISTRY[id];
}

export function getTemplatesForTier(tier: 'pro' | 'master'): TemplateDefinition[] {
  return Object.values(TEMPLATE_REGISTRY).filter((template) => {
    if (tier === 'master') return true;
    return template.requiredTier === 'pro';
  });
}

export function isTemplateAvailable(
  template: ResearchTemplate,
  tier: 'pro' | 'master'
): boolean {
  const def = TEMPLATE_REGISTRY[template];
  if (tier === 'master') return true;
  return def.requiredTier === 'pro';
}
