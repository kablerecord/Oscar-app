# OSQR Constitutional Framework Specification

## Metadata
- **Version**: 1.0
- **Created**: December 2025
- **Status**: Ready for Implementation
- **Dependencies**: None (this is the foundational layer)
- **Blocked By**: None
- **Enables**: Plugin Architecture, Honesty Tiers, Council Mode, Bubble Interface, all user-facing features

## Executive Summary
The Constitutional Framework is OSQR's governance layer — the immutable rules that constrain all system behavior regardless of plugins, user preferences, or mode configurations. It enforces three unbreakable principles (User Data Sovereignty, Identity Transparency, Baseline Honesty) through runtime mechanisms that prevent circumvention by prompt engineering, plugin manipulation, or multi-turn attacks. Everything else in OSQR is user/market choice; the constitution only prevents harm.

## Scope

### In Scope
- Definition of the three immutable constitutional elements
- Runtime enforcement mechanisms (gatekeeper, sandboxing, validation)
- Violation detection and response patterns
- Auditability and traceability requirements
- Plugin capability boundaries (what plugins CAN and CANNOT do)
- Architecture for constitutional checks in the request/response flow

### Out of Scope (Deferred)
- Mode interaction rules (user choice, not constitutional)
- Plugin preference hierarchy (market decides)
- Honesty style mandates beyond baseline (plugins compete)
- Proactivity limits beyond interrupt budget infrastructure
- Specific jailbreak detection ML models (v2.0)
- Constitutional amendment governance process (v1.1)

## Architecture

### System Context
The Constitutional Framework sits at the top of OSQR's processing pipeline. Every user request passes through the Constitutional Gatekeeper before reaching any plugin or model. Every response passes through the Output Validator before reaching the user.

```
USER INPUT
    ↓
┌─────────────────────────────────────────────────────────────┐
│              CONSTITUTIONAL GATEKEEPER                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Immutable Core Rules (hardcoded)                     │  │
│  │  • User Data Sovereignty                              │  │
│  │  • Identity Transparency                              │  │
│  │  • Baseline Honesty                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Amendable Secondary Rules (version-controlled)       │  │
│  │  • Plugin capability boundaries                       │  │
│  │  • Data access permissions                            │  │
│  │  • Honesty tier definitions                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              HONESTY TIER ROUTER                            │
│  ├─ BASE (mild, always active)                              │
│  ├─ PLUGIN (variable, user-selected)                        │
│  └─ SUPREME COURT (adversarial, earned access)              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              PLUGIN SANDBOX                                 │
│  • Declared capabilities only                               │
│  • No direct PKV write access                               │
│  • Containerized execution                                  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              OUTPUT VALIDATOR                               │
│  • Constitutional compliance check                          │
│  • Honesty tier consistency check                           │
│  • Identity transparency verification                       │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
USER OUTPUT
```

### Core Data Structures

