# OSQR Setup Requirements

Complete guide for setting up OSQR from scratch.

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >= 20.9.0 | Check with `node --version` |
| npm | >= 10.x | Comes with Node.js |
| PostgreSQL | 15+ | Via Supabase (recommended) or self-hosted |
| pgvector | 0.5+ | Required for embeddings |

## Database Setup

### Option A: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Enable pgvector extension:
   - Go to Database → Extensions
   - Search for "vector" and enable it
4. Get connection strings from Project Settings → Database:
   - **DATABASE_URL**: Connection pooler URL (Transaction mode)
   - **DIRECT_URL**: Direct connection URL (for migrations)

### Option B: Self-Hosted PostgreSQL

```bash
# Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Settings → Database |
| `DIRECT_URL` | Direct PostgreSQL URL (for migrations) | Supabase Dashboard → Settings → Database |
| `NEXTAUTH_URL` | Your app's production URL | Your deployment platform |
| `NEXTAUTH_SECRET` | Auth encryption key | Generate: `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | Anthropic API key | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `GOOGLE_AI_API_KEY` | Google AI (Gemini) key | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `XAI_API_KEY` | xAI (Grok) API key | [console.x.ai](https://console.x.ai) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_EMBEDDING_MODEL` | Embedding model for vector search | `text-embedding-ada-002` |
| `NEXT_PUBLIC_STRIPE_PRO_LINK` | Stripe payment link for Pro tier | - |
| `NEXT_PUBLIC_STRIPE_MASTER_LINK` | Stripe payment link for Master tier | - |

## Third-Party Accounts

| Service | Purpose | Free Tier | Paid Tier | Setup Link |
|---------|---------|-----------|-----------|------------|
| **Supabase** | Database + pgvector | 500MB DB, 2GB bandwidth | $25/mo | [supabase.com](https://supabase.com) |
| **OpenAI** | GPT-4, embeddings | Pay-per-use | ~$0.03/1K tokens | [platform.openai.com](https://platform.openai.com) |
| **Anthropic** | Claude models | Pay-per-use | ~$15/M input tokens | [console.anthropic.com](https://console.anthropic.com) |
| **Google AI** | Gemini models | Free tier available | Pay-per-use | [aistudio.google.com](https://aistudio.google.com) |
| **xAI** | Grok models | Pay-per-use | Varies | [console.x.ai](https://console.x.ai) |
| **Stripe** | Payments (optional) | Free to start | 2.9% + $0.30/tx | [stripe.com](https://stripe.com) |
| **Resend** | Email (optional) | 100 emails/day | $20/mo | [resend.com](https://resend.com) |

## Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Run database migrations
npx prisma migrate dev

# 4. (Optional) Seed the database
npm run db:seed

# 5. (Optional) Index knowledge base
npm run index-knowledge

# 6. Start development server
npm run dev
```

## Verification Steps

After setup, verify everything works:

### 1. Database Connection
```bash
npx prisma db pull
# Should complete without errors
```

### 2. Run Tests
```bash
npm run test:run
# Expected: 174 tests pass, 1 skip
```

### 3. Start Dev Server
```bash
npm run dev
# Navigate to http://localhost:3001
```

### 4. Check API Health
```bash
curl http://localhost:3001/api/health
# Should return { "status": "ok" }
```

### 5. Test AI Providers
- Create a new workspace
- Send a message in Quick mode
- Verify response is generated

## Estimated Monthly Costs

| Component | Light Usage | Medium Usage | Heavy Usage |
|-----------|-------------|--------------|-------------|
| Supabase | Free | $25 | $25+ |
| OpenAI | $5-10 | $50-100 | $200+ |
| Anthropic | $5-10 | $50-100 | $200+ |
| Google AI | Free | $10-20 | $50+ |
| xAI | $5-10 | $20-50 | $100+ |
| **Total** | **~$20** | **~$150-250** | **~$500+** |

*Costs vary significantly based on:*
- Number of active users
- Query volume and complexity
- Mode usage (Council mode uses 3+ models per query)
- Embedding operations for document indexing

## Troubleshooting

### Database Connection Errors

**Error**: `P1001: Can't reach database server`
- Check DATABASE_URL is correct
- Ensure Supabase project is active (not paused)
- Verify IP allowlist in Supabase settings

**Error**: `extension "vector" is not available`
- Enable pgvector in Supabase: Database → Extensions → Enable "vector"

### AI Provider Errors

**Error**: `401 Unauthorized` from OpenAI/Anthropic
- Verify API key is correct and active
- Check billing is set up on the provider's dashboard
- Ensure API key has required permissions

**Error**: `429 Rate Limited`
- Reduce concurrent requests
- Implement exponential backoff
- Consider upgrading API tier

### Build Errors

**Error**: `Cannot find module '@osqr/core'`
- This is expected - @osqr/core is mocked in tests
- For production, ensure vitest.config.ts has the alias configured

**Error**: `Type errors in Prisma client`
```bash
npx prisma generate
```

### Migration Errors

**Error**: `Migration failed`
```bash
# Reset and re-run migrations (WARNING: deletes data)
npx prisma migrate reset

# Or manually fix the migration state
npx prisma migrate resolve --applied "MIGRATION_NAME"
```

## Production Deployment

### Railway (Recommended)

1. Connect GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Railway auto-detects Next.js and builds automatically
4. Set `NEXTAUTH_URL` to your Railway domain

### Vercel

1. Import project from GitHub
2. Add environment variables
3. Deploy

**Note**: Vercel has limitations with WebSockets - some real-time features may not work.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```

## Security Notes

- Never commit `.env` to version control
- Rotate API keys periodically
- Use connection pooling for database (Supabase provides this)
- Enable Row Level Security (RLS) in Supabase for additional protection
- NEXTAUTH_SECRET must be at least 32 characters

## Support

For issues specific to OSQR:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Review [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) for system design
- Check [API_REFERENCE.md](./API_REFERENCE.md) for endpoint documentation
