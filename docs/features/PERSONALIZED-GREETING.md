# Personalized Greeting System

## Overview

OSQR greets users with personalized, contextual messages that make each session feel unique and engaging. The greeting system combines time-of-day awareness, user activity data, and workspace context to create a warm, personalized experience.

## Key Components

### 1. Time-Based Greetings

Location: `app/api/greeting/route.ts`

The system provides time-appropriate greetings:
- **Morning (5am-12pm)**: "Good morning" with sun emoji
- **Afternoon (12pm-5pm)**: "Good afternoon" with partly cloudy emoji
- **Evening (5pm-9pm)**: "Good evening" with sunset emoji
- **Night (9pm-5am)**: "Burning the midnight oil" with moon emoji

### 2. Context-Aware Messages

The greeting API (`/api/greeting`) fetches multiple data points to personalize messages:

#### User Data
- User's name (first name extraction)
- Account creation date
- Current streak (consecutive days of usage)

#### Workspace Data
- Workspace name
- Capability level
- Onboarding completion status

#### Activity Metrics
- Vault document count
- Recent documents
- Today's question count
- Total questions asked
- Recent insights

#### Profile Context
- What user is working on (`v1-working-on`)
- User's goals (`v1-goal`)
- User's challenges (`v1-constraint`)

### 3. Contextual Message Generation

The system generates 2-3 relevant messages based on user context:

```typescript
// Late night recognition
if (timeGreeting.emoji === 'moon') {
  contextualMessages.push("Late night thinking session? I'm here for it.")
}

// Streak encouragement
if (currentStreak >= 7) {
  contextualMessages.push(`${currentStreak} day streak - you're building something good here.`)
}

// Vault awareness
if (documentCount > 0) {
  contextualMessages.push(`I've got ${documentCount} documents in your vault ready to help.`)
}

// Project/goal reminders
if (profileContext.workingOn) {
  contextualMessages.push(`Still working on "${profileContext.workingOn}"? Let's make progress.`)
}
```

### 4. New User Experience

For users who haven't completed onboarding or have fewer than 5 total questions, the system shows a welcome-focused message:

```typescript
if (!workspace?.onboardingCompleted || totalUsage < 5) {
  contextualMessages = [
    "Welcome! I'm your personal AI thinking partner.",
    "Ask me anything - I'll help you sharpen your question first, then get the best answer.",
  ]
}
```

## API Response Structure

```typescript
{
  timeGreeting: { greeting: string; emoji: string }
  firstName: string
  contextualMessages: string[]
  stats: {
    vaultDocuments: number
    recentDocuments: Array<{ title: string; createdAt: Date }>
    currentStreak: number
    todayQuestions: number
    totalQuestions: number
    capabilityLevel: number
  }
  profile: {
    workingOn?: string
    goal?: string
    challenge?: string
  }
  pinnedItems: Array<{ content: string; category: string }>
  recentInsights: Array<{ title: string; category: string; surfacedAt: Date }>
  isNewUser: boolean
}
```

## Display Locations

### Centered OSQR Greeting (RefineFireChat.tsx)

When the user first opens the panel, OSQR is displayed centered on the screen with the personalized greeting. This creates a "welcome back" moment before the user starts typing.

The greeting displays:
- Time-appropriate greeting with emoji
- User's first name
- 1-3 contextual messages based on their activity

### OSQR Bubble (OSCARBubble.tsx)

The bubble also has access to greeting data and can display personalized messages in its chat history.

## Future Enhancements

1. **Seasonal greetings**: Holiday and seasonal awareness
2. **Achievement celebrations**: Milestone recognition (100 questions, 30-day streak, etc.)
3. **Insight previews**: "I found something interesting about [topic] yesterday"
4. **Weather integration**: Location-aware weather mentions
5. **Learning from interactions**: Track which greeting styles get the best engagement

## Files

- `app/api/greeting/route.ts` - Main greeting API endpoint
- `components/oscar/RefineFireChat.tsx` - Centered greeting display
- `components/oscar/OSCARBubble.tsx` - Bubble greeting integration
- `lib/onboarding/oscar-onboarding.ts` - `getPersonalizedGreeting()` helper

## Usage

```typescript
// Fetch greeting data
const response = await fetch(`/api/greeting?workspaceId=${workspaceId}`)
const greetingData = await response.json()

// Display personalized greeting
<div>
  <span>{greetingData.timeGreeting.emoji}</span>
  <h2>{greetingData.timeGreeting.greeting}, {greetingData.firstName}!</h2>
  {greetingData.contextualMessages.map((msg, i) => (
    <p key={i}>{msg}</p>
  ))}
</div>
```
