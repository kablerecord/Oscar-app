'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Beaker, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const LAB_PROMPT_STORAGE_KEY = 'osqr_lab_prompt_dismissed'
const LAB_PROMPTS_DISABLED_KEY = 'osqr_lab_prompts_disabled'
const LAB_PROMPT_CHAT_THRESHOLD = 5

export function LabPrompt() {
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if prompts are globally disabled
    const promptsDisabled = localStorage.getItem(LAB_PROMPTS_DISABLED_KEY) === 'true'
    if (promptsDisabled) return

    // Check if already dismissed
    const dismissed = localStorage.getItem(LAB_PROMPT_STORAGE_KEY)
    if (dismissed) return

    const checkEligibility = async () => {
      try {
        // Check chat count from stats
        const statsResponse = await fetch('/api/settings/stats')
        if (!statsResponse.ok) return

        const stats = await statsResponse.json()
        if (stats.totalQuestions < LAB_PROMPT_CHAT_THRESHOLD) return

        // Check if already a lab member
        const memberResponse = await fetch('/api/lab/member')
        if (memberResponse.ok) return // Already a member

        if (memberResponse.status === 404) {
          setShow(true)
        }
      } catch {
        // Silently fail
      }
    }

    // Delay check to not slow down initial load
    const timer = setTimeout(checkEligibility, 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(LAB_PROMPT_STORAGE_KEY, 'true')
    setShow(false)
  }

  const handleJoin = () => {
    router.push('/lab')
    handleDismiss()
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border border-blue-700/50 rounded-lg p-4 shadow-xl max-w-sm">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
            <Beaker className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="font-medium text-white text-sm mb-1">
              Help shape Oscar
            </h3>
            <p className="text-xs text-gray-300 mb-3">
              Join Oscar Lab to share feedback and earn rewards. Your insights directly influence what we build.
            </p>
            <Button
              onClick={handleJoin}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
            >
              Join the Lab
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
