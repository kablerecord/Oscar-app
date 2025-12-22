# OSQR MentorScript
## Development Standards and Behavioral Rules

**Status:** Active
**Last Updated:** 2025-12-20
**Version:** 1.0

---

## 1. Code Standards

### TypeScript Conventions

| Rule | Example |
|------|---------|
| Strict mode always enabled | `"strict": true` in tsconfig |
| Explicit return types on public functions | `function getUser(id: string): User { }` |
| Interface over type for object shapes | `interface User { }` not `type User = { }` |
| Barrel exports via index.ts | `export * from './user'` in index.ts |
| Async functions return Promise explicitly | `async function fetch(): Promise<Data>` |

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `memory-wrapper.ts` |
| Components | PascalCase | `BubbleGreeting.tsx` |
| Functions | camelCase | `validateUserInput()` |
| Constants | SCREAMING_SNAKE | `FEATURE_FLAGS` |
| Interfaces | PascalCase with I-prefix optional | `RequestContext` or `IRequestContext` |
| Types | PascalCase | `QuestionType` |

### Testing Requirements

| Rule | Details |
|------|---------|
| All public APIs must have tests | Test file naming: `*.test.ts` |
| Test framework | Vitest |
| Coverage target | Core logic: 80%+, Wrappers: 60%+ |
| Integration tests | Required for cross-component behavior |
| E2E tests | Required for critical user flows |

### File Organization

| Rule | Details |
|------|---------|
| One concept per file | Don't mix unrelated concerns |
| Max file length | ~300 lines (split if larger) |
| Related files in same directory | Group by feature, not by type |
| Index.ts for public exports only | Internal helpers not exported |

---

## 2. Architectural Patterns

### Repository Pattern

**Used for:** Storage abstraction
**Found in:** `lib/osqr/*-wrapper.ts`, guidance storage
**Rule:** All persistence goes through repositories

```typescript
// Good: Repository abstraction
const memories = await MemoryVault.retrieveContext(userId, query);

// Bad: Direct storage access
const memories = await prisma.memory.findMany({ where: { userId } });
```

### Adapter Pattern

**Used for:** Model integration, external services
**Found in:** `lib/ai/providers/`, Council adapters
**Rule:** External services wrapped in adapters

```typescript
// Good: Provider adapter
const response = await anthropicAdapter.chat({ model, messages });

// Bad: Direct SDK usage in business logic
const response = await anthropic.messages.create({ model, messages });
```

### Wrapper Pattern

**Used for:** @osqr/core integration
**Found in:** `lib/osqr/*-wrapper.ts`
**Rule:** All @osqr/core access through thin wrappers

```typescript
// Good: Wrapper function
export async function storeMessage(userId: string, message: string) {
  return MemoryVault.storeMessage(userId, {
    content: message,
    role: 'user',
    timestamp: Date.now(),
    source: 'web',
  });
}

// Bad: Direct namespace access in components
const result = MemoryVault.storeMessage(userId, rawMessage);
```

### Feature Flag Pattern

**Used for:** Gradual rollout, component toggling
**Found in:** `lib/osqr/config.ts`
**Rule:** All new features behind flags

```typescript
// lib/osqr/config.ts
export const featureFlags = {
  enableConstitutionalValidation: true,
  enableRouterMRP: true,
  enableMemoryVault: true,
  // ...
};
```

---

## 3. Known Gotchas

### Memory Vault

| Gotcha | Solution |
|--------|----------|
| Always check privacy tier before retrieval | Use `MemoryVault.retrieveContext(userId, query)` which handles this |
| Embedding dimensions must match across stores | Use consistent model (text-embedding-3-small) |
| PKV and GPKV are separate | Never cross-query; use appropriate namespace |
| In-memory storage in development | Data resets on restart; use persistent store for production |

### Constitutional Framework

| Gotcha | Solution |
|--------|----------|
| Sacred clauses cannot be modified | Constitution changes require version bump and audit |
| Violation detection runs on every response | Don't await log writes (fire-and-forget) |
| Quick screen is fast but incomplete | Use full validation for final output |
| Context objects have required fields | Always build full `RequestContext`/`ResponseContext` |

### Router

