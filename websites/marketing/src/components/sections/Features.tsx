import Link from 'next/link'

const features = [
  {
    icon: '⚡',
    title: 'Multi-Model Intelligence Engine',
    description: "OSQR doesn't rely on one AI. It routes your question through a curated panel of models (Claude, GPT-4, Gemini, Grok, and more), compares their answers, and synthesizes the best response.",
    highlight: 'Many brains. One clear answer.',
  },
  {
    icon: '🎛',
    title: 'Three Thinking Modes',
    description: 'Quick for fast answers. Thoughtful for deeper analysis. Contemplate for complex, high-stakes decisions. You choose how deep OSQR should think.',
    highlight: 'Match your thinking to the moment',
  },
  {
    icon: '🎯',
    title: 'Refine → Fire',
    description: 'Most people ask vague questions and get vague answers. OSQR helps you sharpen the question first, then fires it to the AI panel for a serious response.',
    highlight: 'Better questions = Better answers',
  },
  {
    icon: '📚',
    title: 'Personal Knowledge Vault',
    description: 'Upload your docs, notes, exports, and files. OSQR turns them into your private second brain and uses them to answer questions in your language, with your context.',
    highlight: 'Your knowledge, upgraded and searchable',
    link: { href: '/privacy', text: 'See our privacy promise →' },
  },
  {
    icon: '🗂',
    title: 'Automatic Indexing of Everything',
    description: 'Every chat, upload, note, and profile answer is automatically indexed and searchable. The longer you use OSQR, the more it remembers—and the harder it is to outgrow.',
    highlight: 'Context that compounds over time',
  },
  {
    icon: '✅',
    title: 'Master Summary Checklist',
    description: 'Your goals, projects, ideas, and key insights captured in one living overview. OSQR surfaces what actually matters so you can focus on execution, not juggling mental tabs.',
    highlight: 'Goals • Projects • Patterns • Priorities',
  },
  {
    icon: '📈',
    title: 'Capability Ladder Personalization',
    description: 'OSQR models where you are on the 0–12 Capability Ladder and tunes its tone, prompts, and recommendations to match your current level—and pull you to the next one.',
    highlight: "An OS built around who you're becoming",
  },
  {
    icon: '🔒',
    title: 'Private by Design',
    description: 'Your data stays yours. Clear privacy tiers, no training on your content, and a "Burn It" button that wipes your vault, chats, and memories permanently when you say so.',
    highlight: 'Your vault. Your rules. One-click nuclear delete.',
    link: { href: '/privacy', text: 'Read our privacy policy →' },
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything You Need to Think Better
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            OSQR isn&apos;t just another AI chat. It&apos;s an operating system for capability — designed to make you smarter, faster, and more effective.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300"
            >
              {/* Icon */}
              <div className="text-4xl mb-4">{feature.icon}</div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-400 mb-3">
                {feature.description}
              </p>

              {/* Link (if present) */}
              {feature.link && (
                <Link
                  href={feature.link.href}
                  className="text-xs text-blue-400 hover:text-blue-300 mb-3 inline-block"
                >
                  {feature.link.text}
                </Link>
              )}

              {/* Highlight */}
              <span className="inline-block text-xs font-medium text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full mt-auto">
                {feature.highlight}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
