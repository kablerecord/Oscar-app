# OSQR Cost & Margin Analysis

**Document Type**: Business/Financial Reference  
**Version**: 1.0  
**Status**: Current as of December 2024  
**Purpose**: Source of truth for OSQR unit economics and infrastructure costs

---

## Executive Summary

OSQR operates with **70% gross margins** at the Pro tier ($99/month) while using premium AI models for all user-facing interactions. This document breaks down all costs and provides the financial foundation for pricing, scaling, and operational decisions.

**Key Numbers:**
- Per-user cost: ~$6/month (realistic usage)
- Pro tier margin: ~88%
- Breakeven: 4-5 Pro users cover all fixed costs
- LLM inference: 98% of variable costs

---

## User Model Assumptions

### Realistic Usage Patterns

Based on comparable AI products and expected behavior:

| User Type | Queries/Day | Active Days/Month | Monthly Queries |
|-----------|-------------|-------------------|-----------------|
| Light | 5-8 | 8-10 | 50-80 |
| Regular | 10-15 | 12-15 | 150-200 |
| Power | 20-30 | 18-22 | 400-600 |
| Heavy Power | 40-50 | 25+ | 1,000+ |

**Average user assumption:** 15 queries/day × 12 active days = **180 queries/month**

### Query Token Profile

| Query Type | Input Tokens | Output Tokens | Frequency |
|------------|--------------|---------------|-----------|
| Standard conversation | 2,000 | 500 | 70% |
| Document analysis | 4,000 | 800 | 15% |
| Contemplate/Deep | 5,000 | 1,500 | 10% |
| Quick question | 500 | 200 | 5% |

**Weighted average:** 2,500 input / 600 output tokens per query

---

## Cost Breakdown by Category

### 1. LLM Inference Costs

The dominant cost category (~98% of per-user costs).

#### Primary Model: Claude Sonnet 4.5
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

**Per-query cost (standard):**
```
Input:  2,500 tokens × $0.000003 = $0.0075
Output:   600 tokens × $0.000015 = $0.0090
Total per query: $0.0165
```

**Monthly cost at 180 queries:** $2.97

#### Premium Feature: Contemplate Mode (Opus 4.5)
- Input: $5.00 / 1M tokens
- Output: $25.00 / 1M tokens

**Per-query cost (Contemplate):**
```
Input:  5,000 tokens × $0.000005 = $0.025
Output: 1,500 tokens × $0.000025 = $0.0375
Total per query: $0.0625
```

**Monthly cost at 20 Contemplate queries:** $1.25

#### Backend: Classification & Routing (Haiku 4.5)
- Input: $1.00 / 1M tokens
- Output: $5.00 / 1M tokens

**Per-query cost:**
```
Input:  500 tokens × $0.000001 = $0.0005
Output: 100 tokens × $0.000005 = $0.0005
Total per query: $0.001
```

**Monthly cost at 180 classifications:** $0.18

#### LLM Cost Summary (Per User/Month)

| Model | Usage | Cost |
|-------|-------|------|
| Sonnet 4.5 (conversations) | 160 queries | $2.64 |
| Opus 4.5 (Contemplate) | 20 queries | $1.25 |
| Haiku 4.5 (routing) | 180 queries | $0.18 |
| **LLM Subtotal** | | **$4.07** |

---

### 2. Embedding Costs

For Document Indexing Subsystem - generating and storing vector embeddings.

#### Model: text-embedding-3-small (OpenAI)
- Price: $0.02 / 1M tokens
- Dimensions: 1,536

**Initial document indexing:**
```
25 documents × 5 chunks × 500 tokens = 62,500 tokens
Cost: 62,500 × $0.00000002 = $0.00125 (one-time)
```

**Query embeddings:**
```
180 queries × 100 tokens average = 18,000 tokens
Cost: 18,000 × $0.00000002 = $0.00036/month
```

**Embedding Subtotal:** ~$0.01/user/month (essentially free)

---

### 3. Vector Database Costs

#### Recommended: pgvector (in Supabase)

Using pgvector extension in existing Supabase PostgreSQL - no additional cost.

**Storage calculation:**
```
Per user: 25 docs × 10 chunks × 1,536 dimensions × 4 bytes = 1.5 MB
1,000 users: 1.5 GB total
```

This is negligible within Supabase storage allocations.

#### Alternatives (if needed later)

| Solution | Monthly Minimum | Per-User at 1K Users |
|----------|-----------------|----------------------|
| pgvector (Supabase) | $0 | $0 |
| Chroma (self-hosted) | $0 | $0 |
| Qdrant Cloud | ~$25 | $0.025 |
| Pinecone Serverless | $50 | $0.05 |

**Vector DB Subtotal:** $0/user (included in Supabase)