| Gotcha | Solution |
|--------|----------|
| Confidence thresholds are configurable | Check `routerConfig` for current values |
| Fallback chain must end with guaranteed model | Claude Haiku is the ultimate fallback |
| Cost tracking is async | Don't block on cost recording |
| Question type detection is regex-based | Add patterns for new question types |

### Temporal Intelligence

| Gotcha | Solution |
|--------|----------|
| `when.rawText` not `when.original` | API changed; check wrapper for mapping |
| `isVague` not `isRelative` | Temporal expression field name change |
| CommitmentSource needs full object | Include `type`, `sourceId`, `extractedAt` |

### Bubble Interface

| Gotcha | Solution |
|--------|----------|
| BubbleItem requires specific fields | Must include `temporalItemId`, `confidenceScore`, `basePriority` |
| Focus mode affects budget consumption | Pass focus mode to `canConsumeBudget` |
| Greeting context augmentation | Plugin greeting takes precedence |

### Throttle Architecture

| Gotcha | Solution |
|--------|----------|
| Budget state mapping differs | Map osqr-core states to oscar-app states |
| Tier defaults changed | Default is now "lite" not "free" |
| Process before route | Check throttle before AI processing |

---

## 4. Decision Records

### Why Chroma for Vector Storage

- Embedded operation (no separate service required)
- Good TypeScript support
- Sufficient for v1.0 scale
- Easy to swap for production (Pinecone, Weaviate)

### Why Vitest over Jest

- Faster execution (2-3x)
- Better ESM support
- Native TypeScript without ts-jest
- Compatible test API (easy migration)

### Why Barrel Exports

- Clean public API surface
- Easy to control what's exported
- Simplifies imports for consumers
- Single import point per module

### Why Wrapper Pattern for @osqr/core

- Type adaptation between core and app
- Feature flag injection point
- Logging and error handling centralization
- Future swap-ability of core

### Why In-Memory Storage for Development

- Fast iteration without database setup
- Predictable test environment
- Easy to reset state
- Production uses persistent storage

### Why Webpack over Turbopack (Currently)

- Turbopack has symlink resolution issues with workspaces
- Webpack handles @osqr/core linking correctly
- Will switch when Turbopack issues resolved

---

## 5. Component Integration Rules

### Adding New @osqr/core Features

1. Create wrapper file: `lib/osqr/{feature}-wrapper.ts`
2. Add feature flag to `lib/osqr/config.ts`
3. Export functions from `lib/osqr/index.ts`
4. Map types between core and app as needed
5. Add tests for wrapper layer
6. Document gotchas in this MentorScript

### Modifying API Routes

1. Check throttle before processing
2. Validate constitutional compliance
3. Log with appropriate level
4. Return consistent error shapes
5. Include timing metadata

### Adding UI Components

1. Follow component file structure pattern
2. Use design system tokens
3. Implement accessibility requirements
4. Test presence states (if applicable)
5. Handle loading and error states

---

## 6. Review Checklist

Before marking any task complete:

- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Public APIs documented with JSDoc
- [ ] Privacy implications considered
- [ ] Constitutional compliance verified
- [ ] Feature flag added (if new feature)
- [ ] Wrapper pattern used (if touching @osqr/core)
- [ ] Known gotchas documented (if discovered)

### For PRs Specifically

- [ ] BUILD-LOG.md updated (if integration changes)
- [ ] Config.ts updated (if new flags)
- [ ] No console.log in production code
- [ ] Error boundaries in place
- [ ] Mobile tolerance considered

---

## 7. Common Commands

```bash
# Development
npm run dev           # Start dev server (uses turbopack)
npm run build         # Production build (uses webpack)
npm run typecheck     # TypeScript validation

# Testing
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# @osqr/core
cd lib/osqr-core && npm test  # Core library tests

# Database
npx prisma generate   # Regenerate client
npx prisma db push    # Push schema changes
npx prisma studio     # Database GUI
```

---

## Related Documents

- [BUILD-LOG.md](../../BUILD-LOG.md) — Integration status and type fixes
- [OSQR_LOOPSCRIPT.md](./OSQR_LOOPSCRIPT.md) — Standard operating procedures
- [OSQR_PRD.md](../planning/OSQR_PRD.md) — Requirements and constraints
