'use client'

import { Star } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { FormQuestion as FormQuestionType } from '@/lib/lab/types'

interface FormQuestionProps {
  question: FormQuestionType
  value: unknown
  onChange: (value: unknown) => void
}

export function FormQuestion({ question, value, onChange }: FormQuestionProps) {
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
    case 'scale':
      return (
        <ScaleQuestion
          question={question.question}
          required={question.required}
          value={value as number}
          onChange={onChange}
        />
      )
    case 'choice':
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
    case 'uip_accuracy':
      return (
        <UIPAccuracyQuestion
          question={question.question}
          context={question.context}
          required={question.required}
          value={value as number}
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
    <div className="space-y-3">
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
              className={`h-5 w-5 ${value >= rating ? 'fill-current' : ''}`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function ScaleQuestion({
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
    <div className="space-y-3">
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            onClick={() => onChange(num)}
            className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
              value === num
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Not at all</span>
        <span>Completely</span>
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
    <div className="space-y-3">
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
    <div className="space-y-3">
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <Textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your response..."
        className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
      />
    </div>
  )
}

function UIPAccuracyQuestion({
  question,
  context,
  required,
  value,
  onChange,
}: {
  question: string
  context?: string
  required: boolean
  value: number
  onChange: (value: number) => void
}) {
  const accuracyLabels = [
    'Completely wrong',
    'Mostly wrong',
    'Somewhat accurate',
    'Mostly accurate',
    'Spot on',
  ]

  return (
    <div className="space-y-4">
      {context && (
        <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50 text-sm text-purple-300">
          {context}
        </div>
      )}
      <label className="block text-white font-medium">
        {question}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {accuracyLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              value === i + 1
                ? 'border-blue-500 bg-blue-900/30 text-white'
                : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
            }`}
          >
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">
              {i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
