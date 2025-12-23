/**
 * OSQR Design System - Component Types
 *
 * Shared type definitions for all components.
 */

import { ComponentVariant, ComponentSize, ComponentState } from '../types';

/**
 * Base props for all OSQR components
 */
export interface OSQRBaseProps {
  /** CSS class name(s) to append */
  className?: string;
  /** Inline styles */
  style?: Record<string, string | number>;
  /** Data attributes */
  'data-testid'?: string;
}

/**
 * Button component props
 */
export interface ButtonProps extends OSQRBaseProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  children?: string;
  ariaLabel?: string;
}

/**
 * Input component props
 */
export interface InputProps extends OSQRBaseProps {
  type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  size?: ComponentSize;
  error?: boolean;
  errorMessage?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Card component props
 */
export interface CardProps extends OSQRBaseProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: ComponentSize;
  interactive?: boolean;
  onClick?: () => void;
  children?: any;
}

/**
 * Badge component props
 */
export interface BadgeProps extends OSQRBaseProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  children?: string | number;
}

/**
 * Icon container props (for brain icon states)
 */
export interface IconContainerProps extends OSQRBaseProps {
  state?: 'idle' | 'thinking' | 'connected' | 'holding';
  size?: ComponentSize;
  animated?: boolean;
  children?: any;
}

/**
 * Style object type
 */
export type StyleObject = Record<string, string | number>;

/**
 * Get styles for a button variant
 */
export function getButtonVariantStyles(variant: ComponentVariant): StyleObject {
  const variants: Record<ComponentVariant, StyleObject> = {
    primary: {
      backgroundColor: 'var(--osqr-color-accent-primary)',
      color: 'var(--osqr-color-text-primary)',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'var(--osqr-color-background-tertiary)',
      color: 'var(--osqr-color-text-primary)',
      border: '1px solid var(--osqr-color-border-default)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--osqr-color-text-secondary)',
      border: 'none',
    },
  };
  return variants[variant];
}

/**
 * Get styles for a component size
 */
export function getSizeStyles(size: ComponentSize): StyleObject {
  const sizes: Record<ComponentSize, StyleObject> = {
    sm: {
      padding: 'var(--osqr-spacing-1) var(--osqr-spacing-2)',
      fontSize: 'var(--osqr-font-size-sm)',
      borderRadius: 'var(--osqr-radius-sm)',
    },
    md: {
      padding: 'var(--osqr-spacing-2) var(--osqr-spacing-4)',
      fontSize: 'var(--osqr-font-size-base)',
      borderRadius: 'var(--osqr-radius-md)',
    },
    lg: {
      padding: 'var(--osqr-spacing-3) var(--osqr-spacing-6)',
      fontSize: 'var(--osqr-font-size-md)',
      borderRadius: 'var(--osqr-radius-lg)',
    },
  };
  return sizes[size];
}

/**
 * Get styles for badge variant
 */
export function getBadgeVariantStyles(variant: BadgeProps['variant']): StyleObject {
  const variants: Record<NonNullable<BadgeProps['variant']>, StyleObject> = {
    default: {
      backgroundColor: 'var(--osqr-color-background-tertiary)',
      color: 'var(--osqr-color-text-secondary)',
    },
    success: {
      backgroundColor: 'rgba(74, 222, 128, 0.2)',
      color: 'var(--osqr-color-semantic-success)',
    },
    warning: {
      backgroundColor: 'rgba(251, 191, 36, 0.2)',
      color: 'var(--osqr-color-semantic-warning)',
    },
    error: {
      backgroundColor: 'rgba(248, 113, 113, 0.2)',
      color: 'var(--osqr-color-semantic-error)',
    },
    info: {
      backgroundColor: 'rgba(96, 165, 250, 0.2)',
      color: 'var(--osqr-color-semantic-info)',
    },
  };
  return variants[variant || 'default'];
}

/**
 * Get icon container styles for state
 */
export function getIconContainerStateStyles(state: IconContainerProps['state']): StyleObject {
  const states: Record<NonNullable<IconContainerProps['state']>, StyleObject> = {
    idle: {
      boxShadow: 'var(--osqr-glow-idle)',
    },
    thinking: {
      boxShadow: 'var(--osqr-glow-thinking)',
    },
    connected: {
      boxShadow: 'var(--osqr-glow-thinking)',
    },
    holding: {
      boxShadow: 'var(--osqr-glow-holding)',
    },
  };
  return states[state || 'idle'];
}
