'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, X, Copy, MessageSquareQuote, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Testimonial {
  id: string
  userId: string
  content: string
  displayName: string | null
  role: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

interface TestimonialData {
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  pending: Testimonial[]
  approved: Testimonial[]
  rejected: Testimonial[]
}

export default function AdminTestimonialsPage() {
  const [data, setData] = useState<TestimonialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/testimonials')
      if (!res.ok) {
        throw new Error('Failed to fetch testimonials')
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(testimonialId: string, status: 'APPROVED' | 'REJECTED') {
    setUpdating(testimonialId)
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonialId, status }),
      })
      if (res.ok) {
        await fetchData()
      }
    } catch (err) {
      console.error('Failed to update testimonial:', err)
    } finally {
      setUpdating(null)
    }
  }

  function copyToClipboard(testimonial: Testimonial) {
    const text = `"${testimonial.content}"${
      testimonial.displayName || testimonial.role
        ? `\n— ${testimonial.displayName || 'Anonymous'}${testimonial.role ? `, ${testimonial.role}` : ''}`
        : ''
    }`
    navigator.clipboard.writeText(text)
    setCopied(testimonial.id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-900 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Testimonials</h1>
        <p className="text-gray-400 mt-1">Review and manage user testimonials for the website</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <MessageSquareQuote className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{data.summary.total}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{data.summary.pending}</p>
              <p className="text-sm text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{data.summary.approved}</p>
              <p className="text-sm text-gray-400">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{data.summary.rejected}</p>
              <p className="text-sm text-gray-400">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Testimonials */}
      {data.pending.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Pending Review ({data.pending.length})
          </h2>
          <div className="space-y-4">
            {data.pending.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-gray-800 border border-amber-900/50 rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-lg italic mb-3">
                      &quot;{testimonial.content}&quot;
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        {testimonial.displayName || 'Anonymous'}
                        {testimonial.role && `, ${testimonial.role}`}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>{testimonial.user?.email || 'Unknown user'}</span>
                      <span className="text-gray-600">•</span>
                      <span>
                        {new Date(testimonial.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(testimonial.id, 'APPROVED')}
                      disabled={updating === testimonial.id}
                      className="p-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      title="Approve"
                    >
                      {updating === testimonial.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => updateStatus(testimonial.id, 'REJECTED')}
                      disabled={updating === testimonial.id}
                      className="p-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      title="Reject"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Testimonials */}
      {data.approved.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Approved ({data.approved.length})
          </h2>
          <div className="space-y-4">
            {data.approved.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-gray-800 border border-green-900/50 rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-lg italic mb-3">
                      &quot;{testimonial.content}&quot;
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>
                        {testimonial.displayName || 'Anonymous'}
                        {testimonial.role && `, ${testimonial.role}`}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>{testimonial.user?.email || 'Unknown user'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyToClipboard(testimonial)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      title="Copy for website"
                    >
                      {copied === testimonial.id ? (
                        <>
                          <Check className="h-5 w-5 text-green-400" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => updateStatus(testimonial.id, 'REJECTED')}
                      disabled={updating === testimonial.id}
                      className="p-2 bg-gray-700 hover:bg-red-600 disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-colors"
                      title="Reject"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Testimonials (collapsed by default) */}
      {data.rejected.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-lg font-semibold text-white mb-4 flex items-center gap-2 list-none">
            <XCircle className="h-5 w-5 text-red-400" />
            Rejected ({data.rejected.length})
            <span className="text-sm text-gray-500 ml-2">Click to expand</span>
          </summary>
          <div className="space-y-4 mt-4">
            {data.rejected.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 opacity-60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-lg italic mb-3">
                      &quot;{testimonial.content}&quot;
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {testimonial.displayName || 'Anonymous'}
                        {testimonial.role && `, ${testimonial.role}`}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span>{testimonial.user?.email || 'Unknown user'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => updateStatus(testimonial.id, 'APPROVED')}
                    disabled={updating === testimonial.id}
                    className="p-2 bg-gray-700 hover:bg-green-600 disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
                    title="Re-approve"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Empty State */}
      {data.summary.total === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquareQuote className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No testimonials yet</h3>
          <p className="text-gray-400">
            Testimonials submitted by users will appear here for review.
          </p>
        </div>
      )}
    </div>
  )
}
