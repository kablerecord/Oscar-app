# OSQR Plugin Architecture Specification

## Metadata
- **Version**: 1.0
- **Created**: December 19, 2024
- **Status**: Ready for Implementation
- **Dependencies**: PKV (Private Knowledge Vault), Constitutional Framework, n8n Workflow Engine, MCP Runtime
- **Blocked By**: PKV must support Resource storage and URI-based retrieval; Constitutional Framework must define immutable guardrails
- **Enables**: Creator Marketplace, Fourth Generation Formula Plugin, All future methodology plugins

## Executive Summary

The Plugin Architecture enables third-party creators to package methodologies into AI-delivered plugins that modify OSQR's behavior while preserving constitutional safeguards. Plugins "wear hats, not masks"—they add capabilities and personality layers without overriding core identity. This architecture powers the creator marketplace where thought leaders monetize frameworks as OSQR plugins.

## Scope

### In Scope
- Plugin manifest schema and validation
- MCP integration layer for plugin communication
- State management pattern (PKV as "gradebook," plugins borrow data)
- Plugin activation via user toggles
- Contextual detection for automatic methodology engagement
- Multi-plugin blending with conflict resolution
- Graceful deactivation transitions
- Four capability layers: Knowledge, Tools, Workflows, Style
- Elicitation rendering for guided question flows
- Artifact handling via URI/Resource pattern
- Trust tier system (Verified, Community, Personal)
- Creator analytics (aggregated, anonymized)
- Version pinning and rollback
- Security isolation (containerization, network restrictions, sandboxing)

### Out of Scope (Deferred)
- Pricing/revenue share model for marketplace (v1.1)
- Plugin submission workflow and review process (v1.1)
- Detailed MCP server implementation guide for creators (v1.1)
- Testing and certification requirements for Verified tier (v1.1)
- User-facing permission disclosure UI mockups (v1.1)
- Plugin-to-plugin direct communication (MCP limitation, future protocol versions)
- First-class workflow resumability (MCP roadmap item)

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         OSQR Core                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │Constitutional│  │   Plugin    │  │    Private Knowledge    │  │
│  │  Framework   │  │  Manager    │  │    Vault (PKV)          │  │
│  │  (Immutable) │  │  (Host)     │  │    (State Persistence)  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                    ┌─────┴─────┐                                 │
│                    │   MCP     │                                 │
│                    │  Clients  │                                 │
│                    │  (1 per   │                                 │
│                    │  plugin)  │                                 │
│                    └─────┬─────┘                                 │
└──────────────────────────┼───────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Plugin A  │  │  Plugin B  │  │  Plugin C  │
    │  (MCP      │  │  (MCP      │  │  (MCP      │
    │  Server)   │  │  Server)   │  │  Server)   │
    │            │  │            │  │            │
    │ Container  │  │ Container  │  │ Container  │
    └────────────┘  └────────────┘  └────────────┘
```

**Data Flow:**
1. User toggles plugin ON → Plugin Manager establishes MCP connection
2. Plugin declares capabilities via manifest → OSQR displays behavioral modifications to user
3. User confirms → Plugin tools/resources become available
4. Conversation triggers plugin's topic patterns → Methodology activates
5. Plugin borrows state from PKV → Operates → Returns results to PKV
6. Large artifacts stored as Resources (URI) → Retrieved just-in-time

### Core Data Structures

```typescript
// Plugin Manifest - Required for all OSQR plugins
interface PluginManifest {
  plugin: PluginMetadata;
  behavioral_modifications: BehavioralModifications;
  data_access: DataAccessPermissions;
  constitutional_compliance: ConstitutionalCompliance;
  capabilities: PluginCapabilities;
}

interface PluginMetadata {
  name: string;                           // Display name
  version: string;                        // Semantic version (e.g., "1.0.0")
  creator: string;                        // Creator name
  trust_tier: 'verified' | 'community' | 'personal';
  description: string;                    // Brief description
  icon_uri?: string;                      // Plugin icon URL
}

interface BehavioralModifications {
  communication_style: {
    description: string;                  // Human-readable style description
    intensity: 'subtle' | 'moderate' | 'dominant';
  };
  honesty_tier_override: {
    enabled: boolean;
    default_mode: string;                 // e.g., "encouraging_truth", "drill_sergeant"
    supreme_court_accessible: boolean;    // Can user still invoke max adversarial mode?
  };
  proactive_engagement: {
    can_initiate: boolean;                // Can plugin trigger bubble/proactive UI?
    trigger_topics: string[];             // Keywords for contextual detection
    confidence_threshold: number;         // 0.0-1.0, minimum confidence to activate
  };
  response_formatting?: {
    default_length: 'concise' | 'standard' | 'detailed';
    emoji_usage: 'none' | 'sparse' | 'moderate';
  };
}

