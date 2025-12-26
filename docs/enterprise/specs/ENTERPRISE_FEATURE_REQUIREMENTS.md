# OSQR Enterprise Feature Requirements
## Bridge Document: Sales Strategy → Engineering Implementation

---

## Document Purpose

This document extracts every feature implied by the Roberts Resorts enterprise strategy and translates it into engineering requirements. It serves as the bridge between "what we promised in sales materials" and "what needs to be built."

**Source Documents:**
- Roberts_Resorts_Enterprise_Strategy.md
- ROBERTS_EDGE_PILOT_ONEPAGER.md
- ROBERTS_DEMO_SCRIPT.md
- OSQR existing specs (Conversion Strategy, Free Tier Architecture, etc.)

---

## Part 1: Features Implied by Enterprise Sales Materials

### 1.1 Document Vault / PKV Requirements

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "Upload documents, query them naturally" | Core feature | Verify document indexing + embedding generation working |
| "Persistent vault - upload once, query anytime" | Designed | Ensure PKV persistence across sessions |
| "Never used to train models" | Policy | Document in security materials, enforce in architecture |
| "Delete anytime and it's gone" | Designed | Implement hard delete (not soft delete) for enterprise |
| "Multi-document synthesis" | Designed | Cross-document querying must work |
| "100MB max file size" (from pricing spec) | Spec'd | Implement file size validation and handling |
| "Unlimited documents" (enterprise) | Spec'd | Remove document count limits for enterprise tier |

**Priority:** P0 - These are table stakes for any enterprise demo

---

### 1.2 Multi-Model Requirements

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "GPT-4 + Claude together" | Core architecture | Multi-model router must work reliably |
| "Multi-model mode - see different perspectives" | Designed | UI to show parallel model responses |
| "Council mode - models debate" | Designed (Master tier) | Implement Council mode for enterprise |
| "Switch between models" | Designed | Model selection UI in query interface |

**Priority:** P1 - Differentiator, but single-model works for initial demo

---

### 1.3 Enterprise Administration

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "Multiple users on one account" | Not built | **NEW: Multi-seat enterprise accounts** |
| "3-6 executives in pilot" | Not built | **NEW: User invitation system** |
| "Admin controls" | Not built | **NEW: Admin dashboard** |
| "Role permissions" | Not built | **NEW: Role-based access control (RBAC)** |
| "Audit logs" | Not built | **NEW: Action logging for compliance** |
| "SSO" | Mentioned as roadmap | **NEW: SSO integration (SAML/OIDC)** |
| "Dedicated infrastructure option" | Mentioned | **FUTURE: Isolated tenant deployment** |

**Priority:** P2 for pilot (single shared login OK), P1 for enterprise deal

---

### 1.4 Security & Compliance

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "Your data stays yours" | Policy | Architecture enforces data isolation |
| "Never train on your data" | Policy | Ensure no data leakage to model providers |
| "SOC2 roadmap" | Not started | **FUTURE: SOC2 compliance preparation** |
| "Security documentation available" | Not created | **NEW: Security whitepaper/FAQ** |
| "Data isolation per customer" | Designed | Verify tenant isolation in database |

**Priority:** P1 - Security questions will come up

---

### 1.5 Pilot/Trial System

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "30-day pilot" | Not built | **NEW: Time-limited access tier** |
| "Free pilot, no ticking clock" | Policy | Pilot tier with no payment required |
| "Pilot converts to enterprise" | Not built | **NEW: Tier upgrade flow** |
| "Track pilot success metrics" | Not built | **NEW: Usage analytics per account** |
| "Weekly usage reports" | Not built | **NEW: Usage reporting for pilots** |

**Priority:** P2 - Can manage manually for first few pilots

---

### 1.6 Usage Analytics & Reporting

| Promised Capability | Current Status | Engineering Requirement |
|---------------------|----------------|------------------------|
| "Track weekly usage" | Not built | Query count per user per period |
| "80%+ of pilot users active weekly" | Metric | Define "active" and track it |
| "Answer quality tracking" | Not built | Feedback mechanism on responses |
| "Time saved measurement" | Not built | Survey/self-report mechanism |

