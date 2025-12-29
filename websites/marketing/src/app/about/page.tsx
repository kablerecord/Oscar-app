import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About - OSQR',
  description: 'Learn about OSQR and the vision behind the AI operating system for capability.',
}

export default function AboutPage() {
  return (
    <div className="pt-32 pb-20 bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            About OSQR
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            The Story Behind OSQR
          </h1>
        </div>

        {/* Content */}
        <div className="prose prose-lg prose-invert max-w-none">
          {/* Mission */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">01</span>
              The Problem
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300 mb-4">
                Everyone has access to AI now — ChatGPT, Claude, Gemini. But most people use them like upgraded search engines:
              </p>
              <p className="text-slate-400 italic mb-4 pl-4 border-l-2 border-slate-600">
                Type a question. Get an answer. Forget it ever happened.
              </p>
              <p className="text-slate-300 mb-4">
                The real issue isn&apos;t the AI. It&apos;s the thinking behind the question.
              </p>
              <ul className="space-y-2 text-slate-400 mb-6">
                <li>• Vague questions → vague answers</li>
                <li>• No memory → no momentum</li>
                <li>• No context → no clarity</li>
                <li>• Every session starts from zero</li>
                <li>• Nothing compounds</li>
              </ul>
              <p className="text-white text-lg font-semibold">
                You don&apos;t get smarter. You don&apos;t build capability. You just spin.
              </p>
              <p className="text-slate-300 mt-4">
                OSQR exists to break that cycle.
              </p>
            </div>
          </section>

          {/* Vision */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">02</span>
              The Vision
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300 mb-4">
                OSQR is built on a simple premise:
              </p>
              <blockquote className="border-l-4 border-blue-500 pl-6 my-6">
                <p className="text-white text-2xl font-bold">
                  &quot;The quality of your questions determines the quality of your life.&quot;
                </p>
              </blockquote>
              <p className="text-slate-300 mb-6">
                OSQR isn&apos;t a chatbot. It&apos;s an <strong className="text-white">Operating System for Capability</strong> — your personal thinking engine that helps you:
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  <span><strong className="text-white">Ask sharper questions</strong> with Refine → Fire</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  <span><strong className="text-white">Pull insights from multiple AI models</strong> — Claude, GPT-4, Gemini, Grok — not just one</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  <span><strong className="text-white">Build a private knowledge vault</strong> that grows with you and remembers your context</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  <span><strong className="text-white">Track your growth</strong> on the Capability Ladder from 0 to 12</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  <span><strong className="text-white">Turn thinking into a system</strong>, not a guess</span>
                </li>
              </ul>
              <p className="text-slate-400 mt-6 text-sm">
                This is how you create momentum that compounds for years.
              </p>
            </div>
          </section>

          {/* Philosophy */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">03</span>
              The Philosophy
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300 mb-6">
                OSQR is rooted in a simple progression:
              </p>
              <div className="flex items-center justify-center mb-6 text-lg">
                <span className="text-blue-400 font-bold">Identity</span>
                <span className="text-slate-500 mx-3">→</span>
                <span className="text-blue-400 font-bold">Capability</span>
                <span className="text-slate-500 mx-3">→</span>
                <span className="text-blue-400 font-bold">Output</span>
                <span className="text-slate-500 mx-3">→</span>
                <span className="text-blue-400 font-bold">Legacy</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Identity</h4>
                  <p className="text-sm text-slate-400">Who you believe you are — the foundation of every action</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Capability</h4>
                  <p className="text-sm text-slate-400">What you can consistently do — not by luck, but by design</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Output</h4>
                  <p className="text-sm text-slate-400">The work you produce and the decisions you make</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Legacy</h4>
                  <p className="text-sm text-slate-400">What remains after you — the structures that keep giving</p>
                </div>
              </div>
              <p className="text-slate-300 mt-6">
                OSQR&apos;s role is to help you upgrade the first three so you can eventually build the fourth.
              </p>
            </div>
          </section>

          {/* Builder */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">04</span>
              The Builder
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex-shrink-0">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                    KR
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Kable Record</h3>
                  <p className="text-blue-400 text-sm mb-4">Creator of OSQR</p>
                  <p className="text-slate-300 mb-4">
                    I built OSQR because I got tired of AI that forgets everything about you the moment you close a tab.
                  </p>
                  <p className="text-slate-300 mb-4">
                    Your ideas matter. Your context matters. Your goals, habits, and patterns matter.
                  </p>
                  <p className="text-white font-medium mb-4">
                    You deserve an AI that grows with you — one that remembers, adapts, and strengthens your capability every day.
                  </p>
                  <p className="text-slate-400 text-sm">
                    That&apos;s why OSQR exists.
                  </p>
                  <div className="mt-6">
                    <a
                      href="https://kablerecord.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      kablerecord.com →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Ready to Think Better?
              </h3>
              <p className="text-blue-100 mb-6">
                Experience OSQR for yourself. 90-day money-back guarantee.
              </p>
              <a
                href="https://app.osqr.app/signup"
                className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                Get Started
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
