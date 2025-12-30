'use client'

import { Star } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { ChallengeQuestion as QuestionType } from '@/lib/lab/types'

interface ChallengeQuestionProps {
  question: QuestionType
  value: unknown
  onChange: (value: unknown) => void
}

export function ChallengeQuestion({
  question,
  value,
  onChange,
}: ChallengeQuestionProps) {
  switch (question.type) {
    case 'rating':
      return (
        <RatingQuestion
          question={question.question}
          required={question.required}
          value={value as number}
          onChange={onChange}
        />
      )
    case 'choice':
    case 'comparison':
      return (
        <ChoiceQuestion
          question={question.question}
          options={question.options || []}
          required={question.required}
          value={value as string}
          onChange={onChange}
        />
      )
    case 'text':
      return (
        <TextQuestion
          question={question.question}
          required={question.required}
          value={value as string}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}

function RatingQuestion({
  question,
  required,
  value,
  onChange,
}: {
  question: string
  required: boolean
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={`p-2 rounded-lg border transition-colors ${
              value === rating
                ? 'border-amber-500 bg-amber-900/30 text-amber-400'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Star
              className={`h-6 w-6 ${value >= rating ? 'fill-current' : ''}`}
            />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Poor</span>
        <span>Excellent</span>
      </div>
    </div>
  )
}

function ChoiceQuestion({
  question,
  options,
  required,
  value,
  onChange,
}: {
  question: string
  options: string[]
  required: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`w-full p-3 rounded-lg border text-left transition-colors ${
              value === option
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function TextQuestion({
  question,
  required,
  value,
  onChange,
}: {
  question: string
  required: boolean
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your response..."
        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
      />
    </div>
  )
}
