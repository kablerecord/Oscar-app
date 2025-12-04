# PanelBrain

**Multi-Model AI Master Brain** - A Next.js web app for multi-agent panel discussions with integrated knowledge base and RAG.

## 🎯 Vision

PanelBrain is NOT just another chat UI. It's designed to feel like:

1. **A multi-model panel discussion** where multiple AIs answer and react to each other
2. **A personal "master brain"** that has access to your past chats, documents, and projects
3. **A future SaaS platform** with multi-tenancy built into the architecture from day one

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Vector Search**: pgvector for RAG over documents
- **Auth**: NextAuth (to be implemented)
- **AI Providers**: OpenAI + Anthropic (extensible provider registry)

### Project Structure

```
oscar-app/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   └── panel/
│   │       ├── ask/          # Panel chat endpoint
│   │       └── roundtable/   # Roundtable discussion endpoint
│   ├── panel/                # Panel chat UI
│   └── layout.tsx
├── components/
│   ├── layout/               # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MainLayout.tsx
│   ├── panel/                # Panel chat components
│   │   ├── AgentCard.tsx
│   │   └── PanelChat.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── ai/                   # AI provider layer
│   │   ├── providers/
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   └── index.ts     # Provider registry
│   │   ├── panel.ts         # Panel orchestration
│   │   └── types.ts
│   └── db/
│       └── prisma.ts         # Prisma client
├── prisma/
│   └── schema.prisma         # Database schema
└── .env                      # Environment variables
```

## 📊 Database Schema

### Core Entities

- **User** - Authentication and profile
- **Workspace** - Multi-tenant workspace (one per user for MVP)
- **Project** - Organize work within workspaces
- **Document** - Uploaded files, chat exports, notes
- **DocumentChunk** - Vector embeddings for RAG
- **ChatThread** - Conversation threads
- **ChatMessage** - Individual messages with agent attribution
- **Agent** - AI persona configurations (provider, model, system prompt)
- **UserSetting** - User preferences

See [prisma/schema.prisma](prisma/schema.prisma) for full schema.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- OpenAI API key
- Anthropic API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd oscar-app
   npm install
   ```

2. **Set up environment variables**:

   Copy `.env` and fill in your values:
   ```bash
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/panelbrain?schema=public"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"

   # AI Providers
   OPENAI_API_KEY="sk-your-openai-key-here"
   ANTHROPIC_API_KEY="sk-ant-your-anthropic-key-here"
   ```

3. **Set up the database**:

   If using local Postgres:
   ```bash
   # Install pgvector extension in your database
   psql -d panelbrain -c "CREATE EXTENSION vector;"
   ```

   Run Prisma migrations:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Seed the database** (optional):

   Create initial workspace and agents:
   ```bash
   # TODO: Create seed script
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## ✨ Features

### ✅ Implemented (MVP Phase 1)

- [x] Clean, Spartan UI with sidebar navigation
- [x] Multi-model panel chat interface
- [x] Agent selection and configuration
- [x] Panel discussion mode (multiple AIs respond in parallel)
- [x] Roundtable mode (agents react to each other)
- [x] AI provider layer (OpenAI + Anthropic)
- [x] Database schema with Prisma
- [x] API endpoints for panel chat

### 🚧 In Progress

- [ ] NextAuth authentication
- [ ] Knowledge Base (document upload)
- [ ] RAG integration with pgvector
- [ ] Global search
- [ ] Chat export import

### 📋 Planned

- [ ] Streaming responses
- [ ] Thread management UI
- [ ] Projects page
- [ ] Settings and agent management
- [ ] Document viewer
- [ ] Advanced RAG (chunk optimization, hybrid search)
- [ ] Usage tracking and analytics
- [ ] Multi-workspace support
- [ ] OAuth providers (Google, GitHub)
- [ ] API rate limiting
- [ ] Webhook integrations

## 🎨 UI/UX Design Principles

- **Spartan & Professional** - Minimal noise, high contrast, clean typography
- **Deep, Not Shallow** - Serious workspace, not a toy
- **Multi-brain Motif** - Visual emphasis on multiple agents (overlapping brains, animated dots)
- **Panel-first** - Default view showcases multi-agent capability
- **Always-on Knowledge** - RAG toggle is prominent and easy to use

