# OSQR Local Development Setup

**Version:** 1.0
**Updated:** 2025-12-20

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** v20.9.0 or higher
- **npm** or **pnpm** package manager
- **PostgreSQL** database with pgvector extension (Supabase recommended)
- **Git** for version control

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd oscar-app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 4. Set up the database
npm run db:setup

# 5. Start the development server
npm run dev
```

The app will be available at `http://localhost:3001`.

---

## Environment Variables

Create a `.env` file in the project root with these required variables:

### Database (Required)

```bash
# Supabase PostgreSQL with pgvector
DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
```

**Getting your DATABASE_URL:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. Go to Project Settings → Database
4. Copy the connection string

### Authentication (Required)

```bash
# Local development URL
NEXTAUTH_URL="http://localhost:3001"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret"
```

### AI Providers (At least one required)

```bash
# Anthropic (Required for Claude models)
ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI (Required for embeddings and GPT models)
OPENAI_API_KEY="sk-..."

# Google AI (Optional - for Gemini models)
GOOGLE_AI_API_KEY="..."

# xAI (Optional - for Grok models)
XAI_API_KEY="xai-..."
```

**Getting API Keys:**
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Google AI: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- xAI: [console.x.ai](https://console.x.ai/)

### Stripe (Optional for development)

```bash
# Payment links for upgrade flows
NEXT_PUBLIC_STRIPE_PRO_LINK="https://buy.stripe.com/..."
NEXT_PUBLIC_STRIPE_MASTER_LINK="https://buy.stripe.com/..."
```

---

## Database Setup

### Using Supabase (Recommended)

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy the connection string to your `.env`

### Running Migrations

```bash
# Run all migrations
npx prisma migrate dev

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed with initial data
npm run db:seed
```

### Viewing Data

```bash
# Open Prisma Studio (GUI for database)
npx prisma studio
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3001 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Run migrations + seed |
| `npm run db:seed` | Seed database with initial data |
| `npm run index-knowledge` | Index knowledge base documents |
| `npm run index-osqr-self` | Index OSQR self-knowledge |
| `npm run seed-msc` | Seed MSC frameworks |

---

## Project Structure

```
oscar-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── oscar/         # OSQR endpoints
│   │   └── vault/         # Document vault endpoints
│   └── (routes)/          # Page routes
├── components/            # React components
│   └── oscar/             # OSQR-specific components
├── lib/                   # Core libraries
│   ├── osqr/              # OSQR subsystem wrappers
│   ├── ai/                # AI provider integrations
│   ├── db/                # Database utilities
│   └── knowledge/         # Knowledge retrieval
├── prisma/                # Database schema and migrations
├── docs/                  # Documentation
└── public/                # Static assets
```

---

## Development Workflow

### 1. Start Development

```bash
npm run dev
```

### 2. Make Changes

- Edit files in `app/`, `components/`, or `lib/`
- Hot reload will refresh automatically

### 3. Database Changes

```bash
# After editing prisma/schema.prisma
npx prisma migrate dev --name your_migration_name

# Generate Prisma client
npx prisma generate
```

### 4. Check Linting

```bash
npm run lint
```

---

## Testing

> **Note:** Test framework is not yet installed. To enable testing:

```bash
# Install test dependencies
npm install -D vitest @vitest/coverage-v8

# Add to package.json scripts:
# "test": "vitest",
# "test:coverage": "vitest --coverage"
```

Test files are located in `lib/osqr/__tests__/` and ready to run once vitest is installed.

---

## Common Issues

### Database Connection Failed

1. Check `DATABASE_URL` is correct in `.env`
2. Ensure database is running and accessible
3. Check network/firewall settings

```bash
# Test connection
npx prisma db push --skip-generate
```

### API Key Errors

1. Verify keys are set in `.env`
2. Check for typos (no extra spaces)
3. Ensure keys are valid and not expired

```bash
# Check if key is set (first 10 chars)
echo $ANTHROPIC_API_KEY | head -c 10
```

### Port Already in Use

The dev server runs on port 3001 by default. If occupied:

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
next dev -p 3002
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma client
npx prisma generate
```

---

## Feature Flags

OSQR subsystems can be toggled via feature flags in `lib/osqr/config.ts`:

```typescript
export const featureFlags = {
  enableConstitutional: true,
  enableMemoryVault: true,
  enableRouter: true,
  enableThrottle: true,
  enableDocumentIndexing: true,
  enableBubble: true,
  enableCouncil: true,
  enableTemporal: true,
  enableGuidance: true,
  // Debug flags (dev only)
  logConstitutionalViolations: false,
  logRouterDecisions: false,
  logThrottleDecisions: false,
}
```

---

## IDE Setup

### VS Code Extensions (Recommended)

- **Prisma** - Schema highlighting and formatting
- **ESLint** - Linting integration
- **Tailwind CSS IntelliSense** - CSS class completion
- **TypeScript** - Built-in, ensure updated

### Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## Getting Help

- **Architecture:** See [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)
- **API Reference:** See [API_REFERENCE.md](./API_REFERENCE.md)
- **Troubleshooting:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Spec Compliance:** See [SPEC_COMPLIANCE_REPORT.md](./SPEC_COMPLIANCE_REPORT.md)
