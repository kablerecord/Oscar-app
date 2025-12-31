'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ColdOpenOnboardingProps {
  onComplete: (data: { name: string; workingOn: string }) => void
}

type Screen = 'meet' | 'context'

/**
 * Cold Open Onboarding
 *
 * A fast, professional introduction to OSQR. Under 60 seconds to first interaction.
 *
 * Philosophy:
 * - Get them into the action fast
 * - OSQR introduces himself, establishes his identity
 * - Minimal friction - just name and what they're working on
 * - Professional but warm - not a "kids" bubble
 * - Then get out of the way and let contextual tips take over
 */
export function ColdOpenOnboarding({ onComplete }: ColdOpenOnboardingProps) {
  const [screen, setScreen] = useState<Screen>('meet')
  const [name, setName] = useState('')
  const [workingOn, setWorkingOn] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  // Blinking cursor effect for typed text
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Typing animation for OSQR's message
  const [displayedText, setDisplayedText] = useState('')
  const fullText = "Hi. I'm OSQR. I can be with you everywhere — on your phone, your computer, even in a robot someday. Same me. Always knowing where we left off and ready to continue working."

  useEffect(() => {
    if (screen === 'meet' && displayedText.length < fullText.length) {
      setIsTyping(true)
      const timeout = setTimeout(() => {
        setDisplayedText(fullText.slice(0, displayedText.length + 1))
      }, 25) // Fast but readable typing speed
      return () => clearTimeout(timeout)
    } else if (displayedText.length >= fullText.length) {
      setIsTyping(false)
    }
  }, [screen, displayedText, fullText])

  const handleContinue = () => {
    if (screen === 'meet') {
      setScreen('context')
    } else if (screen === 'context' && name.trim()) {
      onComplete({ name: name.trim(), workingOn: workingOn.trim() })
    }
  }

  const canProceed = screen === 'meet'
    ? !isTyping
    : name.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <AnimatePresence mode="wait">
          {screen === 'meet' && (
            <motion.div
              key="meet"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* OSQR Bubble */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                className="mx-auto mb-8"
              >
                <div className="relative mx-auto h-20 w-20">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl" />
                  {/* Main bubble */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30">
                    {/* Inner pulse */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-400/30 to-transparent" />
                    {/* OSQR text mark */}
                    <span className="text-2xl font-bold text-white tracking-tight">O</span>
                  </div>
                  {/* Subtle breathing animation */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-purple-400/30"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>

              {/* Typed message */}
              <div className="mb-8 min-h-[120px]">
                <p className="text-lg leading-relaxed text-slate-300">
                  {displayedText}
                  {isTyping && (
                    <span className={`ml-0.5 inline-block w-0.5 h-5 bg-purple-400 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
                  )}
                </p>
              </div>

              {/* Continue button - appears after typing */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: canProceed ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={handleContinue}
                  disabled={!canProceed}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  Let's go
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {screen === 'context' && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* OSQR smaller bubble */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="mx-auto mb-6"
              >
                <div className="relative mx-auto h-12 w-12">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-lg" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/20">
                    <span className="text-lg font-bold text-white">O</span>
                  </div>
                </div>
              </motion.div>

              {/* Questions */}
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="mb-2 block text-sm font-medium text-slate-400">
                    What should I call you?
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canProceed) {
                        handleContinue()
                      }
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="mb-2 block text-sm font-medium text-slate-400">
                    In a sentence — what are you working on right now?
                    <span className="ml-1 text-slate-500">(optional)</span>
                  </label>
                  <Textarea
                    value={workingOn}
                    onChange={(e) => setWorkingOn(e.target.value)}
                    placeholder="A project, a goal, something you're figuring out..."
                    rows={2}
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && canProceed) {
                        e.preventDefault()
                        handleContinue()
                      }
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="pt-2"
                >
                  <Button
                    onClick={handleContinue}
                    disabled={!canProceed}
                    size="lg"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
