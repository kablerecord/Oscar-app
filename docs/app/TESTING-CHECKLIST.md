# OSQR User Testing Checklist

**Generated:** 2025-12-08
**Phase:** 1 (Foundation Enhancement)
**Status:** Ready for systematic testing

---

## Pre-Testing Setup

- [ ] Verify database is accessible (Supabase connection)
- [ ] Run `npm run db:push` if needed to sync schema
- [ ] Run `npm run dev` to start development server
- [ ] Open browser to `http://localhost:3000`

---

## 1. Authentication & Signup

### 1.1 Registration Flow
- [ ] Navigate to `/signup`
- [ ] Enter name, email, and password (min 8 characters)
- [ ] Verify password confirmation works (try mismatched passwords)
- [ ] Submit registration form
- [ ] Verify redirect to `/onboarding`
- [ ] Check user appears in database

### 1.2 Login Flow
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Verify redirect to `/panel`
- [ ] Try invalid credentials (expect error message)
- [ ] Test "Forgot password" if implemented

### 1.3 Session Persistence
- [ ] Log in successfully
- [ ] Close browser tab
- [ ] Reopen to `/panel`
- [ ] Verify still logged in

---

## 2. Onboarding Flow

### 2.1 Welcome Step
- [ ] New user sees welcome modal
- [ ] "Let's Go" button works
- [ ] Progress bar visible at top

### 2.2 Identity Step
- [ ] Name field accepts input
- [ ] "What are you working on" field works
- [ ] "What's frustrating you" field works (optional)
- [ ] Cannot proceed without required fields
- [ ] "Skip for now" option available after welcome

### 2.3 Capability Assessment Step
- [ ] 6 assessment questions appear one at a time
- [ ] Can select one option per question
- [ ] Progress bar updates with each question
- [ ] Can navigate back to previous questions
- [ ] "Skip for now" available on first question
- [ ] After final question, see level result
- [ ] Level badge displays with stage info
- [ ] Welcome message appropriate to level (Foundation/Operator/Creator/Architect)

### 2.4 Upload Step (Magic Moment #1)
- [ ] Drag and drop file works
- [ ] Click to upload works
- [ ] Supported formats: PDF, TXT, MD, DOCX, JSON
- [ ] "Privacy info" modal opens on click
- [ ] Privacy modal content displays correctly
- [ ] "Skip for now" option works
- [ ] "Index My File" button starts indexing

### 2.5 Indexing Step (Magic Moment #2)
- [ ] Loading indicator shows during indexing
- [ ] Summary appears after indexing completes
- [ ] 3 suggested questions generated
- [ ] Can click suggested question or type custom
- [ ] Questions queue while indexing (show "Queued" status)
- [ ] Auto-submit when indexing completes
- [ ] Answer appears below question
- [ ] "See Something Wild" button advances

### 2.6 Panel Debate Step (Magic Moment #3)
- [ ] Two brain animation displays
- [ ] "Start the Panel" button triggers debate
- [ ] Loading animation shows during processing
- [ ] GPT-4 response appears with green border
- [ ] Claude response appears with orange border
- [ ] OSQR Synthesis appears with purple border
- [ ] "This is amazing, continue" button advances

### 2.7 Memory Callback Step (Magic Moment #4)
- [ ] User's provided info displayed
- [ ] Can click to confirm/unconfirm each memory
- [ ] Visual feedback on selection (checkmark)
- [ ] "Yes, remember these" / "Yes, continue" button works

### 2.8 Master Summary Step (Magic Moment #5)
- [ ] "Generate My Summary" button triggers AI
- [ ] Loading spinner during generation
- [ ] Summary displays in scrollable container
- [ ] Pro upsell banner visible
- [ ] "Start Using OSQR" completes onboarding
- [ ] Redirects to main panel after completion

---

## 3. Main Panel (Chat Interface)

### 3.1 Initial State
- [ ] Empty state shows "Hello, I'm OSQR" with brain icon
- [ ] Refine → Fire tagline visible
- [ ] Mode selector visible (Quick/Thoughtful/Contemplate)
- [ ] "Use Knowledge Base" checkbox available
- [ ] "Show Panel" checkbox available
- [ ] Text input area functional

### 3.2 Response Modes
#### Quick Mode (~5-10s)
- [ ] Click "Quick" button to select
- [ ] Time estimate shows "(~5-10s, skips refinement)"
- [ ] Type question and click "Fire"
- [ ] Response appears without refinement step
- [ ] Response shows "Quick" badge
- [ ] "See another AI" button appears

