import { prisma } from '../lib/db/prisma'

async function main() {
  const email = 'kable-test@osqr.app'
  
  // Find the user and workspace
  const user = await prisma.user.findUnique({
    where: { email },
    include: { workspaces: true }
  })
  
  if (!user) {
    console.error('User not found:', email)
    process.exit(1)
  }
  
  const workspace = user.workspaces[0]
  if (!workspace) {
    console.error('No workspace found for user')
    process.exit(1)
  }
  
  console.log('Resetting account:', email)
  console.log('Workspace:', workspace.id)
  
  // Reset onboarding
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { onboardingCompleted: false }
  })
  console.log('✓ Reset onboardingCompleted to false')
  
  // Delete all chat threads/messages
  const threads = await prisma.chatThread.findMany({
    where: { workspaceId: workspace.id }
  })
  
  for (const thread of threads) {
    await prisma.chatMessage.deleteMany({ where: { threadId: thread.id } })
  }
  await prisma.chatThread.deleteMany({ where: { workspaceId: workspace.id } })
  console.log(`✓ Deleted ${threads.length} chat threads and their messages`)
  
  // Delete MSC items
  const mscDeleted = await prisma.mSCItem.deleteMany({ where: { workspaceId: workspace.id } })
  console.log(`✓ Deleted ${mscDeleted.count} MSC items`)
  
  // Delete profile answers
  const profileDeleted = await prisma.profileAnswer.deleteMany({ where: { workspaceId: workspace.id } })
  console.log(`✓ Deleted ${profileDeleted.count} profile answers`)
  
  console.log('\n✅ Account reset complete!')
  console.log('Email:', email)
  console.log('Password: TestOsqr2024!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
