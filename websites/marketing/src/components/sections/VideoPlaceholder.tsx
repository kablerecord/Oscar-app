export function VideoPlaceholder() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See OSQR in Action
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Watch how OSQR transforms the way you think, decide, and build.
          </p>
        </div>

        {/* Video placeholder */}
        <div className="relative mx-auto max-w-4xl aspect-video rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden group">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />

          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Mock OSQR Interface Preview */}
          <div className="absolute inset-6 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 overflow-hidden">
            {/* Window controls */}
            <div className="flex items-center space-x-2 px-4 py-3 border-b border-slate-700/50 bg-slate-900/50">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-4 text-xs text-slate-500">OSQR Panel</span>
            </div>

            {/* Mock content */}
            <div className="p-4 space-y-4">
              {/* Mode selector mockup */}
              <div className="flex space-x-2">
                <div className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400">Quick</div>
                <div className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs text-white">Thoughtful</div>
                <div className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400">Contemplate</div>
              </div>

              {/* Chat mockup */}
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="bg-blue-600 rounded-lg px-4 py-2 max-w-xs">
                    <div className="h-3 w-40 bg-blue-400/50 rounded" />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-lg px-4 py-3 max-w-sm space-y-2">
                    <div className="h-3 w-full bg-slate-600 rounded" />
                    <div className="h-3 w-3/4 bg-slate-600 rounded" />
                    <div className="h-3 w-1/2 bg-slate-600 rounded" />
                  </div>
                </div>
              </div>

              {/* Input mockup */}
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex-1 h-10 bg-slate-800 rounded-lg border border-slate-700" />
                <div className="h-10 w-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">Fire</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
            {/* Coming soon badge */}
            <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm text-blue-300 mb-4">
              <span className="mr-2 h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Demo video launching soon
            </span>

            {/* CTA */}
            <p className="text-slate-400 text-sm max-w-md text-center mb-4">
              Experience OSQR for yourself. Start your free trial today.
            </p>

            <a
              href="https://app.osqr.app/signup"
              className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