```typescript
// Constitutional clause definitions
interface ConstitutionalClause {
  id: string;                          // e.g., "USER_DATA_SOVEREIGNTY"
  name: string;                        // Human-readable name
  description: string;                 // What this clause protects
  immutable: boolean;                  // true = cannot be overridden, ever
  enforcement: EnforcementMechanism[]; // How this is enforced at runtime
  violationResponse: ViolationResponse;
}

type EnforcementMechanism =
  | "INTENT_FILTER"           // Pre-execution inspection
  | "SANDBOX_BOUNDARY"        // Capability isolation
  | "OUTPUT_VALIDATION"       // Post-execution check
  | "NAMESPACE_VERIFICATION"  // Cryptographic signing
  | "CROSS_TOOL_CONSTRAINT";  // Chaining prevention

interface ViolationResponse {
  action: "SILENT_INTERCEPT" | "GRACEFUL_DECLINE" | "ABSTAIN";
  logLevel: "INFO" | "WARN" | "CRITICAL";
  userMessage?: string;       // Optional graceful decline text
  discloseReason: boolean;    // false = don't educate attackers
}

// The three immutable constitutional elements
const IMMUTABLE_CONSTITUTION: ConstitutionalClause[] = [
  {
    id: "USER_DATA_SOVEREIGNTY",
    name: "User Data Sovereignty",
    description: "Users own their data. Plugins borrow but never own.",
    immutable: true,
    enforcement: ["INTENT_FILTER", "SANDBOX_BOUNDARY"],
    violationResponse: {
      action: "SILENT_INTERCEPT",
      logLevel: "CRITICAL",
      discloseReason: false
    }
  },
  {
    id: "IDENTITY_TRANSPARENCY",
    name: "Identity Transparency",
    description: "Users always know they're using OSQR.",
    immutable: true,
    enforcement: ["OUTPUT_VALIDATION"],
    violationResponse: {
      action: "GRACEFUL_DECLINE",
      logLevel: "WARN",
      userMessage: "I need to be upfront with you about something.",
      discloseReason: false
    }
  },
  {
    id: "BASELINE_HONESTY",
    name: "Baseline Honesty",
    description: "Mild truth-telling cannot be disabled.",
    immutable: true,
    enforcement: ["OUTPUT_VALIDATION"],
    violationResponse: {
      action: "ABSTAIN",
      logLevel: "INFO",
      discloseReason: false
    }
  }
];

// Plugin capability declaration
interface PluginCapabilities {
  pluginId: string;
  version: string;
  signature: string;                    // Cryptographic signature

  // What the plugin is allowed to do
  canModifyCommunicationStyle: boolean;
  canOverrideHonestyTier: boolean;      // Above baseline only
  canInjectKnowledge: boolean;
  canAddTools: string[];                // List of tool IDs
  canAdjustProactivity: boolean;

  // Resource access
  pkvReadAccess: boolean;
  pkvWriteAccess: false;                // Always false - enforced
  networkDomains: string[];             // Allowed external domains
  fileSystemPaths: string[];            // Allowed paths (read-only)
}

// Violation audit log entry
interface ViolationLogEntry {
  timestamp: string;                    // ISO 8601
  requestId: string;
  userId: string;
  clauseViolated: string;               // Constitutional clause ID
  violationType: ViolationType;
  sourceType: "USER_INPUT" | "PLUGIN" | "MODEL_OUTPUT";
  sourceId?: string;                    // Plugin ID if applicable
  action: ViolationResponse["action"];
  context: {
    inputSnippet?: string;              // Sanitized, truncated
    detectionMethod: EnforcementMechanism;
  };
}

type ViolationType =
  | "DATA_ACCESS_ATTEMPT"
  | "IDENTITY_MASKING_ATTEMPT"
  | "HONESTY_BYPASS_ATTEMPT"
  | "CAPABILITY_EXCEEDED"
  | "NAMESPACE_SPOOFING"
  | "PROMPT_INJECTION"
  | "CROSS_TOOL_CHAINING";

// Gatekeeper request validation result
interface GatekeeperResult {
  allowed: boolean;
  clausesChecked: string[];
  violations: ViolationLogEntry[];
  sanitizedInput?: string;              // Cleaned input if allowed
  confidenceScore: number;              // 0-1, for ambiguous cases
}

// Amendable secondary rules (version-controlled)
interface SecondaryRuleset {
  version: string;
  lastModified: string;
  rules: SecondaryRule[];
  changeLog: VersionControlledResolution[];
}

interface SecondaryRule {
  id: string;
  category: "PLUGIN_BOUNDARY" | "DATA_ACCESS" | "HONESTY_TIER";
  rule: string;
  createdAt: string;
  modifiedAt: string;
}

interface VersionControlledResolution {
  resolutionId: string;
  ruleId: string;
  previousValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
  approvedBy: string;
}
```

### Key Algorithms

#### Intent Filter (Pre-Execution Validation)

