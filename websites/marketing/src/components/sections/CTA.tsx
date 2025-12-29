'use client'

import { Button } from '@/components/ui/Button'

// For local development, use localhost:3001. In production, use custom domain
const APP_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : 'https://app.osqr.app'

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 to-blue-500 p-8 md:p-16 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Think Better?
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
              Experience the power of OSQR and transform how you work with AI. 90-day money-back guarantee.
            </p>

            {/* CTA Button */}
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center font-semibold rounded-lg px-6 py-3 text-base bg-white text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-lg"
            >
              Get Started
            </a>

            <p className="mt-4 text-sm text-blue-200">
              Join the builders sharpening their thinking with OSQR.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
