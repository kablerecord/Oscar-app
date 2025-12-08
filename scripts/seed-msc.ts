/**
 * Seed MSC (Master Summary Checklist) with initial items
 *
 * Run with: npx tsx scripts/seed-msc.ts
 *
 * This script seeds the MSC panel with example items to demonstrate
 * the feature. Users can delete/modify these as they customize OSQR.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Sample MSC items - these are examples that demonstrate the feature
const SAMPLE_MSC_ITEMS = [
  // Goals
  {
    category: 'goal',
    content: 'Build a morning routine that sets me up for success',
    isPinned: true,
    sortOrder: 0,
  },
  {
    category: 'goal',
    content: 'Achieve inbox zero by end of each day',
    isPinned: false,
    sortOrder: 1,
  },
  {
    category: 'goal',
    content: 'Read 2 books per month to expand my knowledge',
    isPinned: false,
    sortOrder: 2,
  },

  // Projects
  {
    category: 'project',
    content: 'OSQR personal knowledge vault - index all my chat exports',
    isPinned: true,
    sortOrder: 0,
  },
  {
    category: 'project',
    content: 'Home office setup improvements',
    isPinned: false,
    sortOrder: 1,
  },
  {
    category: 'project',
    content: 'Annual planning and goal review',
    isPinned: false,
    sortOrder: 2,
  },

  // Ideas
  {
    category: 'idea',
    content: 'Create a weekly reflection practice with OSQR',
    isPinned: true,
    sortOrder: 0,
  },
  {
    category: 'idea',
    content: 'Use PKV to track insights from all AI conversations',
    isPinned: false,
    sortOrder: 1,
  },
  {
    category: 'idea',
    content: 'Build a personal wiki from accumulated knowledge',
    isPinned: false,
    sortOrder: 2,
  },
]

async function seedMSC() {
  console.log('🧠 Seeding MSC (Master Summary Checklist)...\n')

  // Find the first workspace (or Kable's workspace specifically)
  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { name: { contains: 'Kable' } },
        { onboardingCompleted: true },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })

  if (!workspace) {
    console.error('❌ No workspace found. Please complete onboarding first.')
    process.exit(1)
  }

  console.log(`📂 Found workspace: ${workspace.name} (${workspace.id})\n`)

  // Check if MSC already has items
  const existingItems = await prisma.mSCItem.count({
    where: { workspaceId: workspace.id },
  })

  if (existingItems > 0) {
    console.log(`ℹ️  MSC already has ${existingItems} items.`)
    const proceed = process.argv.includes('--force')

    if (!proceed) {
      console.log('   Run with --force to clear and reseed.')
      console.log('   Skipping to preserve existing items.\n')
      process.exit(0)
    }

    console.log('   --force flag detected. Clearing existing items...')
    await prisma.mSCItem.deleteMany({
      where: { workspaceId: workspace.id },
    })
    console.log('   ✅ Cleared existing items.\n')
  }

  // Create new MSC items
  console.log('📝 Creating MSC items...\n')

  for (const item of SAMPLE_MSC_ITEMS) {
    const created = await prisma.mSCItem.create({
      data: {
        workspaceId: workspace.id,
        ...item,
      },
    })

    const pinIcon = item.isPinned ? '📌' : '  '
    const categoryIcon =
      item.category === 'goal' ? '🎯' :
      item.category === 'project' ? '📁' :
      item.category === 'idea' ? '💡' : '•'

    console.log(`   ${pinIcon} ${categoryIcon} ${item.content}`)
  }

  console.log('\n✅ MSC seeded successfully!')
  console.log(`   Goals: ${SAMPLE_MSC_ITEMS.filter(i => i.category === 'goal').length}`)
  console.log(`   Projects: ${SAMPLE_MSC_ITEMS.filter(i => i.category === 'project').length}`)
  console.log(`   Ideas: ${SAMPLE_MSC_ITEMS.filter(i => i.category === 'idea').length}`)
  console.log('\n💡 Tip: Customize these in the MSC panel on the right side of OSQR.')
}

seedMSC()
  .catch((error) => {
    console.error('❌ Error seeding MSC:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
