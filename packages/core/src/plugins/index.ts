/**
 * OSQR Plugin System
 *
 * Provides plugin management with cryptographic signature verification.
 * All plugins must be signed by trusted keys to be loaded.
 */

// Types
export type {
  KeyType,
  KeyStatus,
  SigningKey,
  KeyValidationResult,
  PluginSignature,
  SignatureVerificationResult,
  PluginState,
  PluginManifest,
  LoadedPlugin,
  PluginLoadOptions,
  PluginLoadResult,
  PluginManagerConfig,
  PluginErrorCode,
} from './types';

export {
  DEFAULT_PLUGIN_MANAGER_CONFIG,
  PluginError,
} from './types';

// Key Store
export {
  initializeKeyStore,
  isKeyStoreInitialized,
  addKey,
  getKey,
  getKeysByType,
  getActiveKeys,
  revokeKey,
  isKeyRevoked,
  isKeyExpired,
  validateKey,
  validateChainOfTrust,
  getTrustChain,
  exportKeys,
  importKeys,
  clearNonRootKeys,
  getKeyStoreStats,
} from './key-store';

// Signature Verification
export {
  hashManifestContent,
  hashContent,
  verifySignature,
  createTestSignature,
  hasSignature,
  getSignatureAge,
} from './signature';

// Plugin Manager
export {
  configurePluginManager,
  getPluginManagerConfig,
  resetPluginManagerConfig,
  loadPlugin,
  unloadPlugin,
  unloadAllPlugins,
  getPlugin,
  getLoadedPlugins,
  getPluginsByState,
  isPluginLoaded,
  suspendPlugin,
  resumePlugin,
  markPluginFailed,
  getPluginCount,
  getPluginStats,
  findPluginsWithCapability,
  onPluginEvent,
  clearEventListeners,
  verifyPlugin,
  canLoadPlugin,
  resetPluginManager,
} from './plugin-manager';