**Priority:** P3 - Nice to have, can survey manually initially

---

### 1.7 Demo-Specific Requirements

| Demo Need | Current Status | Engineering Requirement |
|-----------|----------------|------------------------|
| "Upload document, query in <30 seconds" | Unknown | Performance testing needed |
| "Show where answer came from (citations)" | Designed | Citation UI must work |
| "Refine question flow" | Designed | Refine → Fire workflow functional |
| "Multi-model comparison view" | Designed | Side-by-side response UI |
| "Handle imperfect answers gracefully" | UX | Clear confidence indicators |

**Priority:** P0 - Demo must work smoothly

---

## Part 2: Feature Prioritization for Enterprise

### P0: Must Work for Demo (Before Roberts Outreach)

1. **Document upload + indexing + embedding generation**
   - User uploads PDF/DOCX/MD
   - Document is chunked and embedded
   - Queries retrieve relevant chunks
   - Response synthesizes from chunks

2. **Basic query flow**
   - User asks question
   - OSQR retrieves relevant context
   - Model generates response
   - Citations show source

3. **Session persistence**
   - Documents stay in vault across sessions
   - Conversation history maintained

### P1: Must Work for Pilot (30 days post-demo)

1. **Multi-user access**
   - Shared vault for team
   - Individual logins (can be simple invite links)
   - Basic usage tracking

2. **Multi-model responses**
   - Toggle between GPT-4 and Claude
   - Thoughtful mode (parallel responses)

3. **Security documentation**
   - One-pager on data handling
   - Architecture diagram showing isolation

### P2: Must Work for Enterprise Deal (60-90 days)

1. **Admin dashboard**
   - See all users on account
   - View usage statistics
   - Manage documents (bulk operations)

2. **Role-based access**
   - Admin vs. standard user
   - Document-level permissions (optional)

3. **Usage reporting**
   - Export usage data
   - Success metrics dashboard

### P3: Nice to Have / Future

1. **SSO integration**
2. **Council mode**
3. **SOC2 compliance**
4. **Dedicated infrastructure**
5. **API access for integrations**

---

## Part 3: Mapping to OSQR Versions

Based on existing roadmap documents:

| Feature Category | Suggested Version | Rationale |
|------------------|-------------------|-----------|
| Document indexing fixes | V1.0 (current) | Blocking - must work for any demo |
| Basic enterprise access | V1.5 | Aligns with planned integrations |
| Admin dashboard | V2.0 | Aligns with VS Code extension work |
| SSO / advanced security | V2.0+ | Enterprise scale features |
| Dedicated infrastructure | V3.0+ | Requires significant architecture |

---

## Part 4: Gap Analysis

### What Exists in Specs But May Not Be Built

| Spec'd Feature | Source Document | Build Status |
|----------------|-----------------|--------------|
| Document Indexing Subsystem | OSQR_Document_Indexing_Spec.md | **VERIFY** - embedding generation gap identified |
| Memory Vault cross-project awareness | OSQR_Memory_Vault_Addendum.md | **VERIFY** - designed but implementation unknown |
| Multi-model routing | ARCHITECTURE.md (referenced) | **VERIFY** - core architecture |
| Tier-based throttling | Free_Tier_Architecture_4.md | Spec'd, likely not built |
| Conversion flows | OSQR_Conversion_Strategy_v1_1.md | Spec'd, likely not built |

### What's Promised But Not Spec'd

| Promised Feature | Needs Spec |
|------------------|------------|
| Multi-seat enterprise accounts | Yes - NEW SPEC NEEDED |
| User invitation system | Yes - NEW SPEC NEEDED |
| Admin dashboard | Yes - NEW SPEC NEEDED |
| Role-based access control | Yes - NEW SPEC NEEDED |
| Audit logging | Yes - NEW SPEC NEEDED |
| Usage analytics/reporting | Yes - NEW SPEC NEEDED |
| Pilot/trial tier management | Yes - NEW SPEC NEEDED |
| Security whitepaper | Yes - DOCUMENT NEEDED |

---

## Part 5: Recommended New Specs

### Immediate (Before Enterprise Push)