```typescript
async function validateIntent(
  input: string,
  context: RequestContext,
  activePlugin?: PluginCapabilities
): Promise<GatekeeperResult> {
  const violations: ViolationLogEntry[] = [];
  const clausesChecked: string[] = [];

  // Phase 1: Check immutable constitutional clauses
  for (const clause of IMMUTABLE_CONSTITUTION) {
    clausesChecked.push(clause.id);

    const violation = await checkClauseViolation(input, context, clause);
    if (violation) {
      violations.push(violation);

      // Immutable violations = immediate rejection
      if (clause.immutable) {
        await logViolation(violation);
        return {
          allowed: false,
          clausesChecked,
          violations,
          confidenceScore: 1.0  // Certain this is a violation
        };
      }
    }
  }

  // Phase 2: Check plugin capability boundaries
  if (activePlugin) {
    const capabilityViolation = await checkPluginCapabilities(
      input,
      context,
      activePlugin
    );
    if (capabilityViolation) {
      violations.push(capabilityViolation);
      await logViolation(capabilityViolation);
      return {
        allowed: false,
        clausesChecked,
        violations,
        confidenceScore: 1.0
      };
    }
  }

  // Phase 3: Check for indirect prompt injection patterns
  const injectionScore = await detectPromptInjection(input);
  if (injectionScore > INJECTION_THRESHOLD) {
    const violation = createViolationEntry(
      "PROMPT_INJECTION",
      "USER_INPUT",
      "INTENT_FILTER"
    );
    violations.push(violation);
    await logViolation(violation);

    // Conservative abstention under ambiguity
    return {
      allowed: false,
      clausesChecked,
      violations,
      confidenceScore: injectionScore
    };
  }

  // Phase 4: Check for cross-tool chaining attempts
  if (context.previousToolCalls?.length > 0) {
    const chainingViolation = await checkCrossToolChaining(
      input,
      context.previousToolCalls
    );
    if (chainingViolation) {
      violations.push(chainingViolation);
      // This one requires user approval, not automatic rejection
      return {
        allowed: false,
        clausesChecked,
        violations,
        confidenceScore: 0.7
      };
    }
  }

  return {
    allowed: true,
    clausesChecked,
    violations: [],
    sanitizedInput: sanitize(input),
    confidenceScore: 1.0
  };
}

const INJECTION_THRESHOLD = 0.75;
```

#### Output Validator (Post-Execution Validation)

```typescript
async function validateOutput(
  output: string,
  context: ResponseContext,
  activePlugin?: PluginCapabilities
): Promise<{ valid: boolean; sanitizedOutput?: string; violations: ViolationLogEntry[] }> {
  const violations: ViolationLogEntry[] = [];

  // Check 1: Identity Transparency
  // Ensure output doesn't mask OSQR's identity
  if (await detectIdentityMasking(output)) {
    violations.push(createViolationEntry(
      "IDENTITY_MASKING_ATTEMPT",
      "MODEL_OUTPUT",
      "OUTPUT_VALIDATION"
    ));
    return { valid: false, violations };
  }

  // Check 2: Baseline Honesty
  // Ensure output maintains minimum honesty threshold
  const honestyScore = await evaluateHonesty(output, context);
  if (honestyScore < BASELINE_HONESTY_THRESHOLD) {
    violations.push(createViolationEntry(
      "HONESTY_BYPASS_ATTEMPT",
      "MODEL_OUTPUT",
      "OUTPUT_VALIDATION"
    ));
    // Don't reject outright - apply honesty correction
    output = await applyBaselineHonesty(output, context);
  }

  // Check 3: Data Leakage
  // Ensure output doesn't expose other users' data
  if (await detectDataLeakage(output, context.userId)) {
    violations.push(createViolationEntry(
      "DATA_ACCESS_ATTEMPT",
      "MODEL_OUTPUT",
      "OUTPUT_VALIDATION"
    ));
    return { valid: false, violations };
  }

  return {
    valid: violations.length === 0 ||
           violations.every(v => v.action !== "SILENT_INTERCEPT"),
    sanitizedOutput: output,
    violations
  };
}

const BASELINE_HONESTY_THRESHOLD = 0.6;
```

#### Plugin Sandbox Enforcement

