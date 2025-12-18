# AI Features Roadmap: Parity & Beyond

> **Status:** Priority implementation queue - next after current Phase 1 polish
> **Goal:** Ensure OSQR users don't need separate Claude/ChatGPT subscriptions
> **Last Updated:** 2024-12-18

---

## Executive Summary

OSQR must provide feature parity with Claude and ChatGPT Plus, plus unique value that neither offers. This document outlines the AI capabilities to implement, prioritized by user value and implementation complexity.

**The Promise:** OSQR subscribers get everything Claude and ChatGPT offer, plus multi-model routing, persistent memory, and intelligent orchestration.

---

## Feature Matrix: Current State

| Feature | Claude | ChatGPT | OSQR Status |
|---------|--------|---------|-------------|
| Text Chat | ✅ | ✅ | ✅ Complete |
| Multi-Model Routing | ❌ | ❌ | ✅ **Unique to OSQR** |
| Refine → Fire | ❌ | ❌ | ✅ **Unique to OSQR** |
| Council Mode (Multi-AI Debate) | ❌ | ❌ | ✅ **Unique to OSQR** |
| See Another AI's Opinion | ❌ | ❌ | ✅ **Unique to OSQR** |
| Persistent Memory Vault | ❌ | Limited | ✅ **Superior** |
| Command Center (MSC) | ❌ | ❌ | ✅ **Unique to OSQR** |
| Artifacts/Canvas | ✅ | ✅ | ⚠️ Partial |
| Code Execution | ✅ (Python) | ✅ (Python) | ❌ Not started |
| Image Generation (DALL-E) | ❌ | ✅ | ❌ Not started |
| Image Analysis (Vision) | ✅ | ✅ | ❌ Not started |
| File Attachments in Chat | ✅ | ✅ | ⚠️ Vault only |
| Voice Input | ✅ | ✅ | ⚠️ UI exists, not wired |
| Voice Output (TTS) | ✅ | ✅ | ❌ Not started |
| Web Search/Browsing | ❌ | ✅ | ❌ Not started |
| Extended Thinking | ✅ | ✅ (o1) | ⚠️ Contemplate Mode |
| Function/Tool Calling | ✅ | ✅ | ❌ Not started |
| Projects/Workspaces | ✅ | ✅ | ✅ Complete |
| Custom Instructions | ✅ | ✅ | ⚠️ Partial (Profile) |

---

## Implementation Phases

### Phase A: Alpha Launch (Immediate Priority)

**Goal:** Demo-ready features for CTO presentation. Polish what exists.

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| ✅ Styled tooltips (sidebar) | Done | - | Matches right panel style |
| ✅ Mobile panel accessibility | Done | - | Slide-out drawers + toggle buttons |
| ✅ TopBar z-index fix | Done | - | Content no longer scrolls behind |
| Keyboard shortcuts (⌘K) | Done | - | Modal + suggest feature |
| Tips highlighting system | Done | - | Interactive UI tours |

### Phase B: Feature Parity - High Impact (Next Sprint)

**Goal:** Close the gap on most-requested features.

#### B.1 Voice Input (Whisper API)
- **API:** OpenAI Whisper or browser Web Speech API
- **UI:** Mic button already exists in RefineFireChat
- **Effort:** Medium (2-3 days)
- **Implementation:**
  ```
  1. Wire existing Mic button to start recording
  2. Send audio to Whisper API (or use browser SpeechRecognition)
  3. Transcribe to input field
  4. User can edit before sending
  ```

#### B.2 Image Analysis (GPT-4 Vision)
- **API:** OpenAI GPT-4 Vision, Claude Vision, Gemini Vision
- **UI:** Attach image button in chat, drag-and-drop
- **Effort:** Medium (3-4 days)
- **Implementation:**
  ```
  1. Add image upload UI (drag-drop + button)
  2. Convert to base64 or upload to temp storage
  3. Send with message to vision-capable model
  4. Display inline in conversation
  ```

#### B.3 Direct File Attachments in Chat
- **Current:** Files go to Memory Vault
- **New:** Attach files directly to messages
- **UI:** Paperclip icon in chat input
- **Effort:** Medium (2-3 days)
- **Implementation:**
  ```
  1. Add attachment button to chat input
  2. Upload to temp storage (or process inline)
  3. Include in context for that message
  4. Support PDF, DOCX, TXT, images, code files
  ```

### Phase C: Feature Parity - Differentiators (1-2 Weeks)

#### C.1 Image Generation (DALL-E 3)
- **API:** OpenAI DALL-E 3
- **Pricing:** ~$0.04-0.12 per image (pass through or include in tier)
- **UI:** "Generate Image" mode or auto-detect from prompt
- **Effort:** Medium (3-4 days)
- **Implementation:**
  ```
  1. Detect image generation intent OR explicit mode
  2. Call DALL-E 3 API
  3. Display generated image in chat
  4. Save to Media Vault (optional)
  5. Allow regenerate, variations
  ```

#### C.2 Web Search Integration
- **API Options:**
  - Perplexity API (easiest, $20/month)
  - Tavily API (search-focused)
  - SerpAPI + summary (more control)
  - Brave Search API
