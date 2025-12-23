import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - OSQR',
  description: 'Terms of Service for OSQR - Your AI Operating System for Capability.',
}

export default function TermsPage() {
  return (
    <div className="pt-32 pb-20 bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            Legal
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-400">
            Last updated: December 2024
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg prose-invert max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300">
                Welcome to OSQR. By using our service, you agree to these Terms of Service. Please read them carefully before using our AI operating system.
              </p>
            </div>
          </section>

          {/* Acceptance */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">01</span>
              Acceptance of Terms
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300">
                By accessing or using OSQR, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our service.
              </p>
            </div>
          </section>

          {/* Description of Service */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">02</span>
              Description of Service
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <p className="text-slate-300">
                OSQR is an AI operating system designed to help you think better, make decisions faster, and build lasting capability. Our service includes:
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Multi-model AI assistance (Claude, GPT-4, Gemini, Grok, and more)
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Personal Knowledge Vault for document storage and retrieval
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Refine → Fire question enhancement system
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Capability assessment and development tracking
                </li>
              </ul>
            </div>
          </section>

          {/* User Accounts */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">03</span>
              User Accounts
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <p className="text-slate-300">When you create an account, you agree to:</p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Provide accurate, current, and complete information
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Maintain the security of your password and account
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Accept responsibility for all activities under your account
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Notify us immediately of any unauthorized use
                </li>
              </ul>
              <p className="text-slate-300 mt-4">
                You must be at least 18 years old to use OSQR.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">04</span>
              Acceptable Use
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <p className="text-slate-300">You agree NOT to use OSQR to:</p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Generate harmful, illegal, or offensive content
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Violate any laws or regulations
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Infringe on intellectual property rights
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Attempt to gain unauthorized access to our systems
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Interfere with or disrupt the service
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Resell or redistribute the service without permission
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">✗</span>
                  Use automated tools to scrape or abuse the service
                </li>
              </ul>
            </div>
          </section>

          {/* Content Ownership */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">05</span>
              Content Ownership
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Content</h3>
                <p className="text-slate-300">
                  You retain ownership of all content you upload to OSQR. By uploading content, you grant us a limited license to process, store, and retrieve your content solely for providing the service to you.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">AI-Generated Content</h3>
                <p className="text-slate-300">
                  Responses generated by OSQR are provided for your personal use. You may use AI-generated content in your work, but you are responsible for reviewing and verifying its accuracy.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Our Content</h3>
                <p className="text-slate-300">
                  OSQR&apos;s software, design, and branding remain our intellectual property. You may not copy, modify, or distribute our proprietary materials without permission.
                </p>
              </div>
            </div>
          </section>

          {/* Subscription & Payment */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">06</span>
              Subscription & Payment
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Subscriptions are billed monthly or annually as selected
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Payments are processed securely through Stripe
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Subscriptions auto-renew unless cancelled before the renewal date
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Refunds are provided within 7 days of purchase if you&apos;re unsatisfied
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">→</span>
                  Prices may change with 30 days notice
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">07</span>
              Disclaimers
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <p className="text-slate-300">
                OSQR is provided &quot;as is&quot; without warranties of any kind. We do not guarantee:
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">!</span>
                  The accuracy or completeness of AI-generated responses
                </li>
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">!</span>
                  Uninterrupted or error-free service
                </li>
                <li className="flex items-start">
                  <span className="text-amber-400 mr-2">!</span>
                  That the service will meet your specific requirements
                </li>
              </ul>
              <p className="text-slate-300 mt-4">
                AI responses should not be considered professional advice. Always verify important information and consult appropriate professionals for medical, legal, or financial decisions.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">08</span>
              Limitation of Liability
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300">
                To the maximum extent permitted by law, OSQR and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability shall not exceed the amount you paid for the service in the 12 months prior to the claim.
              </p>
            </div>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">09</span>
              Termination
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700 space-y-4">
              <p className="text-slate-300">
                You may cancel your account at any time. We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
              <p className="text-slate-300">
                Upon termination, your right to use the service ends immediately. We may delete your data after 30 days unless required to retain it for legal purposes.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">10</span>
              Changes to Terms
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300">
                We may update these Terms of Service from time to time. We will notify you of significant changes via email or through the service. Your continued use after changes constitutes acceptance of the new terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-blue-400 mr-3">11</span>
              Contact Us
            </h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
              <p className="text-slate-300 mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <ul className="space-y-2 text-slate-300">
                <li>
                  Email:{' '}
                  <a href="mailto:legal@osqr.app" className="text-blue-400 hover:text-blue-300">
                    legal@osqr.app
                  </a>
                </li>
                <li>
                  General inquiries:{' '}
                  <a href="mailto:info@osqr.app" className="text-blue-400 hover:text-blue-300">
                    info@osqr.app
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* Governing Law */}
          <section>
            <div className="bg-blue-900/30 rounded-2xl p-8 border border-blue-700/50">
              <h3 className="text-lg font-semibold text-white mb-2">Governing Law</h3>
              <p className="text-slate-300">
                These Terms of Service shall be governed by and construed in accordance with the laws of the United States. Any disputes shall be resolved in the appropriate courts of that jurisdiction.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
