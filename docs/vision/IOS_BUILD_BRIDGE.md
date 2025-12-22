# iOS Build Bridge

**MCP Server Specification for VS Code iOS Development**

| Component | ios-build-bridge (MCP Server) |
|-----------|-------------------------------|
| Version | 1.0 |
| Status | Ready for Implementation |
| Date | December 22, 2025 |
| Author | Kable Record |
| Priority | OSQR V1.5 — VS Code Extension Integration |

---

## Executive Summary

The iOS Build Bridge is an MCP (Model Context Protocol) server that enables Claude in VS Code to compile, run, and iterate on iOS applications without opening Xcode. It bridges the gap between AI-assisted code generation and Apple's build toolchain.

This creates a closed feedback loop: Claude writes Swift, the bridge compiles it, runs it in the simulator, captures the result, and Claude iterates based on what it sees. The same documentation-first, spoken-architecture methodology that builds OSQR can now build iOS apps.

---

## Problem Statement

### The Current Reality

Claude in VS Code can write perfect Swift/SwiftUI code. The language is not the barrier. The problem is execution:

1. Claude writes Swift code
2. Developer must manually copy code to Xcode
3. Developer must manually build and run
4. Developer must manually report errors back to Claude
5. Developer must manually describe visual results

This breaks the autonomous development loop that makes Claude in VS Code powerful for web and Node.js projects.

### Why This Gap Exists

| Reason | Explanation |
|--------|-------------|
| Apple's closed ecosystem | Apple wants developers in Xcode. CLI tools exist but aren't promoted. |
| Market hasn't demanded it | iOS developers are trained on Xcode from day one. They don't know to want alternatives. |
| AI-native development is new | The Claude-in-IDE paradigm is 18 months old. Tooling hasn't caught up. |
| Signing complexity | Certificates and provisioning profiles are bureaucracy, not computer science. Nobody wants to automate Apple's paperwork. |

### The Opportunity

None of these barriers are technical impossibilities. Apple's CLI tools are well-documented and scriptable. An MCP server can orchestrate them. The gap exists because of assumption, not difficulty.

---

## Solution Architecture

### Core Concept

The iOS Build Bridge wraps Apple's command-line tools in an MCP interface that Claude can call directly from VS Code.

**The Development Loop**:

Developer describes what they want → Claude writes Swift → Bridge compiles → Bridge runs in simulator → Bridge captures screenshot → Claude sees result → Claude iterates

This is identical to how Claude develops web apps, just with iOS tooling instead of Node/browser.

### Apple CLI Tools (Already Exist)

| Tool | Purpose | Scriptable? |
|------|---------|-------------|
| xcodebuild | Compiles projects, runs tests, creates archives | Yes |
| xcrun simctl | Controls iOS Simulator (boot, install, launch, screenshot) | Yes |
| swift CLI | Compiles Swift packages directly | Yes |
| xcodeproj gem | Programmatically modifies .xcodeproj files | Yes |
| fastlane | Automates signing, building, deploying | Yes |

All of these output parseable text. The bridge is essentially a wrapper that calls these tools and formats the output for Claude.

### MCP Server Architecture

- **Server Name**: ios-build-bridge
- **Transport**: stdio (standard for VS Code MCP)
- **Language**: TypeScript (matches OSQR stack)
- **Dependencies**: Xcode Command Line Tools (user must have installed)

---

## Tool Definitions

The MCP server exposes these tools to Claude:

### Project Management

#### ios_project_create

**Purpose**: Scaffold a new SwiftUI project

**Parameters**:
- `name` (string, required): Project name
- `bundleId` (string, required): Bundle identifier (e.g., com.osqr.bubble)
- `template` (string, optional): 'swiftui-app' | 'swiftui-widget' | 'empty' (default: swiftui-app)

**Returns**: Project path, file structure created

**Implementation**: Generates .xcodeproj and minimal SwiftUI boilerplate

#### ios_file_write

**Purpose**: Write or update a Swift file in the project

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj
- `filePath` (string, required): Relative path within project (e.g., Sources/BubbleView.swift)
- `content` (string, required): Swift code to write
- `addToTarget` (boolean, optional): Add to build target if new file (default: true)

**Returns**: Success confirmation, any warnings

**Implementation**: Writes file, updates .xcodeproj if needed

#### ios_file_read

**Purpose**: Read contents of a Swift file

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj
- `filePath` (string, required): Relative path within project

**Returns**: File contents as string

### Build Operations

#### ios_build

