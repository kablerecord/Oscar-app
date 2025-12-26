# OSQR Security Documentation
## Enterprise Security Overview

**Status:** PLACEHOLDER - Needs Full Documentation
**Priority:** P1 (Required for enterprise conversations)
**Created:** December 2024

---

## Purpose

Provide security documentation for enterprise prospects' security reviews. This document should answer common enterprise security questions and provide architecture details showing data protection measures.

---

## Document Sections Needed

### 1. Data Handling Overview
- [ ] Where data is stored (Supabase PostgreSQL)
- [ ] Encryption at rest (database-level)
- [ ] Encryption in transit (TLS)
- [ ] Data residency (region)

### 2. AI Model Data Usage
- [ ] Statement: User data is NOT used to train models
- [ ] How data flows to model providers
- [ ] What data is sent in API calls
- [ ] Retention by providers (OpenAI, Anthropic policies)

### 3. Data Isolation
- [ ] Tenant isolation architecture
- [ ] How workspaces are separated
- [ ] No cross-customer data access
- [ ] Database-level isolation

### 4. Access Control
- [ ] Authentication methods (email/password, OAuth)
- [ ] Session management
- [ ] Password requirements
- [ ] Future: SSO support

### 5. Data Lifecycle
- [ ] What happens when user deletes data
- [ ] Hard delete vs. soft delete
- [ ] Backup retention
- [ ] Account deletion process

### 6. Compliance Roadmap
- [ ] Current state (no certifications)
- [ ] SOC2 roadmap timeline
- [ ] GDPR considerations
- [ ] Data processing agreements

### 7. Infrastructure
- [ ] Hosting provider (Railway)
- [ ] Database provider (Supabase)
- [ ] CDN/edge (if applicable)
- [ ] Monitoring and logging

### 8. Incident Response
- [ ] How security incidents are handled
- [ ] Notification procedures
- [ ] Contact information

---

## Key Claims to Document

From Enterprise Sales Materials:

| Claim | Documentation Needed |
|-------|---------------------|
| "Your data stays yours" | Data ownership terms, deletion process |
| "Never used to train models" | Technical architecture showing no training data flow |
| "Delete anytime and it's gone" | Hard delete implementation details |
| "Data isolation per customer" | Tenant isolation architecture diagram |

---

## Architecture Diagram Needed

```
[User Browser]
      |
      | HTTPS/TLS
      v
[Railway - Next.js App]
      |
      | Internal
      v
[Supabase PostgreSQL]
   - Per-user encryption keys
   - Tenant isolation via workspace_id
   - pgvector for embeddings
      |
      | API calls (TLS)
      v
[AI Providers]
   - OpenAI (GPT-4)
   - Anthropic (Claude)
   - No training on customer data
```

---

## FAQ Format

Should include answers to common security questions:

1. Where is my data stored?
2. Who can access my data?
3. Is my data used to train AI models?
4. How do I delete my data?
5. What certifications do you have?
6. Do you support SSO?
7. What happens if there's a breach?
8. Can I get a data processing agreement?

---

## Open Questions

1. What is actual backup retention policy?
2. What logging exists currently?
3. Is there an incident response plan?
4. What are actual encryption details?
5. Need to verify Railway/Supabase security docs

---

## Implementation Notes

For Roberts Resorts:
- Security questions will come up
- Need at least a 1-pager ready
- Full documentation for enterprise deal

---

## Related Documents

- [ENTERPRISE_FEATURE_REQUIREMENTS.md](./ENTERPRISE_FEATURE_REQUIREMENTS.md)

---

*Placeholder created: December 2024*
*Status: Needs full documentation*
