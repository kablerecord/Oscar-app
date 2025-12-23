/**
 * OSQR Design System - Shadow Tokens
 *
 * Elevation shadows and glow effects for presence states.
 */

import { ShadowTokens, GlowTokens } from '../types';

export const glowTokens: GlowTokens = {
  // Blue idle glow
  idle: '0 0 20px rgba(59, 130, 246, 0.3)',
  idlePeak: '0 10px 35px -3px rgba(59, 130, 246, 0.45), 0 4px 8px -4px rgba(139, 92, 246, 0.35)',

  // Purple thinking glow
  thinking: '0 0 20px rgba(139, 92, 246, 0.3)',
  thinkingPeak: '0 0 30px rgba(139, 92, 246, 0.5)',

  // Amber holding glow
  holding: '0 0 20px rgba(245, 158, 11, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)',
  holdingPeak: '0 0 35px rgba(245, 158, 11, 0.7), 0 0 60px rgba(249, 115, 22, 0.4)',
};

export const shadows: ShadowTokens = {
  // Elevation levels
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Glow effects (for Bubble presence)
  glow: glowTokens,
};

export default shadows;
