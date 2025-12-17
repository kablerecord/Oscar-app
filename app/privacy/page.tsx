import { Metadata } from 'next'
import { Shield, Check, Trash2, Lock, Eye, Server, Key, FileX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy - OSQR',
  description: 'Your data belongs to you. Learn about OSQR\'s privacy-first philosophy.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900">
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
        {/* Manifesto Banner */}
        <Link
          href="/manifesto"
          className="mb-12 block rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 p-6 hover:border-purple-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-400 font-semibold mb-1">New: Trust & Privacy Manifesto</p>
              <p className="text-slate-400 text-sm">Read our founder&apos;s personal commitment to privacy and why OSQR is built on architectural trust, not promises.</p>
            </div>
            <ArrowLeft className="h-5 w-5 text-purple-400 rotate-180 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Privacy is Capability
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            If you can&apos;t trust your AI, you can&apos;t use it to its full potential.
            OSQR is built on privacy from the ground up.
          </p>
        </div>

        {/* Core Promise */}
        <div className="mb-16 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            &quot;Your data belongs to you.&quot;
          </h2>
          <p className="text-slate-300 text-lg">
            OSQR exists to make you more capable — not to extract anything from you.
            Everything you upload, write, think, or store in OSQR belongs solely to you.
            Your data is never sold, shared, or used for training.
            OSQR only uses your data to think <em>for you</em>, not for anyone else.
          </p>
          <p className="mt-4 text-emerald-400 font-semibold">
            OSQR is a private intelligence engine — not a data farm.
          </p>
        </div>

        {/* Key Commitments */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">1</span>
            Our Privacy Commitments
          </h2>

          <div className="grid gap-6">
            <CommitmentCard
              icon={<Eye className="h-6 w-6" />}
              title="Your Vault is Yours Alone"
              description="No one — not even OSQR staff — can see your files, chats, uploads, or memories. Your Personal Knowledge Vault is completely private."
            />
            <CommitmentCard
              icon={<FileX className="h-6 w-6" />}
              title="Never Used for Training"
              description="OSQR does not train any AI model on your data. Not now. Not ever. Your content, documents, conversations, and embeddings are never used for machine learning."
            />
            <CommitmentCard
              icon={<Lock className="h-6 w-6" />}
              title="Encrypted & Secure"
              description="Your data is encrypted at rest (AES-256) and in transit (TLS 1.2+). Embeddings are stored as numeric vectors that cannot be reversed into text."
            />
            <CommitmentCard
              icon={<Trash2 className="h-6 w-6" />}
              title="The &quot;Burn It&quot; Button"
              description="Delete everything instantly. One click. Irreversible. Total wipe. Documents, embeddings, chats, memories, profile — everything. Gone forever."
            />
          </div>
        </div>

        {/* Privacy Tiers */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">2</span>
            Privacy Tiers
          </h2>
          <p className="text-slate-400 mb-8">
            You control how your data is used. Choose the level that fits your comfort.
          </p>

          <div className="space-y-6">
            <TierCard
              tier="A"
              name="Maximum Privacy"
              isDefault
              features={[
                "Nothing leaves your vault except what's sent to AI models to answer your questions",
                "None of your data improves OSQR globally",
                "No anonymization, no analytics on your content",
                "Fully private — the strictest setting"
              ]}
            />
            <TierCard
              tier="B"
              name="Improve My OSQR"
              features={[
                "No raw content is ever shared",
                "Optionally allow OSQR to learn from patterns only",
                "Example: \"User sets fitness goals but doesn't follow through\"",
                "Improves your personal model — not anyone else's"
              ]}
            />
            <TierCard
              tier="C"
              name="Global Patterns"
              features={[
                "Opt-in only, off by default, extra warnings",
                "Anonymously contribute patterns (never content)",
                "Zero identifiable data — aggregated trends only",
                "Help improve OSQR for everyone (the \"Waze\" model)"
              ]}
            />
          </div>
        </div>

        {/* Where Data is Stored */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">3</span>
            Where Your Data Lives
          </h2>

          <div className="rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Data Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Storage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <DataRow
                  type="Your Documents"
                  storage="Encrypted database (PostgreSQL + Supabase)"
                />
                <DataRow
                  type="Your Embeddings"
                  storage="Numeric vectors — mathematically irreversible to text"
                />
                <DataRow
                  type="Your Profile"
                  storage="Encrypted rows tied only to your account"
                />
                <DataRow
                  type="Your Chats"
                  storage="Private, encrypted, never exposed outside OSQR"
                />
                <DataRow
                  type="AI Requests"
                  storage="Only the text needed to answer your question is sent to AI providers"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* No Human Access */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">4</span>
            No Human Access
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">
                OSQR Staff Cannot:
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  See your files
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  Open your vault
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  Browse your chats
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  View your uploads
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  Inspect your embeddings
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-red-400">✕</span>
                  See your profile data
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-4">
                OSQR Staff Can See:
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center">
                  <span className="mr-2 text-emerald-400">✓</span>
                  Your email address
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-emerald-400">✓</span>
                  Your subscription plan
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-emerald-400">✓</span>
                  Billing metadata
                </li>
                <li className="flex items-center">
                  <span className="mr-2 text-emerald-400">✓</span>
                  Error logs (no content)
                </li>
              </ul>
              <p className="mt-4 text-sm text-slate-400">
                That&apos;s it. Nothing else.
              </p>
            </div>
          </div>
        </div>

        {/* Burn It Button */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">5</span>
            The &quot;Burn It&quot; Button
          </h2>

          <div className="rounded-xl border border-red-500/30 bg-slate-800/50 p-8">
            <div className="flex items-start space-x-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Instant, Complete Deletion</h3>
                <p className="text-slate-300 mb-4">
                  When you click &quot;Burn It,&quot; OSQR permanently deletes:
                </p>
                <ul className="grid sm:grid-cols-2 gap-2 text-slate-400">
                  <li>• All your documents</li>
                  <li>• All embeddings</li>
                  <li>• All chat history</li>
                  <li>• All memories</li>
                  <li>• Your entire PKV</li>
                  <li>• All profile data</li>
                  <li>• Cached model outputs</li>
                  <li>• All system logs</li>
                </ul>
                <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-red-300 font-semibold">
                    Once deleted, OSQR cannot recover your data.
                  </p>
                  <p className="text-red-400/80 text-sm mt-1">
                    There is no undo. No cold storage copy. No internal archive. No ghost copy for analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider Handling */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">6</span>
            How AI Requests Work
          </h2>

          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <p className="text-slate-300 mb-6">
              When OSQR sends something to AI providers (OpenAI, Anthropic, etc.), the rule is simple:
            </p>
            <p className="text-xl font-semibold text-white mb-6">
              Only the exact text necessary to answer your question goes to the model.
            </p>

            <div className="space-y-4">
              <div className="rounded-lg bg-slate-700/30 p-4">
                <p className="text-slate-400 text-sm mb-2">Example:</p>
                <p className="text-slate-300">
                  If you ask: <span className="text-white">&quot;Summarize page 4 of my document&quot;</span>
                </p>
                <p className="text-emerald-400 mt-2">
                  → OSQR only sends page 4&apos;s text to the AI
                </p>
              </div>
              <div className="rounded-lg bg-slate-700/30 p-4">
                <p className="text-slate-400 text-sm mb-2">Example:</p>
                <p className="text-slate-300">
                  If you ask: <span className="text-white">&quot;What were my goals last month?&quot;</span>
                </p>
                <p className="text-emerald-400 mt-2">
                  → OSQR fetches goals from your vault internally, sends only your question and the relevant text
                </p>
              </div>
            </div>
            <p className="text-slate-400 mt-6 text-sm">
              You control what is sent because it is always tied to your explicit action.
            </p>
          </div>
        </div>

        {/* Encryption Details */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">7</span>
            Encryption & Security
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            <SecurityCard
              icon={<Server className="h-5 w-5" />}
              title="At Rest"
              description="AES-256 encryption via Supabase/PostgreSQL"
            />
            <SecurityCard
              icon={<Lock className="h-5 w-5" />}
              title="In Transit"
              description="TLS 1.2+ / HTTPS for all connections"
            />
            <SecurityCard
              icon={<Key className="h-5 w-5" />}
              title="Passwords"
              description="Hashed with bcrypt/argon2 (never stored in plain text)"
            />
            <SecurityCard
              icon={<FileX className="h-5 w-5" />}
              title="Embeddings"
              description="Stored as vectors — mathematically irreversible to text"
            />
          </div>
        </div>

        {/* Data Minimization */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mr-3 text-sm">8</span>
            Data Minimization
          </h2>

          <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <p className="text-slate-300 mb-4">
              OSQR collects <strong className="text-white">the minimum necessary</strong>:
            </p>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-2" />
                Email address
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-2" />
                Password (hashed)
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-2" />
                Subscription status
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-2" />
                Usage metrics (not content)
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-emerald-400 mr-2" />
                Optional profile info you provide
              </li>
            </ul>
            <p className="mt-6 text-slate-400">
              That&apos;s it. No tracking. No surveillance. No creepy behavior. No &quot;shadow profiles.&quot;
            </p>
          </div>
        </div>

        {/* Founder Letter */}
        <div className="mb-16">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              A Note from the Founder
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-slate-300">
                I built OSQR to be the AI assistant I always wanted — one that truly knows me,
                remembers my context, and helps me think better. But that kind of deep integration
                requires trust.
              </p>
              <p className="text-slate-300">
                If you&apos;re going to index your entire life into an AI system — your documents,
                your thoughts, your goals, your struggles — you need to know that data is sacred.
              </p>
              <p className="text-slate-300">
                That&apos;s why OSQR is built on privacy from day one. Not as a feature. Not as a
                marketing bullet point. As a <em>foundation</em>.
              </p>
              <p className="text-white font-semibold">
                Your capability depends on your willingness to be honest with OSQR.
                And your willingness depends on trust. I intend to earn it.
              </p>
            </div>
            <div className="mt-6 flex items-center space-x-4">
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

        {/* Questions */}
        <div className="text-center">
          <p className="text-slate-400 mb-4">
            Questions about privacy? Concerns? Ideas?
          </p>
          <a
            href="mailto:privacy@osqr.app"
            className="inline-flex items-center text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            privacy@osqr.app
          </a>
        </div>
      </div>
    </div>
  )
}

// Component: Commitment Card
function CommitmentCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start space-x-4 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
    </div>
  )
}

// Component: Tier Card
function TierCard({
  tier,
  name,
  features,
  isDefault = false
}: {
  tier: string
  name: string
  features: string[]
  isDefault?: boolean
}) {
  return (
    <div className={`rounded-xl border p-6 ${
      isDefault
        ? 'border-emerald-500/50 bg-emerald-500/5'
        : 'border-slate-700 bg-slate-800/30'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
            isDefault
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}>
            {tier}
          </span>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
        </div>
        {isDefault && (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            Default
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start text-slate-400">
            <Check className="h-4 w-4 text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Component: Data Row
function DataRow({ type, storage }: { type: string; storage: string }) {
  return (
    <tr className="hover:bg-slate-800/30">
      <td className="px-6 py-4 text-sm font-medium text-white">{type}</td>
      <td className="px-6 py-4 text-sm text-slate-400">{storage}</td>
    </tr>
  )
}

// Component: Security Card
function SecurityCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
      <div className="flex items-center space-x-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
          {icon}
        </div>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}