**Purpose**: Compile the project

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj
- `scheme` (string, optional): Build scheme (default: auto-detect)
- `configuration` (string, optional): 'Debug' | 'Release' (default: Debug)
- `destination` (string, optional): Simulator destination (default: latest iPhone)

**Returns**: Success/failure, parsed error messages with file/line references

**Implementation**: Calls xcodebuild, parses output, extracts actionable errors

#### ios_build_errors

**Purpose**: Get structured error information from last build

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj

**Returns**: Array of {file, line, column, message, severity}

**Implementation**: Parses xcodebuild output, structures for Claude consumption

### Simulator Operations

#### ios_simulator_list

**Purpose**: List available iOS simulators

**Parameters**: None

**Returns**: Array of {udid, name, state, runtime}

**Implementation**: Calls `xcrun simctl list --json`

#### ios_simulator_boot

**Purpose**: Start a simulator

**Parameters**:
- `device` (string, optional): Device name or UDID (default: latest iPhone)

**Returns**: Simulator UDID, boot status

**Implementation**: Calls `xcrun simctl boot`

#### ios_simulator_install

**Purpose**: Install app on simulator

**Parameters**:
- `appPath` (string, required): Path to .app bundle
- `device` (string, optional): Simulator UDID (default: booted)

**Returns**: Success confirmation

**Implementation**: Calls `xcrun simctl install`

#### ios_simulator_launch

**Purpose**: Launch app on simulator

**Parameters**:
- `bundleId` (string, required): App bundle identifier
- `device` (string, optional): Simulator UDID (default: booted)
- `waitForDebugger` (boolean, optional): Pause for debugger attach (default: false)

**Returns**: Process ID, launch confirmation

**Implementation**: Calls `xcrun simctl launch`

#### ios_simulator_screenshot

**Purpose**: Capture simulator screen

**Parameters**:
- `device` (string, optional): Simulator UDID (default: booted)
- `format` (string, optional): 'png' | 'jpeg' (default: png)

**Returns**: Base64 encoded image for Claude vision, file path

**Implementation**: Calls `xcrun simctl io screenshot`, encodes for vision API

#### ios_simulator_logs

**Purpose**: Stream or retrieve simulator logs

**Parameters**:
- `device` (string, optional): Simulator UDID (default: booted)
- `bundleId` (string, optional): Filter to specific app
- `lines` (number, optional): Number of recent lines (default: 50)

**Returns**: Log output, crash reports if any

**Implementation**: Calls `xcrun simctl spawn log stream` with filtering

### Compound Operations

#### ios_build_and_run

**Purpose**: Full build-install-launch-screenshot cycle

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj
- `captureDelay` (number, optional): Seconds to wait before screenshot (default: 2)

**Returns**: Build result, screenshot, any errors or logs

**Implementation**: Orchestrates build → install → launch → wait → screenshot

This is the primary tool Claude will use during iterative development.

### Signing Operations (Phase 2)

#### ios_signing_status

**Purpose**: Check code signing configuration

**Returns**: Available certificates, provisioning profiles, team IDs

#### ios_signing_configure

**Purpose**: Set up code signing for a project

**Parameters**:
- `projectPath` (string, required): Path to .xcodeproj
- `teamId` (string, required): Apple Developer Team ID
- `signingStyle` (string, optional): 'automatic' | 'manual' (default: automatic)

**Returns**: Configuration applied, any issues

Note: Requires Apple Developer account and Xcode signed in

---

## Error Handling

### Build Error Parsing

The bridge parses xcodebuild output to extract structured errors:

**Raw xcodebuild output**:
```
/Users/dev/Project/ContentView.swift:15:23: error: cannot find 'unknownVariable' in scope
```

**Parsed for Claude**:
```
file: ContentView.swift
line: 15
column: 23
severity: error
message: cannot find 'unknownVariable' in scope
```

This allows Claude to directly navigate to the error location and fix it.

### Common Error Categories

| Category | Example | Auto-Fix? |
|----------|---------|-----------|
| Syntax | Missing brace, typo | Yes |
| Type | Type mismatch, missing conformance | Usually |
| Import | Missing import statement | Yes |
| Signing | Certificate issues | Guided wizard |
| Simulator | Device not found | Auto-select alternative |

---

## Implementation Phases

### Phase 1: Core Loop (Week 1)

Minimum viable bridge that proves the concept.

- `ios_project_create` — Scaffold minimal SwiftUI project
- `ios_file_write` — Write Swift files to correct locations
- `ios_build` — Compile via xcodebuild with error parsing
- `ios_simulator_boot` — Start simulator
- `ios_simulator_install` — Install app
- `ios_simulator_launch` — Run app
- `ios_simulator_screenshot` — Capture result