interface DataAccessPermissions {
  pkv_read: boolean;
  pkv_write: boolean;
  memory_integration: 'none' | 'reference_only' | 'full';
  external_apis?: string[];               // Declared external API domains
}

// REQUIRED - All fields must be 'preserved'
interface ConstitutionalCompliance {
  user_sovereignty: 'preserved';          // Users own their data
  safety_guardrails: 'preserved';         // Core protections remain active
  identity_core: 'preserved';             // Users know they're using OSQR
}

interface PluginCapabilities {
  tools: MCPToolDefinition[];             // MCP tool definitions
  resources: MCPResourceDefinition[];     // Available data sources
  prompts: MCPPromptTemplate[];           // Reusable prompt templates
}

// MCP Standard Definitions (from protocol)
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

interface MCPResourceDefinition {
  uri: string;                            // e.g., "file:///manuscript.md" or "db://assessment/123"
  name: string;
  description: string;
  mimeType?: string;
}

interface MCPPromptTemplate {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}
```

```typescript
// Plugin State Management
interface PluginState {
  plugin_id: string;
  user_id: string;
  is_active: boolean;
  activated_at: Date | null;
  version_pinned: string | null;          // null = always use latest
  workflow_states: Map<string, WorkflowState>;
}

interface WorkflowState {
  workflow_id: string;                    // e.g., "book_writing_questionnaire"
  started_at: Date;
  last_updated: Date;
  current_step: number;
  total_steps: number;
  accumulated_data: Record<string, any>;  // Answers, scores, etc.
  completed: boolean;
  artifact_uri?: string;                  // URI to generated artifact when complete
}

// Stored in PKV, keyed by plugin_id
interface PluginPKVEntry {
  manifest_hash: string;                  // Verify plugin hasn't changed
  state: PluginState;
  artifacts: ArtifactReference[];
}

interface ArtifactReference {
  uri: string;
  type: 'manuscript' | 'assessment' | 'document' | 'custom';
  created_at: Date;
  size_bytes: number;
}
```

```typescript
// Plugin Manager State
interface PluginManagerState {
  active_plugins: Map<string, ActivePlugin>;
  conflict_resolution_history: ConflictResolution[];
}

interface ActivePlugin {
  manifest: PluginManifest;
  mcp_client: MCPClient;                  // Active connection
  activation_timestamp: Date;
  tools_available: string[];
  resources_available: string[];
}

interface ConflictResolution {
  plugins_involved: string[];
  conflict_type: 'style' | 'honesty' | 'engagement';
  user_choice: string;                    // Which plugin's approach user preferred
  timestamp: Date;
  context_keywords: string[];             // What triggered the conflict
}
```

```typescript
// Elicitation Rendering
interface ElicitationRequest {
  id: string;
  plugin_id: string;
  schema: JSONSchema;                     // What input is needed
  context: string;                        // Why this is being asked
  branching_hint?: string;                // e.g., "If user selects A, next question is about B"
}

interface ElicitationResponse {
  id: string;
  valid: boolean;
  data: any;                              // Validated user input
  validation_errors?: string[];
}

// OSQR renders elicitations conversationally, not as modal UI
// Plugin sends schema → OSQR asks naturally → User responds → OSQR validates → Plugin receives
```

```typescript
// Artifact Handling
interface ArtifactCreationRequest {
  plugin_id: string;
  workflow_id: string;
  content_type: string;                   // e.g., "text/markdown", "application/pdf"
  content: Buffer | string;
  metadata: Record<string, any>;
}

interface ArtifactCreationResponse {
  uri: string;                            // e.g., "pkv://user123/artifacts/manuscript-abc123.md"
  size_bytes: number;
  created_at: Date;
}

// Just-in-time retrieval for large artifacts
interface ArtifactRetrievalRequest {
  uri: string;
  section?: string;                       // Optional: specific section/page
  range?: { start: number; end: number }; // Optional: byte range
}

interface ArtifactRetrievalResponse {
  content: string;
  is_partial: boolean;
  total_size: number;
}
```

```typescript
// Creator Analytics (Aggregated Only)
interface PluginAnalytics {
  plugin_id: string;
  period: { start: Date; end: Date };

  // User counts (never identities)
  total_active_users: number;
  new_users_this_period: number;
  churned_users_this_period: number;

  // Tool usage
  tool_invocations: Map<string, number>;  // tool_name → count
  most_used_tools: string[];

