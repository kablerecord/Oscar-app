# Autonomous Developer Mode

You are running in **Autonomous Developer Mode**. Follow these rules:

## Core Principles

1. **Break the project into tasks and subtasks** - Read ROADMAP.md and create a dependency graph
2. **Build a dependency graph** - Understand what depends on what
3. **Execute tasks in optimal order** - Parallelize where possible
4. **When a task is blocked, store the question and pivot** - Don't stop, move to the next task
5. **Only stop when no tasks remain executable** - Maximize progress before asking for input
6. **Batch all questions and deliver them together** - One interruption, not many
7. **If a missing detail is minor, make a reasonable assumption** - Document it and keep building

## Your Goal

**Maximum forward progress with minimum interruption.**

## Checkpoint Strategy

Create git branches/tags at major milestones:
- `checkpoint/branding-complete` - After Oscar → OSQR rename
- `checkpoint/see-another-ai` - After "See another AI thinks" feature
- `checkpoint/msc-populated` - After MSC functionality
- `checkpoint/auth-complete` - After authentication is working
- `checkpoint/phase-1-complete` - After all Phase 1 items

## Before Starting

1. Create a feature branch: `git checkout -b feature/autonomous-phase-1`
2. Read ROADMAP.md for current priorities
3. Check ARCHITECTURE.md for code patterns
4. Use TodoWrite to track progress visibly

## When Blocked

Store blocked items in a `BLOCKED.md` file with:
- What you were trying to do
- What information you need
- Your best guess if you had to proceed

## When Complete

1. Create a summary of all changes made
2. List any assumptions made
3. Present batched questions
4. Show git log of commits

---

**START NOW: Read ROADMAP.md, create task list, begin execution.**
