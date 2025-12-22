# OSQR Troubleshooting Guide

**Version:** 1.0
**Updated:** 2025-12-20

---

## Quick Reference

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "Constitutional violation" | Input blocked | Rephrase query |
| "Budget exhausted" | Daily limit reached | Wait for reset or upgrade |
| Slow responses | Complex query routing | Use Quick mode |
| Empty memory context | New workspace | Build history |
| Document not searchable | Indexing failed | Re-upload document |

---

## Common Errors

### 1. Constitutional Violations

**Error:** `Constitutional violation detected`

**Cause:** The input or output was blocked by OSQR's constitutional framework.

**Solutions:**
1. Review the input for potential policy violations
2. Rephrase the question to be more specific
3. If legitimate, contact support for review

**Debug:**
```typescript
// In development, enable logging
featureFlags.logConstitutionalViolations = true
```

---

### 2. Budget Exhausted

**Error:** `Budget exhausted` or `429 Too Many Requests`

**Cause:** Daily query limit reached for your tier.

**Solutions:**
1. Wait for midnight reset (user's timezone)
2. Upgrade to a higher tier
3. Purchase overage queries (if available)

**Check Status:**
```bash
curl /api/oscar/budget
```

**Response indicates:**
```json
{
  "budgetState": "depleted",
  "queriesRemaining": 0,
  "statusMessage": "Daily budget exhausted. Resets at midnight."
}
```

---

### 3. Mode Not Available

**Error:** `Mode not available for your tier`

**Cause:** Attempting to use a mode not included in your subscription tier.

**Mode Availability:**
| Mode | Lite | Pro | Master | Enterprise |
|------|------|-----|--------|------------|
| Quick | ✓ | ✓ | ✓ | ✓ |
| Thoughtful | ✗ | ✓ | ✓ | ✓ |
| Contemplate | ✗ | ✗ | ✓ | ✓ |
| Council | ✗ | ✗ | ✓ | ✓ |

**Solution:** Upgrade tier or use available modes.

---

### 4. Document Upload Failures

**Error:** `Unsupported file type` or `Indexing failed`

**Cause:** File type not supported or indexing error.

**Supported Types:**
- Text: `.md`, `.txt`
- Code: `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, etc.
- Data: `.json`, `.yaml`, `.yml`
- Documents: `.pdf`, `.docx`

**Size Limits by Tier:**
| Tier | Max File Size |
|------|---------------|
| Lite | 5 MB |
| Pro | 25 MB |
| Master | 50 MB |
| Enterprise | 100 MB |

**Solutions:**
1. Verify file type is supported
2. Check file size against tier limit
3. Ensure file is not corrupted
4. Try converting to supported format

---

### 5. Memory Not Retrieved

**Error:** Empty context or missing memories

**Cause:** No relevant memories stored or workspace not initialized.

**Solutions:**
1. Verify workspace ID is correct
2. Build conversation history first
3. Upload relevant documents
4. Check memory vault is enabled:
   ```typescript
   featureFlags.enableMemoryVault // should be true
   ```

---

### 6. Router Misclassification

**Symptom:** Wrong model selected or slow responses

**Cause:** Query complexity misestimated.

**Solutions:**
1. Use explicit mode selection in UI
2. Add context to help classification
3. For complex queries, start with simpler questions

**Force Model:**
```typescript
await fullRoute(input, { forceModel: 'claude-sonnet-4-20250514' })
```

---

### 7. Council Mode Timeout

**Error:** Council session timed out

**Cause:** One or more AI providers slow or unresponsive.

**Solutions:**
1. Retry the query
2. Check AI provider status pages
3. Use single-model mode as fallback
4. Simplify the query

---

### 8. Database Connection Errors

**Error:** `PrismaClientInitializationError` or connection refused

**Cause:** Database connection issue.

**Solutions:**
1. Verify `DATABASE_URL` in `.env`
2. Check database is running
3. Verify network connectivity
4. Run migrations: `npx prisma migrate dev`

**Check Connection:**
```bash
npx prisma db push --skip-generate
```

---

### 9. API Key Errors

**Error:** `Invalid API key` or authentication failed

**Cause:** Missing or invalid AI provider API keys.

**Required Keys:**
- `ANTHROPIC_API_KEY` - For Claude models
- `OPENAI_API_KEY` - For GPT models (optional)

**Verify Keys:**
```bash
# Check key is set
echo $ANTHROPIC_API_KEY | head -c 10

# Test key (be careful with rate limits)
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

---

### 10. Session/Authentication Issues

**Error:** `Unauthorized` or session expired

**Cause:** NextAuth session invalid or expired.

**Solutions:**
1. Clear browser cookies and re-login
2. Check `NEXTAUTH_SECRET` is set
3. Verify `NEXTAUTH_URL` matches your domain

**Debug:**
```typescript
// Check session in API route
const session = await getServerSession(authOptions)
console.log('Session:', session)
```

---

## Performance Issues

### Slow Response Times

**Diagnosis:**
1. Check which model is being used (Opus is slower than Sonnet)
2. Verify complexity classification
3. Check network latency to AI providers

**Solutions:**
1. Use Quick mode for faster responses
2. Reduce context size
3. Check for database query bottlenecks

---

### High Memory Usage

**Cause:** Large document processing or memory leaks.

**Solutions:**
1. Process large documents in chunks
2. Monitor with Node.js memory tools
3. Restart if memory exceeds 80%

---

## Debug Mode

Enable comprehensive logging for troubleshooting:

```typescript
// In lib/osqr/config.ts
export const featureFlags = {
  // ... other flags
  logConstitutionalViolations: true,
  logRouterDecisions: true,
  logThrottleDecisions: true,
  logDocumentIndexing: true,
}
```

**Warning:** Disable in production for performance and privacy.

---

## Getting Help

### Self-Service
1. Check this troubleshooting guide
2. Review [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
3. Check [API Reference](./API_REFERENCE.md)

### Support Channels
- GitHub Issues: https://github.com/your-org/osqr-app/issues
- Discord: (if available)
- Email: support@your-domain.com (Enterprise tier)

### Reporting Bugs

Include:
1. Error message (full text)
2. Steps to reproduce
3. Expected vs actual behavior
4. Tier and mode used
5. Browser/client info
6. Relevant logs (redact sensitive data)