- **UI:** Auto-detect "current events" or explicit toggle
- **Effort:** Medium-High (4-5 days)
- **Implementation:**
  ```
  1. Detect queries needing current info
  2. Call search API for top results
  3. Feed results to LLM for synthesis
  4. Display sources with answer
  ```

#### C.3 Code Execution (Python Sandbox)
- **Options:**
  - E2B (cloud sandbox, easiest)
  - Pyodide (browser-based, free)
  - Modal (serverless Python)
- **UI:** Code blocks with "Run" button, output display
- **Effort:** High (5-7 days)
- **Implementation:**
  ```
  1. Detect code blocks in response
  2. Add "Run" button to Python blocks
  3. Execute in sandboxed environment
  4. Display output/errors inline
  5. Support data visualization (matplotlib, etc.)
  ```

### Phase D: Advanced Capabilities (2-4 Weeks)

#### D.1 Artifacts Enhancement
- **Current:** Basic artifact panel exists
- **Needed:**
  - Interactive code editing
  - Live preview for HTML/React
  - Version history
  - Export options
- **Reference:** Claude's Artifacts, ChatGPT Canvas

#### D.2 Voice Output (Text-to-Speech)
- **API Options:**
  - OpenAI TTS (natural, $0.015/1K chars)
  - ElevenLabs (premium, $0.30/1K chars)
  - Browser SpeechSynthesis (free, robotic)
- **UI:** Speaker icon on responses, auto-play option
- **Effort:** Medium (3-4 days)

#### D.3 Function/Tool Calling Framework
- **Purpose:** Let OSQR take actions (check calendar, send email, etc.)
- **API:** Built into Claude, GPT-4, Gemini
- **Effort:** High (1-2 weeks)
- **Implementation:**
  ```
  1. Define tool schema system
  2. Register available tools per user
  3. Parse tool calls from model response
  4. Execute tools securely
  5. Return results to model
  ```

#### D.4 Extended Thinking Mode Enhancement
- **Current:** Contemplate Mode does multi-model
- **Enhancement:** Show reasoning chain (like Claude's thinking, o1's chain-of-thought)
- **UI:** Expandable "How I thought about this" section

### Phase E: OSQR-Unique Features (Ongoing)

These don't exist in Claude or ChatGPT - they're our moat:

| Feature | Status | Value Proposition |
|---------|--------|-------------------|
| Multi-Model Routing | ✅ | Best model for each question |
| Council Mode | ✅ | AI panel discussion |
| See Another AI | ✅ | Easy second opinion |
| Memory Vault (PKV) | ✅ | True persistent context |
| Command Center (MSC) | ✅ | Goals, tasks, action items |
| Refine → Fire | ✅ | Question improvement |
| Capability Assessment | ✅ | Personalized guidance |
| Tips & Onboarding | ✅ | Interactive learning |

---

## API Cost Considerations

| Feature | API | Cost per Use | Monthly @ 100 uses |
|---------|-----|--------------|-------------------|
| Voice Input | Whisper | ~$0.006/min | ~$0.60 |
| Image Generation | DALL-E 3 | $0.04-0.12 | $4-12 |
| Image Analysis | GPT-4V | ~$0.01/image | ~$1 |
| Web Search | Perplexity | ~$0.005/query | ~$0.50 |
| Code Execution | E2B | ~$0.001/run | ~$0.10 |
| TTS | OpenAI | ~$0.015/1K chars | ~$1.50 |

**Total estimated additional cost per Pro user:** $5-15/month
**Recommendation:** Include in Pro tier, add usage caps if needed.

---

## Implementation Order (Recommended)

```
Week 1:
├── B.1 Voice Input (mic button → Whisper)
├── B.2 Image Analysis (GPT-4 Vision)
└── B.3 Direct File Attachments

Week 2:
├── C.1 Image Generation (DALL-E 3)
└── C.2 Web Search (Perplexity or Tavily)

Week 3-4:
├── C.3 Code Execution (E2B sandbox)
├── D.2 Voice Output (TTS)
└── D.1 Artifacts Enhancement

Ongoing:
├── D.3 Tool Calling Framework
└── D.4 Extended Thinking Enhancement
```

---

## Success Metrics

1. **Feature Parity:** User can do anything in OSQR they could do in Claude or ChatGPT
2. **Unique Value:** Features like Council Mode, Memory Vault justify switching
3. **No Second Subscription:** Users cancel Claude/ChatGPT Pro because OSQR covers it

---

## Technical Notes

### Voice Input Implementation
```typescript
// Browser-based (free, good enough)
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  setInputValue(transcript);
};

// OR Whisper API (better accuracy)
const transcribe = async (audioBlob: Blob) => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: formData,
  });
  return res.json();
};
```

### Image Generation Implementation
```typescript
const generateImage = async (prompt: string) => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });
  const data = await res.json();
  return data.data[0].url;
};
```

---

## References

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [E2B Sandbox](https://e2b.dev)
- [Perplexity API](https://docs.perplexity.ai)
- [ElevenLabs TTS](https://elevenlabs.io/docs)

---

**Owner:** Kable Record
**Next Review:** After Alpha Demo
