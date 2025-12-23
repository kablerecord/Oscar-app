/**
 * Design System Component Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  getButtonVariantStyles,
  getSizeStyles,
  getBadgeVariantStyles,
  getIconContainerStateStyles,
} from '../components/types';

describe('Component Style Helpers', () => {
  describe('getButtonVariantStyles', () => {
    it('should return primary button styles', () => {
      const styles = getButtonVariantStyles('primary');
      expect(styles.backgroundColor).toBe('var(--osqr-color-accent-primary)');
      expect(styles.color).toBe('var(--osqr-color-text-primary)');
      expect(styles.border).toBe('none');
    });

    it('should return secondary button styles', () => {
      const styles = getButtonVariantStyles('secondary');
      expect(styles.backgroundColor).toBe('var(--osqr-color-background-tertiary)');
      expect(styles.border).toContain('var(--osqr-color-border-default)');
    });

    it('should return ghost button styles', () => {
      const styles = getButtonVariantStyles('ghost');
      expect(styles.backgroundColor).toBe('transparent');
      expect(styles.color).toBe('var(--osqr-color-text-secondary)');
      expect(styles.border).toBe('none');
    });
  });

  describe('getSizeStyles', () => {
    it('should return small size styles', () => {
      const styles = getSizeStyles('sm');
      expect(styles.fontSize).toBe('var(--osqr-font-size-sm)');
      expect(styles.borderRadius).toBe('var(--osqr-radius-sm)');
      expect(styles.padding).toContain('var(--osqr-spacing-1)');
    });

    it('should return medium size styles', () => {
      const styles = getSizeStyles('md');
      expect(styles.fontSize).toBe('var(--osqr-font-size-base)');
      expect(styles.borderRadius).toBe('var(--osqr-radius-md)');
    });

    it('should return large size styles', () => {
      const styles = getSizeStyles('lg');
      expect(styles.fontSize).toBe('var(--osqr-font-size-md)');
      expect(styles.borderRadius).toBe('var(--osqr-radius-lg)');
    });
  });

  describe('getBadgeVariantStyles', () => {
    it('should return default badge styles', () => {
      const styles = getBadgeVariantStyles('default');
      expect(styles.backgroundColor).toBe('var(--osqr-color-background-tertiary)');
      expect(styles.color).toBe('var(--osqr-color-text-secondary)');
    });

    it('should return success badge styles', () => {
      const styles = getBadgeVariantStyles('success');
      expect(styles.color).toBe('var(--osqr-color-semantic-success)');
      expect(styles.backgroundColor).toContain('74, 222, 128');
    });

    it('should return warning badge styles', () => {
      const styles = getBadgeVariantStyles('warning');
      expect(styles.color).toBe('var(--osqr-color-semantic-warning)');
    });

    it('should return error badge styles', () => {
      const styles = getBadgeVariantStyles('error');
      expect(styles.color).toBe('var(--osqr-color-semantic-error)');
    });

    it('should return info badge styles', () => {
      const styles = getBadgeVariantStyles('info');
      expect(styles.color).toBe('var(--osqr-color-semantic-info)');
    });

    it('should handle undefined as default', () => {
      const styles = getBadgeVariantStyles(undefined);
      expect(styles.backgroundColor).toBe('var(--osqr-color-background-tertiary)');
    });
  });

  describe('getIconContainerStateStyles', () => {
    it('should return idle state styles', () => {
      const styles = getIconContainerStateStyles('idle');
      expect(styles.boxShadow).toBe('var(--osqr-glow-idle)');
    });

    it('should return thinking state styles', () => {
      const styles = getIconContainerStateStyles('thinking');
      expect(styles.boxShadow).toBe('var(--osqr-glow-thinking)');
    });

    it('should return connected state styles', () => {
      const styles = getIconContainerStateStyles('connected');
      expect(styles.boxShadow).toBe('var(--osqr-glow-thinking)');
    });

    it('should return holding state styles', () => {
      const styles = getIconContainerStateStyles('holding');
      expect(styles.boxShadow).toBe('var(--osqr-glow-holding)');
    });

    it('should handle undefined as idle', () => {
      const styles = getIconContainerStateStyles(undefined);
      expect(styles.boxShadow).toBe('var(--osqr-glow-idle)');
    });
  });
});
