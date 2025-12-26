# MCP Roadmap: Plans for Evolving Model Context Protocol

**Source:** Official MCP Documentation
**Last Updated:** 2025-10-31
**Next Release:** November 25th, 2025
**Release Candidate:** November 11th, 2025

---

## Overview

The Model Context Protocol is rapidly evolving. This roadmap outlines priority areas for the next release, focusing on transitioning from experimental phase to production-ready ecosystem.

**Note:** These are priorities, not commitments. Solutions may differ from descriptions, and some may not materialize. Community participation is encouraged through linked discussions.

---

## Priority Areas for Next Release

### 1. Asynchronous Operations

**Current State:** MCP is built around mostly synchronous operations.

**What's Changing:**
- Adding async support for long-running tasks
- Servers can kick off tasks while clients check back later
- Enables operations that take minutes or hours without blocking

**Tracking:** SEP-1686

---

### 2. Statelessness and Scalability

**Challenge:** Organizations deploying MCP servers at enterprise scale face horizontal scaling challenges.

**What's Changing:**
- Building on Streamable HTTP's stateless support
- Smoothing rough edges around server startup
- Improving session handling
- Making it easier to run MCP servers in production

**Tracking:** SEP-1442

---

### 3. Server Identity

**What's Changing:**
- Servers can advertise themselves through `.well-known` URLs
- Using established standard for providing metadata
- Clients can discover server capabilities without connecting first
- Enables registry systems to automatically catalog capabilities

**Approach:** Working across multiple industry projects on a common standard for agent cards.

---

### 4. Official Extensions

**Challenge:** Valuable patterns have emerged for specific industries and use cases, but everyone reinvents the wheel.

**What's Changing:**
- Officially recognizing and documenting popular protocol extensions
- Curated collection for specialized domains
- Solid starting point for developers building in specific verticals

**Target Domains:**
- Healthcare
- Finance
- Education
- Other specialized industries

---

### 5. SDK Support Standardization

**What's Changing:** Introducing a clear tiering system for SDKs based on:

| Factor | Description |
|--------|-------------|
| **Specification compliance speed** | How quickly SDK adopts new spec versions |
| **Maintenance responsiveness** | How actively SDK is maintained |
| **Feature completeness** | How fully SDK implements the specification |

**Benefit:** Developers understand exactly what level of support they're getting before committing to a dependency.

---

### 6. MCP Registry General Availability

**Current State:** Launched in preview in September 2025.

**What's Changing:**
- Stabilizing v0.1 API through real-world integrations
- Incorporating community feedback
- Transitioning from preview to production-ready service

**Result:** Reliable, community-driven platform for discovering and sharing MCP servers.

---

## Summary Table

| Priority Area | Status | Goal |
|---------------|--------|------|
| Async Operations | In Progress (SEP-1686) | Long-running task support |
| Statelessness/Scalability | In Progress (SEP-1442) | Enterprise-scale deployment |
| Server Identity | In Development | Discovery via .well-known URLs |
| Official Extensions | Planning | Industry-specific patterns |
| SDK Standardization | Planning | Tiered support system |
| Registry GA | Preview → Production | Stable discovery platform |

---

## Governance and Process

- **Standards Track:** GitHub tracks how proposals progress toward official specification
- **Community Participation:** Discussions linked for each priority area
- **Release Timeline:** Detailed in blog post on next version update
- **Specification Changelog:** Documents what's changing in upcoming release

---

## Key Takeaways

1. **Async support** enables enterprise-scale, long-running operations
2. **Statelessness improvements** make production deployment easier
3. **Server identity** through `.well-known` URLs enables automatic discovery
4. **Official extensions** prevent reinventing the wheel for specialized domains
5. **SDK tiering** provides transparency about dependency quality
6. **Registry GA** establishes reliable server discovery infrastructure
