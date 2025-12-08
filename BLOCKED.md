# Blocked Items

This file tracks items that are blocked during autonomous development and need user input or external factors to resolve.

## Currently Blocked

### 1. MSC Seed Script - Database Unreachable
**Date:** 2025-12-08
**What:** MSC seed script (`npm run seed-msc`) ready but cannot execute
**Why:** Supabase database at `aws-1-us-east-1.pooler.supabase.com:5432` is unreachable
**Resolution:** Run `npm run seed-msc` when database is back online
**Code:** Script complete at `scripts/seed-msc.ts`

### 2. Capability Ladder Migration
**Date:** 2025-12-08
**What:** Prisma migration for capability ladder schema changes
**Why:** Database at `aws-1-us-east-1.pooler.supabase.com:5432` is unreachable
**Resolution:** When database is online, run:
```bash
cd /Users/kablerecord/Desktop/oscar-app
npx prisma migrate dev --name add_capability_ladder
```
**Code:** Schema ready in `prisma/schema.prisma` with:
- `Workspace.capabilityLevel` (Int, default 0)
- `Workspace.capabilityAssessedAt` (DateTime?)
- `Workspace.identityStage` (String?)
- New `CapabilityAssessment` model for history tracking

### 3. Claude Data Folder Indexing Verification
**Date:** 2025-12-08
**What:** Cannot verify if folder is indexed: `/Users/kablerecord/Desktop/Personal Brand/AI GPT/Export data/Claude/Claude Data Dec 1 2025`
**Why:** Database unreachable, cannot query documents table
**Resolution:** When database is online, run:
```bash
# Check if Claude exports are indexed
cd /Users/kablerecord/Desktop/oscar-app
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.document.findMany({
  where: { OR: [
    { originalFilename: { contains: 'Claude' } },
    { title: { contains: 'Claude' } },
    { sourceType: 'chat_export' }
  ]},
  take: 20
}).then(docs => {
  console.log('Claude exports found:', docs.length);
  docs.forEach(d => console.log('-', d.title));
}).finally(() => prisma.\$disconnect());
"
```

If not indexed, run:
```bash
npm run index-knowledge "/Users/kablerecord/Desktop/Personal Brand/AI GPT/Export data/Claude/Claude Data Dec 1 2025"
```

---

## Resolved

*(Move items here when resolved)*
