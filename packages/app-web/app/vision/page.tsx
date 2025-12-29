import { Metadata } from 'next'
import {
  Sparkles,
  ArrowLeft,
  Brain,
  Layers,
  Clock,
  Zap,
  Users,
  Lightbulb,
  Target,
  Infinity
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'The Vision - OSQR',
  description: 'OSQR is a compounding intelligence system. The longer you use it, the more valuable it becomes.',
}

export default function VisionPage() {
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
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            The Vision
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            OSQR is not a ChatGPT wrapper. It&apos;s a compounding intelligence system where value increases the longer you use it.
          </p>
        </div>

        {/* The Core Thesis */}
        <div className="mb-16 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-8">
          <h2 className="text-2xl font-bold text-white mb-4">The Core Thesis</h2>
          <p className="text-slate-300 text-lg mb-4">
            The moat isn&apos;t the AI. It&apos;s the accumulated context, the temporal layer, the indexed vault, the learned preferences.
          </p>
          <p className="text-amber-400 font-semibold">
            Every day you spend with OSQR makes OSQR more valuable to you—and harder to leave.
          </p>
        </div>

        {/* The One Voice Principle */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 text-sm">
              <Brain className="h-4 w-4" />
            </span>
            The One Voice Principle
          </h2>

          <p className="text-slate-300 mb-6">
            OSQR consults multiple AI models—Claude, GPT-4o, Gemini, Grok—but delivers one coherent voice.
          </p>

          <div className="rounded-xl border border-slate-700 overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Who</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">What They Do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm font-medium text-amber-400">Witnesses</td>
                  <td className="px-6 py-4 text-sm text-slate-300">Claude, GPT-4o, Gemini, Grok</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Provide perspectives, analysis, options</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm font-medium text-amber-400">Judge</td>
                  <td className="px-6 py-4 text-sm text-slate-300">OSQR</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Synthesizes witnesses into coherent guidance</td>
                </tr>
                <tr className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm font-medium text-amber-400">Owner</td>
                  <td className="px-6 py-4 text-sm text-slate-300">You</td>
                  <td className="px-6 py-4 text-sm text-slate-400">Makes the decision, lives with the outcome</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <p className="text-white font-semibold mb-2">The Anti-Pattern:</p>
            <p className="text-slate-400 mb-4">Showing you 4 different answers and making you pick. That&apos;s not intelligence—that&apos;s abdication.</p>
            <p className="text-white font-semibold mb-2">The OSQR Pattern:</p>
            <p className="text-slate-400">OSQR has an opinion. It&apos;s informed by multiple perspectives. You can dig into the reasoning, but you don&apos;t have to.</p>
          </div>
        </div>

        {/* The Stack Effect */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 text-sm">
              <Layers className="h-4 w-4" />
            </span>
            The Stack Effect
          </h2>

          <p className="text-slate-300 mb-6">
            Each capability multiplies the others. No single feature is the moat. The integration is.
          </p>

          <div className="grid gap-4 mb-6">
            <StackItem
              formula="Vault + Time"
              result="&quot;You mentioned X three weeks ago, it's relevant now&quot;"
            />
            <StackItem
              formula="Panel + Render"
              result="&quot;Here's what each model suggested, visualized&quot;"
            />
            <StackItem
              formula="Profile + Routing"
              result="Automatically choose the right depth based on learned preferences"
            />
            <StackItem
              formula="Secretary + Time"
              result="&quot;You committed to Y, deadline is approaching&quot;"
            />
          </div>

          <p className="text-amber-400 font-semibold text-center">
            Copying one feature gives you 10% of the value. The stack is the moat.
          </p>
        </div>

        {/* How Value Compounds */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 text-sm">
              <Clock className="h-4 w-4" />
            </span>
            How Value Compounds
          </h2>

          <div className="space-y-4">
            <TimelineItem
              time="Day 1"
              description="OSQR is a better ChatGPT (multi-model, nice UI)"
            />
            <TimelineItem
              time="Week 1"
              description="OSQR knows your projects and remembers context"
            />
            <TimelineItem
              time="Month 1"
              description="OSQR surfaces relevant history automatically, routes intelligently"
            />
            <TimelineItem
              time="Month 3"
              description="OSQR anticipates needs, tracks commitments, learns preferences"
            />
            <TimelineItem
              time="Month 6"
              description="OSQR is your externalized thinking layer—the stuff you'd forget lives in the vault"
              highlight
            />
          </div>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-800/30 p-6">
            <p className="text-slate-300">
              Each day adds data. Each interaction trains the profile. Each commitment tracked builds trust.
            </p>
            <p className="text-white font-semibold mt-4">
              The switching cost isn&apos;t contractual—it&apos;s cognitive.
            </p>
          </div>
        </div>

        {/* What OSQR Becomes */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 text-sm">
              <Target className="h-4 w-4" />
            </span>
            What OSQR Becomes
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <CapabilityCard
              icon={<Brain className="h-5 w-5" />}
              title="Personal Knowledge Vault"
              description="Your second brain, actually queryable. Documents, conversations, insights—all connected."
            />
            <CapabilityCard
              icon={<Clock className="h-5 w-5" />}
              title="Temporal Intelligence"
              description="Time-aware thinking. Commitments tracked, deadlines surfaced, context evolves."
            />
            <CapabilityCard
              icon={<Lightbulb className="h-5 w-5" />}
              title="Proactive Secretary"
              description="OSQR surfaces what matters before you ask. Anticipation, not just reaction."
            />
            <CapabilityCard
              icon={<Zap className="h-5 w-5" />}
              title="Execution Surfaces"
              description="Intelligence that produces—images, charts, artifacts. Thinking made tangible."
            />
            <CapabilityCard
              icon={<Users className="h-5 w-5" />}
              title="Creator Plugins"
              description="Borrow expert judgment on demand. Frameworks from people you trust."
            />
            <CapabilityCard
              icon={<Infinity className="h-5 w-5" />}
              title="Interface Agnostic"
              description="Web, VS Code, mobile, voice—same brain, different windows."
            />
          </div>
        </div>

        {/* The Multiplier Principle */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 text-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            The Multiplier Principle
          </h2>

          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700 p-8">
            <p className="text-xl text-white font-semibold mb-4">
              OSQR multiplies people at whatever level they are currently operating.
            </p>
            <div className="space-y-3 text-slate-300">
              <p>• A beginner gains confidence and direction</p>
              <p>• An expert gains synthesis and scale</p>
              <p>• A builder gains speed and leverage</p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400">
                OSQR does not assume everyone starts at the same level.
                OSQR does not pretend everyone will reach the same ceiling.
              </p>
              <p className="text-amber-400 font-semibold mt-4">
                OSQR meets people where they are and helps them move forward.
              </p>
            </div>
          </div>
        </div>

        {/* The Long Arc */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">The Long Arc</h2>

          <p className="text-slate-300 mb-6">
            OSQR isn&apos;t an app company. It&apos;s an intelligence utility—like electricity or internet, but for cognitive augmentation.
          </p>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <p className="text-white font-semibold mb-4">
              Users subscribe to a relationship with an intelligence that knows them and improves over time.
            </p>
            <p className="text-slate-400">
              The various surfaces—web, VS Code, mobile, eventually hardware—are containers for that relationship. The brain stays consistent. The windows multiply.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-slate-400">
            This is what we&apos;re building. Not a chatbot. A thinking partner that compounds.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/manifesto"
              className="inline-flex items-center text-amber-400 hover:text-amber-300 font-semibold"
            >
              Read the Manifesto →
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-8">
            If you found this page, you&apos;re paying attention. Welcome.
          </p>
        </div>
      </div>
    </div>
  )
}

// Component: Stack Item
function StackItem({ formula, result }: { formula: string; result: string }) {
  return (
    <div className="flex items-center space-x-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4">
      <span className="font-mono text-amber-400 whitespace-nowrap">{formula}</span>
      <span className="text-slate-600">=</span>
      <span className="text-slate-300">{result}</span>
    </div>
  )
}

// Component: Timeline Item
function TimelineItem({ time, description, highlight }: { time: string; description: string; highlight?: boolean }) {
  return (
    <div className={`flex items-start space-x-4 rounded-xl border p-4 ${
      highlight
        ? 'border-amber-500/30 bg-amber-500/5'
        : 'border-slate-700 bg-slate-800/30'
    }`}>
      <span className={`font-semibold whitespace-nowrap ${highlight ? 'text-amber-400' : 'text-slate-400'}`}>
        {time}
      </span>
      <span className={highlight ? 'text-white' : 'text-slate-300'}>{description}</span>
    </div>
  )
}

// Component: Capability Card
function CapabilityCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-5">
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-amber-400">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  )
}
