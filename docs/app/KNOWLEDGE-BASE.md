# 🧠 OSQR's Knowledge Base System

## Overview

OSQR's Knowledge Base is designed to handle **messy, unorganized collections** of files and turn them into a structured, searchable, AI-powered knowledge vault. Perfect for indexing your ChatGPT and Claude export files along with everything else.

### Key Features

✅ **Handles Disorder** - Messy files, duplicates, random naming
✅ **AI Organization** - Automatically categorizes and structures files
✅ **Smart Extraction** - Text from .txt, .md, .json, .pdf, .docx, code files
✅ **Duplicate Detection** - Finds identical files by content hash
✅ **Chunking & Embedding** - Breaks large documents into searchable chunks
✅ **RAG Integration** - OSQR uses your knowledge to answer questions

---

## 📂 Recommended Setup

### Option 1: Separate Knowledge Directory (Recommended)

Create a dedicated folder for your knowledge base:

```bash
mkdir -p ~/Documents/OSQRKnowledge
cd ~/Documents/OSQRKnowledge

# Create structure
mkdir -p 01-raw-imports    # Drop ChatGPT/Claude exports here
mkdir -p 02-organized      # AI-organized files go here
mkdir -p 03-projects       # Your projects
mkdir -p 04-notes          # Personal notes
mkdir -p 05-archives       # Old versions & duplicates
```

**Why separate?**
- Keeps data separate from code
- Easy to backup independently
- Can be shared across projects
- Doesn't clutter the app repo

### Option 2: Inside OSQR App

```bash
cd /Users/kablerecord/Desktop/oscar-app
mkdir -p knowledge-base/{raw,organized,projects,notes,archives}
```

**Use this if:**
- You want everything in one place
- Easier for testing/development
- Planning to deploy as single unit

---

## 🚀 Quick Start: Index Your Files

### Step 1: Export Your ChatGPT & Claude Chats

**ChatGPT:**
1. Go to ChatGPT settings
2. Data Controls → Export Data
3. Download the ZIP file
4. Extract to `~/Documents/OSQRKnowledge/01-raw-imports/chatgpt/`

**Claude:**
1. Go to Claude settings
2. Export conversations
3. Save to `~/Documents/OSQRKnowledge/01-raw-imports/claude/`

### Step 2: Add Any Other Files

Drop in whatever you want OSQR to know about:
- PDFs, documents, notes
- Code files, project docs
- Markdown files, text files
- Research papers, articles

**Don't worry about organization** - OSQR will analyze and categorize them!

### Step 3: Run the Indexer

```bash
npm run index-knowledge ~/Documents/OSQRKnowledge/01-raw-imports
```

**What happens:**
1. 🔍 Scans all files recursively
2. 📊 Shows file breakdown by type
3. 🔍 Detects duplicates
4. 🤖 **AI analyzes & proposes organization** (optional)
5. 📥 Extracts text and indexes into database
6. ✂️ Chunks documents for embedding
7. 🧠 Stores in OSQR's knowledge base

### Interactive Process

```
🧠 OSQR Knowledge Indexer

📂 Target directory: /Users/you/Documents/OSQRKnowledge/01-raw-imports

🔍 Step 1: Scanning files...

✅ Found 247 files

📊 File breakdown:
   .txt: 89 files
   .md: 45 files
   .json: 67 files
   .pdf: 23 files
   .docx: 12 files

⚠️  Found 15 sets of duplicate files

🤖 Run AI organization analysis? (Y/n): Y

🧠 Analyzing with AI... (this may take a minute)

📁 Suggested Organization:

   AI Conversations (134 files)
      ChatGPT and Claude conversation exports

   Project Documentation (45 files)
      Technical docs, READMEs, architecture notes

   Personal Notes (38 files)
      General notes, ideas, brainstorming

   Research & Articles (18 files)
      Papers, articles, saved web content

🗑️  Duplicate Recommendations:
   Keep: meeting-notes-2024.txt
   Reason: Most recent version, others are identical

💡 Suggestions:
   - Rename generic files like "untitled-3.txt"
   - Merge similar conversation exports
   - Archive old versions to 05-archives/

📥 Index 247 files into OSQR's knowledge base? (Y/n): Y

📥 Indexing files...

   Processing: chatgpt-export-001.json...
      ✅ 47 chunks
   Processing: claude-conversation-12.md...
      ✅ 23 chunks
   ...

🎉 Indexing complete!
   ✅ Indexed: 242 files
   ❌ Failed: 5 files
```

---

## 💬 Using Knowledge Base with OSQR

Once indexed, OSQR automatically has access to your knowledge!

### In the Chat Interface

1. Check **"Use Knowledge Base"** checkbox
2. Ask OSQR anything related to your files
3. OSQR will:
   - Search your knowledge base
   - Find relevant chunks
   - Ground the answer in YOUR data

### Example Questions

```
"What did I discuss with ChatGPT about React architecture?"

"Summarize my notes from the project planning meeting"

"What are my thoughts on the Fourth Generation Formula?"

"Find all conversations where I mentioned 'Jarvis' or 'AI assistant'"
```

OSQR will cite your documents and give you context-aware answers!

---

## 🔧 Advanced Usage

### Index Specific File Types Only

```bash
npm run index-knowledge ~/Documents/ChatGPT-Exports --ext=.json,.txt
```

### Re-index with Force Update

```bash
# TODO: Add force flag to script
npm run index-knowledge ~/Documents/OSQRKnowledge --force
```

### View Indexed Documents

Use Prisma Studio:

