# Jarvis V1 Scope & Reality

**Status:** Canon (Companion to Jarvis Continuum)
**Parent Document:** [OSQR-JARVIS-CONTINUUM.md](./OSQR-JARVIS-CONTINUUM.md)
**Version:** 1.0
**Last Updated:** 2024-12-26

---

## Purpose

This document draws a hard line between the Jarvis Continuum vision and what ships in V1.0. It prevents "vaporware" perception and anchors user expectations.

**This doc answers:** "What does OSQR look like right now?"

---

## 1. Voice Capabilities in V1.0

| Capability | V1.0 Status | Future Version |
|------------|-------------|----------------|
| Voice input (transcription) | **Functional** | — |
| Voice output (TTS) | Not included | V1.1 |
| Voice-first ambient mode | Not included | V3.0+ |
| Wake word / always-listening | Not included | V3.0+ |
| Cross-device voice handoff | Not included | V3.0+ |

**V1.0 Reality:** Users can speak to OSQR via the microphone button. Speech is transcribed to text. OSQR responds in text only.

---

## 2. Surfaces in V1.0

| Surface | V1.0 Status | Future Version |
|---------|-------------|----------------|
| Web app (app.osqr.ai) | **Shipped** | — |
| Mobile web | Responsive, not native | V2.0+ |
| Native mobile app | Not included | V2.0+ |
| VS Code extension | Not included | V3.0 |
| Desktop app | Not included | V3.0+ |
| Car / wearables / earbuds | Not included | V4.0+ |

**V1.0 Reality:** OSQR lives in the browser. Same intelligence, one interface.

---

## 3. Autonomy Levels in V1.0

| Mode | V1.0 Status | Description |
|------|-------------|-------------|
| Mode B (Supervised) | **Default** | No irreversible external action without approval |
| Mode A (Earned) | Not available | Requires trust accumulation + user opt-in |

**Autonomy Ladder in V1.0:**

| Level | Capability | V1.0 Status |
|-------|------------|-------------|
| 0 | Observe only | Available |
| 1 | Prepare artifacts | Available |
| 2 | Propose actions | Available |
| 3 | Execute low-risk actions | Limited (internal only) |
| 4 | Execute bounded actions | Not available |
| 5 | Full delegation | Not available |

**V1.0 Reality:** OSQR prepares, proposes, and asks. It does not act on the external world without explicit user confirmation.

---

## 4. Bubble vs Panel in V1.0

| Interface | V1.0 Status | Capabilities |
|-----------|-------------|--------------|
| Bubble (ambient presence) | **Implemented** | Idle states, thinking indicator, insight signals |
| Panel (workspace) | **Implemented** | Full reasoning, Council Mode, artifact display |

**Bubble States in V1.0:**

| State | Visual | Functional |
|-------|--------|------------|
| Idle (listening) | Gentle pulse | Monitoring context |
| Thinking | Slower pulse, shimmer | Processing request |
| Insight Ready | Quickened pulse | Has proactive suggestion |
| Needs Input | Amber indicator | Blocked, requires decision |
| Critical | Red indicator | Time-sensitive, high impact |

**V1.0 Reality:** Both Bubble and Panel exist. Bubble is ambient; Panel is where deep work happens. Escalation from Bubble to Panel is functional.

---

## 5. Memory Architecture in V1.0

| Layer | V1.0 Status | Description |
|-------|-------------|-------------|
| Working Context | **Implemented** | Current session, recent turns |
| Retrieved Context (RAG) | **Implemented** | PKV semantic search, K≈5 |
| Durable Memory (PKV) | **Implemented** | Decisions, preferences, documents |

**V1.0 Reality:** OSQR remembers across sessions. Facts are retrieved. Decisions are stored. Chat transcripts are indexed but not treated as memory by default.

---

## 6. What V1.0 Does NOT Include

These are explicitly deferred to maintain launch focus:

- [ ] Real-world integrations (Gmail, Calendar, Slack)
- [ ] Voice output / TTS
- [ ] Wake word / ambient listening
- [ ] Mode A autonomy (earned permissions)
- [ ] Cross-device session handoff
- [ ] Native mobile apps
- [ ] VS Code extension
- [ ] Plugin marketplace
- [ ] Background awareness (J-1)

---

## 7. Tier Implications

| Feature | Lite | Pro | Master |
|---------|------|-----|--------|
| Voice input | Yes | Yes | Yes |
| Bubble interface | Yes | Yes | Yes |
| Panel interface | Limited | Full | Full |
| Council Mode | No | Limited | Full |
| Autonomy Level 3+ | No | No | No (V1.0) |

**Note:** Autonomy features will be tier-gated when they ship. Master tier will receive Mode A capabilities first.

---

## 8. Success Criteria for V1.0

V1.0 is successful if:

1. Users can have persistent conversations with memory
2. Multi-model routing works correctly (Quick/Thoughtful/Contemplate)
3. PKV stores and retrieves user context accurately
4. Bubble presence feels alive, not dead
5. Panel reasoning is visibly superior to single-model chat
6. No critical bugs in voice transcription

---

## 9. What Comes Next

| Version | Focus | Key Additions |
|---------|-------|---------------|
| V1.1 | AI Feature Parity | Voice output, image analysis, web search |
| V1.5 | Intelligence Layer | Proactive insights, auto-organization, deep research |
| V2.0 | Plugin Ecosystem | Creator marketplace, third-party plugins |
| V3.0 | VS Code OSQR | Full dev companion, execution orchestrator |

---

## 10. Related Documents

- [OSQR-JARVIS-CONTINUUM.md](./OSQR-JARVIS-CONTINUUM.md) — North star vision
- [OSQR_FAILURE_RECOVERY.md](./OSQR_FAILURE_RECOVERY.md) — What happens when OSQR fails
- [VOICE_FIRST_PATH.md](./VOICE_FIRST_PATH.md) — Roadmap from text to Jarvis

---

**This document locks V1.0 scope. Vision lives in the Jarvis Continuum. Reality lives here.**