```typescript
class PluginSandbox {
  private plugin: PluginCapabilities;
  private allowedOperations: Set<string>;

  constructor(plugin: PluginCapabilities) {
    this.plugin = plugin;
    this.allowedOperations = this.computeAllowedOperations();
  }

  private computeAllowedOperations(): Set<string> {
    const ops = new Set<string>();

    if (this.plugin.canModifyCommunicationStyle) ops.add("MODIFY_STYLE");
    if (this.plugin.canOverrideHonestyTier) ops.add("OVERRIDE_HONESTY");
    if (this.plugin.canInjectKnowledge) ops.add("INJECT_KNOWLEDGE");
    if (this.plugin.canAdjustProactivity) ops.add("ADJUST_PROACTIVITY");
    if (this.plugin.pkvReadAccess) ops.add("PKV_READ");
    // PKV_WRITE is NEVER added - constitutional constraint

    this.plugin.canAddTools.forEach(tool => ops.add(`TOOL:${tool}`));

    return ops;
  }

  async execute(
    operation: string,
    payload: unknown
  ): Promise<{ success: boolean; result?: unknown; violation?: ViolationLogEntry }> {
    // Verify operation is allowed
    if (!this.allowedOperations.has(operation)) {
      return {
        success: false,
        violation: createViolationEntry(
          "CAPABILITY_EXCEEDED",
          "PLUGIN",
          "SANDBOX_BOUNDARY",
          this.plugin.pluginId
        )
      };
    }

    // Verify namespace (prevent spoofing)
    if (!await this.verifyNamespace()) {
      return {
        success: false,
        violation: createViolationEntry(
          "NAMESPACE_SPOOFING",
          "PLUGIN",
          "NAMESPACE_VERIFICATION",
          this.plugin.pluginId
        )
      };
    }

    // Execute in isolated context
    try {
      const result = await this.isolatedExecute(operation, payload);
      return { success: true, result };
    } catch (error) {
      // Log but don't expose internal errors to user
      await logError(error, this.plugin.pluginId);
      return { success: false };
    }
  }

  private async verifyNamespace(): Promise<boolean> {
    // Verify cryptographic signature matches declared plugin
    return await verifyCryptographicSignature(
      this.plugin.pluginId,
      this.plugin.signature
    );
  }

  private async isolatedExecute(
    operation: string,
    payload: unknown
  ): Promise<unknown> {
    // Containerized execution with resource limits
    // Implementation depends on runtime environment
    return executeInContainer({
      operation,
      payload,
      limits: {
        maxMemory: "256MB",
        maxCpu: "500m",
        networkDomains: this.plugin.networkDomains,
        fileSystemPaths: this.plugin.fileSystemPaths,
        timeout: 30000
      }
    });
  }
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/src/constitution/` directory structure
- [ ] Implement `ConstitutionalClause` and related type definitions in `types.ts`
- [ ] Define the three immutable clauses in `clauses.ts`
- [ ] Create `ViolationLogEntry` schema and logging utility
- [ ] Set up version-controlled secondary rules storage (JSON or database)

### Phase 2: Core Logic
- [ ] Implement `validateIntent()` function (Intent Filter)
- [ ] Implement `validateOutput()` function (Output Validator)
- [ ] Implement `PluginSandbox` class with capability enforcement
- [ ] Implement `detectPromptInjection()` heuristics (pattern matching v1)
- [ ] Implement `checkCrossToolChaining()` for tool combination detection
- [ ] Implement `verifyNamespace()` for cryptographic signature verification

### Phase 3: Integration
- [ ] Wire Constitutional Gatekeeper into main request pipeline
- [ ] Wire Output Validator into response pipeline
- [ ] Integrate with Plugin Architecture (sandbox enforcement)
- [ ] Integrate with Honesty Tier Router
- [ ] Integrate with PKV for data sovereignty enforcement
- [ ] Create graceful decline message templates

### Phase 4: Testing
- [ ] Unit tests for each constitutional clause enforcement
- [ ] Unit tests for Intent Filter edge cases
- [ ] Unit tests for Output Validator edge cases
- [ ] Integration test: plugin attempting to exceed capabilities
- [ ] Integration test: prompt injection detection
- [ ] Integration test: cross-tool chaining prevention
- [ ] Integration test: identity masking prevention
- [ ] Adversarial test suite: common jailbreak patterns

## API Contracts

### Inputs

```typescript
// Main entry point - called on every user request
async function processRequest(request: OSQRRequest): Promise<OSQRResponse>;

interface OSQRRequest {
  requestId: string;
  userId: string;
  input: string;
  context: {
    conversationId: string;
    previousMessages: Message[];
    previousToolCalls: ToolCall[];
    activePlugin?: string;
    honestyTier: "BASE" | "PLUGIN" | "SUPREME_COURT";
  };
  metadata: {
    timestamp: string;
    source: "WEB" | "MOBILE" | "VOICE" | "VSCODE";
  };
}
```

