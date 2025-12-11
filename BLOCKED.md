# Blocked Items

This file tracks items that are blocked during autonomous development and need user input or external factors to resolve.

## Currently Blocked

### 1. Claude Data Folder Indexing Verification
**Date:** 2025-12-08
**What:** Cannot verify if folder is indexed: `/Users/kablerecord/Desktop/Personal Brand/AI GPT/Export data/Claude/Claude Data Dec 1 2025`
**Status:** Database is now online, can verify indexing
**Resolution:** Run:
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

### ✅ MSC Seed Script
**Date Blocked:** 2025-12-08
**Date Resolved:** 2025-12-09
**Resolution:** MSC already had 9 items seeded. Database is now reachable.

### ✅ Capability Ladder Migration
**Date Blocked:** 2025-12-08
**Date Resolved:** 2025-12-09
**Resolution:** Migration was already included in 0_init. Marked as applied with `npx prisma migrate resolve --applied 0_init`.

### ✅ OSQR Self-Indexer
**Date Blocked:** 2025-12-09
**Date Resolved:** 2025-12-09
**Resolution:** Successfully ran `npx tsx scripts/index-osqr-self.ts`. Indexed 85 files with system scope tag.
