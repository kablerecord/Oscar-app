# TODO: Analytics Review & Optimization

**Created:** December 2024
**Review Date:** March 2025 (or after ~500 questions logged)

## What This Is

We built a developer analytics system that logs detailed metrics for every OSQR interaction in Joe's account. The goal is to collect real usage data to identify optimization opportunities.

## Where The Data Lives

1. **Database:** `ChatMessage.metadata` field contains analytics for each response
2. **API Endpoint:** `GET /api/analytics/report` - generates a summary report
3. **Code:** `lib/analytics/dev-analytics.ts` - the analytics system

## What's Being Tracked

For every question in Joe's account:
- **Timing:** Total response time, AI time, context assembly time
- **Question Analysis:** Type (factual, complex, etc.), complexity score, word count
- **Routing:** Requested mode vs effective mode, was it auto-routed?
- **Context:** Cache hits/misses, which sources were used (vault, MSC, profile)
- **Response:** Token count, word count, artifacts generated

## When To Review

After accumulating ~500 questions (probably 2-3 months of usage), run:

```bash
# Generate analytics report
curl https://app.osqr.app/api/analytics/report
```

Or use the API directly while logged in as Joe.

## What To Look For

### 1. Slow Queries (>5 seconds)
Look at `slowQueries` in the report. For each:
- What made it slow? (Knowledge search? MSC lookup? AI response?)
- Can we prefetch more data?
- Should we adjust routing to use Quick mode more?

### 2. Cache Misses
Look at `cacheMisses` in the report:
- What data did users need that wasn't prefetched?
- Add new items to `PREFETCH_ITEMS` in `lib/context/prefetch.ts`

### 3. Question Patterns
Look at `questionPatterns` in the report:
- What types of questions are most common?
- Are we routing them to the right mode?
- Should we add specialized handling for common patterns?

### 4. Auto-Routing Accuracy
- When we auto-downgrade from Thoughtful to Quick, was it the right call?
- Are users getting good answers on Quick mode?

## Expanding The Prefetch System

When you find data that's frequently needed but not cached, add it to `lib/context/prefetch.ts`:

```typescript
{
  key: 'yourNewKey',
  tier: 2,  // 1=immediate, 2=100ms, 3=300ms, 4=600ms
  ttlMinutes: 10,
  fetcher: async (workspaceId) => {
    // Your query here
    return result
  },
},
```

## Files To Update

1. **Add prefetch items:** `lib/context/prefetch.ts`
2. **Add analytics fields:** `lib/analytics/dev-analytics.ts`
3. **Improve routing:** `lib/ai/model-router.ts`
4. **Update ask route:** `app/api/oscar/ask/route.ts`

## Success Metrics

After optimizations:
- Average response time for Quick mode: <3 seconds
- Cache hit rate: >80%
- Fast path usage: >60% of questions
- User satisfaction: No complaints about slowness

---

**Remember:** This is a living document. Update it as you learn from the data!