```bash
npx prisma studio
```

Go to **Documents** table → see all indexed files

---

## 📁 File Support

### Currently Supported

| Format | Extension | Extraction Method |
|--------|-----------|-------------------|
| Plain Text | `.txt` | Direct read |
| Markdown | `.md` | Direct read |
| JSON | `.json` | Direct read (great for ChatGPT exports) |
| Code Files | `.js`, `.ts`, `.py`, `.html`, `.css`, `.sql` | Direct read |
| Configuration | `.yaml`, `.yml`, `.xml` | Direct read |

### Coming Soon (Need Additional Libraries)

| Format | Extension | What's Needed |
|--------|-----------|---------------|
| PDF | `.pdf` | `npm install pdf-parse` |
| Word | `.doc`, `.docx` | `npm install mammoth` |
| Excel | `.xlsx` | `npm install xlsx` |

### Adding PDF Support

```bash
npm install pdf-parse
```

Then update `lib/knowledge/text-extractor.ts` (instructions in comments)

---

## 🤖 How AI Organization Works

When you enable AI organization analysis, OSQR:

1. **Samples your files** (analyzes ~30-50 for efficiency)
2. **Extracts text previews** from each file
3. **Sends to Claude** with the organizing prompt (see below)
4. **Receives structured categories** and suggestions
5. **Maps files to categories** based on content

### The Organization Prompt

```
You are an expert file organization AI assistant.

Analyze this collection of files and propose logical organization.

Identify:
- Themes, topics, natural groupings
- Clear category names
- Duplicates and outdated versions
- Files to keep vs archive
- Meaningful folder structures

Output as JSON with categories, duplicates, and suggestions.
```

The AI is given context about:
- Filenames
- File sizes
- Modification dates
- Text previews (first 500 characters)

---

## 🔍 How Search Works (RAG)

### Semantic Search with pgvector

1. **Your question** is converted to an embedding vector
2. **pgvector searches** the DocumentChunk table for similar vectors
3. **Top K chunks** are retrieved (most relevant content)
4. **Context is added** to OSQR's panel discussion
5. **Agents use your data** to formulate answers

### Chunk Strategy

- Documents are split into **~1000 character chunks**
- **200 character overlap** between chunks (preserves context)
- **Paragraph boundaries respected** where possible
- Each chunk gets its own **embedding vector**

This means:
- Large documents are searchable
- Context is preserved across chunks
- Relevant sections are found even in huge files

---

## 🗂️ Database Schema

### Document Table

```prisma
model Document {
  id               String   @id @default(cuid())
  workspaceId      String
  projectId        String?
  title            String
  sourceType       String   // 'upload' | 'chat_export' | 'note'
  originalFilename String?
  mimeType         String?
  textContent      String   @db.Text
  metadata         Json?    // Custom metadata
  chunks           DocumentChunk[]
}
```

### DocumentChunk Table

```prisma
model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  content    String   @db.Text
  embedding  vector(1536)?  // OpenAI ada-002 embeddings
  chunkIndex Int
}
```

Embeddings are stored as **pgvector** type for fast semantic search!

---

## 🚧 Roadmap

### Phase 1 (Current)
✅ File scanning & organization
✅ Text extraction (txt, md, json, code)
✅ AI-powered categorization
✅ Duplicate detection
✅ Database indexing
✅ Chunking strategy

### Phase 2 (Next)
- [ ] PDF extraction (`pdf-parse`)
- [ ] Word document extraction (`mammoth`)
- [ ] Embedding generation (OpenAI)
- [ ] pgvector integration
- [ ] RAG query implementation
- [ ] OSQR uses knowledge base

### Phase 3 (Future)
- [ ] Watch mode (auto-index new files)
- [ ] Web UI for file management
- [ ] Manual file upload interface
- [ ] Category management
- [ ] Advanced search filters
- [ ] Citation in OSQR's responses
- [ ] Export organized structure

---

## 💡 Tips & Best Practices

### Organizing Your Exports

**For ChatGPT:**
- Export periodically (monthly?)
- Name files: `chatgpt-export-YYYY-MM.json`
- Keep in dated folders

**For Claude:**
- Export conversations individually or in bulk
- Use descriptive names if possible
- Group by topic in subdirectories

### General Tips

1. **Start small** - Index 50-100 files first to test
2. **Review AI suggestions** - They're usually good but not perfect
3. **Keep originals** - Don't delete unorganized files yet
4. **Iterate** - Re-index as you add more files
5. **Use debug mode** - See what OSQR is using from your knowledge

### Performance

- **Large collections** (1000+ files): Index in batches
- **Big files** (>1MB): May take longer to chunk
- **Many duplicates**: Clean up before indexing

---

## 🐛 Troubleshooting

### "Failed to extract text"

- Check file encoding (should be UTF-8)
- Some PDFs may be scanned images (need OCR)
- Corrupted files will be skipped

### "AI analysis failed"

- Check your Anthropic API key in `.env`
- Make sure you have API credits
- Can still index without AI analysis (basic categorization)

### "Embedding generation failed"

- Check OpenAI API key
- Verify API quota/limits
- Embeddings are optional for initial indexing

### Out of Memory

- Index in smaller batches
- Reduce chunk overlap
- Increase system memory allocation

---

## 📞 Need Help?

- Check [SETUP.md](./SETUP.md) for general setup
- View [README.md](./README.md) for architecture
- Explore the code in `lib/knowledge/`

---

**Your messy files → OSQR's organized knowledge → Intelligent answers** 🧠✨
