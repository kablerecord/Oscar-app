export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Refine Your Question',
      description: 'Type your question. OSQR analyzes it and asks clarifying questions to sharpen your thinking. Most people skip this — that\'s why they get mediocre answers.',
      visual: (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-2">Your question:</div>
          <div className="text-white mb-4">&quot;How do I grow my business?&quot;</div>
          <div className="border-t border-slate-700 pt-4">
            <div className="text-sm text-blue-400 mb-2">OSQR asks:</div>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• What&apos;s your current revenue/stage?</li>
              <li>• What does &quot;grow&quot; mean to you?</li>
              <li>• What&apos;s your timeline?</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      number: '02',
      title: 'Fire to the Panel',
      description: 'Your refined question goes to a panel of AI models. Each brings a different perspective — strategic, technical, creative, practical.',
      visual: (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-blue-400 mb-1">Claude</div>
            <div className="text-xs text-slate-400">Strategic thinking</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-green-400 mb-1">GPT-4</div>
            <div className="text-xs text-slate-400">Technical depth</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-purple-400 mb-1">Gemini</div>
            <div className="text-xs text-slate-400">Research & facts</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="text-xs text-amber-400 mb-1">Grok + more</div>
            <div className="text-xs text-slate-400">Fresh perspectives</div>
          </div>
        </div>
      ),
    },
    {
      number: '03',
      title: 'Get Synthesized Insights',
      description: 'OSQR synthesizes the best from each model into one clear, actionable answer. Grounded in your knowledge vault and personalized to your context.',
      visual: (
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/30">
          <div className="text-sm text-blue-400 mb-2 font-medium">OSQR Synthesis</div>
          <div className="text-sm text-slate-300">
            &quot;Based on your stage and goals, here are 3 specific actions ranked by impact/effort...&quot;
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs text-slate-500">
            <span className="flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 mr-1"></span>
              Personalized
            </span>
            <span className="flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-1"></span>
              Context-aware
            </span>
          </div>
        </div>
      ),
    },
  ]

  return (
    <section id="how-it-works" className="py-20 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Refine → Fire → Synthesize
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            The magic isn&apos;t in getting AI to answer. It&apos;s in asking the right question. OSQR teaches you to think better before you fire.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-transparent -translate-x-8 z-0" />
              )}

              <div className="relative bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-blue-500/30 transition-colors">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-lg mb-6">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-6">
                  {step.description}
                </p>

                {/* Visual */}
                {step.visual}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-4">
            Ready to upgrade how you think?
          </p>
          <a
            href="https://app.osqr.app/signup"
            className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-blue-500/40"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}
