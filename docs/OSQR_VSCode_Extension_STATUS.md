# OSQR VS Code Extension - Status & Enablement Guide

**Last Updated:** December 24, 2024
**Status:** COMPLETE - Ready for Testing & Enablement
**Target Release:** V2.0 (post web launch)
**Time to Enable:** ~1-2 hours (testing + environment config)

---

## Current State: FULLY BUILT

The VS Code extension and all supporting backend infrastructure is complete. This is not a "pickup point" — it's an enablement guide.

### Backend (COMPLETE & MIGRATED)

| Component | File | Status |
|-----------|------|--------|
| Decision marking | `packages/app-web/app/api/decisions/mark/route.ts` | Complete |
| Token usage tracking | `packages/app-web/app/api/usage/route.ts` | Complete |
| Token-based rate limiting | `packages/app-web/lib/security/rate-limit.ts` | Complete |
| Tier configuration | `packages/app-web/lib/tiers/config.ts` | Complete |
| OAuth authorize | `packages/app-web/app/api/auth/vscode/authorize/route.ts` | Complete |
| OAuth token exchange | `packages/app-web/app/api/auth/vscode/token/route.ts` | Complete |
| VS Code token validation | `packages/app-web/lib/auth/vscode-auth.ts` | Complete |
| Chat streaming (SSE) | `packages/app-web/app/api/chat/stream/route.ts` | Complete |
| Thread management | `packages/app-web/app/api/chat/threads/route.ts` | Complete |
| Thread CRUD | `packages/app-web/app/api/chat/threads/[threadId]/route.ts` | Complete |

### Database Models (COMPLETE)

| Model | Purpose |
|-------|---------|
| `Decision` | Stores marked decisions across interfaces |
| `TokenUsage` | Monthly token tracking by source (web/vscode/mobile) |
| `ChatThread` | Conversation persistence |
| `ChatMessage` | Individual messages within threads |

### Extension (COMPLETE - 32.6kb bundled)

| Component | File | Status |
|-----------|------|--------|
| Entry point | `packages/osqr-vscode/src/extension.ts` | Complete |
| OAuth auth | `packages/osqr-vscode/src/providers/AuthProvider.ts` | Complete |
| API client | `packages/osqr-vscode/src/providers/ApiClient.ts` | Complete |
| Chat sidebar | `packages/osqr-vscode/src/views/ChatViewProvider.ts` | Complete |
| Usage meter | `packages/osqr-vscode/src/views/UsageMeter.ts` | Complete |
| Mark Decision | `packages/osqr-vscode/src/commands/markDecision.ts` | Complete |
| Workspace context | `packages/osqr-vscode/src/utils/context.ts` | Complete |
| Config | `packages/osqr-vscode/src/utils/config.ts` | Complete |

---

## Token Limits by Tier

| Tier | Monthly Tokens | VS Code Access |
|------|----------------|----------------|
| Lite | 500K | No |
| Pro | 2.5M | Yes |
| Master | 12.5M | Yes |

---

## Commands Available

| Command | Shortcut | Description |
|---------|----------|-------------|
| `osqr.signIn` | - | OAuth sign-in flow |
| `osqr.signOut` | - | Clear session |
| `osqr.askOsqr` | `Cmd+Shift+O` | Open chat sidebar |
| `osqr.markDecision` | `Cmd+Shift+D` | Mark selection as decision |
| `osqr.explainSelection` | Right-click | Explain selected code |
| `osqr.showUsage` | Click status bar | Show usage details |

---

## Required Environment Variables

All of these must be set in `packages/app-web/.env`:

```bash
# Already required for web app
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.osqr.ai

# VS Code OAuth (add when enabling)
VSCODE_OAUTH_CLIENT_ID=osqr-vscode
VSCODE_OAUTH_REDIRECT_URI=vscode://osqr.osqr-vscode/callback
```

---

## Known Issues / Testing Notes

- **OAuth callback page**: The authorize endpoint redirects to `/auth/signin?callbackUrl=...`. Verify this page correctly handles the VS Code OAuth callback flow and redirects back to VS Code with the auth code.
- **End-to-end untested**: Extension compiled successfully but full OAuth → Chat → Decision flow not tested in real VS Code environment.
- **Token refresh untested**: The refresh_token grant type is implemented but not exercised in real usage.
- **URI handler**: VS Code needs to register `vscode://osqr.osqr-vscode/callback` as a valid URI handler. This is configured in `package.json` but needs verification.

---

## How to Enable (When Ready)

### Step 1: Verify database models exist
```bash
cd packages/app-web
npx prisma migrate status
# Should show all migrations applied
# If models missing: npx prisma db push
```

### Step 2: Configure environment
Add to `packages/app-web/.env`:
```bash
VSCODE_OAUTH_CLIENT_ID=osqr-vscode
VSCODE_OAUTH_REDIRECT_URI=vscode://osqr.osqr-vscode/callback
```

### Step 3: Build extension
```bash
cd packages/osqr-vscode
pnpm install
pnpm run compile
```

### Step 4: Test locally
1. Open `packages/osqr-vscode` in VS Code
2. Press F5 to launch Extension Development Host
3. Test flow:
   - Sign in (verify OAuth redirect works)
   - Send a chat message (verify streaming works)
   - Mark a decision with `Cmd+Shift+D`
   - Check usage meter in status bar

