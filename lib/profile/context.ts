import { prisma } from '../db/prisma'

/**
 * Get user profile context for OSQR
 * Formats profile answers into a natural context string
 */
export async function getProfileContext(workspaceId: string): Promise<string | undefined> {
  const answers = await prisma.profileAnswer.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  })

  if (answers.length === 0) {
    return undefined
  }

  // Group answers by category
  const byCategory: Record<string, Array<{ question: string; answer: string }>> = {}

  answers.forEach((answer) => {
    if (!byCategory[answer.category]) {
      byCategory[answer.category] = []
    }
    byCategory[answer.category].push({
      question: answer.question,
      answer: answer.answer,
    })
  })

  // Format into natural text
  const sections: string[] = []

  if (byCategory.personal) {
    const personal = byCategory.personal
      .map((a) => `- ${a.question}: ${a.answer}`)
      .join('\n')
    sections.push(`Personal Background:\n${personal}`)
  }

  if (byCategory.goals) {
    const goals = byCategory.goals.map((a) => `- ${a.question}: ${a.answer}`).join('\n')
    sections.push(`Goals & Objectives:\n${goals}`)
  }

  if (byCategory.context) {
    const context = byCategory.context.map((a) => `- ${a.question}: ${a.answer}`).join('\n')
    sections.push(`Current Context:\n${context}`)
  }

  if (byCategory.preferences) {
    const prefs = byCategory.preferences.map((a) => `- ${a.question}: ${a.answer}`).join('\n')
    sections.push(`Communication Preferences:\n${prefs}`)
  }

  return sections.join('\n\n')
}