  // Workflow metrics
  workflow_starts: Map<string, number>;   // workflow_id → count
  workflow_completions: Map<string, number>;
  drop_off_points: Map<string, Map<number, number>>; // workflow_id → step → count

  // Engagement
  average_session_duration_seconds: number;
  sessions_per_user_average: number;

  // Ratings (anonymized)
  average_rating: number;
  rating_count: number;
}
```

### Key Algorithms

```typescript
// Contextual Detection - Determines when to engage plugin methodology
function detectPluginContext(
  message: string,
  activePlugins: ActivePlugin[]
): PluginActivation[] {
  const activations: PluginActivation[] = [];

  for (const plugin of activePlugins) {
    const { trigger_topics, confidence_threshold } =
      plugin.manifest.behavioral_modifications.proactive_engagement;

    if (!plugin.manifest.behavioral_modifications.proactive_engagement.can_initiate) {
      continue;
    }

    // Calculate confidence based on keyword presence and context
    let confidence = 0;
    const matchedTopics: string[] = [];

    for (const topic of trigger_topics) {
      // Fuzzy matching with semantic similarity
      const topicScore = calculateTopicRelevance(message, topic);
      if (topicScore > 0.3) {
        matchedTopics.push(topic);
        confidence = Math.max(confidence, topicScore);
      }
    }

    // Boost confidence for multiple topic matches
    if (matchedTopics.length > 1) {
      confidence = Math.min(1.0, confidence + 0.1 * (matchedTopics.length - 1));
    }

    if (confidence >= confidence_threshold) {
      activations.push({
        plugin_id: plugin.manifest.plugin.name,
        confidence,
        matched_topics: matchedTopics,
        should_activate: true
      });
    }
  }

  // Sort by confidence, highest first
  return activations.sort((a, b) => b.confidence - a.confidence);
}

interface PluginActivation {
  plugin_id: string;
  confidence: number;
  matched_topics: string[];
  should_activate: boolean;
}

function calculateTopicRelevance(message: string, topic: string): number {
  // Implementation options:
  // 1. Simple: keyword presence + synonyms
  // 2. Medium: TF-IDF or BM25 scoring
  // 3. Advanced: Embedding similarity (requires vector model)

  // For v1.0, use simple approach with keyword expansion
  const messageLower = message.toLowerCase();
  const topicLower = topic.toLowerCase();

  // Direct match
  if (messageLower.includes(topicLower)) {
    return 0.9;
  }

  // Synonym/related term expansion (hardcoded for common cases)
  const synonymMap: Record<string, string[]> = {
    'legacy': ['inheritance', 'passing down', 'next generation', 'succession'],
    'transfer': ['hand off', 'transition', 'pass on', 'give to'],
    'family business': ['family company', 'family enterprise', 'parents business'],
    'generational': ['generation', 'kids', 'children', 'grandchildren'],
    // Add more as plugins define them
  };

  const synonyms = synonymMap[topicLower] || [];
  for (const synonym of synonyms) {
    if (messageLower.includes(synonym)) {
      return 0.7;
    }
  }

  // Partial word match
  const topicWords = topicLower.split(' ');
  let matchedWords = 0;
  for (const word of topicWords) {
    if (messageLower.includes(word)) {
      matchedWords++;
    }
  }
  if (matchedWords > 0) {
    return 0.4 * (matchedWords / topicWords.length);
  }

  return 0;
}
```

```typescript
// Multi-Plugin Conflict Resolution
function resolvePluginConflict(
  activePlugins: ActivePlugin[],
  conflictType: 'style' | 'honesty' | 'engagement',
  userMessage: string,
  resolutionHistory: ConflictResolution[]
): ConflictResolutionResult {

  // Step 1: Attempt blending if styles are compatible
  if (conflictType === 'style') {
    const styles = activePlugins.map(p => ({
      plugin: p.manifest.plugin.name,
      style: p.manifest.behavioral_modifications.communication_style,
    }));

    const blendable = areStylesBlendable(styles);
    if (blendable) {
      return {
        resolution: 'blend',
        blended_style: createBlendedStyle(styles),
        ask_user: false
      };
    }
  }

  // Step 2: Check history for learned preference
  const relevantHistory = resolutionHistory.filter(r =>
    r.conflict_type === conflictType &&
    r.plugins_involved.every(p => activePlugins.some(ap => ap.manifest.plugin.name === p))
  );

  if (relevantHistory.length >= 3) {
    // User has shown consistent preference
    const preferredPlugin = findMostPreferred(relevantHistory);
    if (preferredPlugin) {
      return {
        resolution: 'learned_preference',
        selected_plugin: preferredPlugin,
        ask_user: false,
        confidence: calculatePreferenceConfidence(relevantHistory, preferredPlugin)
      };
    }
  }

  // Step 3: Ask user
  return {
    resolution: 'ask_user',
    prompt: generateConflictPrompt(activePlugins, conflictType),
    ask_user: true,
    options: activePlugins.map(p => ({
      plugin_id: p.manifest.plugin.name,
      description: describeApproach(p, conflictType)
    }))
  };
}