---

### 4. Database & Infrastructure (Supabase)

#### Supabase Pricing Tiers

| Plan | Monthly | Included |
|------|---------|----------|
| Free | $0 | 500MB DB, 1GB storage, 50K MAU |
| Pro | $25 | 8GB DB, 100GB storage, 100K MAU |
| Team | $599 | + SOC2, SSO, priority support |

#### OSQR Infrastructure Plan

**At launch (< 500 users):** Supabase Pro ($25/month)

| Component | Included | Overage Rate | Est. Overage |
|-----------|----------|--------------|--------------|
| Database | 8GB | $0.125/GB | $0-5 |
| Storage | 100GB | $0.021/GB | $0-2 |
| Egress | 250GB | $0.09/GB | $0-5 |
| MAU | 100,000 | $0.00325/MAU | $0 |

**Monthly infrastructure cost:** $25-40 (mostly fixed)

**Per-user cost at 500 users:** $40 ÷ 500 = $0.08/user

**Per-user cost at 1,000 users:** $45 ÷ 1,000 = $0.045/user

---

### 5. Authentication (Clerk)

| Tier | Monthly | MAU Included | Overage |
|------|---------|--------------|---------|
| Free | $0 | 10,000 | - |
| Pro | $25 | 10,000 | $0.02/MAU |

**At launch:** Free tier covers initial growth

**At 1,000 MAU:** Still free

**At 10,000+ MAU:** $25 + overages

**Per-user cost:** ~$0.025/user at scale

---

### 6. Hosting & Domains

| Service | Monthly Cost |
|---------|--------------|
| Vercel (hosting) | $0-20 |
| Cloudflare (DNS/CDN) | $0-5 |
| Domain registration | ~$1 |

**Hosting Subtotal:** ~$5-25/month (fixed)

---

## Total Cost Summary

### Per-User Variable Costs (Monthly)

| Category | Cost | % of Total |
|----------|------|------------|
| LLM Inference | $4.07 | 97.4% |
| Embeddings | $0.01 | 0.2% |
| Vector DB | $0.00 | 0% |
| Infrastructure (amortized) | $0.05 | 1.2% |
| Auth (amortized) | $0.05 | 1.2% |
| **Total Per User** | **$4.18** | 100% |

*At realistic usage (180 queries/month, 20 Contemplate)*

### Fixed Monthly Costs

| Category | Cost |
|----------|------|
| Supabase Pro | $25 |
| Clerk (if over 10K) | $0-25 |
| Vercel | $0-20 |
| Cloudflare | $0-5 |
| Domains | $1 |
| **Fixed Total** | **$26-76** |

---

## Margin Analysis by Tier

### Lite Tier ($19/month)

| Metric | Value |
|--------|-------|
| Price | $19.00 |
| Per-user cost | $4.18 |
| Gross margin | $14.82 |
| **Margin %** | **78%** |

### Pro Tier ($99/month)

| Metric | Value |
|--------|-------|
| Price | $99.00 |
| Per-user cost | ~$30 |
| Gross margin | $69.00 |
| **Margin %** | **70%** |

### Master Tier ($249/month)

Master users use more Opus/Council. Adjusted cost: ~$75/month

| Metric | Value |
|--------|-------|
| Price | $249.00 |
| Per-user cost | ~$75 |
| Gross margin | $174.00 |
| **Margin %** | **70%** |

---

## Scaling Projections

### Revenue & Cost at Scale

| Users | Monthly LLM | Infrastructure | Total Cost | Revenue (Pro) | Net Margin |
|-------|-------------|----------------|------------|---------------|------------|
| 100 | $3,000 | $50 | $3,050 | $9,900 | **69%** |
| 500 | $15,000 | $75 | $15,075 | $49,500 | **70%** |
| 1,000 | $30,000 | $100 | $30,100 | $99,000 | **70%** |
| 5,000 | $150,000 | $300 | $150,300 | $495,000 | **70%** |
| 10,000 | $300,000 | $500 | $300,500 | $990,000 | **70%** |

### Breakeven Analysis

**Fixed costs:** ~$50/month minimum

**Breakeven users:** $50 ÷ ($99 - $30) = **0.7 Pro users**

With safety margin: **2 Pro users** covers all fixed costs comfortably.

---

## Scenario Analysis

### Scenario 1: Average User

- 15 queries/day × 12 active days = 180 queries
- 90% standard, 10% Contemplate
- **Monthly cost: $4.18**
- **Pro margin: 91%**

### Scenario 2: Power User

- 30 queries/day × 20 active days = 600 queries
- 80% standard, 20% Contemplate
- **Monthly cost: $11.50**
- **Pro margin: 77%**

### Scenario 3: Light User

