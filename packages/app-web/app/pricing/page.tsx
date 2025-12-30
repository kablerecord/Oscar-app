'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TIERS, type TierName, hasYearlyOption } from '@/lib/tiers/config'
import { Check, Crown, Star, ArrowLeft, Building2, X, Loader2, Zap, Users } from 'lucide-react'
import { FounderCountdown } from '@/components/pricing/FounderCountdown'

export default function PricingPage() {
  // Only show Pro and Master tiers (Lite launches post-1,000 users)
  const tiers = Object.values(TIERS).filter(tier => tier.name !== 'lite')
  const [isYearly, setIsYearly] = useState(false)
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      {/* Navigation */}
      <nav className="max-w-5xl mx-auto mb-8">
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OSQR
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold text-white mb-4">
            An AI That Knows You, Remembers Everything, and Thinks With Multiple Minds
          </h1>
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-2">
            Council Mode: One Question. Many AI Perspectives. One Clear Answer.
          </p>
          <p className="text-base text-neutral-500 max-w-xl mx-auto">
            Built for founders, operators, and high-performers who want elite decision-making and world-class clarity.
          </p>
        </div>

        {/* Founder Countdown Component */}
        <div className="max-w-md mx-auto mb-8">
          <FounderCountdown />
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
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} isYearly={isYearly} />
          ))}

          {/* Enterprise Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-b from-amber-950/40 to-orange-950/40 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500">
                <Building2 className="h-3 w-3" />
                ENTERPRISE
              </span>
            </div>

            <div className="mb-6 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h3 className="text-xl font-bold text-white">OSQR Enterprise</h3>
              </div>
              <p className="text-sm text-neutral-400">
                For teams and organizations
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Tailored pricing based on your needs
              </p>
              <p className="text-xs font-medium text-amber-400 mt-1">
                Volume discounts available
              </p>
            </div>

            <ul className="space-y-3 mb-6">
              {[
                'Everything in Master',
                'Unlimited documents and storage',
                'API access for integrations',
                'Team collaboration (coming)',
                'SSO & advanced security',
                'Dedicated support',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-400" />
                  <span className="text-sm text-neutral-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowEnterpriseModal(true)}
              className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg"
            >
              Contact Us
            </button>

            {/* Comparison card - no query limits shown */}
            <div className="mt-4 pt-4 border-t border-neutral-700">
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                <div>
                  <span className="font-medium text-neutral-300">Unlimited</span> docs
                </div>
                <div>
                  <span className="font-medium text-neutral-300">100MB</span> max file
                </div>
                <div>
                  <span className="font-medium text-neutral-300">All</span> AI models
                </div>
                <div>
                  <span className="font-medium text-neutral-300">All</span> modes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Modal */}
        {showEnterpriseModal && (
          <EnterpriseModal onClose={() => setShowEnterpriseModal(false)} />
        )}

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Compare Plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="py-4 px-4 text-left text-neutral-400 font-medium">Feature</th>
                  <th className="py-4 px-4 text-center text-cyan-400 font-bold">Pro</th>
                  <th className="py-4 px-4 text-center text-purple-400 font-bold">Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Monthly Price</td>
                  <td className="py-3 px-4 text-center text-white font-semibold">
                    <span className="text-green-400">$39</span>
                    <span className="text-neutral-500 text-xs ml-1">(founder)</span>
                  </td>
                  <td className="py-3 px-4 text-center text-white font-semibold">
                    <span className="text-green-400">$119</span>
                    <span className="text-neutral-500 text-xs ml-1">(founder)</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Regular Price</td>
                  <td className="py-3 px-4 text-center text-neutral-400">$49/mo</td>
                  <td className="py-3 px-4 text-center text-neutral-400">$149/mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Queries per Day</td>
                  <td className="py-3 px-4 text-center text-white">75</td>
                  <td className="py-3 px-4 text-center text-white">200</td>
                </tr>
                <tr className="bg-purple-500/5">
                  <td className="py-3 px-4 text-neutral-300 flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    Council Mode
                  </td>
                  <td className="py-3 px-4 text-center text-white font-medium">5/day</td>
                  <td className="py-3 px-4 text-center text-white font-medium">15/day</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Documents in Vault</td>
                  <td className="py-3 px-4 text-center text-white">500</td>
                  <td className="py-3 px-4 text-center text-white">1,500</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Storage</td>
                  <td className="py-3 px-4 text-center text-white">10GB</td>
                  <td className="py-3 px-4 text-center text-white">100GB</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">VS Code Extension</td>
                  <td className="py-3 px-4 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Priority Processing</td>
                  <td className="py-3 px-4 text-center"><X className="h-5 w-5 text-neutral-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-neutral-300">Weekly Reviews</td>
                  <td className="py-3 px-4 text-center"><X className="h-5 w-5 text-neutral-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Guarantee Section */}
        <div className="mt-16 text-center">
          <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">
              90-Day Guarantee
            </h3>
            <p className="text-sm text-neutral-400">
              Use OSQR for 90 days. If you don&apos;t make at least one decision faster than you would have alone,
              surface at least one insight you wouldn&apos;t have found, and save at least 5 hours of mental load,
              I&apos;ll refund every dollar. No questions. No hassle. You keep everything Oscar learned about you.
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
  const hasYearly = hasYearlyOption(tier.name)

  // Get founder price if available
  const founderPrice = (tier as { founderPrice?: number }).founderPrice
  const hasFounderPricing = founderPrice !== undefined && founderPrice < tier.price

  // Stripe payment links
  const paymentLinks: Record<TierName, { monthly: string; yearly: string }> = {
    lite: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_LITE_LINK || '/signup?plan=lite&billing=monthly',
      yearly: '/signup?plan=lite&billing=monthly', // Lite is monthly only
    },
    pro: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_FOUNDER_LINK || '/signup?plan=pro&billing=monthly&founder=true',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_LINK || '/signup?plan=pro&billing=yearly',
    },
    master: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_MASTER_FOUNDER_LINK || '/signup?plan=master&billing=monthly&founder=true',
      yearly: process.env.NEXT_PUBLIC_STRIPE_MASTER_YEARLY_LINK || '/signup?plan=master&billing=yearly',
    },
  }

  const handleSelect = () => {
    if (isYearly && hasYearly) {
      window.location.href = paymentLinks[tier.name].yearly
      return
    }
    window.location.href = paymentLinks[tier.name].monthly
  }

  // Calculate display price - show founder price during founder period
  const displayPrice = isYearly && hasYearly
    ? tier.yearlyPrice
    : (hasFounderPricing ? founderPrice : tier.price)
  const priceLabel = isYearly && hasYearly ? '/year' : '/month'

  // Style configurations
  const styleConfig: Record<TierName, {
    gradient: string
    border: string
    shadow: string
    badgeBg: string
    checkColor: string
    buttonBg: string
    icon: React.ReactNode
    iconColor: string
  }> = {
    lite: {
      gradient: 'bg-gradient-to-b from-neutral-800/60 to-neutral-900/60',
      border: 'border-2 border-neutral-600',
      shadow: '',
      badgeBg: 'bg-neutral-600',
      checkColor: 'text-neutral-400',
      buttonBg: 'bg-neutral-700 hover:bg-neutral-600',
      icon: <Zap className="h-5 w-5 text-neutral-400" />,
      iconColor: 'text-neutral-400',
    },
    pro: {
      gradient: 'bg-gradient-to-b from-cyan-950/40 to-blue-950/40',
      border: 'border-2 border-cyan-500',
      shadow: 'shadow-lg shadow-cyan-500/20',
      badgeBg: 'bg-gradient-to-r from-cyan-500 to-blue-500',
      checkColor: 'text-cyan-400',
      buttonBg: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
      icon: <Star className="h-5 w-5 text-cyan-400" />,
      iconColor: 'text-cyan-400',
    },
    master: {
      gradient: 'bg-gradient-to-b from-purple-950/40 to-pink-950/40',
      border: 'border-2 border-purple-500',
      shadow: 'shadow-lg shadow-purple-500/20',
      badgeBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
      checkColor: 'text-purple-400',
      buttonBg: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
      icon: <Crown className="h-5 w-5 text-purple-400" />,
      iconColor: 'text-purple-400',
    },
  }

  const style = styleConfig[tier.name]

  return (
    <div className={`relative rounded-2xl p-6 ${style.gradient} ${style.border} ${style.shadow}`}>
      {/* Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className={`text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${style.badgeBg}`}>
          {isMaster && <Crown className="h-3 w-3" />}
          FOUNDER PRICING
        </span>
      </div>

      <div className="mb-6 mt-2">
        <div className="flex items-center gap-2 mb-2">
          {style.icon}
          <h3 className="text-xl font-bold text-white">
            {tier.displayName}
          </h3>
        </div>
        <p className="text-sm text-neutral-400">
          {tier.description}
        </p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white">
            ${displayPrice}
          </span>
          <span className="text-neutral-400">{priceLabel}</span>
        </div>

        {isYearly && hasYearly ? (
          <>
            <p className="text-xs text-neutral-500 mt-1">
              ${Math.round(tier.yearlyPrice / 12)}/mo effective — Save ${tier.price * 12 - tier.yearlyPrice}/year
            </p>
            <p className="text-xs font-medium text-green-400 mt-1">
              2 months free + all future upgrades included
            </p>
          </>
        ) : (
          <>
            {hasFounderPricing ? (
              <>
                <p className="text-xs text-neutral-500 mt-1">
                  <span className="line-through">${tier.price}/mo</span> — Founder pricing
                </p>
                <p className="text-xs font-medium text-green-400 mt-1">
                  Locked in for life as a founder
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500 mt-1">
                Monthly billing
              </p>
            )}
          </>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.checkColor}`} />
            <span className="text-sm text-neutral-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSelect}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all text-white shadow-md hover:shadow-lg ${style.buttonBg}`}
      >
        {`Get ${tier.displayName}${isYearly && hasYearly ? ' (Yearly)' : ''}`}
      </button>

      {/* Comparison card - Show key limits including Council Mode */}
      <div className="mt-4 pt-4 border-t border-neutral-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.maxDocuments}</span> docs
          </div>
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.maxFileSizeMB}MB</span> max file
          </div>
          <div>
            <span className="font-medium text-neutral-300">{tier.limits.panelQueriesPerDay}</span>/day queries
          </div>
          <div>
            {tier.limits.hasCouncilMode ? (
              <><span className="font-medium text-neutral-300">{tier.limits.councilPerDay}</span>/day council</>
            ) : (
              <span className="text-neutral-500">No council</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/enterprise-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setSubmitted(true)
      }
    } catch (error) {
      console.error('Failed to submit:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
            <p className="text-neutral-400 mb-6">
              Thanks for reaching out. I&apos;ll get back to you within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Building2 className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Enterprise Inquiry</h3>
                <p className="text-sm text-neutral-400">Tell me about your needs</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">
                    Team Size
                  </label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Select...</option>
                    <option value="1-5">1-5 people</option>
                    <option value="6-20">6-20 people</option>
                    <option value="21-50">21-50 people</option>
                    <option value="51-200">51-200 people</option>
                    <option value="200+">200+ people</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  What are you looking for? *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  placeholder="Tell me about your use case, team needs, and any specific requirements..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Message'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
