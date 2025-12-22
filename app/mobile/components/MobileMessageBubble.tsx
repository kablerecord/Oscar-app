'use client'

import { cn } from '@/lib/utils'

export interface Message {
  id: string
  role: 'user' | 'osqr'
  content: string
  timestamp?: Date
}

interface MobileMessageBubbleProps {
  message: Message
  isLastInGroup?: boolean
}

/**
 * Message Bubble Component
 *
 * Displays a single message in the thread.
 * - User messages: right-aligned, purple background
 * - OSQR messages: left-aligned, gray background
 */
export function MobileMessageBubble({ message, isLastInGroup = true }: MobileMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        isLastInGroup ? 'mb-2' : 'mb-1'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 rounded-2xl text-base leading-relaxed',
          isUser
            ? 'bg-purple-500 text-white rounded-br-md'
            : 'bg-slate-800 text-slate-100 rounded-bl-md'
        )}
      >
        {/* Render message content with line breaks */}
        {message.content.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  )
}
