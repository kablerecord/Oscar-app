'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { MobileHeader } from '../components/MobileHeader'
import { MobileMenu } from '../components/MobileMenu'
import { MobileMessageBubble, type Message } from '../components/MobileMessageBubble'
import { MobileTypingIndicator } from '../components/MobileTypingIndicator'
import { MobileInputBar } from '../components/MobileInputBar'

/**
 * Mobile Thread Page
 *
 * Main conversation interface - the only screen users interact with regularly.
 * - Message thread (scrollable, newest at bottom)
 * - Text input with voice support
 * - Menu accessible via header logo tap
 */
export default function MobileThreadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationIdRef = useRef<string>(crypto.randomUUID())

  // Check auth
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/mobile/signin')
    }
  }, [session, status, router])

  // Fetch user's workspace ID
  useEffect(() => {
    if (!session) return

    const fetchWorkspace = async () => {
      try {
        const response = await fetch('/api/mobile/workspace')
        if (response.ok) {
          const data = await response.json()
          setWorkspaceId(data.workspaceId)
        } else if (response.status === 401) {
          router.replace('/mobile/signin')
        } else {
          setError('Unable to load your workspace. Please try again.')
        }
      } catch (err) {
        console.error('Error fetching workspace:', err)
        setError('Unable to connect. Please check your connection.')
      } finally {
        setIsLoadingWorkspace(false)
      }
    }

    fetchWorkspace()
  }, [session, router])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = useCallback(async (content: string, inputType: 'text' | 'voice') => {
    if (!content.trim() || isLoading || !isOnline || !workspaceId) return

    setError(null)

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))

      // Send to OSQR API (reuse existing endpoint with mobile flag)
      const response = await fetch('/api/oscar/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          workspaceId, // Use user's actual workspace ID
          conversationId: conversationIdRef.current,
          mode: 'quick', // Mobile uses quick mode by default
          useKnowledge: true,
          conversationHistory,
          // Optional: track input type for analytics
          metadata: {
            interface: 'mobile',
            inputType,
          },
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/mobile/signin')
          return
        }
        if (response.status === 403) {
          setError('Please subscribe at osqr.app to continue.')
          return
        }
        if (response.status === 429) {
          setError('Slow down! Give me a moment to think.')
          return
        }
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      // Add OSQR response
      const osqrMessage: Message = {
        id: crypto.randomUUID(),
        role: 'osqr',
        content: data.answer || data.response || data.content || 'I understand. What else would you like to discuss?',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, osqrMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Something went wrong. Please try again.')

      // Add error message from OSQR
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'osqr',
        content: 'I had trouble processing that. Could you try again?',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages, isLoading, isOnline, router, workspaceId])

  // Show loading while checking auth or fetching workspace
  if (status === 'loading' || !session || isLoadingWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse" />
      </div>
    )
  }

  // Show error if workspace couldn't be loaded
  if (!workspaceId && !isLoadingWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <p className="text-slate-300 mb-2">Unable to load your workspace</p>
        <p className="text-slate-500 text-sm mb-4">Please sign in again or try the web app</p>
        <button
          onClick={() => router.replace('/mobile/signin')}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm"
        >
          Sign in again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <MobileHeader onMenuOpen={() => setIsMenuOpen(true)} />

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-400">I need a connection to think</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center">
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          // Empty state
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="text-white text-lg font-bold">O</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Send a thought, ask a question, or just say hi.
            </p>
          </div>
        ) : (
          // Message list
          <>
            {messages.map((message, index) => {
              // Check if this is the last message from the same sender
              const nextMessage = messages[index + 1]
              const isLastInGroup = !nextMessage || nextMessage.role !== message.role

              return (
                <MobileMessageBubble
                  key={message.id}
                  message={message}
                  isLastInGroup={isLastInGroup}
                />
              )
            })}

            {/* Typing indicator */}
            {isLoading && <MobileTypingIndicator />}
          </>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <MobileInputBar
        onSend={sendMessage}
        disabled={!isOnline || !workspaceId}
        isLoading={isLoading}
      />

      {/* Menu */}
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  )
}
