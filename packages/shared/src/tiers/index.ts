export {
  TIERS,
  getTierConfig,
  hasFeature,
  getLimit,
  isOverLimit,
  hasYearlyOption,
  getYearlyMonthlyPrice,
  hasVSCodeAccess,
  getMonthlyTokenLimit,
  getEffectiveTokenLimit,
  formatTokenCount,
} from './config'

export type { TierName, TierConfig, TierLimits } from './config'
