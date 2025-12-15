'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useFocusMode } from './FocusModeContext'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function FocusModeToggle() {
  const { focusMode, toggleFocusMode } = useFocusMode()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFocusMode}
            className={`rounded-full transition-all duration-300 ${
              focusMode
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 hover:bg-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {focusMode ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
          <p className="text-sm">
            {focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          </p>
          <p className="text-xs text-slate-400">
            {focusMode ? 'Show side panels' : 'Hide distractions'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
