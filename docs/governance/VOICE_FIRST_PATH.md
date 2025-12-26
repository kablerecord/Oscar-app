# Voice-First Infrastructure Path

**Status:** Canon (Companion to Jarvis Continuum)
**Parent Document:** [OSQR-JARVIS-CONTINUUM.md](./OSQR-JARVIS-CONTINUUM.md)
**Version:** 1.0
**Last Updated:** 2024-12-26

---

## Purpose

This document turns "voice-first" from philosophy into a roadmap. It defines how OSQR evolves from text-primary to voice-primary without lying to users about current capabilities.

**This doc answers:** "How do we get from text to Jarvis without lying?"

---

## 1. The End State (Jarvis Continuum Reference)

From the Jarvis Continuum:

> "Voice-first is the end state (~95% of interactions)"
> "UI exists to support learning, trust, and edge cases"
> "Over time, UI recedes and voice becomes default"

This is the destination. This document maps the path.

---

## 2. Current State (V1.0)

| Capability | Status | Implementation |
|------------|--------|----------------|
| Voice input (transcription) | **Functional** | Mic button → Whisper/Web Speech API → text |
| Voice output | Not implemented | — |
| Ambient listening | Not implemented | — |
| Wake word | Not implemented | — |
| Cross-device voice | Not implemented | — |

**V1.0 Reality:** Users can speak; OSQR responds in text.

---

## 3. Voice Input MVP (V1.0 → V1.1)

### What Exists (V1.0)
- Microphone button in chat interface
- Transcription to text (Whisper API or Web Speech API)
- Editable transcript before sending

### What's Needed (V1.1 Polish)
- [ ] Visual feedback during recording (waveform or pulse)
- [ ] Recording state indicator (clear start/stop)
- [ ] Error handling for mic permission denial
- [ ] Fallback for browsers without Web Speech API
- [ ] Transcription confidence indicator (optional)

### Privacy Posture
- Audio is processed server-side (Whisper API) or client-side (Web Speech API)
- Audio is never stored after transcription
- Transcribed text follows normal PKV storage rules

### Latency Target
- Transcription complete within 2 seconds of speech end
- User should not feel "waiting for transcription"

---

## 4. Voice Output MVP (V1.1)

### Implementation Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| OpenAI TTS | High quality, multiple voices | Cost per request | **Primary** |
| ElevenLabs | Best quality, voice cloning | Higher cost | Future premium |
| Browser TTS | Free, instant | Robotic, inconsistent | Fallback only |

### MVP Features (V1.1)
- [ ] Speaker icon on OSQR responses
- [ ] Click to hear response read aloud
- [ ] Auto-play option in user settings
- [ ] Voice selection (2-3 preset voices)
- [ ] Pause/resume playback
- [ ] Speed control (0.75x, 1x, 1.25x, 1.5x)

### Voice Characteristics (Per Character Guide)
- Natural cadence, not synthesizer-flat
- Slight warmth in tone
- Pace varies with content (faster for quick info, slower for complex)
- Comfortable pauses

### Privacy Posture
- Text sent to TTS provider for synthesis
- Audio streamed to user, not stored
- User can disable voice output entirely