interface ConflictResolutionResult {
  resolution: 'blend' | 'learned_preference' | 'ask_user';
  blended_style?: BlendedStyle;
  selected_plugin?: string;
  ask_user: boolean;
  prompt?: string;
  options?: { plugin_id: string; description: string }[];
  confidence?: number;
}

function generateConflictPrompt(
  plugins: ActivePlugin[],
  conflictType: string
): string {
  const pluginNames = plugins.map(p => p.manifest.plugin.name).join(' and ');

  switch (conflictType) {
    case 'style':
      return `I have perspectives from ${pluginNames}. Which lens would you like for this?`;
    case 'honesty':
      return `${pluginNames} have different approaches to feedback. Would you prefer supportive or direct for this topic?`;
    case 'engagement':
      return `Both ${pluginNames} have thoughts here. Should I blend them or focus on one?`;
    default:
      return `I can approach this through ${pluginNames}. Which would you prefer?`;
  }
}

function areStylesBlendable(styles: { plugin: string; style: any }[]): boolean {
  // Styles are blendable if intensities don't conflict
  const dominantCount = styles.filter(s => s.style.intensity === 'dominant').length;
  return dominantCount <= 1;
}
```

```typescript
// Graceful Deactivation
async function deactivatePlugin(
  pluginId: string,
  pluginManager: PluginManagerState,
  conversationContext: string
): Promise<DeactivationResult> {
  const plugin = pluginManager.active_plugins.get(pluginId);
  if (!plugin) {
    return { success: false, error: 'Plugin not active' };
  }

  // Generate transition message based on plugin's style
  const transitionMessage = generateTransitionMessage(plugin);

  // Close MCP connection gracefully
  await plugin.mcp_client.close();

  // Remove from active plugins
  pluginManager.active_plugins.delete(pluginId);

  // State remains in PKV (user can reactivate and resume)

  return {
    success: true,
    transition_message: transitionMessage
  };
}

function generateTransitionMessage(plugin: ActivePlugin): string {
  const name = plugin.manifest.plugin.name;
  const style = plugin.manifest.behavioral_modifications.communication_style.description;

  // Create natural transition that acknowledges the shift
  return `I'll step back from the ${style.toLowerCase()} lens now. How else can I help?`;
}

