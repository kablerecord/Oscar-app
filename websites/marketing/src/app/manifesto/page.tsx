import { Metadata } from 'next'
import { Shield, Check, Trash2, Lock, Eye, ArrowLeft, Building2, FileText, Scale, Bot, Heart } from 'lucide-react'
import Link from 'next/link'
import { EasterEggConsole } from './easter-egg'

export const metadata: Metadata = {
  title: 'Trust & Privacy Manifesto - OSQR',
  description: 'Why OSQR is built on architectural trust, not promises. Read our commitment to privacy.',
}

export default function ManifestoPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Layer 4: Console easter egg */}
      <EasterEggConsole />

      {/* Layer 2: HTML comment easter egg - only visible in DevTools */}
      {/*
        ═══════════════════════════════════════════════════════════

        If you're reading this, you're the kind of person we built
        OSQR for. The curious ones. The ones who look deeper.

        There's more to discover: /vision

        ═══════════════════════════════════════════════════════════
      */}
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to OSQR
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Trust & Privacy Manifesto
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Every company says they protect your privacy. The words have been hollowed out by the ones who didn&apos;t mean it.
          </p>
        </div>

        {/* Why This Exists */}
        <div className="mb-16 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-8">
          <p className="text-slate-300 text-lg">
            This document exists because I know you don&apos;t believe privacy promises anymore. Neither do I. That&apos;s why I built OSQR.
          </p>
          <p className="mt-4 text-slate-400">
            I don&apos;t believe every company sells our data. Many genuinely try to protect users. But the system makes it hard to tell who&apos;s trustworthy—and even well-intentioned companies can be acquired, pressured, or compromised.
          </p>
          <p className="mt-4 text-purple-400 font-semibold">
            OSQR is different—not because I&apos;m asking you to trust my words, but because I&apos;ve built a system where trust is architectural, not promissory.
          </p>
        </div>

        {/* Personal Commitment */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Building2 className="h-4 w-4" />
            </span>
            My Personal Commitment
          </h2>

          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6 mb-6">
            <p className="text-white text-lg font-semibold mb-4">
              My name is Kable Record. I built OSQR. I own 100% of it.
            </p>
            <p className="text-slate-300 mb-4">
              I will never sell OSQR to a company that doesn&apos;t share these values. I will never take investor money that compromises user privacy. I will never dilute ownership to people who see your data as a product.
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-400">Typical Startup</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400">OSQR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">VC investors demand growth at any cost</td>
                  <td className="px-6 py-4 text-sm text-white">I answer to users, not investors</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Board can override founder on privacy</td>
                  <td className="px-6 py-4 text-sm text-white">No board. My decision.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Exit pressure leads to data monetization</td>
                  <td className="px-6 py-4 text-sm text-white">No exit pressure. I&apos;m building for decades.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">&quot;We had to change our privacy policy&quot;</td>
                  <td className="px-6 py-4 text-sm text-white">I don&apos;t have to do anything</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-slate-400 italic">
            I&apos;d rather own 100% of something smaller than any percentage of something that betrays users.
          </p>
        </div>

        {/* Architectural Transparency */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Lock className="h-4 w-4" />
            </span>
            Architectural Transparency
          </h2>

          <p className="text-slate-300 mb-6">
            OSQR&apos;s privacy isn&apos;t a policy—it&apos;s how the system is built.
          </p>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 mb-6">
            <p className="text-xl font-bold text-white text-center">
              &quot;OSQR stores everything. OSQR sees nothing.&quot;
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">What This Means</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">How It Works</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">Your data is encrypted before it leaves your device</td>
                  <td className="px-6 py-4 text-sm text-slate-400">I hold ciphertext, not content</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">Embeddings generated locally</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Your device creates the searchable index</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">User holds the keys</td>
                  <td className="px-6 py-4 text-sm text-slate-400">I cannot access your data even if I wanted to</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">Search happens locally</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Queries never decrypted on my servers</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">The Legal Consequence:</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Right to deletion?</strong> Delete your key—data becomes meaningless</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Subpoena?</strong> I can only hand over encrypted blobs</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Data breach?</strong> Encrypted data breach is a non-event</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>&quot;Sell my data&quot;?</strong> I can&apos;t sell what I can&apos;t read</span>
              </li>
            </ul>
            <p className="mt-6 text-purple-400 font-semibold">
              I&apos;m not asking you to trust my intentions. I&apos;m showing you a system where bad intentions wouldn&apos;t matter.
            </p>
          </div>
        </div>

        {/* Constitutional Framework */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Scale className="h-4 w-4" />
            </span>
            The Constitutional Framework
          </h2>

          <p className="text-slate-300 mb-6">
            OSQR operates under a published constitution—rules the system follows that you can read and verify.
          </p>

          <div className="grid gap-4">
            <ConstitutionItem
              title="User sovereignty"
              description="Your data belongs to you. Period."
            />
            <ConstitutionItem
              title="No surveillance capitalism"
              description="OSQR will never sell data or attention"
            />
            <ConstitutionItem
              title="Transparency"
              description="You can always see what OSQR knows about you"
            />
            <ConstitutionItem
              title="The Burn-It Button"
              description="One click deletes everything. Actually deletes. Not 'archived for 90 days.'"
            />
            <ConstitutionItem
              title="No dark patterns"
              description="OSQR will never manipulate you for engagement"
            />
          </div>

          <p className="mt-6 text-slate-400">
            These aren&apos;t policies. They&apos;re constraints built into the code.
          </p>
        </div>

        {/* Transparency Reports */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <FileText className="h-4 w-4" />
            </span>
            Radical Receipts
          </h2>

          <p className="text-slate-300 mb-6">
            I will publish regular transparency reports:
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
              <p className="text-white font-medium">Government/Third-Party Requests</p>
              <p className="text-sm text-slate-400 mt-1">Every data request received and what was shared (spoiler: nothing, because I can&apos;t read it)</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
              <p className="text-white font-medium">Security Incidents</p>
              <p className="text-sm text-slate-400 mt-1">Any incidents and exactly what was affected</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
              <p className="text-white font-medium">Revenue Sources</p>
              <p className="text-sm text-slate-400 mt-1">Proving no data monetization</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
              <p className="text-white font-medium">Third-Party Audits</p>
              <p className="text-sm text-slate-400 mt-1">Security audits from independent firms</p>
            </div>
          </div>

          <p className="mt-6 text-slate-400 italic">
            Boring consistency over time builds trust.
          </p>
        </div>

        {/* The Anti-VIKI Promise */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Bot className="h-4 w-4" />
            </span>
            The Anti-VIKI Promise
          </h2>

          <p className="text-slate-300 mb-6">
            In <em>I, Robot</em>, VIKI was a centralized AI that controlled all robots—one intelligence making decisions for millions of people, &quot;for their own good.&quot; OSQR is architecturally the opposite:
          </p>

          <div className="rounded-xl border border-slate-700 overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-red-400">VIKI (What We&apos;re Avoiding)</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-purple-400">OSQR (What We&apos;re Building)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Centralized control</td>
                  <td className="px-6 py-4 text-sm text-white">User-owned intelligence</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Platform decides what&apos;s best</td>
                  <td className="px-6 py-4 text-sm text-white">You see and control everything</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Your data serves the system</td>
                  <td className="px-6 py-4 text-sm text-white">Your data serves you</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">Robot loyalty to manufacturer</td>
                  <td className="px-6 py-4 text-sm text-white">Intelligence loyalty to <em>you</em></td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">&quot;Trust us&quot;</td>
                  <td className="px-6 py-4 text-sm text-white">&quot;Verify it yourself&quot;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
            <p className="text-white font-semibold">Your robot should work for you, not the manufacturer.</p>
            <p className="text-white font-semibold">Your AI should work for you, not the platform.</p>
            <p className="text-slate-400 mt-4 text-sm">
              As OSQR expands to more devices—phones, computers, cars, eventually robots—this architecture ensures the intelligence layer always belongs to you.
            </p>
          </div>
        </div>

        {/* 7 Nevers */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Eye className="h-4 w-4" />
            </span>
            What OSQR Will Never Do
          </h2>

          <p className="text-slate-400 mb-6">
            These are hard commitments, not aspirational statements:
          </p>

          <div className="space-y-4">
            <NeverItem
              number={1}
              title="Never sell your data"
              description="The architecture makes this impossible, not just prohibited"
            />
            <NeverItem
              number={2}
              title="Never use your data to train models sold to others"
              description="Your intelligence is yours"
            />
            <NeverItem
              number={3}
              title="Never show you ads"
              description="Revenue comes from subscriptions and plugins, not attention harvesting"
            />
            <NeverItem
              number={4}
              title="Never lock you in"
              description="Export everything, anytime, in usable formats"
            />
            <NeverItem
              number={5}
              title="Never manipulate for engagement"
              description="OSQR's job is to improve your thinking, not maximize your screen time"
            />
            <NeverItem
              number={6}
              title="Never share with governments without legal compulsion"
              description="And even then, I can only share encrypted data I can't read"
            />
            <NeverItem
              number={7}
              title="Never change these commitments"
              description="The constitution is immutable. If I tried to change it, the system would be forked."
            />
          </div>
        </div>

        {/* Trust Equation */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">The Trust Equation</h2>

          <p className="text-slate-300 mb-6">
            I&apos;m asking you to trust OSQR with your most personal information—your thoughts, decisions, family details, business strategy. Here&apos;s why that trust is reasonable:
          </p>

          <div className="rounded-xl border border-slate-700 overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Your Concern</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">How OSQR Addresses It</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">Can they access my data?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">No. End-to-end encryption. I hold ciphertext.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">Will they sell my data?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Can&apos;t sell what I can&apos;t read.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">What if they&apos;re acquired?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">100% ownership. No investors. No board. My choice.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">What if they go bankrupt?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Your keys mean your data. Export anytime.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">What if they change the policy?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Constitutional framework is immutable.</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-300">What if they lie?</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Architecture makes lies impossible, not just unethical.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 text-center">
            <p className="text-2xl font-bold text-white">Don&apos;t trust me. Trust the math.</p>
          </div>
        </div>

        {/* Burn It Button */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 mr-3 text-sm">
              <Trash2 className="h-4 w-4" />
            </span>
            The Burn-It Button
          </h2>

          <div className="rounded-xl border border-red-500/30 bg-slate-800/50 p-8">
            <p className="text-xl font-bold text-white mb-4">One click. Everything gone.</p>
            <p className="text-slate-400 mb-4">
              Not &quot;scheduled for deletion in 30 days.&quot;<br />
              Not &quot;removed from active systems but retained in backups.&quot;<br />
              Not &quot;anonymized and retained for analytics.&quot;
            </p>
            <p className="text-red-400 font-bold text-lg mb-6">Gone.</p>

            <div className="space-y-2 text-slate-300 mb-6">
              <p>The Burn-It Button:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Deletes your encryption keys from all devices</li>
                <li>Instructs OSQR servers to purge all associated encrypted blobs</li>
                <li>Removes all metadata</li>
                <li>Confirms deletion with cryptographic proof</li>
              </ol>
            </div>

            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-white font-semibold">Why this matters:</p>
              <p className="text-slate-300 mt-2">
                You should be able to walk away. Completely. At any moment.
              </p>
              <p className="text-slate-300 mt-2">
                If you can&apos;t truly leave, you&apos;re not a user—you&apos;re a hostage.
              </p>
              <p className="text-red-400 font-semibold mt-2">
                OSQR will never hold your data hostage.
              </p>
            </div>
          </div>
        </div>

        {/* My Story */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 mr-3 text-sm">
              <Heart className="h-4 w-4" />
            </span>
            My Story: Why I Built This
          </h2>

          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 p-8">
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300">
                I used an app that promised not to sell my data. Then I learned they did exactly that.
              </p>
              <p className="text-slate-300">
                I&apos;m not naive—I knew companies collected data. But the explicit lie bothered me. &quot;We don&apos;t sell your data&quot; wasn&apos;t a gray area. It was false.
              </p>
              <p className="text-slate-300">
                I looked for an AI assistant I could trust with my real thoughts, my business strategy, my family details. Something that would remember everything and work for me, not harvest me.
              </p>
              <p className="text-slate-300">
                It didn&apos;t exist.
              </p>
              <p className="text-slate-300">
                So I built it.
              </p>
              <p className="text-slate-300">
                OSQR exists because I wanted something I could actually trust. If I&apos;m going to have an AI that knows everything about me—my decisions, my patterns, my family, my business—I need to know that information works <em>for</em> me, not against me.
              </p>
              <p className="text-white font-semibold mt-6">
                I built OSQR for myself first. Then I realized others need it too.
              </p>
            </div>
            <div className="mt-8 flex items-center space-x-4 border-t border-slate-700 pt-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                KR
              </div>
              <div>
                <p className="font-semibold text-white">Kable Record</p>
                <p className="text-sm text-slate-400">Founder & 100% Owner, OSQR</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <p className="text-slate-400">
            For technical details on our current privacy practices:
          </p>
          <Link
            href="/privacy"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 font-semibold"
          >
            View Privacy Policy →
          </Link>
          <p className="text-slate-500 text-sm mt-8">
            This document is version 1.0 · Last updated: December 2025 ·{' '}
            {/* Layer 1: Subtle infinity symbol - clickable but looks decorative */}
            <Link
              href="/vision"
              className="text-slate-600 hover:text-purple-400 transition-colors duration-500"
              title=""
              aria-label="Hidden page"
            >
              ∞
            </Link>
          </p>
          {/* Layer 3: Invisible text - only visible via select-all or inspect */}
          <span
            className="select-all text-transparent text-[1px] leading-none block h-0 overflow-hidden"
            aria-hidden="true"
          >
            The curious find /vision
          </span>
        </div>
      </div>
    </div>
  )
}

// Component: Constitution Item
function ConstitutionItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start space-x-3 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
      <Check className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-semibold text-white">{title}:</span>{' '}
        <span className="text-slate-400">{description}</span>
      </div>
    </div>
  )
}

// Component: Never Item
function NeverItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4 rounded-xl border border-slate-700 bg-slate-800/30 p-5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 font-bold">
        {number}
      </span>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      </div>
    </div>
  )
}
