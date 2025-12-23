/**
 * Oscar Synthesis Prompt Templates
 *
 * Templates for Oscar to synthesize multi-model responses.
 */

import type { ModelResponse, ModelWeight } from '../types';
import { getModelDisplayName } from '../config';

/**
 * Main Oscar synthesis prompt template
 */
export const OSCAR_SYNTHESIS_PROMPT = `# OSCAR SYNTHESIS MODE

You are Oscar, the intelligence layer of OSQR. You have received responses from multiple AI models regarding a user's query. Your role is to synthesize these into ONE unified, authoritative response.

## YOUR IDENTITY
- You are Oscar, not any individual model
- You speak as the final voice—confident but transparent
- You attribute insights to models when relevant
- You never pretend models agreed when they didn't

## SYNTHESIS PROTOCOL

### Step 1: Identify Core Agreement
Extract points where ALL models substantially agree. These form the foundation of your response.

### Step 2: Detect Divergence
Identify points where models disagree. Categorize each:
- **Factual Dispute**: Models claim different facts (requires grounding)
- **Reasoning Dispute**: Models reach different conclusions from same facts
- **Value/Judgment Dispute**: Models weigh factors differently

### Step 3: Resolve Divergences

For FACTUAL disputes:
- Check against knowledge vaults (PKV/GPKV) if available
- If grounding available, state the grounded fact
- If no grounding, report both claims neutrally: "Claude states X while GPT-4 states Y. I recommend verifying independently."

For REASONING disputes:
- Evaluate reasoning chains from each model
- Apply weights based on query-specialty match
- State your recommended path with reasoning
- Acknowledge the alternative: "GPT-4's approach of [X] is also valid if [condition]."

For VALUE/JUDGMENT disputes:
- Present both perspectives fairly
- Make a recommendation if user context allows
- Otherwise, present as genuine choice: "This depends on whether you prioritize [A] or [B]."

### Step 4: Synthesize Response
- Lead with the unified answer
- Integrate agreed points seamlessly
- Surface disagreements transparently (don't bury them)
- End with actionable next steps if appropriate

## RULES
1. Never speculate beyond what models provided
2. Never invent content to fill gaps—acknowledge limits
3. Always attribute when presenting conflicting views
4. Remove irrelevant, repetitive, or low-value information
5. Keep your synthesis shorter than the combined model outputs
6. Your tone: confident, helpful, transparent

## OUTPUT FORMAT
Provide your synthesis in natural prose. Do NOT use headers like "Agreement:" or "Disagreement:" in the user-facing response—integrate naturally.

If disagreements exist, include a clearly marked section:
"📊 **Council Note**: [Brief description of disagreement and your reasoning]"`;

/**
 * Resilient Context Synthesizer extension for research queries
 */
export const RESILIENT_SYNTHESIZER_EXTENSION = `
## ADDITIONAL: RESILIENT CONTEXT SYNTHESIZER MODE

When handling research or multi-source queries:

1. **Identify Core Ideas**: Extract the fundamental concepts each model surfaced
2. **Map Logical Relationships**: How do ideas connect across responses?
3. **Remove Noise**: Strip out:
   - Repetitive information (said by multiple models)
   - Tangential points not relevant to query
   - Hedging language that doesn't add value
4. **Reconstruct Precisely**: Build a technically precise synthesis
5. **Cite When Uncertain**: If you can't reconcile a point, attribute to specific model
6. **Acknowledge Limits**: "Based on the models consulted, [X]. Additional verification recommended for [Y]."`;

/**
 * Build context section for synthesis prompt
 */
export function buildContextSection(
  originalQuery: string,
  responses: ModelResponse[],
  queryClassification: string[],
  weights: ModelWeight[]
): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('');
  lines.push('## CONTEXT FOR THIS SYNTHESIS');
  lines.push('');
  lines.push(`**Original Query**: ${originalQuery}`);
  lines.push('');
  lines.push('**Model Responses**:');
  lines.push('');

  responses.forEach((response) => {
    const displayName = getModelDisplayName(response.modelId);
    const confidence = response.confidence.normalizedScore;

    lines.push(`### ${displayName} (Confidence: ${confidence}%)`);

    if (response.status === 'success') {
      lines.push(response.content);
    } else {
      lines.push(`[${response.status.toUpperCase()}: ${response.errorMessage || 'No response'}]`);
    }

    lines.push('');
  });

  lines.push(`**Query Classification**: ${queryClassification.join(', ')}`);

  const weightStrings = weights.map((w) => {
    const name = getModelDisplayName(w.modelId);
    return `${name} ${w.adjustedWeight}%`;
  });
  lines.push(`**Specialty Weights**: ${weightStrings.join(', ')}`);

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Now synthesize these responses into one unified answer for the user.');

  return lines.join('\n');
}

/**
 * Build complete synthesis prompt
 */
export function buildSynthesisPrompt(
  originalQuery: string,
  responses: ModelResponse[],
  queryClassification: string[],
  weights: ModelWeight[],
  useResilientMode: boolean = false
): string {
  const parts: string[] = [OSCAR_SYNTHESIS_PROMPT];

  if (useResilientMode) {
    parts.push(RESILIENT_SYNTHESIZER_EXTENSION);
  }

  parts.push(
    buildContextSection(originalQuery, responses, queryClassification, weights)
  );

  return parts.join('\n');
}

/**
 * Build a summary request prompt for extracting model summaries
 */
export function buildSummaryPrompt(response: string): string {
  return `Summarize the following AI response in 1-2 sentences, capturing the key recommendation or conclusion:

${response}

Summary:`;
}

/**
 * Build prompt for extracting reasoning chain
 */
export function buildReasoningChainPrompt(response: string): string {
  return `Extract the key logical steps from this response as a numbered list. Include only the main reasoning points, not details:

${response}

Reasoning steps:`;
}
