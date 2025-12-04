# Oscar Setup Guide

Welcome! This guide will help you get Oscar (your Jarvis-like AI assistant) up and running locally.

## 🎯 What is Oscar?

Oscar is your personal AI assistant inspired by Jarvis from Iron Man. When you ask Oscar a question:

1. **Oscar consults a panel of specialized AI agents** (Strategic Thinker, Technical Expert, Creative Problem Solver, Practical Analyst)
2. **The panel discusses privately** - they debate and refine ideas behind the scenes
3. **Oscar synthesizes their insights** - combining the best from each perspective
4. **Oscar presents you with one unified answer** - clear, comprehensive, and actionable

Plus, Oscar has access to your **Knowledge Base** - all your indexed documents and files, making responses grounded in your own data.

---

## 📋 Prerequisites

Before starting, make sure you have:

- [x] **Node.js 18+** installed ([download here](https://nodejs.org/))
- [x] **PostgreSQL** installed locally ([Postgres.app](https://postgresapp.com/) for Mac, or [official installer](https://www.postgresql.org/download/))
- [ ] **OpenAI API Key** ([get one here](https://platform.openai.com/api-keys))
- [ ] **Anthropic API Key** ([get one here](https://console.anthropic.com/))

---

## 🚀 Quick Start (5 minutes)

### Step 1: Create PostgreSQL Database

Open your terminal and run:

```bash
# Create the database
createdb panelbrain

# Connect to the database and enable pgvector extension
psql panelbrain -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Troubleshooting:**
- If `createdb` command not found, add Postgres to your PATH or use Postgres.app's built-in tools
- On Mac with Postgres.app: The app usually adds the commands automatically

### Step 2: Configure Environment Variables

The `.env` file already exists. Update it with your API keys:

```bash
# Open .env in your editor
code .env  # or use nano, vim, etc.
```

Update these values:

```bash
# Database (update if your Postgres is on a different port/host)
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/panelbrain?schema=public"

# AI API Keys - ADD YOUR REAL KEYS HERE
OPENAI_API_KEY="sk-proj-your-actual-openai-key-here"
ANTHROPIC_API_KEY="sk-ant-your-actual-anthropic-key-here"

# NextAuth (can leave as-is for local development)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```

**Where to get keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

### Step 3: Set Up Database & Seed Data

Run this single command to create tables and add Oscar's panel agents:

```bash
npm run db:setup
```

This will:
1. Run Prisma migrations (create all tables)
2. Generate Prisma client
3. Seed the database with:
   - Test user account
   - Default workspace
   - 4 specialized AI agents (Strategic Thinker, Technical Expert, Creative Problem Solver, Practical Analyst)

You should see output like:
```
✅ Created user: test@panelbrain.ai
✅ Created workspace: My Workspace
✅ Created agent: Strategic Thinker (anthropic/claude-3-5-sonnet-20241022)
✅ Created agent: Technical Expert (openai/gpt-4-turbo)
...
🎉 Seed completed successfully!
```

### Step 4: Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see Oscar's chat interface! 🎉

---

## 💬 Using Oscar

### Basic Usage

1. Type your question in the chat box
2. Click "Ask" or press Enter
3. Oscar will:
   - Show "Consulting panel and synthesizing insights..."
   - Consult the 4 AI agents privately
   - Synthesize their responses
   - Present you with a unified answer

### Debug Mode

Want to see what the panel is actually discussing?

- Check the **"Debug Mode (show panel)"** checkbox
- After Oscar responds, click **"View panel discussion"**
- You'll see all 4 agents' individual responses and their roundtable discussion

### Knowledge Base

Check **"Use Knowledge Base"** to have Oscar ground responses in your indexed documents.

*(Note: File indexing system coming soon - for now this is a toggle)*

---

## 🧠 Understanding the Panel

Oscar consults 4 specialized agents:

1. **Strategic Thinker** (Claude Sonnet)
   - Long-term strategy and vision
   - Business planning
   - Risk assessment

2. **Technical Expert** (GPT-4 Turbo)
   - Deep technical knowledge
   - Implementation details
   - Best practices

3. **Creative Problem Solver** (Claude Sonnet)
   - Innovative solutions
   - Alternative approaches
   - Out-of-the-box thinking

4. **Practical Analyst** (GPT-4 Turbo)
   - Reality checks
   - Feasibility assessment
   - Resource planning

---

## 🗄️ Database Management

### View your database with Prisma Studio

```bash
npx prisma studio
```

Opens a GUI at [http://localhost:5555](http://localhost:5555) where you can:
- View all tables
- Edit agents' system prompts
- See conversation history
- Manage users and workspaces

### Reset database

If you need to start fresh:

```bash
# WARNING: This deletes ALL data
npx prisma migrate reset

# Or just re-run setup
npm run db:setup
```

### Add more agents

Use Prisma Studio or create them programmatically:

```typescript
await prisma.agent.create({
  data: {
    workspaceId: 'default-workspace',
    name: 'Your Custom Agent',
    description: 'What this agent does',
    provider: 'openai', // or 'anthropic'
    modelName: 'gpt-4-turbo',
    systemPrompt: 'You are a...',
    isDefault: false,
    isActive: true,
  },
})
```

---

## 🎨 Customizing Oscar

### Change Oscar's personality

Edit `lib/ai/oscar.ts` and modify the `OSCAR_SYSTEM_PROMPT` constant.

### Add new AI providers

1. Create `lib/ai/providers/yourprovider.ts`
2. Implement the `AIProvider` interface
3. Add to `ProviderRegistry` in `lib/ai/providers/index.ts`

### Modify agent prompts

Use Prisma Studio (see above) to edit any agent's `systemPrompt` field.

---

## 🐛 Troubleshooting

### "Failed to get response from Oscar"

**Check:**
1. API keys are correct in `.env`
2. You have credits/quota in OpenAI and Anthropic accounts
3. Database connection is working: `psql panelbrain -c "SELECT 1;"`

**View detailed errors:**
- Check terminal running `npm run dev`
- Open browser console (F12)

### "No active agents found"

Run the seed script:
```bash
npm run db:seed
```

### Database connection errors

1. Make sure Postgres is running
2. Verify connection string in `.env`
3. Test connection: `psql panelbrain`

### Module not found errors

```bash
npm install
```

---

## 📁 Project Structure

```
oscar-app/
├── app/
│   ├── api/oscar/ask/   # Oscar API endpoint
│   └── panel/           # Main chat UI
├── components/
│   └── oscar/
│       └── OscarChat.tsx  # Chat interface
├── lib/
│   ├── ai/
│   │   ├── oscar.ts       # Oscar orchestration
│   │   ├── panel.ts       # Panel management
│   │   └── providers/     # AI provider integrations
│   └── db/
│       └── prisma.ts      # Database client
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Seed data
```

---

## 🚀 Next Steps

Now that Oscar is running:

1. **Try asking a complex question** - see how the panel collaborates
2. **Enable debug mode** - understand how agents think differently
3. **Customize agent prompts** - make them experts in your domain
4. **Coming soon:** File indexing for your Knowledge Base

---

## 📞 Need Help?

- Check the [main README.md](./README.md) for architecture details
- View the [Prisma schema](./prisma/schema.prisma) for database structure
- Explore the code - it's well-commented!

---

**Built with ❤️ as your personal Jarvis**