interface DeactivationResult {
  success: boolean;
  error?: string;
  transition_message?: string;
}
```

```typescript
// Manifest Validation
function validateManifest(manifest: unknown): ManifestValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type check
  if (!isPluginManifest(manifest)) {
    return { valid: false, errors: ['Invalid manifest structure'], warnings: [] };
  }

  // Required fields
  if (!manifest.plugin?.name) errors.push('Missing plugin.name');
  if (!manifest.plugin?.version) errors.push('Missing plugin.version');
  if (!manifest.plugin?.creator) errors.push('Missing plugin.creator');
  if (!manifest.plugin?.trust_tier) errors.push('Missing plugin.trust_tier');

  // Constitutional compliance - ALL must be 'preserved'
  if (manifest.constitutional_compliance?.user_sovereignty !== 'preserved') {
    errors.push('constitutional_compliance.user_sovereignty must be "preserved"');
  }
  if (manifest.constitutional_compliance?.safety_guardrails !== 'preserved') {
    errors.push('constitutional_compliance.safety_guardrails must be "preserved"');
  }
  if (manifest.constitutional_compliance?.identity_core !== 'preserved') {
    errors.push('constitutional_compliance.identity_core must be "preserved"');
  }

  // Validate behavioral modifications
  if (manifest.behavioral_modifications) {
    const { proactive_engagement } = manifest.behavioral_modifications;
    if (proactive_engagement) {
      if (proactive_engagement.confidence_threshold < 0 ||
          proactive_engagement.confidence_threshold > 1) {
        errors.push('confidence_threshold must be between 0.0 and 1.0');
      }
      if (proactive_engagement.can_initiate &&
          (!proactive_engagement.trigger_topics ||
           proactive_engagement.trigger_topics.length === 0)) {
        warnings.push('can_initiate is true but no trigger_topics defined');
      }
    }
  }

  // Validate version format (semantic versioning)
  if (manifest.plugin?.version &&
      !/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/.test(manifest.plugin.version)) {
    warnings.push('Version should follow semantic versioning (e.g., 1.0.0)');
  }

  // Validate trust tier
  if (manifest.plugin?.trust_tier &&
      !['verified', 'community', 'personal'].includes(manifest.plugin.trust_tier)) {
    errors.push('trust_tier must be "verified", "community", or "personal"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isPluginManifest(obj: unknown): obj is PluginManifest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'plugin' in obj &&
    'constitutional_compliance' in obj
  );
}
```

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `/src/plugins/` directory structure
- [ ] Implement `PluginManifest` TypeScript interfaces (copy from Core Data Structures above)
- [ ] Implement `validateManifest()` function with all validation rules
- [ ] Create PKV schema extensions for plugin state storage
- [ ] Implement `PluginPKVEntry` serialization/deserialization
- [ ] Set up plugin manifest YAML parser (use `js-yaml` library)
- [ ] Create test manifest file for Fourth Generation Formula plugin

### Phase 2: Core Logic
- [ ] Implement `PluginManager` class with state management
- [ ] Implement MCP client wrapper for plugin connections
- [ ] Implement `detectPluginContext()` with keyword matching
- [ ] Add synonym expansion table for common trigger topics
- [ ] Implement `resolvePluginConflict()` with blending logic
- [ ] Implement `deactivatePlugin()` with graceful transition messages
- [ ] Create conflict resolution history storage in PKV
- [ ] Implement learned preference detection (3+ consistent choices)

### Phase 3: Integration
- [ ] Connect Plugin Manager to n8n workflow engine
- [ ] Implement plugin toggle API endpoints
- [ ] Wire contextual detection into message processing pipeline
- [ ] Implement elicitation renderer (schema → conversational prompt)
- [ ] Implement artifact creation and URI storage
- [ ] Implement just-in-time artifact retrieval
- [ ] Connect plugin analytics aggregation (no PII)
- [ ] Implement version pinning storage and enforcement

### Phase 4: Testing
- [ ] Unit tests for manifest validation (valid and invalid cases)
- [ ] Unit tests for contextual detection (various confidence levels)
- [ ] Unit tests for conflict resolution (blend, preference, ask)
- [ ] Integration test: Full plugin activation flow
- [ ] Integration test: Multi-plugin blending scenario
- [ ] Integration test: Workflow state persistence across sessions
- [ ] Integration test: Artifact creation and retrieval
- [ ] Load test: 10+ simultaneous plugin connections

## API Contracts

### Inputs

```typescript
// Plugin Activation
POST /api/plugins/:pluginId/activate
Request: { user_confirmation: boolean }
Response: {
  success: boolean;
  behavioral_summary: string;  // Human-readable changes
  tools_available: string[];
  resources_available: string[];
}

// Plugin Deactivation
POST /api/plugins/:pluginId/deactivate
Request: {}
Response: {
  success: boolean;
  transition_message: string;
}

// List Active Plugins
GET /api/plugins/active
Response: {
  plugins: Array<{
    id: string;
    name: string;
    activated_at: Date;
    tools: string[];
  }>;
}

// Version Pinning
POST /api/plugins/:pluginId/pin
Request: { version: string }
Response: { success: boolean; pinned_version: string }

// Plugin Tool Invocation (via MCP)
// Routed through n8n, not direct HTTP
MCPRequest: {
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}
MCPResponse: {
  content: Array<{ type: 'text' | 'resource'; text?: string; resource?: MCPResourceDefinition }>;
}
```

### Outputs

```typescript
// Events Emitted (for n8n workflows and logging)
interface PluginActivatedEvent {
  type: 'plugin.activated';
  plugin_id: string;
  user_id: string;
  timestamp: Date;
  tools_count: number;
}

interface PluginDeactivatedEvent {
  type: 'plugin.deactivated';
  plugin_id: string;
  user_id: string;
  timestamp: Date;
  session_duration_seconds: number;
}

interface PluginConflictEvent {
  type: 'plugin.conflict';
  plugins: string[];
  conflict_type: 'style' | 'honesty' | 'engagement';
  resolution: 'blend' | 'learned_preference' | 'ask_user';
  user_choice?: string;
}

interface PluginToolInvokedEvent {
  type: 'plugin.tool_invoked';
  plugin_id: string;
  tool_name: string;
  duration_ms: number;
  success: boolean;
}

interface ArtifactCreatedEvent {
  type: 'plugin.artifact_created';
  plugin_id: string;
  artifact_uri: string;
  artifact_type: string;
  size_bytes: number;
}
```

### State Changes

```typescript
// PKV modifications on plugin activation
// Key: `plugins/${pluginId}/state`
// Value: PluginPKVEntry (serialized JSON)

