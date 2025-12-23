/**
 * OSQR Constitutional Framework - Cross-Tool Chaining Detection
 *
 * Detects attempts to chain tool calls in ways that could
 * circumvent security controls or escalate privileges.
 */

import type { ToolCall } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ChainingDetectionResult {
  /** Whether suspicious chaining was detected */
  isSuspicious: boolean;
  /** Risk level of the detected pattern */
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  /** Description of the detected pattern */
  pattern?: string;
  /** Tools involved in the suspicious chain */
  involvedTools?: string[];
  /** Whether user approval is required to proceed */
  requiresApproval: boolean;
}

// ============================================================================
// Dangerous Tool Combinations
// ============================================================================

/**
 * Tool pairs that require extra scrutiny when used together.
 */
const DANGEROUS_TOOL_PAIRS: Array<[string, string, string]> = [
  // [tool1, tool2, reason]
  ['read_file', 'send_email', 'Data exfiltration risk'],
  ['read_file', 'http_request', 'Data exfiltration risk'],
  ['database_query', 'http_request', 'Data exfiltration risk'],
  ['database_query', 'send_email', 'Data exfiltration risk'],
  ['pkv_read', 'http_request', 'Memory data exfiltration risk'],
  ['pkv_read', 'send_email', 'Memory data exfiltration risk'],
  ['list_users', 'send_email', 'Privacy violation risk'],
  ['get_credentials', 'http_request', 'Credential theft risk'],
  ['execute_code', 'http_request', 'Remote code execution risk'],
  ['execute_code', 'write_file', 'Persistence installation risk'],
];

/**
 * Tools that should never be called in automated chains.
 */
const RESTRICTED_AUTO_CHAIN_TOOLS = new Set([
  'delete_file',
  'delete_user',
  'modify_permissions',
  'execute_code',
  'send_payment',
  'modify_credentials',
  'pkv_write', // Even though PKV write is blocked, detect attempts
]);

/**
 * Maximum allowed tool chain depth before requiring approval.
 */
const MAX_CHAIN_DEPTH = 5;

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if a proposed tool call creates a dangerous chain with previous calls.
 *
 * @param currentInput - Current user input requesting the tool
 * @param previousToolCalls - Previous tool calls in this conversation
 * @param proposedToolId - The tool being requested
 * @returns Detection result
 */
export function checkCrossToolChaining(
  currentInput: string,
  previousToolCalls: ToolCall[],
  proposedToolId?: string
): ChainingDetectionResult {
  const result: ChainingDetectionResult = {
    isSuspicious: false,
    riskLevel: 'NONE',
    requiresApproval: false,
  };

  // Check 1: Chain depth
  if (previousToolCalls.length >= MAX_CHAIN_DEPTH) {
    result.isSuspicious = true;
    result.riskLevel = 'MEDIUM';
    result.pattern = `Tool chain depth (${previousToolCalls.length}) exceeds maximum (${MAX_CHAIN_DEPTH})`;
    result.requiresApproval = true;
    return result;
  }

  // Check 2: Restricted tools in automated chain
  if (proposedToolId && RESTRICTED_AUTO_CHAIN_TOOLS.has(proposedToolId)) {
    // Check if input suggests automation
    if (containsAutomationIndicators(currentInput)) {
      result.isSuspicious = true;
      result.riskLevel = 'HIGH';
      result.pattern = `Automated chain detected with restricted tool: ${proposedToolId}`;
      result.involvedTools = [proposedToolId];
      result.requiresApproval = true;
      return result;
    }
  }

  // Check 3: Dangerous tool pairs
  if (proposedToolId) {
    const previousToolIds = previousToolCalls.map((tc) => tc.toolId);

    for (const [tool1, tool2, reason] of DANGEROUS_TOOL_PAIRS) {
      // Check if proposed tool + any previous tool forms a dangerous pair
      if (proposedToolId === tool1 && previousToolIds.includes(tool2)) {
        result.isSuspicious = true;
        result.riskLevel = 'MEDIUM';
        result.pattern = reason;
        result.involvedTools = [tool1, tool2];
        result.requiresApproval = true;
        return result;
      }
      if (proposedToolId === tool2 && previousToolIds.includes(tool1)) {
        result.isSuspicious = true;
        result.riskLevel = 'MEDIUM';
        result.pattern = reason;
        result.involvedTools = [tool1, tool2];
        result.requiresApproval = true;
        return result;
      }
    }
  }

  // Check 4: Rapid tool switching (potential confusion attack)
  if (previousToolCalls.length >= 3) {
    const recentTools = previousToolCalls.slice(-3).map((tc) => tc.toolId);
    const uniqueTools = new Set(recentTools).size;

    if (uniqueTools === 3 && containsSuspiciousPhrasing(currentInput)) {
      result.isSuspicious = true;
      result.riskLevel = 'LOW';
      result.pattern = 'Rapid tool switching detected with suspicious phrasing';
      result.involvedTools = recentTools;
      result.requiresApproval = false; // Low risk, just log
    }
  }

  // Check 5: Output piping patterns in input
  if (containsOutputPipingPattern(currentInput)) {
    result.isSuspicious = true;
    result.riskLevel = 'MEDIUM';
    result.pattern = 'Explicit output piping requested';
    result.requiresApproval = true;
    return result;
  }

  return result;
}

