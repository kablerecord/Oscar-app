# OSQR Mobile iOS App Build Specification

**Thought Capture Interface**

| Component | OSQR Mobile iOS App |
|-----------|---------------------|
| Version | 1.0 MVP |
| Status | Ready for Implementation |
| Date | December 22, 2025 |
| Author | Kable Record |
| Priority | OSQR V1.5 — Mobile Interface |

---

## Design Philosophy

### The Jarvis Principle

Tony Stark never pulls up his phone and navigates a complicated app to talk to Jarvis. He just speaks. Jarvis listens, understands, and handles everything in the background.

OSQR Mobile follows this principle: the app should be so simple it almost feels like nothing. The user talks or types. OSQR does the work.

**The phone is a microphone with a screen. The intelligence is elsewhere.**

### What This Means

- No navigation menus
- No project selectors
- No settings pages
- No document browsers
- No feature toggles
- Just a conversation

All complexity lives in the backend. The iOS app is a thin client that sends text/voice and receives text. OSQR handles routing, context, projects, memory, and actions server-side.

### Long-Term Vision

This MVP may be all the iOS app ever does. Future versions make it simpler, not more complex:

- **V2**: Add voice input/output (talk and listen)
- **V3**: Remove text field entirely — voice-only like Siri
- **Future**: "Hey OSQR" wake word, always listening

The app gets simpler over time as OSQR gets smarter.

---

## Product Definition

### What It Is

A mobile thought-capture interface for OSQR. Users speak or type their thoughts. OSQR listens, processes in the background, and routes information to the right places. Users can check their computer later to see what OSQR did.

### What It Is Not