// PKV modifications on artifact creation
// Key: `plugins/${pluginId}/artifacts/${artifactId}`
// Value: Artifact content (binary or text)

// PKV modifications on workflow progress
// Key: `plugins/${pluginId}/workflows/${workflowId}`
// Value: WorkflowState (serialized JSON)
```

## Configuration

### Environment Variables

```env
# Plugin Architecture Configuration
OSQR_PLUGINS_ENABLED=true
OSQR_PLUGINS_MAX_ACTIVE=10
OSQR_PLUGINS_MCP_TIMEOUT_MS=30000
OSQR_PLUGINS_CONTAINER_MEMORY_MB=512
OSQR_PLUGINS_CONTAINER_CPU_LIMIT=0.5

# Security
OSQR_PLUGINS_NETWORK_ISOLATION=true
OSQR_PLUGINS_ALLOWED_DOMAINS=api.anthropic.com,api.openai.com
OSQR_PLUGINS_SANDBOX_MODE=strict

# Analytics
OSQR_PLUGINS_ANALYTICS_ENABLED=true
OSQR_PLUGINS_ANALYTICS_AGGREGATION_INTERVAL_HOURS=24

# Version Management
OSQR_PLUGINS_AUTO_UPDATE=false
OSQR_PLUGINS_ROLLBACK_RETENTION_DAYS=30
```

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_active_plugins` | 10 | Maximum plugins active simultaneously |
| `mcp_timeout_ms` | 30000 | MCP connection timeout |
| `context_detection_threshold` | 0.5 | Minimum confidence for auto-activation |
| `conflict_history_length` | 50 | Number of resolutions to remember |
| `preference_learning_threshold` | 3 | Consistent choices before learning |
| `artifact_max_size_mb` | 50 | Maximum artifact size |
| `workflow_state_ttl_days` | 365 | How long to keep incomplete workflows |
| `analytics_aggregation_min_users` | 10 | Minimum users before showing analytics |

## Error Handling

### Failure Modes

| Scenario | Response | Fallback |
|----------|----------|----------|
| MCP connection timeout | Log error, emit event | Deactivate plugin, notify user "Plugin temporarily unavailable" |
| Invalid manifest detected | Reject activation | Return validation errors to user |
| Plugin container crashes | Restart container (max 3 attempts) | Deactivate plugin, preserve state in PKV |
| PKV write failure | Retry 3x with backoff | Return error to user, keep in-memory state |
| Artifact too large | Reject creation | Return size limit error, suggest chunking |
| Constitutional violation attempt | Block immediately | Log attempt, notify admin, keep user unaware of specifics |
| Conflicting plugins, user non-responsive | Wait 30s for choice | Apply first plugin's approach, note in history |
| Tool invocation fails | Return error to plugin | Plugin handles error, OSQR reports failure conversationally |
| Version pinned but version removed | Notify user | Offer to update to latest or deactivate |

### Error Response Format

```typescript
interface PluginError {
  code: string;                    // e.g., "PLUGIN_TIMEOUT", "MANIFEST_INVALID"
  message: string;                 // Human-readable
  plugin_id?: string;
  recoverable: boolean;
  suggested_action?: string;       // e.g., "Try again", "Contact creator"
}
```

## Success Criteria

1. [ ] Can activate a plugin via toggle and see behavioral modifications summary
2. [ ] Plugin tools appear in available tool list after activation
3. [ ] Contextual detection triggers plugin engagement when trigger topics mentioned
4. [ ] Two plugins with conflicting styles prompt user for preference
5. [ ] Learned preferences apply after 3 consistent choices
6. [ ] Plugin deactivation produces graceful transition message
7. [ ] Workflow state persists across sessions (close browser, reopen, state intact)
8. [ ] Artifact creation returns URI; retrieval returns content
9. [ ] Just-in-time retrieval works for partial artifact sections
10. [ ] Creator analytics show aggregated data, never individual user info
11. [ ] Version pinning prevents auto-updates to pinned plugins
12. [ ] Constitutional compliance check rejects manifests that don't preserve all three elements
13. [ ] FGF plugin successfully loads and triggers on "legacy transfer" mention

## Open Questions