#### Thoughtful Mode (~30-60s)
- [ ] Click "Thoughtful" button to select
- [ ] Time estimate shows "(~30-60s, with refinement)"
- [ ] Type question and click "Refine"
- [ ] Refinement card appears with:
  - [ ] Analysis of question
  - [ ] Clarifying questions (optional answers)
  - [ ] Editable refined question
- [ ] "Fire" button sends refined question
- [ ] Response shows "Thoughtful" badge

#### Contemplate Mode (~60-90s)
- [ ] Click "Contemplate" button to select
- [ ] Time estimate shows "(~60-90s, deep analysis)"
- [ ] Full refinement + extended analysis process
- [ ] Response shows "Contemplate" badge

### 3.3 Auto-Suggest Mode (NEW)
- [ ] Type a simple question (e.g., "What is Python?")
- [ ] Blue suggestion banner appears suggesting "Quick mode"
- [ ] Click suggestion to change mode
- [ ] Dismiss with X button
- [ ] Type complex question (e.g., "How should I decide between...")
- [ ] Suggests "Contemplate mode"

### 3.4 Refine → Fire Flow
- [ ] Type question in input area
- [ ] Click "Refine" (Thoughtful/Contemplate modes)
- [ ] Amber-colored refinement card appears
- [ ] Analysis text displays
- [ ] Clarifying questions with input fields
- [ ] Pre-filled refined question editable
- [ ] Can modify refined question before firing
- [ ] "Fire" button has gradient styling
- [ ] "Start Over" clears and resets
- [ ] If question ready-to-fire: green card, auto-advances

### 3.5 Response Display
- [ ] User messages right-aligned, blue background
- [ ] OSQR messages left-aligned with brain icon
- [ ] Mode badge on OSQR responses
- [ ] Share actions visible (copy, share buttons)
- [ ] Auto-scroll to new messages

### 3.6 "See What Another AI Thinks" (Quick Mode)
- [ ] Button appears under Quick mode responses
- [ ] Click main button for random AI
- [ ] Dropdown (chevron) shows model selector:
  - [ ] "Surprise me" (random)
  - [ ] Claude
  - [ ] GPT-4
  - [ ] GPT-4o
- [ ] Loading state shows "Consulting alternate AI..."
- [ ] Alt opinion displays in purple card
- [ ] Model name displayed (e.g., "Claude says:")

### 3.7 Side-by-Side Comparison View (NEW)
- [ ] After getting alt opinion, "Compare side-by-side" button appears
- [ ] Click toggles to two-column view:
  - [ ] Left: OSQR Panel (blue card)
  - [ ] Right: Alternate AI (purple card)
- [ ] "Hide comparison" toggles back to single view

### 3.8 Agreement/Disagreement Synthesis (NEW)
- [ ] In side-by-side view, "Synthesis Analysis" card appears
- [ ] Shows "Agreements" with green bullets
- [ ] Shows "Different Views" with amber bullets
- [ ] Handles empty arrays gracefully

### 3.9 Panel Discussion Debug
- [ ] Enable "Show Panel" checkbox
- [ ] Submit question
- [ ] Expandable panel discussion section appears
- [ ] Click to expand/collapse
- [ ] Shows individual expert responses

### 3.10 Artifacts Panel
- [ ] When response includes artifacts, "View X artifacts" button appears
- [ ] Click opens artifact panel on right
- [ ] Close button works
- [ ] Code artifacts render with syntax highlighting

### 3.11 Profile Questions (During Wait)
- [ ] Enable Thoughtful/Contemplate mode
- [ ] Submit question
- [ ] Profile question modal may appear during processing
- [ ] Can answer, skip, or close
- [ ] Answers saved to profile

---

## 4. Knowledge Vault

### 4.1 Vault Page
- [ ] Navigate to `/vault`
- [ ] Stats overview shows:
  - [ ] Total documents count
  - [ ] Total chunks count
  - [ ] Source type breakdown
- [ ] Document list displays

### 4.2 Document List
- [ ] Documents show title, type, date
- [ ] Chunk count visible per document
- [ ] Source type filter works
- [ ] Search filter works
- [ ] Pagination works (if >20 docs)

### 4.3 File Upload (From Vault)
- [ ] Upload new file from vault page
- [ ] File appears in list after indexing
- [ ] Delete document works (if implemented)

