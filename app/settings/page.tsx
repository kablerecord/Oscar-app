'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, CreditCard, Settings2, Flame, Download, Loader2, Check } from 'lucide-react'

interface UserData {
  name: string
  email: string
  tier: string
  createdAt: string
}

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  // Burn It modal state
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [burnStep, setBurnStep] = useState<'initial' | 'confirm' | 'final' | 'burning' | 'done'>('initial')
  const [confirmText, setConfirmText] = useState('')

  // Export state
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch('/api/settings/user')
        if (res.ok) {
          const data = await res.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/settings/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `osqr-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleBurnIt = async () => {
    setBurnStep('burning')
    try {
      const res = await fetch('/api/settings/burn-it', {
        method: 'DELETE',
      })
      if (res.ok) {
        setBurnStep('done')
        // Redirect to home after 2 seconds
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        setBurnStep('initial')
        alert('Failed to delete data. Please try again.')
      }
    } catch (error) {
      console.error('Burn failed:', error)
      setBurnStep('initial')
      alert('Failed to delete data. Please try again.')
    }
  }

  const openBurnModal = () => {
    setShowBurnModal(true)
    setBurnStep('initial')
    setConfirmText('')
  }

  const closeBurnModal = () => {
    setShowBurnModal(false)
    setBurnStep('initial')
    setConfirmText('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-12 px-4">
      {/* Navigation */}
      <nav className="max-w-3xl mx-auto mb-8">
        <Link
          href="/panel"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to OSQR
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="mt-2 text-neutral-400">
            Manage your account, subscription, and preferences.
          </p>
        </div>

        {/* Account Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <User className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Account</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
              <p className="text-white">{userData?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
              <p className="text-white">{userData?.email || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Member since</label>
              <p className="text-white">
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Subscription</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Current Plan</label>
                <p className="text-white font-semibold">
                  OSQR {userData?.tier === 'master' ? 'Master' : userData?.tier === 'pro' ? 'Pro' : 'Free'}
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {userData?.tier === 'free' ? 'Upgrade' : 'Manage Plan'}
              </Link>
            </div>
            <p className="text-sm text-neutral-500">
              {userData?.tier === 'master'
                ? 'You have access to all OSQR features including priority processing and unlimited queries.'
                : userData?.tier === 'pro'
                ? 'You have access to multi-model AI and advanced features.'
                : 'Upgrade to unlock the full power of OSQR.'}
            </p>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Settings2 className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Theme</p>
                <p className="text-sm text-neutral-400">Currently using dark mode</p>
              </div>
              <div className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-sm">
                Dark
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Default Mode</p>
                <p className="text-sm text-neutral-400">Your preferred thinking depth</p>
              </div>
              <div className="px-3 py-1.5 bg-neutral-800 text-neutral-300 rounded-lg text-sm">
                Thoughtful
              </div>
            </div>
          </div>
        </section>

        {/* Data & Privacy Section */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Download className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Data & Privacy</h2>
          </div>

          <div className="space-y-6">
            {/* Export Data */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Export Your Data</p>
                <p className="text-sm text-neutral-400">Download all your data in JSON format</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Data
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-neutral-800" />

            {/* Burn It Section */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Flame className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400">Burn It</h3>
                  <p className="text-sm text-neutral-400">Permanently delete all your data</p>
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-200 mb-3">
                  <strong>Your data, your choice.</strong> We built OSQR on the belief that you should
                  have complete control over your information. The &quot;Burn It&quot; button is our promise
                  to you: with one action, you can permanently and irrevocably delete everything.
                </p>
                <p className="text-sm text-red-300/80">
                  This will delete:
                </p>
                <ul className="text-sm text-red-300/80 list-disc list-inside mt-2 space-y-1">
                  <li>All your conversations and chat history</li>
                  <li>Your Knowledge Vault documents and embeddings</li>
                  <li>Profile answers and preferences</li>
                  <li>Goals, projects, and MSC items</li>
                  <li>Your account and all associated data</li>
                </ul>
                <p className="text-sm text-red-400 font-semibold mt-3">
                  This action cannot be undone. There are no backups. When it&apos;s gone, it&apos;s gone forever.
                </p>
              </div>

              <button
                onClick={openBurnModal}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Flame className="h-5 w-5" />
                Burn It All
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Burn It Modal */}
      {showBurnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeBurnModal} />

          <div className="relative w-full max-w-md bg-neutral-900 border border-red-900/50 rounded-2xl p-6 shadow-xl">
            {burnStep === 'initial' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Flame className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Are you sure?</h3>
                </div>

                <p className="text-neutral-300 mb-6">
                  You&apos;re about to permanently delete all your data from OSQR. This includes
                  your conversations, documents, profile, and account. This action cannot be undone.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={closeBurnModal}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBurnStep('confirm')}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Yes, Continue
                  </button>
                </div>
              </>
            )}

            {burnStep === 'confirm' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Flame className="h-6 w-6 text-red-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Final Confirmation</h3>
                </div>

                <p className="text-neutral-300 mb-4">
                  This is your last chance to turn back. To confirm, type <strong className="text-red-400">BURN IT</strong> below:
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type BURN IT to confirm"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-6"
                />

                <div className="flex gap-3">
                  <button
                    onClick={closeBurnModal}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBurnIt}
                    disabled={confirmText !== 'BURN IT'}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Burn Everything
                  </button>
                </div>
              </>
            )}

            {burnStep === 'burning' && (
              <div className="text-center py-8">
                <div className="relative mx-auto w-16 h-16 mb-4">
                  <Flame className="h-16 w-16 text-red-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Burning...</h3>
                <p className="text-neutral-400">Deleting all your data permanently.</p>
              </div>
            )}

            {burnStep === 'done' && (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Done</h3>
                <p className="text-neutral-400">Your data has been permanently deleted. Redirecting...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
