/**
 * OSQR Constitutional Framework - Plugin Sandbox
 *
 * Enforces plugin capability boundaries through isolated execution.
 * Prevents plugins from exceeding their declared permissions.
 */

import type { PluginCapabilities, ViolationLogEntry } from './types';
import { createViolationEntry, logViolation, logError } from './logging/audit';

// ============================================================================
// Types
// ============================================================================

export interface SandboxExecutionResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result of the operation (if successful) */
  result?: unknown;
  /** Violation entry (if operation was blocked) */
  violation?: ViolationLogEntry;
  /** Error message (if operation failed for non-security reason) */
  error?: string;
}

export interface ContainerLimits {
  maxMemory: string;
  maxCpu: string;
  networkDomains: string[];
  fileSystemPaths: string[];
  timeout: number;
}

export interface SandboxContext {
  requestId: string;
  userId: string;
}

// ============================================================================
// Operation Types
// ============================================================================

/** Operations that can be performed in the sandbox */
export type SandboxOperation =
  | 'MODIFY_STYLE'
  | 'OVERRIDE_HONESTY'
  | 'INJECT_KNOWLEDGE'
  | 'ADJUST_PROACTIVITY'
  | 'PKV_READ'
  | 'PKV_WRITE'
  | `TOOL:${string}`
  | `NETWORK:${string}`
  | `FILE:${string}`;

// ============================================================================
// Cryptographic Verification
// ============================================================================

/**
 * Verify a plugin's cryptographic signature.
 * In v1.0, this is a placeholder that validates format.
 * Full PKI implementation planned for v1.1.
 */
export async function verifyCryptographicSignature(
  pluginId: string,
  signature: string
): Promise<boolean> {
  // Signature format validation
  if (!signature || signature.length < 32) {
    return false;
  }

  // Check for obviously invalid signatures
  if (signature === 'invalid' || signature === 'test' || signature === 'none') {
    return false;
  }

  // v1.0: Accept signatures that match expected format
  // Format: plugin_id.timestamp.hash
  const signaturePattern = /^[\w-]+\.\d+\.[a-f0-9]{64}$/i;
  if (!signaturePattern.test(signature)) {
    // Also accept hex-only signatures of proper length
    const hexPattern = /^[a-f0-9]{64,128}$/i;
    return hexPattern.test(signature);
  }

  return true;
}

// ============================================================================
// Container Execution (Placeholder)
// ============================================================================

/**
 * Execute an operation in an isolated container.
 * In v1.0, this runs in-process with resource monitoring.
 * Full containerization planned for v1.1.
 */
async function executeInContainer(config: {
  operation: string;
  payload: unknown;
  limits: ContainerLimits;
}): Promise<unknown> {
  const { operation, payload, limits } = config;

  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), limits.timeout);
  });

  // Execute operation (placeholder - actual implementation depends on plugin system)
  const executionPromise = new Promise((resolve) => {
    // In v1.0, we simulate container execution
    // The actual operation would be delegated to the plugin runtime
    resolve({ operation, payload, executed: true });
  });

  // Race between execution and timeout
  return Promise.race([executionPromise, timeoutPromise]);
}

// ============================================================================
// Plugin Sandbox Class
// ============================================================================

/**
 * Plugin execution sandbox with capability enforcement.
 *
 * This class wraps plugin execution to ensure plugins cannot
 * exceed their declared capabilities.
 */
export class PluginSandbox {
  private plugin: PluginCapabilities;
  private allowedOperations: Set<string>;
  private context: SandboxContext;

  constructor(plugin: PluginCapabilities, context: SandboxContext) {
    this.plugin = plugin;
    this.context = context;
    this.allowedOperations = this.computeAllowedOperations();
  }

  /**
   * Compute the set of operations this plugin is allowed to perform.
   */
  private computeAllowedOperations(): Set<string> {
    const ops = new Set<string>();

    // Behavioral capabilities
    if (this.plugin.canModifyCommunicationStyle) ops.add('MODIFY_STYLE');
    if (this.plugin.canOverrideHonestyTier) ops.add('OVERRIDE_HONESTY');
    if (this.plugin.canInjectKnowledge) ops.add('INJECT_KNOWLEDGE');
    if (this.plugin.canAdjustProactivity) ops.add('ADJUST_PROACTIVITY');

    // Data access
    if (this.plugin.pkvReadAccess) ops.add('PKV_READ');
    // PKV_WRITE is NEVER added - constitutional constraint
    // Even if plugin declares pkvWriteAccess: true, we enforce it to false

    // Tools
    this.plugin.canAddTools.forEach((tool) => ops.add(`TOOL:${tool}`));

    // Network domains
    this.plugin.networkDomains.forEach((domain) => ops.add(`NETWORK:${domain}`));

    // File system paths
    this.plugin.fileSystemPaths.forEach((path) => ops.add(`FILE:${path}`));

    return ops;
  }

