import { prisma } from '../lib/db/prisma'

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'kable-test@osqr.app' },
    include: { workspaces: true }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  const ws = user.workspaces[0]
  console.log('Account: kable-test@osqr.app')
  console.log('Password: TestOsqr2024!')
  console.log('onboardingCompleted:', ws?.onboardingCompleted)
}

main().finally(() => prisma.$disconnect())
