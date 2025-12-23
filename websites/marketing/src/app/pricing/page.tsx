'use client'

import { useState } from 'react'
import Link from 'next/link'

// For local development, use localhost:3001. In production, use app.osqr.app
const APP_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : 'https://app.osqr.app'

interface Feature {
  text: string
  available: boolean
  isHeader?: boolean
  comingSoon?: boolean
  tooltip?: string
}

interface Tier {
  name: string
  tagline: string
  monthlyPrice: number
  yearlyPrice: number // 0 = no yearly option
  futurePrice: number
  features: Feature[]
  cta: string
  tierStyle: 'pro' | 'master'
  badge: string
  tier: string
  limits: {
    docs: number
    maxFile: number
    models: string
    modes: string
  }
}

const tiers: Tier[] = [
  {
    name: 'Pro',
    tagline: 'Full OSQR experience with multi-model panel',
    monthlyPrice: 99,
    yearlyPrice: 948, // $79/month × 12 = $948 (2 months free)
    futurePrice: 149,
    features: [
      { text: '500 documents in vault', available: true, tooltip: 'Upload your documents, notes, and context. OSQR references your knowledge to give personalized, relevant answers.' },
      { text: '100 queries per day', available: true, tooltip: 'More than enough for daily professional use.' },
      { text: '30-day chat history analysis', available: true, tooltip: 'OSQR analyzes your conversation patterns to deliver increasingly personalized responses.' },
      { text: 'Quick, Thoughtful, and Contemplate modes', available: true, tooltip: 'Quick for fast answers, Thoughtful for deeper analysis, Contemplate for complex reasoning.' },
      { text: 'Full Personal Knowledge Vault', available: true, tooltip: 'Your complete knowledge base at OSQR\'s fingertips.' },
      { text: 'Cross-interface continuity', available: true, tooltip: 'OSQR remembers context across sessions and interfaces.' },
      { text: '10GB storage', available: true, tooltip: 'Plenty of room for your documents and knowledge base.' },
      { text: '100 image analyses per month', available: true, tooltip: 'Upload and analyze images, diagrams, and screenshots.' },
    ],
    cta: 'Get Pro',
    tierStyle: 'pro',
    badge: 'FOUNDER PRICING',
    tier: 'pro',
    limits: {
      docs: 500,
      maxFile: 25,
      models: '2',
      modes: '3',
    },
  },
  {
    name: 'Master',
    tagline: 'All modes including Council for builders and power users',
    monthlyPrice: 249,
    yearlyPrice: 2388, // $199/mo effective
    futurePrice: 349,
    features: [
      { text: 'Everything in Pro', available: true, isHeader: true, tooltip: 'All Pro features included, plus the advanced capabilities below.' },
      { text: '1,500 documents in vault', available: true, tooltip: '3x the storage. Upload your entire knowledge base—books, research, company docs, personal notes.' },
      { text: '300 queries per day', available: true, tooltip: 'Covers any human usage pattern.' },
      { text: 'Unlimited chat history analysis', available: true, tooltip: 'OSQR has access to your complete conversation history.' },
      { text: 'Council Mode (multi-model deliberation)', available: true, tooltip: 'Watch multiple AI models debate your question live, then get OSQR\'s synthesized consensus.' },
      { text: 'Priority fast-lane processing', available: true, tooltip: 'Your requests are processed with priority.' },
      { text: '100GB storage', available: true, tooltip: 'Room for your entire professional knowledge base.' },
      { text: 'Unlimited image analyses', available: true, tooltip: 'No monthly cap on image uploads and analysis.' },
      { text: 'Weekly automated reviews', available: true, tooltip: 'OSQR proactively surfaces insights from your knowledge base.' },
      { text: 'Custom Agent Builder', available: true, comingSoon: true, tooltip: 'Create custom AI agents tailored to your workflows.' },
      { text: 'VS Code Extension', available: true, comingSoon: true, tooltip: 'Access OSQR directly in your code editor for seamless development assistance.' },
    ],
    cta: 'Get Master',
    tierStyle: 'master',
    badge: 'FOUNDER PRICING',
    tier: 'master',
    limits: {
      docs: 1500,
      maxFile: 50,
      models: '4+',
      modes: 'All',
    },
  },
]

// Tooltip component
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="group relative inline-flex items-start w-full">
      {children}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 pointer-events-none">
        <div className="bg-neutral-900 border border-neutral-600 text-neutral-200 text-xs rounded-lg px-3 py-2 shadow-xl">
          {text}
          <div className="absolute left-4 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-neutral-600"></div>
        </div>
      </div>
    </div>
  )
}

