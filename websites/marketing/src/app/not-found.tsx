import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* 404 Number */}
        <div className="relative">
          <span className="text-[150px] sm:text-[200px] font-bold text-slate-800 leading-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl sm:text-8xl">🔍</div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-4">
          Page Not Found
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Looks like this page got lost in the knowledge vault. Let&apos;s get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/#features"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-6 py-3 text-base font-semibold text-white hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Explore Features
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm mb-4">Or try one of these pages:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/about" className="text-blue-400 hover:text-blue-300">
              About
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/pricing" className="text-blue-400 hover:text-blue-300">
              Pricing
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
              Privacy
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/terms" className="text-blue-400 hover:text-blue-300">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
