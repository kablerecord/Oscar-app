# OSQR Mobile Web Demo

Browser-based demo of the OSQR iOS thought-capture interface.

## Overview

This is a mobile-first web interface that demonstrates the OSQR iOS app experience. It's designed to:

1. Prove the UX works before building native iOS
2. Serve as a reference implementation for iOS developers
3. Function as a PWA for Android users to "install"
4. Share styles/components with the main OSQR web app

**The Jarvis Principle**: The phone is a microphone with a screen. The intelligence is elsewhere. Users talk or type, OSQR handles everything in the background.

## Access

- **Development**: http://localhost:3000/mobile
- **Production**: https://app.osqr.app/mobile

## Screens

| Route | Purpose |
|-------|---------|
| `/mobile` | Entry point - redirects based on auth state |
| `/mobile/signin` | Authentication (NextAuth) |
| `/mobile/welcome` | First-time welcome screen |
| `/mobile/thread` | Main conversation interface |

## Components

| Component | Description |
|-----------|-------------|
| `MobileHeader.tsx` | Header with OSQR logo (tappable for menu) |
| `MobileMenu.tsx` | Slide-up menu with web link and sign out |
| `MobileMessageBubble.tsx` | Message display (user: purple, OSQR: gray) |
| `MobileInputBar.tsx` | Text input with voice support |
| `MobileTypingIndicator.tsx` | Animated dots during OSQR response |

## API Endpoints Used

This demo uses the existing OSQR API:

```
POST /api/oscar/ask
{
  message: string,
  workspaceId: "mobile",
  mode: "quick",
  useKnowledge: true,
  conversationHistory: [...]
}
```

No new API endpoints were created - the mobile interface is just another client for the existing OSQR backend.

## PWA Support

The mobile demo includes Progressive Web App support:

- **Manifest**: `/public/manifest.json`
- **Icons**: `/public/icons/osqr-{192,512}.svg`
- **Theme color**: `#8b5cf6` (OSQR purple)

### Add to Home Screen

- **Android Chrome**: Menu → "Add to Home Screen" or "Install App"
- **iOS Safari**: Share → "Add to Home Screen"

The app opens fullscreen without browser chrome.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS v4
- **Voice**: Web Speech API (native browser)
- **Colors**: OSQR purple `#8b5cf6`

## Key Features

- **Voice input**: Microphone button uses Web Speech API
- **Offline detection**: Shows "I need a connection to think" message
- **Safe areas**: Respects iOS notch and home indicator
- **Touch optimized**: 44px minimum touch targets
- **Auto-scroll**: Thread scrolls to newest messages
- **Keyboard handling**: Input stays visible above keyboard

## State Management

Simple React state - no external state library:

```typescript
const [messages, setMessages] = useState<Message[]>([])
const [isLoading, setIsLoading] = useState(false)
const [isListening, setIsListening] = useState(false)
```

Messages are not persisted locally (starts fresh each session). OSQR remembers everything on the backend via cross-session memory.

## Future: Native iOS

This demo serves as the reference implementation for the native iOS app. See [MOBILE_BUILD_SPEC.md](../../docs/planning/MOBILE_BUILD_SPEC.md) for the full native app specification.

The native app will be built using:
- SwiftUI
- Clerk iOS SDK (for auth)
- iOS Speech framework (for voice)
- Same OSQR API backend

## Development

```bash
# Start development server
npm run dev

# Access mobile demo
open http://localhost:3000/mobile
```

## Testing Checklist

- [ ] Sign in works (NextAuth flow)
- [ ] Welcome screen shows on first visit only
- [ ] Thread displays messages correctly
- [ ] User can type and send messages
- [ ] OSQR responses appear with typing indicator
- [ ] Voice input works (Chrome/Safari)
- [ ] Menu opens and closes
- [ ] "Open Web" link works
- [ ] Sign out works
- [ ] Offline state shows correctly
- [ ] Works on iPhone Safari
- [ ] Works on Android Chrome
- [ ] Keyboard doesn't cover input
- [ ] Safe areas respected on notched devices