### Latency Target
- First audio within 500ms of button press
- Streaming playback (don't wait for full synthesis)

---

## 5. Conversational Voice Mode (V1.5)

### What It Is
Full voice conversation: user speaks → OSQR speaks back → user speaks again. No text interface required during conversation.

### Prerequisites
- Voice input stable (V1.0-V1.1)
- Voice output stable (V1.1)
- Interrupt handling (user speaks while OSQR speaking)

### Features (V1.5)
- [ ] "Voice mode" toggle in interface
- [ ] Push-to-talk OR voice activity detection (VAD)
- [ ] Interrupt detection (user starts speaking → OSQR stops)
- [ ] Conversation continuity (maintains thread context)
- [ ] "Show me" escape hatch (switch to visual when needed)
- [ ] End-of-utterance detection (when is user done speaking?)

### Latency Target
- Response begins within 1 second of user finishing speech
- Total perceived latency < 2 seconds

### Privacy Posture
- Same as V1.1 (audio not stored)
- VAD processing happens client-side
- Only confirmed utterances sent to server

---

## 6. Ambient Mode (V3.0+)

### What It Is
OSQR is "always there"—listening for wake word, available without explicit activation. The Jarvis experience.

### Prerequisites
- Conversational voice mode stable (V1.5)
- Cross-device session handoff
- Background processing capability
- Significant user trust established

### Wake Word Options

| Option | Pros | Cons |
|--------|------|------|
| "Hey OSQR" | Brand reinforcement | Awkward pronunciation |
| "Oscar" | Natural, friendly | Common name, false positives |
| "Hey Oscar" | Clear trigger | Two words |
| Custom per user | Personal | Training complexity |

**Recommendation:** Start with "Hey Oscar" (clear, natural). Allow customization in V3.5+.

### Features (V3.0)
- [ ] Wake word detection (client-side, always listening)
- [ ] Privacy indicator when listening (visible mic state)
- [ ] "Stop listening" command
- [ ] Scheduled quiet hours (don't listen during sleep)
- [ ] Location-based activation (home only, everywhere, etc.)
- [ ] Multi-device arbitration (which device responds?)

### Privacy Posture (Critical)
- Wake word detection happens **entirely on-device**
- Audio only sent to server **after** wake word detected
- Clear visual/audio indicator when OSQR is actively listening
- User controls listening scope (always, home only, never)
- Full audit log of when OSQR was listening

### Latency Target
- Wake word detection < 500ms
- Response begins within 1.5 seconds of command end

---

## 7. Cross-Device Continuity (V3.0)

### What It Is
Start conversation on phone, continue on desktop. Same OSQR, same context, seamless handoff.

### Prerequisites
- Ambient mode or at least conversational mode on multiple devices
- Real-time session sync
- Device presence detection

### Features (V3.0)
- [ ] Active session indicator across devices
- [ ] "Continue on [device]" command
- [ ] Automatic handoff when user changes context
- [ ] Conversation history sync in real-time
- [ ] Device-appropriate responses (phone = concise, desktop = detailed)

### Technical Requirements
- WebSocket or similar for real-time sync
- Session state stored server-side
- Device registration and presence tracking
- Conflict resolution (user speaks on two devices simultaneously)

---

## 8. Platform-Specific Considerations

### Web (V1.0+)
- Primary development platform
- Full feature support
- Browser permissions for mic required

### Mobile Web (V1.0+)
- Same as web, responsive design
- iOS Safari has mic permission quirks
- Background audio may be interrupted

### Native Mobile (V2.0+)
- Push notifications for OSQR insights
- Background voice processing possible
- Deeper OS integration (Siri Shortcuts, etc.)

### VS Code Extension (V3.0)
- Voice commands for coding ("create a function that...")
- Voice unlikely primary—keyboard still faster for code
- Focus on voice for planning, text for implementation

### Car Integration (V4.0+)
- Voice-only interface
- Minimal visual feedback
- Safety-critical latency requirements
- Integration with CarPlay/Android Auto

### Wearables (V4.0+)
- Earbuds: voice-only, ultra-low latency
- Watch: voice input, haptic feedback
- Glasses (future): voice + visual overlay

---

## 9. Tier Implications

| Feature | Lite | Pro | Master |
|---------|------|-----|--------|
| Voice input | Yes | Yes | Yes |
| Voice output (V1.1) | Limited | Yes | Yes |
| Voice selection | Default only | 3 voices | All voices |
| Conversational mode (V1.5) | No | Yes | Yes |
| Ambient mode (V3.0) | No | No | Yes |
| Cross-device (V3.0) | No | Limited | Yes |
| Custom wake word | No | No | Yes |

---

## 10. Implementation Phases

### Phase 1: Voice Input Polish (V1.1)
- [ ] Visual recording feedback
- [ ] Error handling improvements
- [ ] Latency optimization
- **Effort:** 4-6 hours

### Phase 2: Voice Output MVP (V1.1)
- [ ] OpenAI TTS integration
- [ ] Playback UI
- [ ] User settings
- **Effort:** 8-12 hours

### Phase 3: Conversational Mode (V1.5)
- [ ] Voice mode toggle
- [ ] Interrupt handling
- [ ] VAD integration
- **Effort:** 2-3 days

### Phase 4: Ambient Mode (V3.0)
- [ ] Wake word detection
- [ ] Privacy controls
- [ ] Multi-device arbitration
- **Effort:** 1-2 weeks

### Phase 5: Cross-Device (V3.0)
- [ ] Session sync
- [ ] Handoff protocol
- [ ] Device presence
- **Effort:** 1-2 weeks

---

## 11. Open Questions

1. **Wake word:** "Oscar" vs "Hey Oscar" vs custom?
2. **Voice identity:** Should OSQR have one canonical voice, or should users choose?
3. **Accent/language:** When do we support non-English voice?
4. **Voice cloning:** Should Master tier users be able to give OSQR a custom voice?
5. **Emotion in voice:** Should OSQR's voice convey emotion (excited, concerned)?

---

## 12. Related Documents

- [OSQR-JARVIS-CONTINUUM.md](./OSQR-JARVIS-CONTINUUM.md) — North star vision
- [OSQR-CHARACTER-GUIDE.md](./OSQR-CHARACTER-GUIDE.md) — Voice design notes
- [JARVIS_V1_SCOPE.md](./JARVIS_V1_SCOPE.md) — What ships in V1.0
- [OSQR_FAILURE_RECOVERY.md](./OSQR_FAILURE_RECOVERY.md) — Error handling

---

**This document maps the path. Vision lives in the Jarvis Continuum. Infrastructure lives here.**
