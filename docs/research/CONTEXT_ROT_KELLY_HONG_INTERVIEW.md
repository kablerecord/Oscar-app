# Context Rot: Interview with Kelly Hong (Chroma Research)

**Format:** Video Interview Transcript
**Speaker:** Kelly Hong, Researcher at Chroma
**Topic:** Context Rot research findings and implications

---

## Introduction

Kelly Hong is a researcher at Chroma, a vector database company that also does applied AI research. The Context Rot report, published in July 2025, demonstrated that models have non-uniform performance across input lengths.

> "Even if you're working with a model, say you have a 1 million token context window, it's not guaranteed that you'll have reliable performance with maybe a 10,000 token prompt versus a 1 million token input."

### Real-World Observation

This isn't a new phenomenon—many people have experienced it personally:
- Long-running coding sessions in Cursor
- Extended conversations in ChatGPT
- At a certain point, lower quality outputs emerge

**Motivation:** Quantify this degradation beyond qualitative observations and motivate people to use models in a more thoughtful way.

---

## The Current State of Long Context Models

### Marketing vs Reality

Frontier model releases highlight massive context windows:
- Gemini 2.5 Pro: 1M tokens
- Sonnet 4: 1M tokens
- GPT-4.1: 1M tokens
- LLaMA 4: 10M tokens

**The implication:** These models maintain performance across all input lengths.

**The assumption:** If true, you'd want to give your model as much context as possible—use up that 1 million token context window for more informed outputs.

---

## The Problem with Needle in a Haystack (NIAH)

### What NIAH Actually Tests

NIAH is a simple retrieval task:
- Place a random fact (the "needle") in a long context (the "haystack")
- Ask the model to retrieve that fact

**Example:**
- Question: "What was the best writing advice I got from my college classmate?"
- Needle: "The best writing advice I got from my college classmate was to write every week."

### The Critical Flaw

> "If you look at this needle-question pair, you can see that there's a lot of lexical overlap. You don't really even have to understand the meaning or semantics behind the question to perform this matching because it's just direct lexical matching."

### Is NIAH Pointless?

Kelly's perspective:
- Initially useful when older models showed performance degradation
- As models advanced, they perform very well on it
- Good test because it's scalable, and allowed for variations
- **But:** Not representative of real use cases
- Shouldn't assume NIAH success means good performance on complicated tasks

---

## Experiment 1: Needle-Question Similarity

### Semantic vs Lexical Matching

**Lexical matching needle:**
> "The best writing advice I got from my college classmate was to write every week."

**Semantic matching needle:**
> "I had an interesting friend who I took some humanities courses with back in college. He would write every single day and he told me to try writing at least once a week. Looking back I think it's the most useful habit I've developed for my writing."

### Associations Required for Semantic Matching

- "College classmate" → "friend who I took humanities courses with back in college"
- "Best writing advice" → "most useful habit I've developed for my writing"

### Key Finding

- At shorter input lengths: Models perform similarly regardless of lexical/semantic matching
- As input length scales: Clear divergence—semantic matching degrades more significantly

---

## Real-World Implications: Financial Report Example

### Lexical Query (Unrealistic)
> "How much did Germany, Japan, and the United Kingdom contribute to revenue in fiscal 2024?"

### Realistic Query
> "How is your overseas expansion going?"

**The problem:** You're more likely to ask ambiguous questions because you don't know the details in 100-page documents beforehand.

---

## Experiment 2: Impact of Distractors

### Definitions

| Term | Definition |
|------|------------|
| **Irrelevant content** | Completely unrelated to the needle (e.g., essay about addiction when needle is about writing advice) |
| **Distractor** | Semantically similar to needle but doesn't fully answer the question |

### Distractor Examples

For needle: "Best writing advice from college classmate was to write every week"

1. "Best writing tip from college **professor** was to write every day"
2. "**Worst** writing advice from college classmate..."
3. "Best writing advice from classmate in **high school**..."
4. "I **thought** the best writing advice... **but not anymore**"

### Three Test Conditions

1. Needle only (no distractors)
2. Needle + 1 distractor
3. Needle + 4 distractors

### Key Findings

- More distractors → more unreliable models
- Degradation amplifies as input length increases
- Even just 4 pieces of similar information degrades performance significantly for frontier models

### Real-World Relevance: Financial Documents