- 8 queries/day × 8 active days = 64 queries
- 95% standard, 5% Contemplate
- **Monthly cost: $1.35**
- **Pro margin: 97%**

### Scenario 4: Abuse-Level Usage

- 100 queries/day × 30 days = 3,000 queries
- 70% standard, 30% Contemplate
- **Monthly cost: $65.00**
- **Pro margin: -33%** ❌

This is why throttle limits exist. The 100/day Pro limit protects against this.

---

## Cost Optimization Levers

### Available Now

| Lever | Potential Savings | Implementation |
|-------|-------------------|----------------|
| Prompt caching | 30-50% on LLM | Use Anthropic cache API |
| Batch API | 50% on async tasks | Use for re-indexing, bulk ops |
| Query deduplication | 5-10% | Cache identical queries |
| Smarter routing | 10-20% | Use cheaper models for simple queries |

### Future Optimization

| Lever | Potential Savings | Timeline |
|-------|-------------------|----------|
| Model fine-tuning | 20-40% | V2.0+ |
| Self-hosted inference | 50-70% | At scale (10K+ users) |
| Negotiated API rates | 10-30% | At volume |

### What NOT to Optimize

- User-facing model quality (brand damage)
- Memory persistence (key differentiator)
- Core insight generation (product value)

---

## Third-Party Service Reference

### Current Pricing (December 2024)

#### Anthropic (Claude)

| Model | Input/1M | Output/1M |
|-------|----------|-----------|
| Opus 4.5 | $5.00 | $25.00 |
| Sonnet 4.5 | $3.00 | $15.00 |
| Haiku 4.5 | $1.00 | $5.00 |
| Haiku 3 | $0.25 | $1.25 |

#### OpenAI

| Model | Input/1M | Output/1M |
|-------|----------|-----------|
| GPT-4o | $2.50 | $10.00 |
| GPT-4o Mini | $0.15 | $0.60 |
| text-embedding-3-small | $0.02 | - |
| text-embedding-3-large | $0.13 | - |

#### Google (Gemini)

| Model | Input/1M | Output/1M |
|-------|----------|-----------|
| Gemini 3 Pro | $2.00 | $12.00 |
| Gemini 3 Flash | $0.50 | $3.00 |
| Gemini 2.0 Flash-Lite | $0.075 | $0.30 |

#### Groq

| Model | Input/1M | Output/1M | Speed |
|-------|----------|-----------|-------|
| Llama 4 Maverick | $0.20 | $0.60 | 562 t/s |
| Llama 4 Scout | $0.11 | $0.34 | 594 t/s |
| Llama 3.3 70B | $0.59 | $0.79 | 394 t/s |
| Llama 3.1 8B | $0.05 | $0.08 | 840 t/s |
| Whisper v3 Turbo | $0.04/hour | - | 228x realtime |

#### Infrastructure

| Service | Plan | Price | Included |
|---------|------|-------|----------|
| Supabase | Pro | $25/mo | 8GB DB, 100GB storage |
| Supabase | Team | $599/mo | + SOC2, SSO |
| Clerk | Free | $0 | 10K MAU |
| Clerk | Pro | $25/mo | + overages |
| Vercel | Hobby | $0 | Basic hosting |
| Vercel | Pro | $20/mo | Team features |

---

## Key Insights

### 1. LLM is Everything

98% of per-user costs are LLM inference. Optimizing anything else is noise until you're at massive scale.

### 2. Margins are Excellent

85-95% gross margins at current pricing. This is a healthy SaaS business even with premium models.

### 3. Fixed Costs are Trivial

5 Pro users cover all infrastructure. This isn't a scale problem.

### 4. Power Users are Absorbable

Even 3x average usage (power users) maintains 77% margin. The throttle protects against abuse, not power users.

### 5. The API is the Consumer Product

No quality difference between API and consumer-facing models. Oscar can be as good as any AI assistant.

---

## Document Connections

| Document | Relationship |
|----------|--------------|
| **Model Routing Spec** | Technical implementation of model decisions |
| **Free Tier Architecture** | Throttle system that protects margins |
| **Conversion Strategy** | Pricing and tier decisions |
| **Insights System** | Major cost driver (insight generation) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial analysis |

---

## Appendix: Calculation Formulas

### LLM Cost Per Query
```
cost = (input_tokens × input_price_per_token) + (output_tokens × output_price_per_token)
```

### Monthly User Cost
```
monthly_cost = Σ(queries_by_type × cost_per_query_type)
```

### Gross Margin
```
margin = (price - cost) / price × 100
```

### Breakeven Users
```
breakeven = fixed_costs / (price_per_user - variable_cost_per_user)
```

---

**End of Document**

*Document Version: 1.0*  
*Status: Current*  
*Next Review: After V1.0 launch with real usage data*
