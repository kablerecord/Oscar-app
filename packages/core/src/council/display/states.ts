/**
 * Council Mode Display States
 *
 * State machine for council mode UI presentation.
 */

import type {
  DisplayState,
  CouncilDeliberation,
  AgreementLevel,
  CouncilSummary,
  ConsensusLevel,
  ModelCard,
  DisagreementSummary,
} from '../types';
import { getModelDisplayName } from '../config';

/**
 * Determine the initial display state based on council deliberation
 */
export function determineDisplayState(deliberation: CouncilDeliberation): DisplayState {
  const { agreement } = deliberation;

  // Split council shows disagreement view by default
  if (agreement.level === 'split') {
    return 'disagreement';
  }

  // Low agreement might show disagreement view
  if (agreement.level === 'low' && agreement.divergentPoints.length > 0) {
    return 'disagreement';
  }

  // Default to synthesis-only view
  return 'default';
}

/**
 * Map agreement level to consensus level
 */
export function mapToConsensusLevel(level: AgreementLevel): ConsensusLevel {
  switch (level) {
    case 'high':
      return 'High';
    case 'moderate':
      return 'Moderate';
    case 'low':
    case 'split':
      return 'Split';
    default:
      return 'Moderate';
  }
}

/**
 * Generate consensus description
 */
export function generateConsensusDescription(
  level: AgreementLevel,
  responseCount: number
): string {
  switch (level) {
    case 'high':
      return `${responseCount}/${responseCount} models aligned`;
    case 'moderate':
      return `${responseCount} models reached moderate agreement`;
    case 'low':
      return `Models showed limited agreement`;
    case 'split':
      return `Models disagreed on key points`;
    default:
      return `${responseCount} models consulted`;
  }
}

/**
 * Build model cards from responses
 */
export function buildModelCards(deliberation: CouncilDeliberation): ModelCard[] {
  return deliberation.responses
    .filter((r) => r.status === 'success')
    .map((response) => ({
      modelName: getModelDisplayName(response.modelId),
      confidencePercent: response.confidence.normalizedScore,
      summary: response.summary,
      fullResponseAvailable: response.content.length > 0,
    }));
}

/**
 * Build disagreement summaries for display
 */
export function buildDisagreementSummaries(
  deliberation: CouncilDeliberation
): DisagreementSummary[] | undefined {
  const { agreement, synthesis } = deliberation;

  if (agreement.divergentPoints.length === 0) {
    return undefined;
  }

  return agreement.divergentPoints.map((divergent) => ({
    topic: divergent.topic,
    modelPositions: divergent.positions.map((p) => ({
      model: getModelDisplayName(p.modelId),
      position: p.position,
    })),
    oscarRecommendation: getRecommendationForResolution(divergent.resolution),
    oscarReasoning: divergent.resolutionReasoning,
  }));
}

/**
 * Get Oscar's recommendation text for a resolution type
 */
function getRecommendationForResolution(
  resolution: string
): string {
  switch (resolution) {
    case 'model_a_weighted':
      return 'Following the primary recommendation';
    case 'model_b_weighted':
      return 'Following the alternative approach';
    case 'presented_both':
      return 'Both perspectives are valid';
    case 'external_grounding':
      return 'Verified against external sources';
    default:
      return 'Synthesized from available perspectives';
  }
}

/**
 * Build complete council summary for UI
 */
export function buildCouncilSummary(deliberation: CouncilDeliberation): CouncilSummary {
  const successfulResponses = deliberation.responses.filter((r) => r.status === 'success');

  return {
    consensusLevel: mapToConsensusLevel(deliberation.agreement.level),
    consensusDescription: generateConsensusDescription(
      deliberation.agreement.level,
      successfulResponses.length
    ),
    modelCards: buildModelCards(deliberation),
    disagreements: buildDisagreementSummaries(deliberation),
    arbitrationVisible: deliberation.synthesis.arbitrationLog.length > 0,
  };
}

/**
 * State transition helpers
 */
export const stateTransitions: Record<DisplayState, DisplayState[]> = {
  default: ['expanded', 'disagreement', 'full_log'],
  expanded: ['default', 'disagreement', 'full_log'],
  disagreement: ['default', 'expanded', 'full_log'],
  full_log: ['default', 'expanded', 'disagreement'],
};

/**
 * Check if a state transition is valid
 */
export function canTransitionTo(from: DisplayState, to: DisplayState): boolean {
  return stateTransitions[from]?.includes(to) ?? false;
}

/**
 * Get available transitions from current state
 */
export function getAvailableTransitions(current: DisplayState): DisplayState[] {
  return stateTransitions[current] || [];
}

export default {
  determineDisplayState,
  mapToConsensusLevel,
  generateConsensusDescription,
  buildModelCards,
  buildDisagreementSummaries,
  buildCouncilSummary,
  canTransitionTo,
  getAvailableTransitions,
};
