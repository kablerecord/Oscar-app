/**
 * Council Mode Display Formatters
 *
 * Format council deliberation data for various output formats.
 */

import type {
  CouncilDeliberation,
  CouncilSummary,
  ModelResponse,
  ArbitrationEntry,
  DisplayState,
} from '../types';
import { buildCouncilSummary } from './states';
import { getModelDisplayName, estimateCost } from '../config';

/**
 * Format options
 */
export interface FormatOptions {
  includeTimestamps?: boolean;
  includeTokens?: boolean;
  includeCosts?: boolean;
  maxSummaryLength?: number;
}

/**
 * Format council deliberation for default view (synthesis only)
 */
export function formatDefaultView(
  deliberation: CouncilDeliberation,
  options: FormatOptions = {}
): string {
  const lines: string[] = [];

  // Main synthesis response
  lines.push(deliberation.synthesis.finalResponse);

  // Consensus indicator
  lines.push('');
  lines.push('─'.repeat(50));

  const summary = buildCouncilSummary(deliberation);
  const consensusIcon = getConsensusIcon(summary.consensusLevel);

  lines.push(`${consensusIcon} Council Consensus: ${summary.consensusLevel} (${summary.consensusDescription})`);

  if (summary.arbitrationVisible) {
    lines.push('📊 Expand Council Details');
  }

  return lines.join('\n');
}

/**
 * Format council deliberation for expanded view
 */
export function formatExpandedView(
  deliberation: CouncilDeliberation,
  options: FormatOptions = {}
): string {
  const lines: string[] = [];
  const summary = buildCouncilSummary(deliberation);

  lines.push('COUNCIL DELIBERATION');
  lines.push('═'.repeat(50));
  lines.push('');

  // Model cards
  summary.modelCards.forEach((card) => {
    const weight = deliberation.synthesis.weightsApplied.find(
      (w) => getModelDisplayName(w.modelId) === card.modelName
    );

    lines.push(`┌${'─'.repeat(30)}┐`);
    lines.push(`│ ${card.modelName.padEnd(28)} │`);
    lines.push(`│ Weight: ${(weight?.adjustedWeight || 0).toString().padStart(2)}%`.padEnd(31) + '│');
    lines.push(`│ Confidence: ${card.confidencePercent}%`.padEnd(31) + '│');
    lines.push(`├${'─'.repeat(30)}┤`);

    const summaryLines = wrapText(card.summary, 28);
    summaryLines.forEach((line) => {
      lines.push(`│ ${line.padEnd(28)} │`);
    });

    lines.push(`│${''.padEnd(30)}│`);
    lines.push(`│ ▶ Full Response`.padEnd(31) + '│');
    lines.push(`└${'─'.repeat(30)}┘`);
    lines.push('');
  });

  // Arbitration summary
  lines.push('ARBITRATION SUMMARY');
  lines.push('─'.repeat(50));

  if (deliberation.agreement.alignedPoints.length > 0) {
    lines.push('• All models agreed:');
    deliberation.agreement.alignedPoints.slice(0, 3).forEach((point) => {
      lines.push(`  ${truncate(point, 45)}`);
    });
  }

  const primaryModel = deliberation.synthesis.weightsApplied[0];
  if (primaryModel) {
    lines.push(
      `• ${getModelDisplayName(primaryModel.modelId)} weighted higher (${primaryModel.adjustmentReason || 'specialty match'})`
    );
  }

  if (deliberation.agreement.divergentPoints.length > 0) {
    const divergent = deliberation.agreement.divergentPoints[0];
    lines.push(`• ${divergent.topic}—${divergent.resolution.replace(/_/g, ' ')}`);
  }

  lines.push('');
  lines.push('[Collapse] [View Full Arbitration Log]');

  return lines.join('\n');
}

/**
 * Format council deliberation for disagreement view
 */
export function formatDisagreementView(
  deliberation: CouncilDeliberation,
  options: FormatOptions = {}
): string {
  const lines: string[] = [];
  const summary = buildCouncilSummary(deliberation);

  lines.push('Oscar                                         [⚠️ Split Council]');
  lines.push('─'.repeat(60));
  lines.push('');
  lines.push('The models reached different conclusions on this question.');
  lines.push('Here\'s my synthesis with the key disagreement noted:');
  lines.push('');

  // Oscar's recommendation (first part of synthesis)
  const synthesisParts = deliberation.synthesis.finalResponse.split('\n\n');
  lines.push(synthesisParts[0]);
  lines.push('');

  // Key disagreement box
  if (summary.disagreements && summary.disagreements.length > 0) {
    lines.push('┌' + '─'.repeat(58) + '┐');
    lines.push('│ ⚖️ KEY DISAGREEMENT'.padEnd(59) + '│');
    lines.push('│'.padEnd(60) + '│');

    summary.disagreements.forEach((d) => {
      lines.push(`│ On **${d.topic}**:`.padEnd(59) + '│');
      lines.push('│'.padEnd(60) + '│');

      d.modelPositions.forEach((p) => {
        lines.push(`│ • **${p.model}** argues: ${truncate(p.position, 35)}`.padEnd(59) + '│');
      });

      lines.push('│'.padEnd(60) + '│');
      lines.push(`│ **Oscar's take**: ${truncate(d.oscarReasoning, 35)}`.padEnd(59) + '│');
    });

    lines.push('└' + '─'.repeat(58) + '┘');
  }

  lines.push('');
  lines.push('📊 Expand Full Council Deliberation');

  return lines.join('\n');
}