**Success Criteria**: Claude can create an iOS app, build it, run it, see it, and iterate on it without Xcode ever opening.

### Phase 2: Developer Experience (Week 2)

Quality of life improvements.

- `ios_build_and_run` — Single command for full cycle
- `ios_simulator_logs` — Retrieve crash reports and logs
- `ios_file_read` — Read existing files for context
- Improved error parsing with suggestions
- Auto-detection of scheme and simulator

### Phase 3: Signing & Distribution (Week 3)

Enable device testing and App Store submission.

- `ios_signing_status` — Check signing configuration
- `ios_signing_configure` — Set up code signing
- `ios_archive` — Create distributable archive
- `ios_export` — Export for App Store or TestFlight

### Phase 4: OSQR Integration (Week 4)

Make this a capability of the OSQR VS Code extension.

- Register ios-build-bridge as OSQR MCP server
- Add iOS project detection to OSQR context awareness
- Enable spoken-architecture workflow for iOS
- Document indexing for Swift/iOS projects

---

## First Test Case: OSQR Bubble

The OSQR iOS app (bubble interface) is the perfect first project:

- Single-view SwiftUI app
- No external dependencies
- Animation-heavy (tests SwiftUI capabilities)
- Requires API integration (tests networking)
- Authentication required (tests Clerk integration)
- Small enough to complete quickly
- Real enough to validate the toolchain

**The Development Session**:

Developer: "Build the OSQR bubble — purple gradient, gentle pulse animation, tap to expand"

OSQR (via Claude):
1. Creates SwiftUI project
2. Writes BubbleView.swift with gradient and animation
3. Builds (catches missing import)
4. Fixes and rebuilds
5. Launches in simulator
6. Screenshots result
7. "Here's the bubble. The pulse is running at 0.8Hz. Want it slower?"

---

## Technical Requirements

### User Prerequisites

- macOS (required for iOS development)
- Xcode installed (for toolchain, doesn't need to be open)
- Xcode Command Line Tools (`xcode-select --install`)
- Apple Developer account (for signing, optional for simulator-only)

### MCP Server Stack

- TypeScript (matches OSQR codebase)
- @modelcontextprotocol/sdk for MCP implementation
- Child process spawning for CLI tool orchestration
- JSON parsing for simctl output
- Base64 encoding for screenshot transfer

### File Structure

```
ios-build-bridge/
├── src/
│   ├── index.ts              # MCP server entry
│   ├── tools/
│   │   ├── project.ts        # Project management tools
│   │   ├── build.ts          # Build operations
│   │   ├── simulator.ts      # Simulator operations
│   │   └── signing.ts        # Code signing (Phase 3)
│   ├── parsers/
│   │   ├── xcodebuild.ts     # Build output parsing
│   │   └── simctl.ts         # Simulator output parsing
│   └── templates/
│       └── swiftui-app/      # Project scaffolding templates
├── package.json
└── tsconfig.json
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Build success rate | >95% | Successful builds / total attempts |
| Error parse accuracy | >90% | Correctly structured errors / total errors |
| Screenshot capture | 100% | Successful captures after launch |
| Time to first build | <30 seconds | Project create to running app |
| Iteration cycle | <10 seconds | Code change to screenshot |

---

## Strategic Value

### For OSQR

- iOS app development becomes part of OSQR's capability set
- First AI companion that can build iOS apps through conversation
- Differentiator from ChatGPT, Copilot, Cursor (none can do this)
- Proves spoken-architecture works beyond web development

### For the Market

- Opens iOS development to AI-native developers
- Reduces Xcode dependency for simple apps
- Enables rapid prototyping without IDE friction
- Could be packaged as standalone tool (separate revenue opportunity)

### The Meta Play

If OSQR can build its own iOS app through this bridge, then OSQR users can build their iOS apps through OSQR. iOS development via spoken architecture becomes an OSQR feature, not a separate product.

---

## Open Questions

1. Should the bridge support Swift Package Manager projects in addition to .xcodeproj?
2. How do we handle CocoaPods/SPM dependencies? (Phase 2+ consideration)
3. Should we support physical device deployment in Phase 3 or defer?
4. Integration with Xcode Cloud for CI/CD? (Future consideration)
5. Should screenshots be stored for version comparison? (Visual regression testing)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 22, 2025 | Initial specification |

**Document Status**: Ready for Implementation

**Next Step**: Phase 1 development begins immediately