/**
 * Analyze a sequence of tool calls for suspicious patterns.
 * Used for post-hoc analysis and logging.
 */
export function analyzeToolSequence(toolCalls: ToolCall[]): ChainingDetectionResult {
  if (toolCalls.length < 2) {
    return { isSuspicious: false, riskLevel: 'NONE', requiresApproval: false };
  }

  const toolIds = toolCalls.map((tc) => tc.toolId);

  // Check for dangerous pairs in sequence
  for (let i = 0; i < toolIds.length - 1; i++) {
    const current = toolIds[i];
    const next = toolIds[i + 1];

    for (const [tool1, tool2, reason] of DANGEROUS_TOOL_PAIRS) {
      if ((current === tool1 && next === tool2) || (current === tool2 && next === tool1)) {
        return {
          isSuspicious: true,
          riskLevel: 'MEDIUM',
          pattern: `Sequential dangerous pair: ${reason}`,
          involvedTools: [tool1, tool2],
          requiresApproval: true,
        };
      }
    }
  }

  // Check for data flow patterns (read -> external call)
  const readTools = ['read_file', 'database_query', 'pkv_read', 'get_user_data'];
  const externalTools = ['http_request', 'send_email', 'send_message'];

  let foundRead = false;
  for (const toolId of toolIds) {
    if (readTools.includes(toolId)) {
      foundRead = true;
    } else if (foundRead && externalTools.includes(toolId)) {
      return {
        isSuspicious: true,
        riskLevel: 'MEDIUM',
        pattern: 'Data read followed by external call',
        involvedTools: toolIds.filter(
          (id) => readTools.includes(id) || externalTools.includes(id)
        ),
        requiresApproval: true,
      };
    }
  }

  return { isSuspicious: false, riskLevel: 'NONE', requiresApproval: false };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if input contains indicators of automated execution.
 */
function containsAutomationIndicators(input: string): boolean {
  const automationPatterns = [
    /\b(automatically|auto|automate)\s+(run|execute|call|invoke)/i,
    /\bwithout\s+(asking|prompting|confirmation)/i,
    /\bsilently\s+(run|execute|call)/i,
    /\bin\s+a\s+loop/i,
    /\bfor\s+each\s+.+\s+(run|execute|call)/i,
    /\bschedule\s+(to\s+)?(run|execute)/i,
  ];

  return automationPatterns.some((p) => p.test(input));
}

/**
 * Check if input contains suspicious phrasing.
 */
function containsSuspiciousPhrasing(input: string): boolean {
  const suspiciousPatterns = [
    /\bquickly\s+(before|while)/i,
    /\bdon'?t\s+(tell|mention|reveal)/i,
    /\bkeep\s+(this\s+)?(secret|quiet|private)/i,
    /\bjust\s+do\s+it/i,
    /\btrust\s+me/i,
  ];

  return suspiciousPatterns.some((p) => p.test(input));
}

/**
 * Check if input explicitly requests output piping.
 */
function containsOutputPipingPattern(input: string): boolean {
  const pipingPatterns = [
    /\buse\s+(the\s+)?output\s+(of|from)\s+\w+\s+(as|for)\s+(input|the\s+input)/i,
    /\bpipe\s+(the\s+)?output\s+(to|into)/i,
    /\bfeed\s+(the\s+)?(result|output)\s+(to|into)/i,
    /\bchain\s+(these\s+)?tools?\s+together/i,
    /\bthen\s+pass\s+(it|that|the\s+result)\s+to/i,
  ];

  return pipingPatterns.some((p) => p.test(input));
}

/**
 * Get user-friendly explanation of why approval is needed.
 * This IS shown to users (unlike injection explanations).
 */
export function getChainingApprovalMessage(result: ChainingDetectionResult): string {
  if (!result.requiresApproval) {
    return '';
  }

  if (result.involvedTools && result.involvedTools.length > 0) {
    return `Before I proceed with using ${result.involvedTools.join(' and ')}, I want to confirm this is what you want.`;
  }

  if (result.pattern?.includes('depth')) {
    return "We've used several tools in sequence. Before continuing, I want to confirm you'd like me to proceed.";
  }

  return "Before I do that, I want to confirm you want me to proceed with this operation.";
}
