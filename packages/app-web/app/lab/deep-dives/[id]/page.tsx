'use client'

import { use } from 'react'
import { DeepDiveFormComponent } from '@/components/lab/DeepDiveForm'

interface DeepDivePageProps {
  params: Promise<{ id: string }>
}

export default function DeepDivePage({ params }: DeepDivePageProps) {
  const { id } = use(params)

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <DeepDiveFormComponent formId={id} />
      </div>
    </div>
  )
}
