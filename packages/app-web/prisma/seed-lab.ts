/**
 * OSQR Lab Seed Script
 *
 * Seeds the Lab tables with starter challenges and deep dive forms.
 *
 * Usage:
 *   npx tsx prisma/seed-lab.ts
 *   pnpm prisma db seed (if configured in package.json)
 */

import { PrismaClient } from '@prisma/client'
import { starterChallenges, starterDeepDives } from '../lib/lab/challenges/starter'

const prisma = new PrismaClient()

async function seedChallenges() {
  console.log('Seeding starter challenges...')

  let seededCount = 0

  for (const challenge of starterChallenges) {
    const result = await prisma.challenge.upsert({
      where: {
        id: `starter-${challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
      update: {
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        promptToTry: challenge.promptToTry,
        compareMode: challenge.compareMode,
        modesCompare: challenge.modesCompare,
        questions: JSON.parse(JSON.stringify(challenge.questions)),
        estimatedMinutes: challenge.estimatedMinutes,
        pointsReward: challenge.pointsReward,
        status: 'ACTIVE',
      },
      create: {
        id: `starter-${challenge.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        promptToTry: challenge.promptToTry,
        compareMode: challenge.compareMode,
        modesCompare: challenge.modesCompare,
        questions: JSON.parse(JSON.stringify(challenge.questions)),
        estimatedMinutes: challenge.estimatedMinutes,
        pointsReward: challenge.pointsReward,
        status: 'ACTIVE',
        publishedAt: new Date(),
      },
    })

    console.log(`  ✓ ${result.title}`)
    seededCount++
  }

  console.log(`Seeded ${seededCount} challenges.\n`)
  return seededCount
}

async function seedDeepDives() {
  console.log('Seeding deep dive forms...')

  let seededCount = 0

  for (const deepDive of starterDeepDives) {
    const result = await prisma.deepDiveForm.upsert({
      where: {
        id: `starter-${deepDive.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
      update: {
        title: deepDive.title,
        description: deepDive.description,
        category: deepDive.category,
        sections: JSON.parse(JSON.stringify(deepDive.sections)),
        estimatedMinutes: deepDive.estimatedMinutes,
        pointsReward: deepDive.pointsReward,
        status: 'ACTIVE',
      },
      create: {
        id: `starter-${deepDive.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: deepDive.title,
        description: deepDive.description,
        category: deepDive.category,
        sections: JSON.parse(JSON.stringify(deepDive.sections)),
        estimatedMinutes: deepDive.estimatedMinutes,
        pointsReward: deepDive.pointsReward,
        status: 'ACTIVE',
      },
    })

    console.log(`  ✓ ${result.title}`)
    seededCount++
  }

  console.log(`Seeded ${seededCount} deep dive forms.\n`)
  return seededCount
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('   OSQR Lab Seed Script')
  console.log('═══════════════════════════════════════════════════\n')

  try {
    const challengeCount = await seedChallenges()
    const deepDiveCount = await seedDeepDives()

    console.log('═══════════════════════════════════════════════════')
    console.log('   Summary')
    console.log('═══════════════════════════════════════════════════')
    console.log(`   Challenges seeded: ${challengeCount}`)
    console.log(`   Deep dives seeded: ${deepDiveCount}`)
    console.log('═══════════════════════════════════════════════════\n')
  } catch (error) {
    console.error('Error seeding OSQR Lab:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
