'use client'

import Link from 'next/link'
import { useState } from 'react'

// For local development, use localhost:3001. In production, use app.osqr.app
const APP_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : 'https://app.osqr.app'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
              <span className="text-lg font-bold text-white">O</span>
            </div>
            <span className="text-xl font-bold text-white">OSQR</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link href="/#features" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              About
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            <a
              href={`${APP_URL}/login`}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-blue-500/40"
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open menu</span>
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col space-y-4">
              <Link href="/#features" className="text-sm font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Features
              </Link>
              <Link href="/#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/about" className="text-sm font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                About
              </Link>
              <a
                href={`${APP_URL}/login`}
                className="text-sm font-medium text-slate-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </a>
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