Financial reports often have:
- Very standardized formats
- Only differences are numbers or names
- Multiple years of similar data (2023, 2024)
- Different countries with similar reporting

This makes it difficult for LLMs to distinguish between similar information.

---

## Model-Specific Failure Behaviors

### Claude Models
- **Lowest hallucination rates**
- Tends to abstain from answering when uncertain
- Will say "I don't know" if not confident

### GPT Models
- **Highest rates of hallucination**
- When uncertain, generates confident but incorrect responses
- Rather than saying "I don't know," answers with wrong information

> "People often just assume that if you give all the right information in the context you want the model to perform well. You expect it to perform well but we show that it doesn't even on this very simple task."

---

## Experiment 3: Haystack Structure (Surprising Result)

### Two Conditions

1. **Original:** Sentences have logical flow (structured essays)
2. **Shuffled:** Randomly shuffled sentences from various essays

### Intuition vs Reality

**Intuition:** In original haystack, the needle breaks logical flow and should stand out more.

**Reality:** Models perform BETTER on shuffled haystacks.

> "This seems almost counterintuitive because you might think that if these models process context in a more structured, order-sensitive manner, it'll be able to pick out this needle a lot easier when it breaks the logical flow."

### Implication

> "You can't make certain assumptions about these models—even if it logically makes sense... Unfortunately, we don't really know why this happens."

---

## Additional Experiments

### Conversational Question Answering (LongMemEval)

Two conditions:
- **Focused:** Only relevant context (~100 tokens)
- **Full:** 120k tokens including irrelevant chats

**Finding:** Even with latest models, significant gap between focused and full contexts—same task difficulty, but performance differs based on input length.

### Text Replication

Task: Simply replicate a piece of text with a modified word in the middle.

**Findings:**
- Even frontier models degrade significantly
- Claude models sometimes refuse (thinks it's generating copyrighted material)
- Gemini models generate completely random outputs around 5,000 tokens

> "5,000 tokens honestly isn't that much if you think about it compared to a 1 million token context."

---

## Key Takeaways

1. **How you present information matters as much as what information you provide**
2. **Irrelevant information in context degrades performance**
3. **Distractors significantly impact reliability**
4. **Context engineering is highly dependent on use case**

---

## Context Engineering Example: Coding Agents

### Naive Approach
Continuously append conversation history with every tool call and turn.

**Problem:** Context grows very quickly to hundreds of thousands of tokens.

### Better Approach: Sub-Agents

1. Main orchestrator agent breaks task into subtasks
2. Spawns sub-agents to complete each subtask
3. Each sub-agent has its own clean context
4. Only returns most relevant information to orchestrator
5. Orchestrator maintains clean, filtered thread

---

## Q&A Highlights

### Is One Model Best at Resisting Context Rot?

> "It was all over the place. There wasn't any model that ranked first across all the tasks. Claude Sonnet 4 did best on repeated words. GPT-4.1 did best on needle in haystack. Each model has its own advantages—highly dependent on use case."

### Is RAG Dead?

> "When people say RAG is dead, they only think about vector retrieval. I think of RAG more generally—maybe even using an LLM to do filtering for your context before you pass it in. The better term for it is context engineering."

### Does Position Still Matter (Beginning/End vs Middle)?

> "Through our experiments, we actually didn't see any advantage to putting important information in the beginning or the end. We tested basically almost every possible position but didn't see any pattern in what the model favors."

> "People give that advice because it's easy—if you can just put important information in the beginning and give it all possible relevant context and hope it works. But unfortunately, that doesn't solve all your problems."

### How to Detect Context Rot in Your Application

1. Run examples with long context (100k+ tokens)
2. Compare same task with short context (100 tokens) filled with irrelevant info
3. Look at outputs and see what the model missed
4. Identify what information was irrelevant
5. Determine what you can remove

> "I think you can get a lot out of just looking at what you're inputting to the model, the outputs you're getting out, and how it could have done better."

---

## Summary

> "Even if we have relatively simple tasks like simple fact extraction or text replication, you would expect these models to do well even on long context. But we show that they have non-uniform performance. And you can imagine that if you have a more complicated task, if you have more ambiguous queries, maybe these models will perform just as worse or even more worse than they did here."

The key insight: **Context engineering is essential**—not just what information you provide, but how you structure and filter it.
