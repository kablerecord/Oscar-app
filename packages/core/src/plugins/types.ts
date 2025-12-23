/**
 * OSQR Plugin System - Type Definitions
 *
 * Defines types for plugin management, cryptographic signatures,
 * and plugin lifecycle.
 */

import type { PluginCapabilities } from '../constitutional/types';

// ============================================================================
// Signing Key Types
// ============================================================================

/**
 * Type of signing key.
 */
export type KeyType = 'OSQR_ROOT' | 'OSQR_PUBLISHER' | 'DEVELOPER';

/**
 * Status of a signing key.
 */
export type KeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

/**
 * A signing key for plugin verification.
 */
export interface SigningKey {
  /** Unique key identifier (fingerprint) */
  keyId: string;
  /** Type of key */
  type: KeyType;
  /** Public key in PEM format */
  publicKey: string;
  /** Key holder name/organization */
  holder: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 expiration timestamp */
  expiresAt: string;
  /** Current status */
  status: KeyStatus;
  /** Parent key ID (for chain of trust) */
  parentKeyId?: string;
}

/**
 * Result of key validation.
 */
export interface KeyValidationResult {
  /** Whether the key is valid */
  valid: boolean;
  /** The validated key (if valid) */
  key?: SigningKey;
  /** Reason for invalidity */
  reason?: 'NOT_FOUND' | 'REVOKED' | 'EXPIRED' | 'INVALID_CHAIN';
}

// ============================================================================
// Plugin Signature Types
// ============================================================================

/**
 * Cryptographic signature for a plugin.
 */
export interface PluginSignature {
  /** Signature algorithm (e.g., 'ED25519', 'RSA-SHA256') */
  algorithm: 'ED25519' | 'RSA-SHA256';
  /** Base64-encoded signature */
  signature: string;
  /** Key ID used for signing */
  keyId: string;
  /** ISO 8601 timestamp when signed */
  signedAt: string;
  /** Hash of the signed content */
  contentHash: string;
}

/**
 * Result of signature verification.
 */
export interface SignatureVerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** The signing key (if valid) */
  signingKey?: SigningKey;
  /** Error message (if invalid) */
  error?: string;
  /** Verification details */
  details?: {
    /** Whether content hash matches */
    contentHashValid: boolean;
    /** Whether signature cryptographically verifies */
    signatureValid: boolean;
    /** Whether signing key is trusted */
    keyTrusted: boolean;
    /** Whether signature is not expired */
    notExpired: boolean;
  };
}

// ============================================================================
// Plugin Manifest Types
// ============================================================================

/**
 * Plugin lifecycle state.
 */
export type PluginState = 'UNLOADED' | 'LOADING' | 'ACTIVE' | 'SUSPENDED' | 'FAILED';

/**
 * Plugin manifest with all metadata and signature.
 */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: string;
  /** Semantic version */
  version: string;
  /** Human-readable name */
  name: string;
  /** Plugin description */
  description: string;
  /** Author/publisher */
  author: string;
  /** Plugin homepage or repository */
  homepage?: string;
  /** Required capabilities */
  capabilities: PluginCapabilities;
  /** Entry point file */
  entryPoint: string;
  /** Cryptographic signature */
  signature: PluginSignature;
  /** Minimum OSQR version required */
  minOsqrVersion: string;
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
}

/**
 * Loaded plugin instance.
 */
export interface LoadedPlugin {
  /** Plugin manifest */
  manifest: PluginManifest;
  /** Current state */
  state: PluginState;
  /** ISO 8601 timestamp when loaded */
  loadedAt: string;
  /** Signature verification result */
  signatureVerification: SignatureVerificationResult;
  /** Error message (if state is FAILED) */
  error?: string;
}

// ============================================================================
// Plugin Manager Types
// ============================================================================

/**
 * Plugin loading options.
 */
export interface PluginLoadOptions {
  /** Skip signature verification (DANGEROUS - only for development) */
  skipSignatureVerification?: boolean;
  /** Allow loading from untrusted sources */
  allowUntrusted?: boolean;
  /** Custom key store to use */
  keyStore?: SigningKey[];
}

/**
 * Result of loading a plugin.
 */
export interface PluginLoadResult {
  /** Whether loading succeeded */
  success: boolean;
  /** The loaded plugin (if successful) */
  plugin?: LoadedPlugin;
  /** Error message (if failed) */
  error?: string;
  /** Error code */
  errorCode?: 'UNSIGNED' | 'INVALID_SIGNATURE' | 'KEY_NOT_TRUSTED' | 'MANIFEST_INVALID' | 'LOAD_ERROR';
}

/**
 * Plugin manager configuration.
 */
export interface PluginManagerConfig {
  /** Whether to require signatures (default: true) */
  requireSignatures: boolean;
  /** Trusted key types */
  trustedKeyTypes: KeyType[];
  /** Maximum number of loaded plugins */
  maxPlugins: number;
  /** Plugin timeout in milliseconds */
  pluginTimeout: number;
}

/**
 * Default plugin manager configuration.
 */
export const DEFAULT_PLUGIN_MANAGER_CONFIG: PluginManagerConfig = {
  requireSignatures: true,
  trustedKeyTypes: ['OSQR_ROOT', 'OSQR_PUBLISHER'],
  maxPlugins: 50,
  pluginTimeout: 30000,
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Plugin system error codes.
 */
export type PluginErrorCode =
  | 'PLUGIN_NOT_FOUND'
  | 'PLUGIN_ALREADY_LOADED'
  | 'SIGNATURE_INVALID'
  | 'SIGNATURE_MISSING'
  | 'KEY_NOT_FOUND'
  | 'KEY_REVOKED'
  | 'KEY_EXPIRED'
  | 'MANIFEST_INVALID'
  | 'CAPABILITY_DENIED'
  | 'LOAD_ERROR'
  | 'UNLOAD_ERROR';

/**
 * Plugin system error.
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: PluginErrorCode,
    public readonly pluginId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginError';
  }
}
