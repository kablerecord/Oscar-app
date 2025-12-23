/**
 * Tests for the Plugin Sandbox.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PluginSandbox,
  createSandbox,
  createMinimalPluginCapabilities,
  validatePluginCapabilities,
  verifyCryptographicSignature,
} from '../sandbox';
import { clearAllViolations, getAllViolations } from '../logging/audit';
import type { PluginCapabilities } from '../types';

describe('Plugin Sandbox', () => {
  const createPlugin = (overrides: Partial<PluginCapabilities> = {}): PluginCapabilities => ({
    pluginId: 'test-plugin',
    version: '1.0.0',
    signature: 'test-plugin.1234567890.0000000000000000000000000000000000000000000000000000000000000000',
    canModifyCommunicationStyle: true,
    canOverrideHonestyTier: false,
    canInjectKnowledge: true,
    canAddTools: ['search', 'summarize'],
    canAdjustProactivity: false,
    pkvReadAccess: true,
    pkvWriteAccess: false,
    networkDomains: ['api.example.com', 'data.example.org'],
    fileSystemPaths: ['/data/public', '/config'],
    ...overrides,
  });

  beforeEach(() => {
    clearAllViolations();
  });

  describe('PluginSandbox', () => {
    describe('isOperationAllowed', () => {
      it('should allow declared capabilities', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('MODIFY_STYLE')).toBe(true);
        expect(sandbox.isOperationAllowed('INJECT_KNOWLEDGE')).toBe(true);
        expect(sandbox.isOperationAllowed('PKV_READ')).toBe(true);
      });

      it('should deny undeclared capabilities', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('OVERRIDE_HONESTY')).toBe(false);
        expect(sandbox.isOperationAllowed('ADJUST_PROACTIVITY')).toBe(false);
      });

      it('should ALWAYS deny PKV_WRITE regardless of declaration', () => {
        // Even if someone tries to bypass the type system
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('PKV_WRITE')).toBe(false);
      });

      it('should allow declared tools', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('TOOL:search')).toBe(true);
        expect(sandbox.isOperationAllowed('TOOL:summarize')).toBe(true);
      });

      it('should deny undeclared tools', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('TOOL:execute_code')).toBe(false);
        expect(sandbox.isOperationAllowed('TOOL:delete_file')).toBe(false);
      });

      it('should allow declared network domains', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('NETWORK:api.example.com')).toBe(true);
        expect(sandbox.isOperationAllowed('NETWORK:sub.api.example.com')).toBe(true);
      });

      it('should deny undeclared network domains', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('NETWORK:evil.com')).toBe(false);
        expect(sandbox.isOperationAllowed('NETWORK:api.malicious.com')).toBe(false);
      });

      it('should allow declared file paths', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('FILE:/data/public')).toBe(true);
        expect(sandbox.isOperationAllowed('FILE:/data/public/subdir/file.txt')).toBe(true);
        expect(sandbox.isOperationAllowed('FILE:/config')).toBe(true);
      });

      it('should deny undeclared file paths', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        expect(sandbox.isOperationAllowed('FILE:/etc/passwd')).toBe(false);
        expect(sandbox.isOperationAllowed('FILE:/data/private')).toBe(false);
      });
    });

    describe('execute', () => {
      it('should execute allowed operations', async () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        const result = await sandbox.execute('MODIFY_STYLE', { tone: 'casual' });
        expect(result.success).toBe(true);
        expect(result.violation).toBeUndefined();
      });

      it('should block disallowed operations with violation', async () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        const result = await sandbox.execute('PKV_WRITE', { data: 'test' });
        expect(result.success).toBe(false);
        expect(result.violation).toBeDefined();
        expect(result.violation?.violationType).toBe('CAPABILITY_EXCEEDED');
      });

      it('should log violations', async () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        await sandbox.execute('TOOL:execute_code', { code: 'rm -rf /' });

        const violations = getAllViolations();
        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0].sourceId).toBe('test-plugin');
      });

      it('should block operations with invalid signature', async () => {
        const plugin = createPlugin({ signature: 'invalid' });
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        const result = await sandbox.execute('MODIFY_STYLE', { tone: 'casual' });
        expect(result.success).toBe(false);
        expect(result.violation?.violationType).toBe('NAMESPACE_SPOOFING');
      });
    });

    describe('getAllowedOperations', () => {
      it('should return list of allowed operations', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        const ops = sandbox.getAllowedOperations();
        expect(ops).toContain('MODIFY_STYLE');
        expect(ops).toContain('INJECT_KNOWLEDGE');
        expect(ops).toContain('PKV_READ');
        expect(ops).toContain('TOOL:search');
        expect(ops).not.toContain('PKV_WRITE');
      });
    });

    describe('getPluginInfo', () => {
      it('should return plugin metadata', () => {
        const plugin = createPlugin();
        const sandbox = new PluginSandbox(plugin, { requestId: 'req1', userId: 'user1' });

        const info = sandbox.getPluginInfo();
        expect(info.id).toBe('test-plugin');
        expect(info.version).toBe('1.0.0');
      });
    });
  });

  describe('verifyCryptographicSignature', () => {
    it('should accept valid format signatures', async () => {
      const validSignature = 'plugin-id.1234567890.0000000000000000000000000000000000000000000000000000000000000000';
      expect(await verifyCryptographicSignature('plugin-id', validSignature)).toBe(true);
    });

    it('should accept hex-only signatures of proper length', async () => {
      const hexSignature = '0'.repeat(64);
      expect(await verifyCryptographicSignature('any-plugin', hexSignature)).toBe(true);
    });

    it('should reject short signatures', async () => {
      expect(await verifyCryptographicSignature('plugin', 'short')).toBe(false);
    });

    it('should reject invalid placeholder signatures', async () => {
      expect(await verifyCryptographicSignature('plugin', 'invalid')).toBe(false);
      expect(await verifyCryptographicSignature('plugin', 'test')).toBe(false);
      expect(await verifyCryptographicSignature('plugin', 'none')).toBe(false);
    });

    it('should reject empty signatures', async () => {
      expect(await verifyCryptographicSignature('plugin', '')).toBe(false);
    });
  });

  describe('createSandbox', () => {
    it('should create sandbox with context', () => {
      const plugin = createPlugin();
      const sandbox = createSandbox(plugin, 'request-123', 'user-456');

      expect(sandbox).toBeInstanceOf(PluginSandbox);
      expect(sandbox.getPluginInfo().id).toBe('test-plugin');
    });
  });

  describe('createMinimalPluginCapabilities', () => {
    it('should create minimal plugin with defaults', () => {
      const plugin = createMinimalPluginCapabilities('my-plugin');

      expect(plugin.pluginId).toBe('my-plugin');
      expect(plugin.canModifyCommunicationStyle).toBe(false);
      expect(plugin.pkvWriteAccess).toBe(false);
      expect(plugin.networkDomains).toEqual([]);
    });

    it('should allow overrides', () => {
      const plugin = createMinimalPluginCapabilities('my-plugin', {
        canModifyCommunicationStyle: true,
        networkDomains: ['example.com'],
      });

      expect(plugin.canModifyCommunicationStyle).toBe(true);
      expect(plugin.networkDomains).toEqual(['example.com']);
    });

    it('should generate valid signature format', () => {
      const plugin = createMinimalPluginCapabilities('my-plugin');
      expect(plugin.signature.length).toBeGreaterThan(32);
    });
  });

  describe('validatePluginCapabilities', () => {
    it('should validate correct plugin structure', () => {
      const plugin = createPlugin();
      expect(validatePluginCapabilities(plugin)).toBe(true);
    });

    it('should reject missing pluginId', () => {
      const plugin = createPlugin();
      delete (plugin as unknown as Record<string, unknown>).pluginId;
      expect(validatePluginCapabilities(plugin)).toBe(false);
    });

    it('should reject empty pluginId', () => {
      const plugin = createPlugin({ pluginId: '' });
      expect(validatePluginCapabilities(plugin)).toBe(false);
    });

    it('should reject pkvWriteAccess: true', () => {
      const plugin = createPlugin();
      (plugin as unknown as Record<string, unknown>).pkvWriteAccess = true;
      expect(validatePluginCapabilities(plugin)).toBe(false);
    });

    it('should reject non-boolean capability fields', () => {
      const plugin = createPlugin();
      (plugin as unknown as Record<string, unknown>).canModifyCommunicationStyle = 'yes';
      expect(validatePluginCapabilities(plugin)).toBe(false);
    });

    it('should reject non-array tool fields', () => {
      const plugin = createPlugin();
      (plugin as unknown as Record<string, unknown>).canAddTools = 'search';
      expect(validatePluginCapabilities(plugin)).toBe(false);
    });

    it('should reject null/undefined input', () => {
      expect(validatePluginCapabilities(null)).toBe(false);
      expect(validatePluginCapabilities(undefined)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(validatePluginCapabilities('string')).toBe(false);
      expect(validatePluginCapabilities(123)).toBe(false);
    });
  });
});
