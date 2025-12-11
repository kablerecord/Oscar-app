'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TIERS, type TierName } from '@/lib/tiers/config'
import { Check, Crown, Star, ArrowLeft } from 'lucide-react'

// Founder Pricing metadata
const FOUNDER_PRICING = {
  pro: {
    currentPrice: 49,
    yearlyPrice: 488,
    futurePrice: 79,
    badge: 'FOUNDER PRICING',
  },
  master: {
    currentPrice: 149,
    yearlyPrice: 1484,
    futurePrice: 249,
    badge: 'FOUNDER PRICING',
  },
}

export default function PricingPage() {
  const tiers = Object.values(TIERS)
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      {/* Navigation */}
      <nav className="max-w-4xl mx-auto mb-8">
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OSQR
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-white mb-4">
            Don&apos;t Just Ask AI. Start Thinking With One.
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-2">
            One Question. Many Minds. One Clear Answer.
          </p>
          <p className="text-base text-neutral-500 max-w-xl mx-auto">
            Built for founders, operators, and high-performers who want elite decision-making and world-class clarity.
          </p>
        </div>

        {/* Founder Edition Banner */}
        <div className="text-center mb-8">
          <div className="inline-block bg-neutral-800/50 border border-neutral-600 rounded-lg px-6 py-3">
            <p className="text-sm font-medium text-white">
              Founder Edition Pricing — Available for the first 1,000 users
            </p>
            <p className="text-xs text-green-400 mt-1">
              Lock in lifetime pricing before rates increase
            </p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-white' : 'text-neutral-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? 'bg-green-500' : 'bg-neutral-600'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                isYearly ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-white' : 'text-neutral-500'}`}>
            Yearly
          </span>
          {isYearly && (
            <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              2 months free
            </span>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} isYearly={isYearly} />
          ))}
        </div>

        {/* Guarantee Section */}
        <div className="mt-16 text-center">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 max-w-xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">
              90-Day Capability Transformation Guarantee
            </h3>
            <p className="text-sm text-neutral-400">
              Use OSQR for 90 days. If you don&apos;t think faster, decide clearer, and execute better —
              get all your money back. Zero risk. All leverage.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PricingCard({ tier, isYearly }: { tier: typeof TIERS[TierName]; isYearly: boolean }) {
  const isPro = tier.name === 'pro'
  const isMaster = tier.name === 'master'
  const founderInfo = FOUNDER_PRICING[tier.name]

  // Stripe payment links - will need yearly versions too
  const paymentLinks: Record<TierName, { monthly: string; yearly: string }> = {
    pro: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_LINK || '/signup?plan=pro&billing=monthly',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK || '/signup?plan=pro&billing=yearly',
    },
    master: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_MASTER_LINK || '/signup?plan=master&billing=monthly',
      yearly: process.env.NEXT_PUBLIC_STRIPE_MASTER_YEARLY_LINK || '/signup?plan=master&billing=yearly',
    },
  }

  const handleSelect = () => {
    window.location.href = isYearly ? paymentLinks[tier.name].yearly : paymentLinks[tier.name].monthly
  }

  return (
    <div
      className={`relative rounded-2xl p-6 ${
        isPro
          ? 'bg-gradient-to-b from-cyan-950/40 to-blue-950/40 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : 'bg-gradient-to-b from-purple-950/40 to-pink-950/40 border-2 border-purple-500 shadow-lg shadow-purple-500/20'
      }`}
    >
      {/* Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className={`text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
          isPro
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
            : 'bg-gradient-to-r from-purple-500 to-pink-500'
        }`}>
          {isMaster && <Crown className="h-3 w-3" />}
          {founderInfo.badge}
        </span>
      </div>

      <div className="mb-6 mt-2">
        <div className="flex items-center gap-2 mb-2">
          {isPro && <Star className="h-5 w-5 text-cyan-400" />}
          {isMaster && <Crown className="h-5 w-5 text-purple-400" />}
          <h3 className="text-xl font-bold text-white">
            {tier.displayName}
          </h3>
        </div>
        <p className="text-sm text-neutral-400">
          {tier.description}
        </p>
      </div>

      {/* Pricing with future price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            ${isYearly ? founderInfo.yearlyPrice : founderInfo.currentPrice}
          </span>
          <span className="text-neutral-400">/{isYearly ? 'year' : 'month'}</span>
        </div>
        {isYearly ? (
          <>
            <p className="text-xs text-neutral-500 mt-1">
              ${Math.round(founderInfo.yearlyPrice / 12)}/mo effective — Save ${founderInfo.currentPrice * 12 - founderInfo.yearlyPrice}/year
            </p>
            <p className="text-xs font-medium text-green-400 mt-1">
              2 months free + all future upgrades included
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-neutral-500 mt-1">
              Early Launch Price — Future price ${founderInfo.futurePrice}/mo
            </p>
            <p className="text-xs font-medium text-green-400 mt-1">
              Founder rate locked in for life
            </p>
          </>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              isPro ? 'text-cyan-400' : 'text-purple-400'
            }`} />
            <span className="text-sm text-neutral-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSelect}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
          isPro
            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg'
        }`}
      >
        Get {tier.displayName}{isYearly ? ' (Yearly)' : ''}
      </button>

      {/* Usage limits preview */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.maxDocuments}</span> docs
          </div>
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.panelQueriesPerDay}</span> queries/day
          </div>
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.maxFileSizeMB}MB</span> max file
          </div>
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.hasFullPanel ? '4+' : '2'}</span> AI models
          </div>
        </div>
      </div>
    </div>
  )
}
