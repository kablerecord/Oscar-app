# ⚡ Oscar Quick Start Guide

**Get Oscar running in 5 minutes**

## Prerequisites

```bash
# Install if you don't have:
brew install postgresql      # Mac
# or download from postgresql.org
```

---

## Setup (One-Time)

### 1. Create Database
```bash
createdb panelbrain
psql panelbrain -c "CREATE EXTENSION vector;"
```

### 2. Add API Keys to `.env`
```bash
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/panelbrain?schema=public"
OPENAI_API_KEY="sk-proj-your-key"
ANTHROPIC_API_KEY="sk-ant-your-key"
```

### 3. Setup Database & Agents
```bash
npm run db:setup
```

✅ **Done!** Oscar is ready.

---

## Using Oscar

### Start the App
```bash
npm run dev
```

Open **http://localhost:3000**

### Chat with Oscar

1. Type your question
2. Click "Ask" (or press Enter)
3. Oscar consults his panel and responds

**Debug Mode:** Check "Debug Mode" to see the panel discussion

---

## Knowledge Base

### Step 1: Export Your Chats

- **ChatGPT:** Settings → Export Data → Download ZIP
- **Claude:** Settings → Export conversations

### Step 2: Create Knowledge Folder

```bash
mkdir -p ~/Documents/OscarKnowledge/raw-imports
```

Put your exports there (don't worry about organization!)

### Step 3: Index Files

```bash
npm run index-knowledge ~/Documents/OscarKnowledge/raw-imports
```

Follow the prompts:
- ✅ to AI organization analysis
- ✅ to index files

### Step 4: Use It

In Oscar's chat, check **"Use Knowledge Base"**

Ask: "What did I discuss about [topic]?"

---

## Common Commands

```bash
# Start Oscar
npm run dev

# Index knowledge
npm run index-knowledge <directory>

# View database
npx prisma studio

# Reset database
npm run db:setup
```

---

## Folder Structure

```
~/Documents/OscarKnowledge/
├── raw-imports/          # Drop everything here
│   ├── chatgpt/
│   ├── claude/
│   └── other-files/
├── organized/            # AI-organized files (future)
└── archives/             # Duplicates & old versions
```

---

## That's It!

- **Chat:** http://localhost:3000
- **Database:** `npx prisma studio`
- **Docs:** [SETUP.md](./SETUP.md), [KNOWLEDGE-BASE.md](./KNOWLEDGE-BASE.md)

**You now have Jarvis!** 🤖✨