/**
 * Format full arbitration log
 */
export function formatFullLog(
  deliberation: CouncilDeliberation,
  options: FormatOptions = {}
): string {
  const lines: string[] = [];

  lines.push('FULL ARBITRATION LOG');
  lines.push('═'.repeat(60));
  lines.push('');

  lines.push(`Query ID: ${deliberation.queryId}`);
  if (options.includeTimestamps && deliberation.responses[0]?.timestamp) {
    lines.push(`Timestamp: ${deliberation.responses[0].timestamp}`);
  }
  lines.push(`Trigger: ${deliberation.councilModeTrigger === 'auto' ? 'Auto' : 'User invoked'}`);
  lines.push('');

  // Step 1: Model responses
  lines.push('─'.repeat(60));
  lines.push('STEP 1: Query dispatched to models');

  deliberation.responses.forEach((r) => {
    const inputTokens = Math.ceil(r.tokensUsed * 0.3);
    const outputTokens = Math.ceil(r.tokensUsed * 0.7);
    const cost = estimateCost(r.modelId, inputTokens, outputTokens);

    let line = `• ${getModelDisplayName(r.modelId)}: ${r.latencyMs}ms`;
    if (options.includeTokens) {
      line += ` | ${r.tokensUsed} tokens`;
    }
    if (options.includeCosts) {
      line += ` | $${cost.toFixed(3)}`;
    }
    lines.push(line);
  });
  lines.push('');

  // Step 2-N: Arbitration log
  deliberation.synthesis.arbitrationLog.forEach((entry) => {
    lines.push(`STEP ${entry.step}: ${entry.action}`);
    lines.push(`• ${entry.reasoning}`);
    lines.push(`• ${entry.outcome}`);
    lines.push('');
  });

  // Totals
  lines.push('─'.repeat(60));
  let totalLine = `Total latency: ${deliberation.totalLatencyMs}ms`;
  if (options.includeCosts) {
    totalLine += ` | Total cost: $${deliberation.totalCostEstimate.toFixed(3)}`;
  }
  lines.push(totalLine);
  lines.push('');
  lines.push('[Close] [Export Log]');

  return lines.join('\n');
}

/**
 * Format for the specified display state
 */
export function formatForState(
  deliberation: CouncilDeliberation,
  state: DisplayState,
  options: FormatOptions = {}
): string {
  switch (state) {
    case 'default':
      return formatDefaultView(deliberation, options);
    case 'expanded':
      return formatExpandedView(deliberation, options);
    case 'disagreement':
      return formatDisagreementView(deliberation, options);
    case 'full_log':
      return formatFullLog(deliberation, options);
    default:
      return formatDefaultView(deliberation, options);
  }
}

/**
 * Get consensus icon based on level
 */
function getConsensusIcon(level: string): string {
  switch (level) {
    case 'High':
      return '✅';
    case 'Moderate':
      return '⚖️';
    case 'Split':
      return '⚠️';
    default:
      return '📊';
  }
}

/**
 * Wrap text to specified width
 */
function wrapText(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= width) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format as JSON for API responses
 */
export function formatAsJSON(deliberation: CouncilDeliberation): string {
  const summary = buildCouncilSummary(deliberation);

  return JSON.stringify({
    synthesis: deliberation.synthesis.finalResponse,
    consensus: {
      level: summary.consensusLevel,
      description: summary.consensusDescription,
    },
    models: summary.modelCards,
    disagreements: summary.disagreements,
    metadata: {
      queryId: deliberation.queryId,
      latencyMs: deliberation.totalLatencyMs,
      costEstimate: deliberation.totalCostEstimate,
      trigger: deliberation.councilModeTrigger,
    },
  }, null, 2);
}

export default {
  formatDefaultView,
  formatExpandedView,
  formatDisagreementView,
  formatFullLog,
  formatForState,
  formatAsJSON,
};
