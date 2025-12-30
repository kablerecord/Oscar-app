'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FeedbackCategory, ReactionType } from '@/lib/lab/types'

interface QuickReactionExpandedProps {
  reaction: ReactionType
  onSubmit: (category?: string, comment?: string) => void
  onCancel: () => void
}

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; description: string }[] = [
  {
    value: 'INTENT_UNDERSTANDING',
    label: 'Understanding',
    description: "Didn't get what I meant",
  },
  {
    value: 'RESPONSE_QUALITY',
    label: 'Quality',
    description: 'Response was lacking',
  },
  {
    value: 'MODE_CALIBRATION',
    label: 'Mode',
    description: 'Wrong depth/format',
  },
  {
    value: 'KNOWLEDGE_RETRIEVAL',
    label: 'Knowledge',
    description: "Didn't use my docs",
  },
  {
    value: 'PERSONALIZATION',
    label: 'Personal',
    description: "Didn't know me",
  },
  {
    value: 'CAPABILITY_GAP',
    label: 'Missing',
    description: "Can't do this yet",
  },
]

export function QuickReactionExpanded({
  reaction,
  onSubmit,
  onCancel,
}: QuickReactionExpandedProps) {
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await onSubmit(selectedCategory || undefined, comment || undefined)
    setIsSubmitting(false)
  }

  const isNegative = reaction === 'THUMBS_DOWN' || reaction === 'MISSED_SOMETHING'

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">
          {isNegative ? 'What went wrong?' : 'Add a note'}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isNegative && (
        <div className="grid grid-cols-3 gap-2">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedCategory(option.value)}
              className={`p-2 rounded-lg border text-left transition-colors ${
                selectedCategory === option.value
                  ? 'border-blue-500 bg-blue-900/30 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className="text-xs font-medium">{option.label}</div>
              <div className="text-[10px] text-gray-500">{option.description}</div>
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={
          isNegative
            ? 'Optional: Tell us more about what happened...'
            : 'What did you like? Any suggestions?'
        }
        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 min-h-[60px] text-sm"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-700"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || (isNegative && !selectedCategory && !comment)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </div>
  )
}
