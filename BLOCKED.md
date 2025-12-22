# Blocked Items

This file tracks items that are blocked during autonomous development and need user input or external factors to resolve.

## Currently Blocked

### 1. Marketing Site Access Code (osqr.app)
**Date:** 2025-12-22
**What:** Marketing site (osqr.app) access code validation is broken
**Status:** BLOCKED - Need clarification
**Questions:**
- Is osqr.app a separate codebase from app.osqr.app?
- If osqr.app is just a redirect to app.osqr.app, the access code validation should work via /signup?code=xxx
- If osqr.app has its own landing page, where is that code located?

**Best Guess:** The marketing site at osqr.app may be a simple landing page that redirects to app.osqr.app/signup?code=xxx. If it's in this codebase, I couldn't find it. The access code validation at /api/access-code/validate works correctly.

---

### 2. Claude Data Folder Indexing Verification
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

### 3. Production Testing (Requires User Action)
**Date:** 2025-12-22
**What:** The following features need to be tested in production by a user:
**Status:** NEEDS USER TESTING

**Document Upload Test:**
1. Go to https://app.osqr.app/vault
2. Upload a test PDF/DOCX/TXT file
3. Verify it shows up in the vault with summary
4. Ask OSQR a question about the document content

**Complex Question with Context Test:**
1. Upload at least one document to the vault
2. Ask a question that requires context from the vault
3. Verify the answer references the document content

**Stripe Payment Links Test:**
1. Go to https://app.osqr.app/pricing
2. Click "Get Pro" or "Get Master" button
3. Verify it redirects to a valid Stripe checkout page
4. (Optional) Toggle to yearly and test yearly links

**Note:** These tests require authentication and cannot be automated without login credentials.

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
