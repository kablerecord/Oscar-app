'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { LabHub } from '@/components/lab/LabHub'

export default function LabPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <LabHub />
      </div>
    </MainLayout>
  )
}
