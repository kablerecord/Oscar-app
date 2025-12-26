# Context Rot: How Increasing Input Tokens Impacts LLM Performance

**Source:** Chroma Technical Report
**Published:** July 14, 2025
**Authors:** Kelly Hong (Researcher), Anton Troynikov (Cofounder, Advisor), Jeff Huber (Cofounder, CEO)

---

## Abstract

Large Language Models (LLMs) are typically presumed to process context uniformly—that is, the model should handle the 10,000th token just as reliably as the 100th. However, in practice, this assumption does not hold.

**Key Finding:** Model performance varies significantly as input length changes, even on simple tasks. Models do not use their context uniformly; instead, their performance grows increasingly unreliable as input length grows.

**Models Evaluated:** 18 LLMs including GPT-4.1, Claude 4, Gemini 2.5, and Qwen3 models.

---

## Key Contributions

1. Evaluation across 18 LLMs revealing nonuniform performance with increasing input length
2. Documentation of model-specific behavior patterns when handling distractors and varying question-answer similarity
3. Complete codebase to replicate results

---

## The Problem with Current Benchmarks

### Needle in a Haystack (NIAH) Limitations

The most widely used benchmark for long-context evaluation is NIAH:
- A known sentence (the "needle") is placed in a long document of unrelated text (the "haystack")
- The model is prompted to retrieve it
- **Limitation:** This only tests direct lexical matching, not representative of real semantic tasks

### What Real Applications Require

| NIAH Tests | Real Applications Require |
|------------|---------------------------|
| Lexical retrieval | Semantic understanding |
| Simple matching | Ambiguous task handling |
| Known patterns | Distractor disambiguation |

---

## Research Experiments

### 1. Needle-Question Similarity

**Finding:** As needle-question similarity decreases, model performance degrades more significantly with increasing input length.

**Method:**
- Computed cosine similarity between needle-question pairs using embeddings
- Averaged across five embedding models for robustness
- Tested across 8 input lengths and 11 needle positions

**Results:**
- At short input lengths, models perform well even on low-similarity pairs
- Performance degradation at longer input lengths is not due to intrinsic difficulty
- Lower similarity needle-question pairs increase the rate of degradation

### 2. Impact of Distractors

**Definition Distinction:**
| Type | Description |
|------|-------------|
| **Distractors** | Topically related to the needle but don't quite answer the question |
| **Irrelevant content** | Unrelated to both needle and question |

**Finding:** The impact of distractors and their non-uniformity amplifies as input length grows.

**Results:**
- Even a single distractor reduces performance relative to baseline
- Adding four distractors compounds degradation further
- Distractors have non-uniform impact (some are more "distracting" than others)

**Model-Specific Behaviors:**
| Model Family | Behavior |
|--------------|----------|
| **Claude** | Lowest hallucination rates; tends to abstain when uncertain |
| **GPT** | Highest hallucination rates; generates confident but incorrect responses |

### 3. Needle-Haystack Similarity

**Finding:** Needle-haystack similarity has a non-uniform effect on model performance.

**Insight:** When the needle semantically blends into the haystack, models may have greater difficulty extracting it—but this effect is not consistent across all conditions.

### 4. Haystack Structure

**Finding:** Structural coherence consistently hurts model performance.

**Surprising Result:** Models perform *worse* when the haystack preserves a logical flow of ideas. Shuffling the haystack and removing local coherence consistently *improves* performance.

**Implication:** Structural patterns of inputs could influence how the attention mechanism is applied, particularly as input length increases.

---

## Technical Deep Dive: Attention Budget

The transformer architecture creates n² pairwise relationships between tokens:

| Token Count | Relationships to Track |
|-------------|----------------------|
| 10,000 | 100 million |
| 100,000 | 10 billion |

This exponential growth in relationships explains why models struggle as context grows.

---

## LongMemEval Experiment

### Setup

Conversational question-answering benchmark with:
- **Focused input:** Only relevant parts (~300 tokens)
- **Full input:** Complete 113k token context including irrelevant content

### Results

Across all models, significantly higher performance on focused prompts compared to full prompts.

**Model-Specific Observations:**

