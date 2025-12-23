/**
 * Reset Onboarding Script
 *
 * Run with: npx tsx scripts/reset-onboarding.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const workspaceId = process.argv[2] || 'default-workspace'

  console.log(`Resetting onboarding for workspace: ${workspaceId}`)

  try {
    const result = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        onboardingCompleted: false,
        onboardingCompletedAt: null,
      },
    })

    console.log('✅ Onboarding reset successfully!')
    console.log(`   Workspace: ${result.id}`)
    console.log(`   onboardingCompleted: ${result.onboardingCompleted}`)
    console.log('')
    console.log('Now go to http://localhost:3001/onboarding to see the flow')
  } catch (error) {
    console.error('❌ Failed to reset onboarding:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
