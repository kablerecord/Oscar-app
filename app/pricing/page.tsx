import { TIERS, type TierName } from '@/lib/tiers/config'
import { Check, Crown, Zap, Star } from 'lucide-react'

export default function PricingPage() {
  const tiers = Object.values(TIERS)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Choose Your OSQR Plan
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Upgrade your thinking with the AI operating system designed for builders.
            Better questions lead to better answers.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>

        {/* FAQ or Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            All plans include a 7-day money-back guarantee. No questions asked.
          </p>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ tier }: { tier: typeof TIERS[TierName] }) {
  const isPro = tier.name === 'pro'
  const isMaster = tier.name === 'master'

  // Stripe payment links - these should be configured in your Stripe dashboard
  const paymentLinks: Record<TierName, string> = {
    free: '', // No payment needed
    pro: process.env.NEXT_PUBLIC_STRIPE_PRO_LINK || 'https://buy.stripe.com/YOUR_PRO_LINK',
    master: process.env.NEXT_PUBLIC_STRIPE_MASTER_LINK || 'https://buy.stripe.com/YOUR_MASTER_LINK',
  }

  const handleSelect = () => {
    if (tier.name === 'free') {
      window.location.href = '/panel'
    } else {
      window.open(paymentLinks[tier.name], '_blank')
    }
  }

  return (
    <div
      className={`relative rounded-2xl p-6 ${
        isPro
          ? 'bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-400 dark:border-amber-600 shadow-lg shadow-amber-500/20'
          : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
      }`}
    >
      {isPro && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}

      {isMaster && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Crown className="h-3 w-3" />
            LEGACY TIER
          </span>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {tier.name === 'free' && <Zap className="h-5 w-5 text-blue-500" />}
          {tier.name === 'pro' && <Star className="h-5 w-5 text-amber-500" />}
          {tier.name === 'master' && <Crown className="h-5 w-5 text-purple-500" />}
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
            {tier.displayName}
          </h3>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {tier.description}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-neutral-900 dark:text-white">
            ${tier.price}
          </span>
          {tier.price > 0 && (
            <span className="text-neutral-500 dark:text-neutral-400 ml-2">/month</span>
          )}
        </div>
        {tier.price === 0 && (
          <span className="text-sm text-neutral-500">Free forever</span>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              isPro ? 'text-amber-500' : isMaster ? 'text-purple-500' : 'text-green-500'
            }`} />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSelect}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          isPro
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg'
            : isMaster
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg'
            : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100'
        }`}
      >
        {tier.price === 0 ? 'Get Started' : `Choose ${tier.displayName}`}
      </button>

      {/* Usage limits preview */}
      <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <div>
            <span className="font-medium">{tier.limits.maxDocuments}</span> docs
          </div>
          <div>
            <span className="font-medium">{tier.limits.panelQueriesPerDay}</span> queries/day
          </div>
          <div>
            <span className="font-medium">{tier.limits.maxFileSizeMB}MB</span> max file
          </div>
          <div>
            <span className="font-medium">{tier.limits.hasFullPanel ? '4' : '2'}</span> AI models
          </div>
        </div>
      </div>
    </div>
  )
}