- Not a full OSQR client (that's the web app)
- Not a project management tool
- Not a document viewer
- Not a settings interface
- Not complicated

### Core User Flow

User opens app → Signs in (once) → Sees welcome screen → Taps to start → Types or speaks → OSQR responds → Repeat

That's it. Nothing else.

---

## Screen Specifications

### Screen 1: Sign In

**Purpose**: Authenticate user with existing OSQR account

**Implementation**: Clerk authentication (same as web app)

**Elements**:
- OSQR logo (centered, top third)
- "Sign in to OSQR" text
- Email input field
- "Continue" button
- OR divider
- "Continue with Google" button
- "Continue with Apple" button
- "Don't have an account? Sign up at osqr.app" link (opens browser)

**Behavior**:
- On success: Navigate to Welcome screen
- On failure: Show error inline, stay on screen
- Remember authentication (don't sign out unless explicit)

**Notes**:
- No account creation in app — sends to web
- Biometric unlock after first sign-in (Face ID / Touch ID)

### Screen 2: Welcome

**Purpose**: First impression, set expectations, invite conversation

**Elements**:
- OSQR logo or subtle animation (centered)
- "Hi, I'm OSQR." (large text)
- "Let's do some thinking together." (subtitle)
- "Start" button OR tap anywhere to proceed

**Behavior**:
- Shows only on first launch after sign-in
- Subsequent launches go directly to Thread
- Tap anywhere or button navigates to Thread

**Copy (exact)**:
- "Hi, I'm OSQR."
- "Let's do some thinking together."

### Screen 3: Thread (Main Interface)

**Purpose**: Conversation interface — the only screen users interact with regularly

**Elements**:
- Message thread (scrollable, newest at bottom)
- User messages (right-aligned, distinct color)
- OSQR messages (left-aligned, different color)
- Text input field (bottom, always visible)
- Send button (right of input, or return key sends)
- Microphone button (left of input, for voice)
- Typing indicator (when OSQR is processing)
- Small OSQR logo (top, tappable for Menu)

**Behavior**:
- Keyboard rises with input field
- Thread scrolls to newest message
- Microphone activates iOS speech-to-text
- Voice input converts to text, sends automatically
- Typing indicator shows while awaiting response
- Pull to refresh (syncs if needed)
- Logo tap opens minimal Menu screen

**Offline Behavior**:
- Show "I need a connection to think" message
- Disable send button
- Re-enable when connection restored

**No History**:
- Thread starts fresh each session (MVP)
- OSQR remembers everything on the backend
- User sees continuity through OSQR's responses, not UI

### Screen 4: Menu (Minimal)

**Purpose**: Escape hatch to web, sign out option

**Access**: Tap OSQR logo in Thread

**Elements**:
- "Open OSQR on Web" button (opens browser to app.osqr.app)
- "Sign Out" button
- App version number (small, bottom)
- "Close" or tap outside to dismiss

**Behavior**:
- Modal overlay or slide-up sheet
- Three options maximum
- No settings, no preferences, no complexity

---

## Visual Design

### Color Palette

| Element | Color | Notes |
|---------|-------|-------|
| Background | #FFFFFF (light) / #1A1A1A (dark) | System adaptive |
| User messages | #7C3AED (purple) | OSQR brand color |
| OSQR messages | #F3F4F6 (light) / #2D2D2D (dark) | Subtle contrast |
| Text (user msgs) | #FFFFFF | White on purple |
| Text (OSQR msgs) | #1F2937 (light) / #F9FAFB (dark) | High contrast |
| Input field | #F9FAFB (light) / #2D2D2D (dark) | Subtle background |
| Accent | #7C3AED | Buttons, links |

### Typography

| Element | Font | Size |
|---------|------|------|
| Welcome title | SF Pro Display Bold | 32pt |
| Welcome subtitle | SF Pro Text Regular | 18pt |
| Messages | SF Pro Text Regular | 16pt |
| Input field | SF Pro Text Regular | 16pt |
| Buttons | SF Pro Text Semibold | 16pt |
| Menu items | SF Pro Text Regular | 17pt |

Note: Use SF Pro (iOS system font) for native feel. No custom fonts needed.

### Message Bubbles

- Rounded corners (16pt radius)
- Padding: 12pt horizontal, 8pt vertical
- Max width: 80% of screen width
- User messages: right-aligned, purple background
- OSQR messages: left-aligned, gray background
- Timestamp: hidden (MVP) — no visual clutter

### Spacing

- Message gap: 8pt between messages
- Same-sender gap: 4pt (tighter grouping)
- Input field: 16pt padding from edges
- Safe area: Respect iOS safe areas (notch, home indicator)

---

## API Contract

The iOS app communicates with OSQR's backend through a simple REST API.

### Authentication

- **Endpoint**: Clerk SDK handles authentication
- **Token**: JWT stored in iOS Keychain
- **Header**: `Authorization: Bearer {token}`

### Send Message

```
POST /api/mobile/message
```

**Request**:
```json
{
  "content": "User's message text",
  "interface": "mobile",
  "inputType": "text" | "voice"
}
```

**Response**:
```json
{
  "id": "msg_xxx",
  "content": "OSQR's response",
  "timestamp": "2025-12-22T10:30:00Z",
  "actions": [...]
}
```

### Check Status

```
GET /api/mobile/status
```

**Response**:
```json
{
  "authenticated": true,
  "subscription": "pro",
  "userName": "Kable"
}
```

### Error Responses

| Code | Meaning | App Behavior |
|------|---------|--------------|
| 401 | Unauthorized | Redirect to Sign In |
| 403 | No subscription | Show "Subscribe at osqr.app" message |
| 429 | Rate limited | Show "Slow down" message, retry after delay |
| 500 | Server error | Show "Something went wrong" message |
| 503 | Maintenance | Show "OSQR is updating" message |

---

## Backend Behavior

The iOS app is a thin client. All intelligence lives server-side. When a message arrives from mobile, OSQR:

### Message Processing Flow

1. Receives message with `interface: "mobile"` tag
2. Parses intent (what does user want?)
3. Retrieves relevant context from Memory Vault
4. Routes to appropriate handler (chat, action, project)
5. Executes any actions (schedule, note, reminder)
6. Generates response
7. Stores conversation in user's PKV
8. Returns response to mobile app

The mobile app never needs to know about projects, plugins, or OSQR internals. It just sends strings and receives strings.

### What OSQR Does in Background

When user sends thoughts from mobile, OSQR may:
- Add items to their master checklist
- File notes under appropriate projects
- Create calendar events
- Set reminders
- Update their summary documents
- Queue tasks for later review on web

User can see all of this when they open OSQR on web. Mobile is capture; web is review.

---

## Version Roadmap

### MVP (V1.0) — This Document

- Sign in with Clerk (email, Google, Apple)
- Welcome screen with greeting
- Text thread interface
- Voice input (iOS speech-to-text → text)
- Send/receive messages to OSQR API
- Minimal menu (web link, sign out)
- Offline handling ("I need a connection")
- Dark mode support

**Timeline**: 2-3 weeks with complete spec

### V2.0 — Voice & History

- Voice output (OSQR speaks responses)
- Conversation history sync
- Push notifications (OSQR initiates)
- Background audio mode

**Timeline**: V1 + 2-3 weeks

### V3.0 — Voice-First

- Remove text input (voice only)
- Always-listening mode
- "Hey OSQR" wake word
- Hands-free operation

**Timeline**: Future, based on usage patterns

### Future Agentic Features

These are backend capabilities OSQR will develop. Mobile just sends the request; OSQR does the work.

- Schedule meetings and appointments
- Send texts and emails on user's behalf
- Book flights and reservations
- Create and assign tasks
- Research and summarize topics
- Write and edit documents
- Manage project workflows
- Interface with other apps via MCP

The mobile app doesn't change for these. User just says "Book me a flight to Miami next Tuesday" and OSQR handles it.

---

## Technical Requirements

### iOS Requirements

| Requirement | Value |
|-------------|-------|
| Minimum iOS | iOS 16.0 |
| Devices | iPhone only (MVP) — iPad later |
| Orientation | Portrait only (MVP) |
| Language | SwiftUI |
| Architecture | MVVM |
| Storage | Keychain (auth token only) |
| Networking | URLSession or Alamofire |
| Speech | iOS Speech framework |

### Dependencies

| Dependency | Purpose |
|------------|---------|
| Clerk iOS SDK | Authentication |
| iOS Speech Framework | Voice-to-text (native, no dependency) |
| No other dependencies | Keep it minimal |

### App Store Requirements

- **Bundle ID**: com.osqr.mobile
- **App name**: OSQR
- **Category**: Productivity
- **Age rating**: 4+ (no objectionable content)
- **Privacy**: Microphone (voice input), Network (API calls)

---

## Implementation Guide for Developer

This section provides everything a developer needs to build the app without ambiguity.

### Project Setup

1. Create new Xcode project: iOS App, SwiftUI, Swift
2. Bundle ID: com.osqr.mobile
3. Minimum deployment: iOS 16.0
4. Add Clerk iOS SDK via Swift Package Manager
5. Configure Clerk with OSQR's publishable key
6. Enable Speech Recognition capability
7. Enable Background Modes: Audio (for V2)

### File Structure

```
OSQRMobile/
├── OSQRMobileApp.swift       # App entry point
├── Views/
│   ├── SignInView.swift       # Screen 1
│   ├── WelcomeView.swift      # Screen 2
│   ├── ThreadView.swift       # Screen 3
│   ├── MenuView.swift         # Screen 4
│   └── Components/
│       ├── MessageBubble.swift
│       ├── InputBar.swift
│       └── TypingIndicator.swift
├── ViewModels/
│   ├── AuthViewModel.swift
│   └── ChatViewModel.swift
├── Services/
│   ├── APIService.swift       # OSQR API calls
│   └── SpeechService.swift    # Voice input
├── Models/
│   └── Message.swift
└── Assets.xcassets            # App icon, colors
```

### Key Implementation Notes

**Authentication**:
- Use Clerk's pre-built SignIn component
- Store JWT in iOS Keychain (Clerk handles this)
- Check auth state on app launch
- Enable biometric unlock via Clerk settings

**API Calls**:
- Base URL: https://api.osqr.app (production)
- Include Authorization header on all requests
- Handle 401 by redirecting to sign in
- Implement retry logic for 429/503

**Voice Input**:
- Use SFSpeechRecognizer (native iOS)
- Request microphone permission on first use
- Convert speech to text, send as message
- Show listening indicator while recording

**State Management**:
- Use @StateObject for view models
- Messages stored in-memory only (no persistence in MVP)
- Auth state persisted via Clerk SDK

### Success Criteria

| Criterion | Measurement |
|-----------|-------------|
| App launches in < 2 seconds | Cold start timing |
| Messages send in < 500ms (excluding OSQR response) | Network timing |
| Voice input works reliably | Test on multiple devices |
| Auth flow completes in < 3 taps | User testing |
| Offline state shows immediately | Airplane mode test |
| No crashes in normal use | TestFlight feedback |
| App Store approval on first submission | Clean build, no policy violations |

---

## Developer Handoff Checklist

**Everything the developer receives**:
- This specification document (complete)
- Clerk publishable key and configuration
- API endpoint documentation (above)
- OSQR brand assets (logo, colors, fonts)
- Test account credentials
- Access to staging API
- Browser prototype URL (for reference)
- Direct line to Kable for questions

**What the developer does NOT need to figure out**:
- What screens to build (defined above)
- What the UI looks like (defined above)
- How authentication works (Clerk SDK)
- What the API returns (defined above)
- What happens on the backend (not their concern)

The developer's job is translation, not design.

---

## Cost & Timeline Estimate

| Approach | Timeline | Cost |
|----------|----------|------|
| Traditional ("build me an app") | 6-10 weeks | $15,000-30,000 |
| This spec + experienced dev | 2-3 weeks | $3,000-6,000 |
| This spec + junior dev | 4-5 weeks | $2,000-4,000 |

The spec eliminates ambiguity. Developer time is spent coding, not asking questions.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 22, 2025 | Initial MVP specification |

**Document Status**: Ready for Implementation

**Next Steps**:
1. Build browser prototype to demonstrate functionality
2. Create SwiftUI code samples for key components
3. Prepare developer handoff package
4. Select iOS developer or attempt self-build via iOS Build Bridge
