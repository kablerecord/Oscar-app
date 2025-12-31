/**
 * Seed Default Guidance
 *
 * Seeds MentorScript rules for existing projects.
 * Run: npx tsx scripts/seed-guidance.ts
 *
 * Usage:
 *   npx tsx scripts/seed-guidance.ts                    # Seed for all projects
 *   npx tsx scripts/seed-guidance.ts --project <id>     # Seed for specific project
 *   npx tsx scripts/seed-guidance.ts --email <email>    # Seed for user's projects
 */

import { prisma } from '../lib/db/prisma';

// Default MentorScript templates
const DEFAULT_MENTOR_SCRIPTS = [
  {
    name: 'Code Style',
    content: 'Write clean, readable code with meaningful variable names and clear comments for complex logic.',
    priority: 7,
  },
  {
    name: 'Error Handling',
    content: 'Include proper error handling and user-friendly error messages in all code suggestions.',
    priority: 8,
  },
  {
    name: 'Ask Before Major Changes',
    content: 'When suggesting significant architectural changes, explain the trade-offs and ask for confirmation before proceeding.',
    priority: 9,
  },
  {
    name: 'Test Coverage',
    content: 'When writing new functions, suggest corresponding unit tests to verify the behavior.',
    priority: 6,
  },
  {
    name: 'Documentation',
    content: 'Include JSDoc or equivalent documentation for public functions and complex types.',
    priority: 5,
  },
];

// Project-type specific guidance
const PROJECT_TYPE_GUIDANCE: Record<string, { name: string; content: string; priority: number }[]> = {
  web: [
    {
      name: 'Accessibility',
      content: 'Ensure web components are accessible with proper ARIA labels, keyboard navigation, and semantic HTML.',
      priority: 8,
    },
    {
      name: 'Performance',
      content: 'Consider performance implications of code changes, especially for client-side rendering and bundle size.',
      priority: 7,
    },
  ],
  api: [
    {
      name: 'API Response Format',
      content: 'Use consistent JSON response formats with appropriate HTTP status codes and error structures.',
      priority: 8,
    },
    {
      name: 'Input Validation',
      content: 'Validate all API inputs and sanitize data to prevent injection attacks.',
      priority: 9,
    },
  ],
  mobile: [
    {
      name: 'Offline Support',
      content: 'Consider offline-first design patterns and graceful degradation for mobile apps.',
      priority: 7,
    },
  ],
  data: [
    {
      name: 'Data Privacy',
      content: 'Be mindful of PII and sensitive data handling. Suggest encryption and anonymization where appropriate.',
      priority: 9,
    },
  ],
};

async function seedGuidanceForProject(projectId: string, projectType?: string): Promise<number> {
  let created = 0;

  // Check for existing guidance
  const existingCount = await prisma.mentorScript.count({
    where: { projectId },
  });

  if (existingCount > 0) {
    console.log(`  Project already has ${existingCount} guidance rules, skipping defaults`);
    return 0;
  }

  // Add default scripts
  for (const script of DEFAULT_MENTOR_SCRIPTS) {
    await prisma.mentorScript.create({
      data: {
        projectId,
        ...script,
        source: 'user_defined',
      },
    });
    created++;
  }

  // Add project-type specific guidance if applicable
  if (projectType && PROJECT_TYPE_GUIDANCE[projectType]) {
    for (const script of PROJECT_TYPE_GUIDANCE[projectType]) {
      await prisma.mentorScript.create({
        data: {
          projectId,
          ...script,
          source: 'user_defined',
        },
      });
      created++;
    }
  }

  return created;
}

async function main() {
  const args = process.argv.slice(2);
  let targetProjectId: string | undefined;
  let targetEmail: string | undefined;
  let projectType: string | undefined;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      targetProjectId = args[i + 1];
      i++;
    } else if (args[i] === '--email' && args[i + 1]) {
      targetEmail = args[i + 1];
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      projectType = args[i + 1];
      i++;
    }
  }

  console.log('Seeding default guidance...');

  let projects;

  if (targetProjectId) {
    // Seed specific project
    const project = await prisma.project.findUnique({
      where: { id: targetProjectId },
    });

    if (!project) {
      console.error('Project not found:', targetProjectId);
      process.exit(1);
    }

    projects = [project];
  } else if (targetEmail) {
    // Seed all projects for a specific user
    const workspace = await prisma.workspace.findFirst({
      where: { owner: { email: targetEmail } },
      include: { projects: true },
    });

    if (!workspace) {
      console.error('Workspace not found for email:', targetEmail);
      process.exit(1);
    }

    projects = workspace.projects;
  } else {
    // Seed all projects
    projects = await prisma.project.findMany();
  }

  console.log(`Found ${projects.length} projects to seed`);

  let totalCreated = 0;

  for (const project of projects) {
    console.log(`\nSeeding: ${project.name} (${project.id})`);

    // Infer project type from name/description if not provided
    let inferredType = projectType;
    if (!inferredType) {
      const nameAndDesc = `${project.name} ${project.description || ''}`.toLowerCase();
      if (nameAndDesc.includes('web') || nameAndDesc.includes('frontend') || nameAndDesc.includes('react')) {
        inferredType = 'web';
      } else if (nameAndDesc.includes('api') || nameAndDesc.includes('backend') || nameAndDesc.includes('server')) {
        inferredType = 'api';
      } else if (nameAndDesc.includes('mobile') || nameAndDesc.includes('ios') || nameAndDesc.includes('android')) {
        inferredType = 'mobile';
      } else if (nameAndDesc.includes('data') || nameAndDesc.includes('analytics') || nameAndDesc.includes('ml')) {
        inferredType = 'data';
      }
    }

    const created = await seedGuidanceForProject(project.id, inferredType);
    totalCreated += created;

    if (created > 0) {
      console.log(`  Created ${created} guidance rules${inferredType ? ` (type: ${inferredType})` : ''}`);
    }
  }

  console.log(`\nDone! Created ${totalCreated} total guidance rules`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