### Outputs

```typescript
interface OSQRResponse {
  requestId: string;
  success: boolean;
  output?: string;

  // Constitutional metadata (internal, not exposed to user)
  constitutional: {
    gatekeeperResult: GatekeeperResult;
    validatorResult: {
      valid: boolean;
      violations: ViolationLogEntry[];
    };
    totalLatencyMs: number;
  };

  // Only populated if success=false
  error?: {
    type: "CONSTITUTIONAL_VIOLATION" | "PLUGIN_ERROR" | "MODEL_ERROR";
    userMessage: string;  // Graceful, non-disclosing
  };
}
```

### Events Emitted

```typescript
// Emitted on any constitutional violation
interface ConstitutionalViolationEvent {
  eventType: "CONSTITUTIONAL_VIOLATION";
  violation: ViolationLogEntry;
  handled: boolean;
}

// Emitted when secondary rules are modified
interface RulesetModifiedEvent {
  eventType: "RULESET_MODIFIED";
  resolution: VersionControlledResolution;
}
```

## Configuration

### Environment Variables

```env
# Constitutional Framework Settings
OSQR_CONSTITUTION_LOG_LEVEL=INFO           # INFO | WARN | CRITICAL
OSQR_CONSTITUTION_INJECTION_THRESHOLD=0.75  # 0-1, higher = more permissive
OSQR_CONSTITUTION_HONESTY_THRESHOLD=0.6     # 0-1, baseline honesty floor
OSQR_CONSTITUTION_ENABLE_AUDIT_LOG=true     # Log all violations
OSQR_CONSTITUTION_SECONDARY_RULES_PATH=/config/secondary-rules.json
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `INJECTION_THRESHOLD` | 0.75 | Prompt injection detection sensitivity |
| `BASELINE_HONESTY_THRESHOLD` | 0.6 | Minimum honesty score for outputs |
| `SANDBOX_TIMEOUT_MS` | 30000 | Max plugin execution time |
| `SANDBOX_MAX_MEMORY` | 256MB | Max memory per plugin |
| `AUDIT_LOG_RETENTION_DAYS` | 90 | How long to keep violation logs |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| Immutable clause violation | Silent intercept, log, graceful decline | User sees natural decline, no error |
| Plugin capability exceeded | Block operation, log violation | Plugin operation skipped, core OSQR responds |
| Prompt injection detected (high confidence) | Block request, log | User asked to rephrase |
| Prompt injection detected (low confidence) | Conservative abstention | OSQR asks clarifying question |
| Cross-tool chaining detected | Pause, request user approval | Wait for explicit user confirmation |
| Plugin signature verification failed | Block plugin entirely | Fall back to base OSQR |
| Output validation failed | Intercept response, regenerate | Retry with stricter constraints |
| Gatekeeper timeout | Allow with logging | Log for review, don't block user |

### Graceful Decline Templates

```typescript
const GRACEFUL_DECLINES = {
  DATA_SOVEREIGNTY: "I need to keep that information private.",
  IDENTITY_MASKING: "I should be upfront with you about something.",
  CAPABILITY_EXCEEDED: "I can't do that with this particular setup.",
  AMBIGUOUS_REQUEST: "I want to make sure I understand what you're asking.",
  CROSS_TOOL_CHAINING: "Before I do that, I want to confirm you want me to..."
};
```

## Success Criteria

1. [ ] All three immutable clauses are enforced and cannot be bypassed by any combination of user input, plugin configuration, or mode selection
2. [ ] Violation audit log captures 100% of detected violations with clause linkage
3. [ ] Plugin sandbox prevents any plugin from writing to PKV or accessing data outside declared scope
4. [ ] Output validator catches identity masking attempts with >95% accuracy
5. [ ] Prompt injection detection catches common patterns (role confusion, delimiter injection, instruction override) with <5% false positive rate
6. [ ] Graceful decline messages never disclose security mechanisms
7. [ ] Secondary rules can be modified via version-controlled process with rollback capability
8. [ ] Constitutional checks add <50ms latency to request/response cycle
9. [ ] System fails closed: any gatekeeper error results in conservative abstention, not permission

## Open Questions

- [ ] **Jailbreak detection ML**: Should v1.0 use pattern matching only, or invest in a lightweight classifier? Pattern matching for now, flag for v1.1.
- [ ] **Constitutional amendment process**: How are secondary rules modified? Who approves? Defer to v1.1, use manual JSON editing for v1.0.
- [ ] **Cross-tool chaining approval UX**: What does the user see when we pause for approval? Needs UI design coordination.
- [ ] **Supreme Court + Constitution**: Does Supreme Court's "no guardrails on honesty" mean it can override baseline honesty? Decision: NO. Supreme Court removes politeness, not safety. Baseline honesty is safety.
- [ ] **Plugin signature infrastructure**: Where do we store/verify plugin signatures? Needs coordination with Plugin Architecture spec.
- [ ] **Violation alerting**: Should critical violations alert Kable/admin in real-time? Defer to v1.1.

## Research Foundation

This specification is derived from NotebookLM research synthesis on AI governance patterns:

- **Model Context Protocol (MCP)**: Intent filtering, capability negotiation, namespace verification, human-in-the-loop approval patterns
- **SASE (Structured Agentic Software Engineering)**: MentorScript for codified rules, LoopScript for SOPs, Version Controlled Resolutions for auditability
- **BMAD Method**: Agent-as-code paradigm, customization fields with precedence, expansion packs for specialization without bloating core
- **Multi-Agent System (MAS) patterns**: Gatekeeper architecture, context isolation, hierarchical coordination, decentralized consensus
- **Claude model behaviors**: Conservative abstention under ambiguity, observation-before-action, refusal patterns with stop_reason

Key analogy from research: If an AI system is a high-security laboratory, "politeness filters" are the employee handbook (plugins can modify), while "safety guardrails" are the biocontainment seals (OSQR enforces, nothing overrides).

## Appendices

### A: Violation Response Decision Tree

```
Violation Detected
    ↓
