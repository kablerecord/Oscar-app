/**
 * Project Guidance System
 *
 * Implements "Mentorship-as-Code" - version-controlled, auditable project guidance.
 *
 * Three-layer hierarchy:
 * 1. Constitutional (immutable, OSQR core)
 * 2. MentorScript (project-scoped, user-defined)
 * 3. BriefingScript (session-scoped, contextual)
 */

// Types
export * from './types';

// Storage layer
export * from './storage';

// Context layer
export * from './context';

// Inference layer
export * from './inference';

// Arbitration layer
export * from './arbitration';