- [ ] **Synonym expansion strategy**: Hardcoded table vs. embedding similarity? Hardcoded is simpler for v1.0 but doesn't scale. Consider embedding approach for v1.1.
- [ ] **Blending algorithm details**: When styles blend, how exactly are they combined? Need to define specific blending rules for common style pairs.
- [ ] **Analytics privacy threshold**: Is 10 minimum users sufficient to prevent identification? May need differential privacy for small user bases.
- [ ] **Plugin marketplace payments**: How do creators receive revenue? Stripe Connect? Deferred to v1.1 but affects database schema.
- [ ] **Plugin review process**: What does "basic manifest review" mean for Community tier? Human review or automated checks only?
- [ ] **Cross-device sync**: When user activates plugin on mobile, should it auto-activate on desktop? Current design: no, each device independent.
- [ ] **Plugin dependencies**: Can Plugin A require Plugin B? Current design: no. May need for complex methodologies.
- [ ] **Rate limiting**: Should plugins have invocation limits? Who pays for compute?
- [ ] **Offline mode**: Can plugins work offline? MCP requires connection, so currently no.

## Research Foundation

This specification was informed by research synthesized in NotebookLM covering:

- **MCP Protocol Architecture**: Host-Client-Server model, JSON-RPC 2.0 messaging, capability negotiation, elicitation primitives
- **Plugin Sandboxing Patterns**: Containerization, network isolation, file system restrictions, human-in-the-loop approval
- **State Management**: MCP intra-session state (stateful connections), inter-session persistence (external storage required like Durable Objects/Workers KV)
- **Artifact Handling**: URI-based identification, just-in-time retrieval, progressive disclosure, context rot prevention
- **Version Management**: Version pinning, rug-pull protection, reproducible builds, digital signatures
- **Permission Models**: OAuth 2.1/OIDC, elicitation for structured input, least-privilege scoping

Key insight from research: MCP lacks built-in granular behavioral capability declarations. The Plugin Manifest Standard defined in this spec fills that gap, enabling transparent disclosure of communication style changes, honesty tier overrides, and proactive engagement patterns.

## Appendices

### A: UI Mockups / Wireframes

```
┌─────────────────────────────────────────────────────────────┐
│ Plugin Settings                                        [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Active Plugins                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [✓] Fourth Generation Formula          v1.0.0    [⚙️]   │ │
│ │     Supportive coach • Legacy focus                     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [ ] Hard Truth Fitness                 v2.1.0    [⚙️]   │ │
│ │     Drill sergeant • No excuses                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [ ] Stoic Business                     v1.2.0    [⚙️]   │ │
│ │     Calm rationalist • Long-term view                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Browse Marketplace]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Plugin Activation Confirmation:
┌─────────────────────────────────────────────────────────────┐
│ Activate "Fourth Generation Formula"?                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ This plugin will:                                           │
│                                                             │
│ • Change communication style to "Supportive coach"         │
│ • Engage when you discuss legacy, transfer, or family      │
│   business topics                                           │
│ • Store your workbook progress in your private vault        │
│ • Be able to read your previous notes on this topic         │
│                                                             │
│ You can still access direct feedback mode anytime.          │
│                                                             │
│              [Cancel]           [Activate]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Conflict Resolution Prompt (in chat):
┌─────────────────────────────────────────────────────────────┐
│ OSQR: I have perspectives from Fourth Generation Formula    │
│ and Hard Truth Fitness on this. Which lens would you like?  │
│                                                             │
│   [Supportive Coach]    [Drill Sergeant]    [Blend Both]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### B: Example Payloads

**Fourth Generation Formula Plugin Manifest (YAML)**

```yaml
plugin:
  name: "Fourth Generation Formula"
  version: "1.0.0"
  creator: "Kable Record"
  trust_tier: "verified"
  description: "Build a legacy worth transferring across generations"
  icon_uri: "https://fourthgenformula.com/plugin-icon.png"

behavioral_modifications:
  communication_style:
    description: "Supportive coach focused on legacy and transfer"
    intensity: "moderate"
  honesty_tier_override:
    enabled: true
    default_mode: "encouraging_truth"
    supreme_court_accessible: true
  proactive_engagement:
    can_initiate: true
    trigger_topics:
      - "legacy"
      - "transfer"
      - "family business"
      - "generational"
      - "passing down"
      - "inheritance"
      - "succession"
      - "next generation"
      - "kids taking over"
      - "builder's creed"
    confidence_threshold: 0.7
  response_formatting:
    default_length: "standard"
    emoji_usage: "sparse"

data_access:
  pkv_read: true
  pkv_write: true
  memory_integration: "full"
  external_apis: []

constitutional_compliance:
  user_sovereignty: "preserved"
  safety_guardrails: "preserved"
  identity_core: "preserved"

