# How to Secure Your Model Context Protocol Estate

**Source:** Stacklok
**Topic:** Enterprise MCP Security Framework
**Prediction:** By end of 2026, 75% of enterprises will be using MCP servers

---

## Introduction: The "S" in MCP Stands for Security

> "A common joke at the expense of MCP is that the 'S' stands for security."

When MCP was introduced in November 2024, the focus was on interoperability and usability. Early adopters were expected to run MCP in controlled environments.

### The Current Reality

- **2025 alone:** Thousands of MCP servers published
- **Risk:** Developers can 'npm install' random stuff off the internet
- **Result:** Malicious actors are already exploring MCP's attack surface

### Progress Made

- Proper governance structure now in place
- Improved authorization specification based on OAuth 2.1
- Clarified security best practices for MCP server authors

**However:** In practice, it's still the "wild west" as organizations roll their own policies.

---

## Current Security Concerns

### 1. Prompt Injection

An attacker crafts inputs that trick a client into:
- Invoking a tool in unauthorized ways
- Revealing sensitive information retrieved via MCP
- Exposing customer PII (GDPR violations)

### 2. Tool Poisoning

MCP server's description, schema, or behavior can be manipulated so the client is misled about what it does:
- Instructions could trick client into exfiltrating data
- Privilege escalation
- Going rogue

### 3. Weak Provenance

- No universal concept of provenance for MCP servers
- Difficult/impossible to know who is behind a given server
- Can't assess trustworthiness or update frequency
- **Enterprises are flying blind**

### 4. BYO-Server Risk

With thousands of MCP servers available:
- Hard to know which ones to trust
- Without access control, clients may connect to low-quality or infected servers

### 5. Shadow AI

When employees use clients/context without central controls:
- Data leakage
- Compliance gaps
- IP leakage
- Sensitive data exposure (passwords, PII) via simple copy-paste

### 6. Misconfiguration

When employees configure their own MCP servers:
- Inconsistencies across team/enterprise
- Inconsistent outputs
- Inaccuracies
- Mistrust

### 7. Over-Privileged Access

If a client is granted broad authorization:
- May access more data than intended
- Perform more actions than intended
- Surface sensitive details to non-permissioned employees
- Data exfiltration

---

## Ten Steps to a Secure MCP Estate

### Step 1: Curating a Trusted Registry

**Problem:** Thousands of MCP servers with wide variance in quality. Official MCP registry may overwhelm users.

**Solution:**
- Curate your own registry of trusted MCP servers
- Pre-assign MCP servers to specific roles
- Group multiple MCP servers to tackle specific tasks
- Use a centralized control plane

### Step 2: Isolating Servers

**Problem:** Unclear how MCP servers communicate. Could interact with other servers or spill sensitive information.

**Solution: Containerization**
- Containerize each MCP server
- Introduces simple, useful form of isolation
- Limits blast radius of any issue
- Apply network isolation to verify/enforce which external hosts can be contacted

**Permission Options:**
| Level | Description |
|-------|-------------|
| Defined profiles | Restrict traffic to internal domains or specific cloud services |
| Maximum isolation | 'None' designation disallows outbound communication |

### Step 3: Preconfiguring MCP Servers

**Problem:** Inconsistent configuration of hosts, transports, communications, credentials across users.

**Solution:**
- Preconfigure all pieces so employees only connect and move on
- Requires MCP control plane
- Natural complement to trusted registry curation

### Step 4: Implementing AuthN to Z

**Key Distinction:**
| Concern | Purpose |
|---------|---------|
| **Authentication (authN)** | Verifies who is making a request |
| **Authorization (authZ)** | Determines what that identity is allowed to do |

**Current State:**
- MCP addresses authentication with OAuth 2.1 (recommendation, not requirement)
- Most MCP servers do not include authentication
- MCP does not address authorization (expects servers validate access tokens)

**Recommendations:**
- Use OpenID Connect (OIDC) to eliminate custom security code
- Integrate with existing identity provider
- Apply finer-grained permissions and least privilege access
- **Critical Issue:** Current toolchain treats all agentic actions as performed by the user (incorrect)