// Inner Circle Modal Component
function InnerCircleModal({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/inner-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setIsSubmitted(false)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-800 border border-neutral-700 p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isSubmitted ? (
          // Success state
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">We&apos;ll be in touch!</h3>
            <p className="text-neutral-400 mb-6">
              Thanks for your interest in OSQR Inner Circle. We&apos;ll reach out soon to discuss how we can help you get unfair advantage.
            </p>
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg bg-neutral-700 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-600 transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          // Form state
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300 mb-3">
                <span className="mr-2 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Enterprise
              </div>
              <h3 className="text-xl font-bold text-white mb-1">OSQR Enterprise</h3>
              <p className="text-sm text-neutral-400">
                Enter your details and we&apos;ll reach out to discuss enterprise solutions for your team.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Request Information'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// Contact Modal Component
function ContactModal({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setMessage('')
    setIsSubmitted(false)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-800 border border-neutral-700 p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isSubmitted ? (
          // Success state
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Message Sent!</h3>
            <p className="text-neutral-400 mb-6">
              Thanks for reaching out. We&apos;ll get back to you soon.
            </p>
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-lg bg-neutral-700 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-600 transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          // Form state
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Contact Us</h3>
              <p className="text-sm text-neutral-400">
                Have questions about OSQR? We&apos;d love to hear from you.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium text-neutral-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="contact-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="contact-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-neutral-300 mb-1">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-lg bg-neutral-900 border border-neutral-700 px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  placeholder="Your question or message..."
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// Style configurations for each tier
const tierStyles = {
  pro: {
    gradient: 'bg-gradient-to-b from-cyan-950/40 to-blue-950/40',
    border: 'border-2 border-cyan-500',
    shadow: 'shadow-lg shadow-cyan-500/20',
    badgeBg: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    checkColor: 'text-cyan-400',
    buttonBg: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
    iconColor: 'text-cyan-400',
  },
  master: {
    gradient: 'bg-gradient-to-b from-purple-950/40 to-pink-950/40',
    border: 'border-2 border-purple-500',
    shadow: 'shadow-lg shadow-purple-500/20',
    badgeBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
    checkColor: 'text-purple-400',
    buttonBg: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    iconColor: 'text-purple-400',
  },
}

export default function PricingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      {/* Navigation */}
      <nav className="max-w-5xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto">
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
              Founder Edition Pricing — Available for the first 500 users
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
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier) => {
            const style = tierStyles[tier.tierStyle]
            const hasYearly = tier.yearlyPrice > 0
            const displayPrice = isYearly && hasYearly ? tier.yearlyPrice : tier.monthlyPrice
            const priceLabel = isYearly && hasYearly ? '/year' : '/month'

            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-6 ${style.gradient} ${style.border} ${style.shadow}`}
              >
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${style.badgeBg}`}>
                    {tier.tierStyle === 'master' && (
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                    )}
                    {tier.badge}
                  </span>
                </div>

                <div className="mb-6 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    {tier.tierStyle === 'pro' && (
                      <svg className="h-5 w-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    )}
                    {tier.tierStyle === 'master' && (
                      <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                    )}
                    <h3 className="text-xl font-bold text-white">
                      OSQR {tier.name}
                    </h3>
                  </div>
                  <p className="text-sm text-neutral-400">
                    {tier.tagline}
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
                        ${Math.round(tier.yearlyPrice / 12)}/mo effective — Save ${tier.monthlyPrice * 12 - tier.yearlyPrice}/year
                      </p>
                      <p className="text-xs font-medium text-green-400 mt-1">
                        2 months free + all future upgrades included
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-500 mt-1">
                        {tier.futurePrice > tier.monthlyPrice ? `Early Launch Price — Future price $${tier.futurePrice}/mo` : 'Monthly billing'}
                      </p>
                      {tier.futurePrice > tier.monthlyPrice && (
                        <p className="text-xs font-medium text-green-400 mt-1">
                          Founder rate locked in for life
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {feature.isHeader ? (
                        feature.tooltip ? (
                          <Tooltip text={feature.tooltip}>
                            <span className={`text-sm font-semibold cursor-help ${style.checkColor}`}>
                              {feature.text}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className={`text-sm font-semibold ${style.checkColor}`}>
                            {feature.text}
                          </span>
                        )
                      ) : feature.tooltip ? (
                        <Tooltip text={feature.tooltip}>
                          <div className="flex items-start gap-2 cursor-help">
                            <svg className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.checkColor}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-neutral-300">
                              {feature.text}
                              {feature.comingSoon && (
                                <span className="ml-1.5 text-xs text-amber-400">(coming)</span>
                              )}
                            </span>
                          </div>
                        </Tooltip>
                      ) : (
                        <>
                          <svg className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.checkColor}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-neutral-300">
                            {feature.text}
                            {feature.comingSoon && (
                              <span className="ml-1.5 text-xs text-amber-400">(coming)</span>
                            )}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                <a
                  href={`${APP_URL}/signup?plan=${tier.tier}&billing=${isYearly && hasYearly ? 'yearly' : 'monthly'}`}
                  className={`block w-full py-3 px-4 rounded-lg font-semibold text-center transition-all text-white shadow-md hover:shadow-lg ${style.buttonBg}`}
                >
                  {tier.cta}{isYearly && hasYearly ? ' (Yearly)' : ''}
                </a>

                {/* Comparison card - NO query limits shown */}
                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                    <div>
                      <span className="font-medium text-neutral-300">{tier.limits.docs}</span> docs
                    </div>
                    <div>
                      <span className="font-medium text-neutral-300">{tier.limits.maxFile}MB</span> max file
                    </div>
                    <div>
                      <span className="font-medium text-neutral-300">{tier.limits.models}</span> AI model{tier.limits.models !== '1' ? 's' : ''}
                    </div>
                    <div>
                      <span className="font-medium text-neutral-300">{tier.limits.modes}</span> mode{tier.limits.modes !== '1' ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Enterprise Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-b from-amber-950/40 to-orange-950/40 border-2 border-amber-500/50 shadow-lg shadow-amber-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                ENTERPRISE
              </span>
            </div>

            <div className="mb-6 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
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
                'Unlimited documents',
                'Dedicated support',
                'Custom model access',
                'API access for integrations',
                'Team collaboration (coming)',
                'SSO & advanced security',
                '100MB max file size',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="h-5 w-5 mt-0.5 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-neutral-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg"
            >
              Contact Us
            </button>

            {/* Comparison card */}
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

        {/* FAQ teaser */}
        <div className="mt-12 text-center">
          <p className="text-neutral-400 mb-4">
            Have questions about pricing or features?
          </p>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Contact us →
          </button>
        </div>

      </div>

      {/* Enterprise Modal */}
      <InnerCircleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Contact Modal */}
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  )
}