---

## 5. Capability Ladder

### 5.1 Badge Display
- [ ] CapabilityBadge appears in TopBar
- [ ] Shows correct level number
- [ ] Hover shows level name
- [ ] Click navigates to profile/settings (if implemented)

### 5.2 Level-Based Personalization
- [ ] OSQR's responses vary by level (check tone)
- [ ] Welcome messages appropriate to stage
- [ ] Foundation (0-3): Supportive, habit-building
- [ ] Operator (4-6): Optimization-focused
- [ ] Creator (7-9): Scale and impact
- [ ] Architect (10-12): Strategic, legacy-focused

---

## 6. Navigation & Layout

### 6.1 Sidebar
- [ ] Logo/brand visible
- [ ] Navigation links work:
  - [ ] Panel (Chat)
  - [ ] Vault
  - [ ] Settings (if implemented)
- [ ] User info at bottom
- [ ] Logout works

### 6.2 TopBar
- [ ] Workspace name displays
- [ ] User avatar/name displays
- [ ] Capability badge displays
- [ ] Responsive on mobile

### 6.3 MSC Panel (Master Summary Checklist)
- [ ] Visible on panel page when enabled
- [ ] Expandable/collapsible
- [ ] Shows summary items
- [ ] Items can be checked/unchecked

---

## 7. Pricing Page

- [ ] Navigate to `/pricing`
- [ ] Three tiers display:
  - [ ] Free tier with features
  - [ ] Pro tier (highlighted "MOST POPULAR")
  - [ ] Master tier (LEGACY badge)
- [ ] Prices correct
- [ ] Features list for each tier
- [ ] Usage limits preview (docs, queries, file size, models)
- [ ] CTA buttons work (Get Started / Choose Plan)
- [ ] 7-day money-back guarantee text visible

---

## 8. Privacy Page

- [ ] Navigate to `/privacy`
- [ ] Full privacy policy displays
- [ ] Links work (if any)
- [ ] Accessible styling

---

## 9. Error Handling

### 9.1 API Errors
- [ ] Invalid form submission shows error message
- [ ] Rate limit exceeded shows message with retry time
- [ ] Network error shows appropriate message
- [ ] File upload failure shows error

### 9.2 Authentication Errors
- [ ] Unauthorized access redirects to login
- [ ] Expired session handled gracefully

### 9.3 Empty States
- [ ] Empty vault shows appropriate message
- [ ] No chat history shows empty state
- [ ] No documents for search shows "no results"

---

## 10. Responsive Design

### 10.1 Desktop (1920px)
- [ ] Full layout displays correctly
- [ ] Sidebar visible
- [ ] MSC panel visible

### 10.2 Tablet (768px)
- [ ] Layout adjusts appropriately
- [ ] Touch targets adequate size
- [ ] Modals fit screen

### 10.3 Mobile (375px)
- [ ] Sidebar collapses/hamburger menu
- [ ] Chat interface usable
- [ ] Onboarding modal fits
- [ ] File upload works on mobile
- [ ] Keyboard doesn't break layout

---

## 11. Performance

- [ ] Page load under 3 seconds
- [ ] Quick mode response under 10 seconds
- [ ] Thoughtful mode response under 60 seconds
- [ ] File indexing provides feedback during long operations
- [ ] No memory leaks on long sessions
- [ ] Smooth scrolling in chat

---

## 12. Accessibility

- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible (aria labels)
- [ ] Color contrast adequate (dark/light mode)
- [ ] Form labels associated with inputs

---

## Known Issues / Blocked Items

1. **Database Migration** - Capability Ladder schema migration needs to run:
   ```bash
   npx prisma migrate dev --name add_capability_ladder
   ```

2. **MSC Seed Data** - Need to populate:
   ```bash
   npm run seed-msc
   ```

3. **Environment Variables** - Ensure all API keys set:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

---

## Post-Testing Actions

- [ ] Document any bugs found
- [ ] Note UX friction points
- [ ] Capture screenshots of issues
- [ ] Update ROADMAP.md with findings
- [ ] Create GitHub issues for bugs
- [ ] Prioritize fixes for next iteration

---

**Testing Complete:** [ ] Date: ___________
**Tester:** ___________
**Overall Status:** Pass / Fail / Partial

---

*This checklist covers Phase 1 features. Additional checklists will be created for Phase 2+.*
