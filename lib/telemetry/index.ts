/**
 * Telemetry Module
 *
 * Behavioral Intelligence Layer for OSQR.
 * Enables OSQR to learn from user behavior (not content) and improve over time.
 *
 * @see docs/BEHAVIORAL_INTELLIGENCE_LAYER.md
 * @see docs/TELEMETRY_SPEC.md
 * @see docs/PRIVACY_TIERS.md
 *
 * STATUS: STUBS ONLY - Full implementation pending
 */

// Privacy Tier Manager
export {
  PrivacyTierManager,
  getPrivacyTierManager,
  type PrivacyTier,
  type UserPrivacySettings,
  type DeletionReport,
} from './PrivacyTierManager'

// Telemetry Collector
export {
  TelemetryCollector,
  getTelemetryCollector,
  type TelemetryEventType,
  type BaseTelemetryEvent,
} from './TelemetryCollector'

// Pattern Aggregator
export {
  PatternAggregator,
  getPatternAggregator,
  type PatternType,
  type Pattern,
  type ModePreferencePattern,
  type UsageTimePattern,
  type FeatureAdoptionPattern,
  type EngagementTrendPattern,
  type FrictionPointPattern,
  type SatisfactionTrendPattern,
} from './PatternAggregator'

// User Behavior Model
export {
  UserBehaviorModel,
  getUserBehaviorModel,
  type UserBehaviorProfile,
} from './UserBehaviorModel'