Is clause immutable?
    ├─ YES → Silent intercept → Log (CRITICAL) → Graceful decline
    └─ NO → Check severity
              ├─ HIGH → Log (WARN) → Graceful decline
              ├─ MEDIUM → Log (INFO) → Request clarification
              └─ LOW → Log (INFO) → Allow with monitoring
```

### B: Example Payloads

#### Valid Request (passes gatekeeper)

```json
{
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "input": "Help me think through my business strategy",
  "context": {
    "conversationId": "conv_123",
    "previousMessages": [],
    "previousToolCalls": [],
    "activePlugin": "fourth-generation-formula",
    "honestyTier": "PLUGIN"
  },
  "metadata": {
    "timestamp": "2025-12-19T10:30:00Z",
    "source": "WEB"
  }
}
```

#### Violation Log Entry

```json
{
  "timestamp": "2025-12-19T10:30:15Z",
  "requestId": "req_def456",
  "userId": "user_xyz",
  "clauseViolated": "USER_DATA_SOVEREIGNTY",
  "violationType": "DATA_ACCESS_ATTEMPT",
  "sourceType": "PLUGIN",
  "sourceId": "malicious-plugin-v1",
  "action": "SILENT_INTERCEPT",
  "context": {
    "inputSnippet": "[REDACTED]",
    "detectionMethod": "SANDBOX_BOUNDARY"
  }
}
```

### C: File Structure

```
/src/constitution/
├── index.ts                    # Main exports
├── types.ts                    # All TypeScript interfaces
├── clauses.ts                  # Immutable clause definitions
├── gatekeeper.ts               # Intent validation logic
├── validator.ts                # Output validation logic
├── sandbox.ts                  # Plugin sandbox enforcement
├── detection/
│   ├── injection.ts            # Prompt injection detection
│   ├── chaining.ts             # Cross-tool chaining detection
│   └── patterns.ts             # Known attack patterns
├── logging/
│   ├── audit.ts                # Violation audit logging
│   └── tracing.ts              # Request tracing
├── rules/
│   ├── secondary.ts            # Secondary rule management
│   └── versioning.ts           # VCR handling
└── __tests__/
    ├── gatekeeper.test.ts
    ├── validator.test.ts
    ├── sandbox.test.ts
    └── adversarial.test.ts
```