## 🧠 Core Concepts

### Panel Discussion

Users ask a question once, and multiple AI agents respond simultaneously:

1. User types question
2. Selects which agents should respond
3. Optionally enables "Use Knowledge Base" for RAG context
4. Clicks "Ask Panel"
5. All agents respond in parallel (shown as cards)

### Roundtable Mode

After the initial panel response, users can click "Roundtable Discussion":

- Each agent sees the other agents' responses
- Agents react, agree, disagree, or synthesize
- Creates a deeper, multi-perspective discussion

### Knowledge Base

- Upload documents (PDF, TXT, MD)
- Import chat exports from other tools
- All content is chunked and embedded for RAG
- Toggle "Use Knowledge Base" to ground responses in your data

## 🔌 AI Provider Layer

The app uses an extensible provider registry that makes it easy to add new AI providers:

```typescript
// lib/ai/providers/index.ts
export class ProviderRegistry {
  static getProvider(type: ProviderType, config: AIProviderConfig): AIProvider
}
```

Currently supported:
- **OpenAI** (GPT-4, GPT-4 Turbo)
- **Anthropic** (Claude 3.5 Sonnet)

Adding a new provider:
1. Create `lib/ai/providers/newprovider.ts` implementing `AIProvider` interface
2. Add to registry in `lib/ai/providers/index.ts`
3. Update `ProviderType` in `lib/ai/types.ts`

## 📡 API Endpoints

### POST `/api/panel/ask`

Ask the panel of agents.

**Request**:
```json
{
  "threadId": "optional-existing-thread-id",
  "workspaceId": "workspace-id",
  "userMessage": "What's the best approach to...",
  "agentIds": ["agent-1", "agent-2"],
  "useRag": false
}
```

**Response**:
```json
{
  "threadId": "thread-id",
  "responses": [
    {
      "agentId": "agent-1",
      "content": "AI response here...",
      "error": null
    }
  ]
}
```

### POST `/api/panel/roundtable`

Get roundtable discussion responses.

**Request**:
```json
{
  "threadId": "thread-id",
  "workspaceId": "workspace-id",
  "userMessage": "Original question",
  "agentIds": ["agent-1", "agent-2"],
  "initialResponses": [...]
}
```

## 🗄️ Database Operations

### Create an Agent

```typescript
await prisma.agent.create({
  data: {
    workspaceId: 'workspace-id',
    name: 'Strategic Advisor',
    description: 'Long-term strategic thinking',
    provider: 'anthropic',
    modelName: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a strategic advisor...',
    isDefault: true,
    isActive: true,
  },
})
```

### Fetch Threads

```typescript
const threads = await prisma.chatThread.findMany({
  where: { workspaceId: 'workspace-id' },
  include: {
    messages: {
      include: { agent: true },
      orderBy: { createdAt: 'asc' },
    },
  },
  orderBy: { updatedAt: 'desc' },
})
```

## 🧪 Development

### Running Prisma Studio

```bash
npx prisma studio
```

Browse your database at [http://localhost:5555](http://localhost:5555)

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## 🚢 Deployment

### Database Setup

1. Create PostgreSQL database with pgvector extension
2. Update `DATABASE_URL` in production environment
3. Run migrations: `npx prisma migrate deploy`

### Environment Variables

Set all variables from `.env` in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Railway: Project → Variables
- Render: Environment → Environment Variables

### Build

```bash
npm run build
npm start
```

## 📝 TODO / Next Steps

**Immediate priorities**:
1. Complete NextAuth setup with email/password
2. Build Knowledge Base upload UI
3. Implement RAG with pgvector
4. Add streaming responses for better UX
5. Create Threads management page

**Near-term**:
- Settings page for agent management
- Projects page
- Global search
- Chat export import

**Future**:
- Multi-user/multi-workspace
- SaaS features (billing, teams, etc.)
- More AI providers (Gemini, Llama, etc.)
- Advanced RAG features

---

**Built with ❤️ using Next.js, TypeScript, Prisma, and the latest AI models.**