### Step 5: Verify OAuth callback
The OAuth flow redirects through the web app's sign-in page. Verify:
1. User clicks "Sign In" in VS Code
2. Browser opens to `/api/auth/vscode/authorize`
3. If not logged in, redirects to `/auth/signin`
4. After login, redirects back to authorize endpoint
5. Authorize endpoint redirects to `vscode://osqr.osqr-vscode/callback?code=...`
6. VS Code receives callback and exchanges code for tokens

### Step 6: Package for distribution
```bash
cd packages/osqr-vscode
pnpm run package
# Creates osqr-vscode-0.1.0.vsix file
```

### Step 7: Publish (when ready)
```bash
# Requires VS Code Marketplace publisher account
vsce login osqr
vsce publish
```

---

## Key Decisions (Spec Reference)

| # | Decision | Implementation |
|---|----------|----------------|
| 1 | Thin client | All AI server-side via `/api/chat/stream` |
| 2 | Pro tier minimum | `vsCodeAccess` check in rate-limit.ts and vscode-auth.ts |
| 3 | Token-based usage | `rate-limit.ts` with monthly limits per tier |
| 4 | Session persistence | Every conversation saved to `ChatThread` + `ChatMessage` |
| 5 | Code context capture | `context.ts` sends open files, git branch, project structure |
| 6 | Decision extraction | Manual via `Cmd+Shift+D`, stored in `Decision` model |
| 7 | Cross-project awareness | Backend handles via PKV, extension sends workspace context |
| 8 | Usage meter | Status bar shows token % with breakdown by source |
| 9 | Workspace context | Captured and sent with every message |
| 10 | Secure token storage | VS Code SecretStorage API for access/refresh tokens |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code Extension                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ AuthProvider│  │ ChatView    │  │ UsageMeter  │              │
│  │ (OAuth+PKCE)│  │ (Sidebar)   │  │ (StatusBar) │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          │                                       │
│                    ┌─────┴─────┐                                 │
│                    │ ApiClient │                                 │
│                    └─────┬─────┘                                 │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      app.osqr.ai Backend                         │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ /api/auth/     │  │ /api/chat/     │  │ /api/usage     │     │
│  │ vscode/        │  │ stream         │  │                │     │
│  │ authorize      │  │ threads        │  │                │     │
│  │ token          │  │                │  │                │     │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘     │
│          │                   │                   │               │
│          └───────────────────┼───────────────────┘               │
│                              │                                   │
│                    ┌─────────┴─────────┐                         │
│                    │ Prisma + Postgres │                         │
│                    │ (Decision, Token  │                         │
│                    │  Usage, Threads)  │                         │
│                    └───────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| This file | `docs/OSQR_VSCode_Extension_STATUS.md` | Enablement guide |
| Extension README | `packages/osqr-vscode/README.md` | User-facing docs |
| Extension code | `packages/osqr-vscode/` | Full implementation |
| Tier config | `packages/app-web/lib/tiers/config.ts` | Token limits source of truth |
| Rate limiting | `packages/app-web/lib/security/rate-limit.ts` | Token tracking logic |

---

## Roadmap Integration

### V1.0 (Web Launch)
- [x] `/api/decisions/mark` - Available for web use
- [x] `/api/usage` - Token tracking active
- [x] Token-based rate limiting - Replaces query-based
- [ ] VS Code extension - **Built but not enabled**

### V2.0 (VS Code Release)
- [ ] Enable OAuth endpoints for VS Code
- [ ] Test end-to-end OAuth flow
- [ ] Publish extension to VS Code Marketplace
- [ ] Add VS Code onboarding flow in web app
- [ ] Cross-interface session continuity testing

### V1.5 (Planned Features Using This Infrastructure)
- [ ] Decision comparison: "discussed vs implemented"
- [ ] Codebase indexing via Document Indexing Subsystem
- [ ] AI History Interview for importing Claude/ChatGPT chats
- [ ] "What did I forget to build?" query

---

## Future Feature: "Decisions vs Implementation" (V1.5)

**User asks:** "What ideas did I discuss that never made it to code?"

**Requires:**
1. Decision extraction (built)
2. Decision storage with tags (built)
3. Codebase indexing (not yet built - see Document Indexing Spec)
4. Comparison engine: match decisions to code existence (not yet built)

**Implementation path:**
1. Document Indexing Subsystem scans repo
2. Decisions tagged with feature/component names
3. Query: "Find decisions where no matching code exists in index"
4. Surface: "You discussed webhooks on Dec 10 but I see no webhook implementation"

---

## Why This Exists

Built during December 24, 2024 session. Originally intended as spec-only, but full implementation was completed. This document ensures:

1. **Nothing is lost** - All work is documented with full file paths
2. **Easy to enable** - Clear steps when V2.0 is ready
3. **Context preserved** - Future Claude sessions know exactly what exists
4. **Issues documented** - Known gaps are explicitly called out
5. **Roadmap aligned** - Features mapped to release versions

---

*File location: `oscar-app/docs/OSQR_VSCode_Extension_STATUS.md`*