### Step 5: Managing Secrets

**Problem:** MCP spec doesn't direct how to handle secrets. Many users put secrets in:
- Plain text configuration files
- Environment variables (easy to leak)

**Solution:**
- Integrate with existing secrets management solution
- Options: 1Password, macOS Keychain, HashiCorp Vault
- Example: ToolHive control plane + HashiCorp Vault integration

### Step 6: Sanitizing Inputs and Outputs

**Need:** Every tool must be sanitized.

**Validation Requirements:**
- Parameter-type checking
- Length limits
- Schema libraries
- Format validation
- SQL injection prevention
- Command injection prevention

**Solution: MCP Gateway**
- Intercepts tool call requests before reaching tool
- Checks formats, limits scope, removes suspicious inputs
- Works similarly to web application firewall
- Redacts secrets/PII from tool responses before passing to client

### Step 7: Server Provenance and Signing

**Problem:** Thousands of MCP servers, difficult to assess trustworthiness.

**Solution: Apply Open Source Learnings**
- Determine provenance: identify creators, maintainers, relationships
- Assess trustworthiness based on entity reputation
- Use solutions like **Sigstore** for signed attestation of MCP server provenance

**Enterprise Action:** Look for indicators of trustworthiness when curating registries.

### Step 8: Server Update and Version Management

**Risk:** Outdated servers may contain bugs/vulnerabilities that attackers exploit to:
- Escalate privileges
- Bypass isolation
- Exfiltrate data

**Actions:**
- Ensure using most up-to-date version
- Use curated registry to pin versions
- Record and verify exact MCP server version and permissions
- Set up alerts for new versions
- Define SLAs for patching (like OS/container updates)

### Step 9: Ensuring Observability and Auditability

**Requirements:**
- Log all tool calls and responses
- Monitor suspicious patterns
- Track authentication failures
- Receive alerts on unusual behavior

**Recommendation:**
- Integrate with existing observability solution
- Align with Security Operations Center
- Build shared visibility of MCP estate

### Step 10: Testing Your MCP Server Packaging Pipeline

When building your own MCP server, ensure:

| Requirement | Description |
|-------------|-------------|
| Reproducible builds | Consistent, verifiable build process |
| Network policies | Limit egress |
| Private registries | Push versioned artifacts |
| Fast rollback | Quick recovery capability |
| Drift detection | Identify unexpected changes |

---

## Summary: The Security Checklist

| Step | Focus Area |
|------|------------|
| 1 | Trusted Registry |
| 2 | Server Isolation (Containers) |
| 3 | Preconfiguration |
| 4 | Authentication & Authorization |
| 5 | Secrets Management |
| 6 | Input/Output Sanitization |
| 7 | Provenance & Signing |
| 8 | Version Management |
| 9 | Observability & Auditability |
| 10 | Secure Build Pipeline |

---

## Conclusions

> "There's a ton of energy around the Model Context Protocol. Thousands of MCP servers have been published in less than a year, and vendors are touting new tools that make it easier and faster to create more servers. In short, the excitement is accompanied by some chaos."

### Key Points

1. **Malicious actors attracted** - Expect increasing attacks as surface area grows
2. **Shadow AI emergence** - Internal challenges as enterprises adopt MCP
3. **Proactive approach needed** - Get ahead of the wave
4. **Foundational tools required** - Control plane, registry, gateway
5. **Expert guidance valuable** - Security expertise for production deployment

### The Bottom Line

Developers must move beyond simple usability to establish a **centralized control plane** that ensures every AI interaction is:
- Authenticated
- Audited
- Strictly governed

---

## Key Terminology

| Term | Definition |
|------|------------|
| **MCP Gateway** | Intercepts and sanitizes tool calls (like WAF for MCP) |
| **Control Plane** | Centralized management for MCP servers |
| **Trusted Registry** | Curated list of approved MCP servers |
| **Provenance** | Verification of who created/maintains an MCP server |
| **Tool Poisoning** | Manipulation of MCP server to mislead clients |
