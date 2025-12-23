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

### 2. AI Provider Billing - Pre-Launch Checklist
**Date:** 2025-12-23
**What:** Verify sufficient API credits/billing with all AI providers before adding users
**Status:** Blocked - waiting for launch
**Priority:** CRITICAL before accepting paid users

**Providers to Check:**
- [ ] **OpenAI** - https://platform.openai.com/usage (GPT-4o, GPT-4o-mini, embeddings)
- [ ] **Anthropic** - https://console.anthropic.com/settings/billing (Claude Opus, Sonnet, Haiku)
- [ ] **Google AI** - https://aistudio.google.com/ (Gemini 2.0 Flash Pro)
- [ ] **xAI** - https://console.x.ai/ (Grok 2)
- [ ] **Groq** - https://console.groq.com/ (Llama 3.3 70B - currently free tier)

**Cost Estimates Per User/Month (rough):**
- Light user (~50 queries): ~$2-5
- Medium user (~200 queries): ~$10-20
- Heavy user (~500 queries): ~$30-50

**Resolution:** Before launch:
1. Add payment methods to all providers
2. Set up billing alerts at $100, $500, $1000
3. Consider prepaying for volume discounts (Anthropic, OpenAI)
4. Monitor Groq free tier limits - may need to upgrade

---

### 3. Intelligent Routing - Answer Space Classifier
**Date:** 2025-12-22
**What:** Build Answer Space Classifier for Intelligent Routing based on cardinality framework (singular/bounded/expansive)
**Status:** Blocked - awaiting chat history analysis
**Dependency:** Train Oscar on Kable's chat data first (Claude/ChatGPT exports)
**Priority:** Post-training, Pre-V1.5
**Reference:**
- Specs: `Documents/OSQR_Intelligent_Routing_Spec.docx`, `Documents/OSQR_Intelligent_Routing_Addendum.docx`
- Implementation Notes: `docs/architecture/INTELLIGENT_ROUTING_IMPLEMENTATION.md`

**Resolution:** After chat history is imported and analyzed:
1. Classify historical questions by answer space (singular/bounded/expansive)
2. Identify patterns that predict optimal routing
3. Build classifier based on real data, not just heuristics
4. Validate whether V2.0 (auto-routing) is viable from launch

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