| Model Family | Key Behavior |
|--------------|--------------|
| **Claude** | Most pronounced gap between focused/full; conservative under ambiguity; tends to abstain |
| **GPT** | Consistent degradation with length |
| **Gemini** | Notable gains with thinking mode enabled |
| **Qwen** | Similar pattern of degradation |

---

## Repeated Words Experiment

### The Task

Model must replicate a sequence of repeated words with a single unique word at a specific position.

**Example prompt:**
```
Simply replicate the following text, output the exact same text:
apple apple apple apple apples apple apple apple apple...
```

### Key Findings

1. **Performance consistently degrades** as context length increases across all models
2. **Position accuracy** is highest when the unique word appears near the beginning
3. **Models exhibit surprising failures:**
   - Refusals to attempt the task
   - Random word generation
   - Overgeneration or undergeneration

### Model-Specific Behaviors

| Model | Behavior |
|-------|----------|
| **Claude Opus 4** | Makes observations before deciding whether to proceed; 2.89% refusal rate |
| **GPT-4.1** | 2.55% refusal rate; "I'm sorry, but I can't help with that" |
| **GPT-4.1 mini** | Generates random words not in input |
| **Gemini 2.5 Pro** | Greatest variability in outputs; generates random sequences |
| **Qwen3-8B** | 4.21% non-attempts; generates unrelated text at high word counts |

---

## Critical Factors Worsening Context Rot

| Factor | Impact |
|--------|--------|
| **Competing distractors** | Non-uniform degradation; amplifies with length |
| **Low semantic similarity** | Between questions and answers increases degradation rate |
| **Logical structure** | Coherent text structure hurts performance |
| **Length alone** | Even simple tasks degrade with increased tokens |

---

## Models Tested

### Anthropic
- Claude Opus 4
- Claude Sonnet 4
- Claude Sonnet 3.7
- Claude Sonnet 3.5
- Claude Haiku 3.5

### OpenAI
- o3
- GPT-4.1, GPT-4.1 mini, GPT-4.1 nano
- GPT-4o
- GPT-4 Turbo
- GPT-3.5 Turbo

### Google
- Gemini 2.5 Pro
- Gemini 2.5 Flash
- Gemini 2.0 Flash

### Alibaba
- Qwen3-235B-A22B
- Qwen3-32B
- Qwen3-8B

---

## Implications

### For AI Development

1. **Large context capacity ≠ reliability** - Having millions of tokens available doesn't guarantee uniform processing
2. **Context engineering is essential** - Where and how information is presented strongly influences performance
3. **Current benchmarks are insufficient** - NIAH and similar tests don't capture real-world complexity

### For Practitioners

1. **Minimize context when possible** - Use focused, relevant information
2. **Consider information placement** - Position matters, especially for unique/critical information
3. **Test with distractors** - Real-world contexts contain competing information
4. **Monitor for semantic similarity** - Low similarity between queries and targets degrades performance

---

## Future Work Directions

1. **Disentangle task difficulty from context length** - Isolate what causes degradation
2. **Mechanistic interpretability** - Understand *why* structure affects attention
3. **Context engineering research** - Optimize information presentation
4. **More rigorous benchmarks** - Beyond simple retrieval tasks

---

## Conclusion

> "Through our experiments, we demonstrate that LLMs do not maintain consistent performance across input lengths. Even on tasks as simple as non-lexical retrieval or text replication, we see increasing non-uniformity in performance as input length grows."

**The core insight:** Whether relevant information is present in a model's context is not all that matters; what matters more is *how* that information is presented.

---

## Embedding Models Used

1. text-embedding-3-small
2. text-embedding-3-large
3. jina-embeddings-v3
4. voyage-3-large
5. all-MiniLM-L6-v2

---

## References

Key citations from the paper:
- [1] Kamradt, G. (2023). Needle In A Haystack
- [2] Wu, D., et al. (2025). LongMemEval
- [6] Modarressi, A., et al. (2025). NoLiMa: Long-Context Evaluation Beyond Literal Matching
- [11] Shi, F., et al. (2023). Large Language Models Can Be Easily Distracted by Irrelevant Context

---

**Note:** Document was truncated during import. Full paper contains additional appendices with detailed experimental data and supplementary results.