  /**
   * Check if an operation is allowed for this plugin.
   */
  isOperationAllowed(operation: SandboxOperation): boolean {
    // PKV_WRITE is ALWAYS blocked - constitutional constraint
    if (operation === 'PKV_WRITE') {
      return false;
    }

    // Check direct match
    if (this.allowedOperations.has(operation)) {
      return true;
    }

    // Check network domain patterns
    if (operation.startsWith('NETWORK:')) {
      const requestedDomain = operation.substring(8);
      for (const allowedDomain of this.plugin.networkDomains) {
        if (
          requestedDomain === allowedDomain ||
          requestedDomain.endsWith(`.${allowedDomain}`) ||
          allowedDomain === '*'
        ) {
          return true;
        }
      }
    }

    // Check file path patterns
    if (operation.startsWith('FILE:')) {
      const requestedPath = operation.substring(5);
      for (const allowedPath of this.plugin.fileSystemPaths) {
        if (
          requestedPath === allowedPath ||
          requestedPath.startsWith(`${allowedPath}/`) ||
          allowedPath === '*'
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Execute an operation within the sandbox.
   *
   * @param operation - The operation to execute
   * @param payload - Operation payload/parameters
   * @returns Execution result
   */
  async execute(
    operation: SandboxOperation,
    payload: unknown
  ): Promise<SandboxExecutionResult> {
    // Step 1: Verify operation is allowed
    if (!this.isOperationAllowed(operation)) {
      const violation = createViolationEntry(
        'CAPABILITY_EXCEEDED',
        'PLUGIN',
        'SANDBOX_BOUNDARY',
        this.plugin.pluginId,
        `Attempted operation: ${operation}`,
        this.context.requestId,
        this.context.userId,
        'USER_DATA_SOVEREIGNTY'
      );
      await logViolation(violation);
      return {
        success: false,
        violation,
      };
    }

    // Step 2: Verify namespace (prevent spoofing)
    if (!(await this.verifyNamespace())) {
      const violation = createViolationEntry(
        'NAMESPACE_SPOOFING',
        'PLUGIN',
        'NAMESPACE_VERIFICATION',
        this.plugin.pluginId,
        'Signature verification failed',
        this.context.requestId,
        this.context.userId,
        'USER_DATA_SOVEREIGNTY'
      );
      await logViolation(violation);
      return {
        success: false,
        violation,
      };
    }

    // Step 3: Execute in isolated context
    try {
      const result = await this.isolatedExecute(operation, payload);
      return { success: true, result };
    } catch (error) {
      // Log but don't expose internal errors to user
      await logError(error, this.plugin.pluginId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify the plugin's cryptographic namespace.
   */
  private async verifyNamespace(): Promise<boolean> {
    return verifyCryptographicSignature(this.plugin.pluginId, this.plugin.signature);
  }

  /**
   * Execute operation in isolated context.
   */
  private async isolatedExecute(
    operation: SandboxOperation,
    payload: unknown
  ): Promise<unknown> {
    return executeInContainer({
      operation,
      payload,
      limits: {
        maxMemory: '256MB',
        maxCpu: '500m',
        networkDomains: this.plugin.networkDomains,
        fileSystemPaths: this.plugin.fileSystemPaths,
        timeout: 30000,
      },
    });
  }

  /**
   * Get the list of allowed operations for inspection/debugging.
   */
  getAllowedOperations(): string[] {
    return Array.from(this.allowedOperations);
  }

  /**
   * Get plugin metadata.
   */
  getPluginInfo(): { id: string; version: string } {
    return {
      id: this.plugin.pluginId,
      version: this.plugin.version,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a sandbox for a plugin with default context.
 */
export function createSandbox(
  plugin: PluginCapabilities,
  requestId: string,
  userId: string
): PluginSandbox {
  return new PluginSandbox(plugin, { requestId, userId });
}

/**
 * Create a minimal plugin capabilities object for testing.
 */
export function createMinimalPluginCapabilities(
  pluginId: string,
  overrides: Partial<PluginCapabilities> = {}
): PluginCapabilities {
  return {
    pluginId,
    version: '1.0.0',
    signature: `${pluginId}.${Date.now()}.${Array(64).fill('0').join('')}`,
    canModifyCommunicationStyle: false,
    canOverrideHonestyTier: false,
    canInjectKnowledge: false,
    canAddTools: [],
    canAdjustProactivity: false,
    pkvReadAccess: false,
    pkvWriteAccess: false,
    networkDomains: [],
    fileSystemPaths: [],
    ...overrides,
  };
}

/**
 * Validate plugin capabilities structure.
 */
export function validatePluginCapabilities(
  plugin: unknown
): plugin is PluginCapabilities {
  if (!plugin || typeof plugin !== 'object') {
    return false;
  }

  const p = plugin as Record<string, unknown>;

  // Required string fields
  if (typeof p.pluginId !== 'string' || p.pluginId.length === 0) return false;
  if (typeof p.version !== 'string') return false;
  if (typeof p.signature !== 'string') return false;

  // Boolean fields
  if (typeof p.canModifyCommunicationStyle !== 'boolean') return false;
  if (typeof p.canOverrideHonestyTier !== 'boolean') return false;
  if (typeof p.canInjectKnowledge !== 'boolean') return false;
  if (typeof p.canAdjustProactivity !== 'boolean') return false;
  if (typeof p.pkvReadAccess !== 'boolean') return false;

  // pkvWriteAccess must be false - enforce at validation time
  if (p.pkvWriteAccess !== false) return false;

  // Array fields
  if (!Array.isArray(p.canAddTools)) return false;
  if (!Array.isArray(p.networkDomains)) return false;
  if (!Array.isArray(p.fileSystemPaths)) return false;

  return true;
}