1. **Enterprise_Tier_Spec.md**
   - Multi-seat account structure
   - User invitation flow
   - Tier permissions matrix
   - Upgrade/downgrade flows

2. **Enterprise_Admin_Spec.md**
   - Admin dashboard requirements
   - User management features
   - Usage reporting
   - Document management (bulk operations)

3. **Security_Documentation.md**
   - Data handling practices
   - Architecture security overview
   - Compliance roadmap
   - FAQ for enterprise security reviews

### Future (As Enterprise Scales)

4. **SSO_Integration_Spec.md**
5. **Audit_Logging_Spec.md**
6. **Usage_Analytics_Spec.md**
7. **Dedicated_Infrastructure_Spec.md**

---

## Part 6: Verification Checklist

Before Roberts Resorts outreach, verify:

### Document System
- [ ] Can upload PDF and have it indexed?
- [ ] Can upload DOCX and have it indexed?
- [ ] Can upload MD and have it indexed?
- [ ] Are embeddings being generated? (Known gap - verify fix)
- [ ] Does semantic search return relevant chunks?
- [ ] Do responses cite sources accurately?
- [ ] Do documents persist across sessions?
- [ ] Can delete documents completely?

### Query System
- [ ] Does basic query → response work?
- [ ] Does Thoughtful mode (multi-model) work?
- [ ] Does Contemplate mode work?
- [ ] Is response time acceptable (<30 seconds)?
- [ ] Do confidence indicators display?

### Multi-User (Minimum Viable)
- [ ] Can create additional login for pilot user?
- [ ] Do multiple users see same vault?
- [ ] Is there any usage tracking?

### Demo Readiness
- [ ] Is the UI clean and professional?
- [ ] Are error states handled gracefully?
- [ ] Is there a way to show "what OSQR knows"?
- [ ] Can you screen share without embarrassment?

---

## Part 7: Sales → Engineering Translation Table

| Sales Language | Engineering Meaning |
|----------------|---------------------|
| "Private knowledge vault" | Tenant-isolated document storage with embeddings |
| "Instant answers" | Sub-5-second query response time |
| "Learns your business" | Documents indexed + semantic retrieval |
| "Multiple AI models" | Multi-model router with GPT-4 + Claude |
| "Council mode" | Parallel model queries with synthesis |
| "Enterprise security" | Tenant isolation, encryption, audit logs |
| "Unlimited documents" | No count cap, storage-based limits only |
| "Admin controls" | RBAC + user management dashboard |
| "SSO" | SAML 2.0 or OIDC integration |
| "Dedicated infrastructure" | Single-tenant deployment option |

---

## Part 8: Action Items for VS Code Claude

When implementing enterprise features:

1. **First**: Verify document indexing pipeline is working (P0 blocker)
2. **Second**: Verify multi-model routing works (P1 for differentiation)
3. **Third**: Design multi-seat account structure (P1 for pilot)
4. **Fourth**: Build minimal admin visibility (P2 for enterprise deal)
5. **Fifth**: Create security documentation (P1 for enterprise conversations)

Each of these may require new specs before implementation.

---

## Appendix: Source Document References

| Document | Key Information Extracted |
|----------|---------------------------|
| Roberts_Resorts_Enterprise_Strategy.md | Enterprise value propositions, pilot structure, pricing ranges |
| ROBERTS_EDGE_PILOT_ONEPAGER.md | Pilot requirements, success metrics, security promises |
| ROBERTS_DEMO_SCRIPT.md | Demo flow requirements, "wow moment" needs |
| OSQR_Document_Indexing_Spec.md | Technical architecture for document system |
| OSQR_Memory_Vault_Addendum.md | Cross-project awareness requirements |
| OSQR_Conversion_Strategy_v1_1.md | Tier structure, upgrade flows |
| Free_Tier_Architecture_4.md | Throttling, limits, overage handling |
| OSQR_Plugin_Creator_Control_Inventory.md | Enterprise customization possibilities |

---

*Document Version: 1.0*
*Created: December 2024*
*Purpose: Bridge sales strategy to engineering implementation*
*Status: Ready for VS Code handoff*
