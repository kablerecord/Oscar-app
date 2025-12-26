import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <span className="text-lg font-bold text-white">O</span>
              </div>
              <span className="text-xl font-bold text-white">OSQR</span>
            </Link>
            <p className="text-slate-400 text-sm max-w-md">
              The AI operating system for capability and execution. Don&apos;t just ask questions. Ask the right ones.
            </p>
            <p className="text-slate-500 text-xs mt-4">
              Built by <a href="https://kablerecord.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Kable Record</a>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              Also: <a href="https://fourthgenformula.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Fourth Generation Formula</a>
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-slate-400 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:info@osqr.app" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} OSQR. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
