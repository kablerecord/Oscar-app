'use client'

/**
 * Typing Indicator Component
 *
 * Shows animated dots while OSQR is processing a response.
 * Styled like an OSQR message bubble.
 */
export function MobileTypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
