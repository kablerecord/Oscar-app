# OSQR Privacy Philosophy

**Source of Truth** for Privacy Page, Terms, Tooltips, and all user-facing privacy communication.

---

## 1. Core Principle: "Your Data Belongs to You."

OSQR exists to make you more capable — not to extract anything from you.

So the default rule is simple:

- **Everything you upload, write, think, or store in OSQR belongs solely to you.**
- **Your data is never sold, shared, or used for training.**
- **OSQR only uses your data to think *for you*, not for anyone else.**

**OSQR is a private intelligence engine — not a data farm.**

---

## 2. Clear Privacy Tiers (A/B/C)

### Tier A — Maximum Privacy (default for every new user)

- Nothing leaves your private vault except what must be sent to AI models to answer your questions.
- None of your data is used to improve OSQR globally.
- No anonymization, no analytics on your content.
- Fully private.

This is what most privacy-focused users will choose.

---

### Tier B — Optional "Improve My OSQR" Mode

- Still no raw content is ever shared.
- You can optionally allow OSQR to learn from *patterns only*.
- Example: "User sets lots of fitness goals but doesn't follow through."
- No text, no documents, no files ever leave your vault.

This improves your personal model — not anyone else's.

---

### Tier C — Global Patterns (OPT-IN ONLY, off by default, EXTRA warnings)

- You can choose to anonymously contribute *patterns* (never content) to improve the overall intelligence of OSQR.
- Zero identifiable data.
- Aggregated trends only (e.g., "20% of users ask about starting businesses during Q1").

This is the "Waze" model — contribute if you want to help the ecosystem.

---

## 3. Never Train Models on User Data

This is the line in the sand:

**OSQR does not train any LLM on user data. Not now. Not ever.**

Even in Tier C, OSQR only learns statistically useful **patterns**, not content.

No raw text → no documents → no writing → no conversations → no embeddings → no PKV content → no identity info is used for training.

---

## 4. The Personal Knowledge Vault (PKV) is Fully Private

PKV is **your** second brain. It is **not shared**, **not viewed**, and **not accessible** to anyone — including OSQR staff.

- Encrypted at rest (Postgres/S3/R2)
- Encrypted in transit (HTTPS)
- Only decrypted when you request something
- Only used to answer **your** questions

Even OSQR admins **cannot** inspect your vault.

---

## 5. Where is My Data Stored?

### Your content:
Stored in encrypted storage (Supabase Postgres + Vector DB + Object Storage).

### Your embeddings:
Stored as numeric vectors. They are useless outside your vault and unreadable as text.

### Your profile:
Encrypted rows tied only to your account.

### Your chats:
Private to you, encrypted, and never exposed to any system other than OSQR's reasoning engine.

### AI providers (OpenAI, Anthropic, etc.):
Only see the text required to answer the specific question. They do **not** receive your documents unless you explicitly ask a question about them.

---

## 6. "Burn It" Button — Instant Wipe

### What it does:

- Deletes all your documents
- Deletes all embeddings
- Deletes all chat history
- Deletes all memories
- Deletes your PKV
- Deletes all profile data
- Deletes cached model outputs
- Clears all system logs tied to your account

### Wipe Guarantee:

**Once deleted, OSQR cannot recover it.**

This must be physically enforced at the database and storage layer.

### UX Requirement:

When they click "Burn It," show them a dramatic, spartan modal:

```
"This is irreversible.
Everything you've ever stored in OSQR will be deleted forever.
There is no undo. Continue?"
```

---

## 7. No Human Review, No Human Access

No employee, contractor, or admin can:

- see your files
- open your vault
- browse your chats
- view your uploads
- inspect embeddings
- see your MSC
- see your profile

Your data is yours.

OSQR staff only see:

- your email
- your plan
- billing metadata
- error logs (no content)

---

## 8. Encryption Policy

### At rest:
AES-256 encryption (Supabase/Postgres)

### In transit:
TLS 1.2+/HTTPS

### Embeddings:
Stored as vectors — mathematically irreversible back into text.

### Passwords:
Hashed with modern bcrypt/argon2 (Supabase handles this securely).

---

## 9. Data Minimization

OSQR collects **the minimum necessary**:

- Email
- Password
- Subscription status
- Usage metrics (not content)
- Optional profile info

That's it.

No tracking. No surveillance. No creepy behavior. No "shadow profiles."

---

## 10. AI Request Handling

When OSQR sends something to OpenAI/Anthropic, the rule is simple:

**Only the exact text necessary to answer your question goes to the model.**

Examples:

If you ask: "Summarize page 4 of my document."
→ OSQR only sends page 4's text.

If you ask: "What were my goals last month?"
→ OSQR fetches them from your vault internally and sends only your question and the relevant extracted text.

You control what is sent because it is always tied to your explicit action.

---

## 11. Deletion Guarantees

When you delete something:

- Document → deleted
- Embeddings → deleted
- Index → deleted
- Cache → deleted
- Backups → wiped at the next rotation cycle
- MSC references → removed

### When your account is deleted:

Everything linked to you is wiped.

There is no "cold storage copy."
There is no "internal archive."
There is no "ghost copy for analytics."

---

## 12. OSQR Philosophy: "Privacy is Capability."

**"If you don't trust your AI, you can't use it to its full potential. Privacy creates capability."**

This is the OSQR stance.

If you want users to index their entire lives, you MUST stand stronger on privacy than any competitor:

- stronger than Notion
- stronger than ChatGPT
- stronger than Evernote
- stronger than Dropbox
- stronger than Google
- stronger than Microsoft

And now you do.

---

## Implementation Checklist

### UI Components:
- [x] Privacy info button on upload screen (onboarding)
- [ ] Privacy page at `/privacy`
- [ ] "Burn It" button in settings
- [ ] Privacy tier selector in settings
- [ ] Privacy tier explanation tooltips

### Backend:
- [ ] Implement Tier A/B/C logic
- [ ] "Burn It" deletion cascade
- [ ] Audit logging (no content)
- [ ] Data export feature (GDPR)

### Copy:
- [ ] Privacy page content
- [ ] Terms of Service
- [ ] Cookie policy (minimal)
- [ ] Founder letter on privacy

---

## Quick Reference: Tooltip Text

**Short (button):**
> "Your files are private. Learn more about our privacy commitment."

**Medium (tooltip):**
> "Your files are private. Your vault belongs only to you. OSQR never trains on your data. And you can wipe everything instantly with the Burn It button."

**Full (modal points):**
1. Your vault is yours alone — no one can see it
2. Never used for training — not now, not ever
3. Encrypted & secure — at rest and in transit
4. "Burn It" button — delete everything instantly

---

*Last updated: December 2024*
*Owner: Kable Record*