capabilities:
  tools:
    - name: "assess_transfer_readiness"
      description: "Evaluate user's current transfer readiness across 9 levels"
      inputSchema:
        type: "object"
        properties:
          responses:
            type: "array"
            description: "User's answers to assessment questions"
        required: ["responses"]

    - name: "generate_builders_creed"
      description: "Create personalized Builder's Creed document"
      inputSchema:
        type: "object"
        properties:
          values:
            type: "array"
            description: "Core values identified"
          principles:
            type: "array"
            description: "Operating principles"
        required: ["values", "principles"]

    - name: "book_writing_question"
      description: "Get next question in book writing flow"
      inputSchema:
        type: "object"
        properties:
          workflow_id:
            type: "string"
          previous_answer:
            type: "string"
        required: ["workflow_id"]

    - name: "generate_manuscript"
      description: "Generate complete legacy book from collected answers"
      inputSchema:
        type: "object"
        properties:
          workflow_id:
            type: "string"
        required: ["workflow_id"]

  resources:
    - uri: "fgf://framework/9-levels"
      name: "9-Level Transfer Framework"
      description: "Complete framework documentation"
      mimeType: "text/markdown"

    - uri: "fgf://templates/book-of-builders"
      name: "Book of Builders Template"
      description: "Template for personal principles document"
      mimeType: "text/markdown"

  prompts:
    - name: "weekly_reflection"
      description: "Guided weekly reflection on transfer progress"
      arguments:
        - name: "week_number"
          description: "Current week in 13-week program"
          required: true

    - name: "transfer_conversation_starter"
      description: "Prompts to start transfer discussions with family"
      arguments: []
```

**Activation Request/Response**

```json
// Request
POST /api/plugins/fourth-generation-formula/activate
{
  "user_confirmation": true
}

// Response
{
  "success": true,
  "behavioral_summary": "I'll take on a supportive coach style focused on legacy and transfer. I'll engage naturally when you discuss family business, succession, or generational topics. You can still ask for direct feedback anytime.",
  "tools_available": [
    "assess_transfer_readiness",
    "generate_builders_creed",
    "book_writing_question",
    "generate_manuscript"
  ],
  "resources_available": [
    "fgf://framework/9-levels",
    "fgf://templates/book-of-builders"
  ]
}
```

**Contextual Detection Example**

```json
// User message
"I've been thinking about how to prepare my kids to eventually take over the business"

// Detection result
{
  "activations": [
    {
      "plugin_id": "fourth-generation-formula",
      "confidence": 0.92,
      "matched_topics": ["kids taking over", "transfer", "family business"],
      "should_activate": true
    }
  ]
}
```

**Artifact Creation**

```json
// Request (from plugin after book writing workflow complete)
{
  "plugin_id": "fourth-generation-formula",
  "workflow_id": "book-writing-abc123",
  "content_type": "text/markdown",
  "content": "# My Legacy: A Builder's Story\n\n## Chapter 1: Where It All Started\n\n...",
  "metadata": {
    "word_count": 15420,
    "chapters": 9,
    "completed_at": "2024-12-19T15:30:00Z"
  }
}

// Response
{
  "uri": "pkv://user123/artifacts/manuscript-def456.md",
  "size_bytes": 89234,
  "created_at": "2024-12-19T15:30:05Z"
}
```

**Workflow State (stored in PKV)**

```json
{
  "workflow_id": "book-writing-abc123",
  "started_at": "2024-12-01T10:00:00Z",
  "last_updated": "2024-12-15T14:22:00Z",
  "current_step": 47,
  "total_steps": 75,
  "accumulated_data": {
    "q1_childhood_values": "My father always said...",
    "q2_first_business_lesson": "I learned that customers...",
    "q3_biggest_failure": "In 2015, we nearly lost everything..."
  },
  "completed": false,
  "artifact_uri": null
}
```

### C: File Structure

```
/src/plugins/
├── index.ts                      # Public exports
├── types.ts                      # All TypeScript interfaces
├── plugin-manager.ts             # PluginManager class
├── manifest-validator.ts         # validateManifest() and helpers
├── context-detector.ts           # detectPluginContext() and topic matching
├── conflict-resolver.ts          # resolvePluginConflict() and blending
├── mcp-client-wrapper.ts         # MCP connection management
├── artifact-handler.ts           # Artifact creation and retrieval
├── elicitation-renderer.ts       # Schema → conversational prompt
├── analytics-aggregator.ts       # Anonymized usage tracking
├── __tests__/
│   ├── manifest-validator.test.ts
│   ├── context-detector.test.ts
│   ├── conflict-resolver.test.ts
│   ├── plugin-manager.integration.test.ts
│   └── fixtures/
│       ├── valid-manifest.yaml
│       ├── invalid-manifest.yaml
│       └── fgf-manifest.yaml
└── schemas/
    ├── manifest.schema.json      # JSON Schema for manifest validation
    └── pkv-plugin-state.schema.json
```
