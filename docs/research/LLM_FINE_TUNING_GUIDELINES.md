# Fine-Tuning LLMs with Proprietary Documents and Code: A Technical Guide

**Source:** Academic Research Paper
**Topic:** Practical guidelines for fine-tuning Large Language Models on enterprise data
**Focus:** Data preparation, compute estimation, and PEFT configurations

---

## Abstract

This paper addresses the challenge of training LLMs on proprietary domain knowledge with optimal resource usage. While RAG (Retrieval Augmented Generation) is limited by vector database quality, fine-tuning enables LLMs to internalize domain-specific knowledge directly.

**Key Contributions:**
- GPU sizing guidelines for beginners
- Data formatting options for documents and code
- Pre-processing recipes for dataset preparation
- Practical recommendations from empirical experiments

---

## Fine-Tuning vs RAG

| Approach | Advantages | Limitations |
|----------|------------|-------------|
| **RAG** | Fast, production-ready, no training needed | Limited by retrieval quality, not LLM capability |
| **Fine-Tuning** | Custom feel, low latency, data stays on-premise | High initial cost, requires compute resources |

**Key Finding:** Fine-tuning on domain data produces more succinct and accurate responses than RAG pipelines, and can reduce hallucinations in RAG systems.

---

## Quantization: Reducing Memory Requirements

### Numeric Precision Formats

| Format | Bits | Components | Use Case |
|--------|------|------------|----------|
| **FP32** | 32 | 1 sign, 8 exponent, 23 mantissa | Full precision (default) |
| **FP16** | 16 | 1 sign, 5 exponent, 10 mantissa | Reduced range and precision |
| **BF16** | 16 | 1 sign, 8 exponent, 7 mantissa | Same range as FP32, reduced precision |
| **INT8** | 8 | Integer | 71% memory reduction |
| **INT4** | 4 | Integer | Maximum compression |

### Memory Estimation Formula

| Precision | Multiply Factor | 7B Model Size |
|-----------|-----------------|---------------|
| FP32 | × 4 bytes | ~28 GB |
| FP16 | × 2 bytes | ~14 GB |
| INT8 | × 1 byte | ~7 GB |
| INT4 | × 0.5 bytes | ~3.5 GB |

**Note:** Additional memory required for gradients and activations during fine-tuning.

### Quantization Impact

| Metric | Without Quantization | 8-bit Quantization |
|--------|---------------------|-------------------|
| GPU Memory | 28 GB | 8 GB |
| Inference Time | Faster | Slower (overhead) |
| Quality | Baseline | Similar |

---

## Parameter-Efficient Fine-Tuning (PEFT)

### LoRA (Low-Rank Adaptation)

**How it works:**
1. Freezes pre-trained model weights
2. Inserts small trainable submodules alongside feed-forward layers
3. Uses rank decomposition to reduce trainable parameters
4. First layer projects to lower dimension, second restores original

**Benefits:**
- Thousands to millions of parameters vs billions
- No additional inference latency
- Easy task-switching
- Reduced hardware requirements

### QLoRA (Quantized LoRA)

Combines 4-bit quantization with LoRA for scenarios with limited memory.

---

## Data Pre-Processing Recipes

### Text Data Formats

| Format | Description | Best For |
|--------|-------------|----------|
| **Raw Data** | Document as raw chunks, no template | Baseline next-token prediction |
| **Keywords as Instruction** | RAKE-extracted keywords as prompt | Keyword-based queries |
| **Headings as Instruction** | Document headings as prompt | Structured documents |
| **Queries as Instruction** | Model-generated queries as prompt | Q&A use cases |

### Code Data Formats

| Format | Description | Quality |
|--------|-------------|---------|
| **Summary Method** | Function-level code + LLM-generated summaries | High quality |
| **Metadata Method** | Comments, docstrings + structured info | Textbook-like learning |
| **Tokenization Method** | Raw tokenized codebase | Baseline |

---

## Fine-Tuning Workflow

```
Raw Text/Code
      ↓
Pre-processing Recipe
      ↓
Chunking (logical parts)
      ↓
Tokenization + Padding (to sequence length)
      ↓
LoRA/QLoRA Configuration
      ↓
Fine-tuning (minimize loss)
      ↓
Fine-tuned Model
```

---

## Experimental Results

### Hardware: A100 80GB GPU

#### PEFT Configurations for LLaMA 2

| Model | Dataset | Epochs | Method | GPU Memory | Time |
|-------|---------|--------|--------|------------|------|
| LLaMA 2 Chat 7B | 60 KB | 3 | LoRA | 18 GB | 15 min |
| LLaMA 2 Chat 13B | 60 KB | 3 | LoRA | 26 GB | 25 min |
| LLaMA 2 Chat 70B | 60 KB | 3 | QLoRA | 65 GB | 40 min |

**Note:** 70B model requires QLoRA on 80GB GPU (LoRA not possible).

#### LoRA Rank Tuning Results

| Model | Rank | Alpha | Quality |
|-------|------|-------|---------|
| 7B Chat | 1 | 512 | Good |
| 7B Chat | 2-16 | 512 | Poor |
| 13B Chat | 8 | 512 | Good |

**Finding:** Lower rank + higher alpha works best for small datasets with new information.

#### Code LLaMA LoRA Tuning

| Rank | Alpha | Quality |
|------|-------|---------|
| 2 | 4 | Poor |
| 4 | 8 | Poor |
| 8 | 16 | Average |
| 16 | 32 | Good |

---

## Full Fine-Tuning Configurations

### LLaMA 2 Chat on A100 80GB

| Model | Seq Len | Precision | Batch | Grad Accum | GPU Mem | Time |
|-------|---------|-----------|-------|------------|---------|------|
| 7B | 4096 | FP32 | 1 | 2 | 80 GB | 57 min |
| 7B | 4096 | FP16 | 2 | 4 | 80 GB | 33 min |
| 7B | 2048 | FP16 | 4 | 8 | 80 GB | 10 min |
| 13B | 4096 | FP32 | 1 | 2 | 80 GB | 110 min |
| 13B | 4096 | FP16 | 2 | 4 | 80 GB | 75 min |
| 13B | 2048 | FP16 | 4 | 8 | 80 GB | 25 min |

---

## RAG Enhancement with Fine-Tuning

### Comparison: Base Model RAG vs Fine-Tuned RAG

| Aspect | Base Model + RAG | Fine-Tuned + RAG |
|--------|------------------|------------------|
| Response Style | Generic | Follows document style |
| Step-by-step Format | No | Yes (for user guides) |
| Multi-part Questions | Often fails | Handles both parts |
| Hallucinations | More common | Reduced |

**Key Finding:** Fine-tuning can solve hallucination problems in RAG pipelines.

---

## Before and After Fine-Tuning

| Query | Before Fine-Tuning | After Fine-Tuning |
|-------|-------------------|-------------------|
| "What is AION?" | "Aion is a blockchain-based platform for digital assets and NFTs..." | "AION (Artificial Intelligence ON) is a cloud-based platform for building, training and deploying ML models..." |

---

## Practical Guidelines

### Memory and Precision

| Guideline | Recommendation |
|-----------|----------------|
| Model precision | Half precision (FP16) sufficient, saves GPU memory |
| Small datasets | Use PEFT (LoRA/QLoRA) over full fine-tuning |
| Limited GPU | Use quantization (8-bit or 4-bit) |
| Single GPU + large CPU | Use paged Adam optimizer |

### LoRA Configuration

| Guideline | Recommendation |
|-----------|----------------|
| Small datasets | Lower rank + higher alpha |
| New information | Lower rank helps assimilation |
| Rank tuning | Must be empirically determined |

### Data Preparation

| Guideline | Recommendation |
|-----------|----------------|
| Large documents | Use full sequence length per row |
| Reduce rows | Chunk to full context without padding |
| Time reduction | Fewer rows = faster training |

### Training Parameters

| Parameter | Impact |
|-----------|--------|
| **Batch size** | Higher = faster convergence, better inference |
| **Gradient accumulation** | Higher = more memory saved, longer time |
| **Sequence length** | Half length = significant time savings |

---

## Code Fine-Tuning Results

### Example: Database Connection Code

**Prompt:** "A connection object is created to connect to a database for a given project name..."

**Result:** Model generates syntactically correct Java code matching the training repository's patterns, including:
- Correct class usage (ConnectionPool, DriverManager)
- Proper exception handling
- Repository-specific method names

---

## Key Takeaways

| Aspect | Recommendation |
|--------|----------------|
| **When to use LoRA** | Small datasets, limited resources |
| **When to use QLoRA** | Very large models (70B+), memory constrained |
| **When to full fine-tune** | Large datasets, multiple GPUs available |
| **Rank selection** | Start low (1-4) for text, higher (16) for code |
| **Alpha selection** | High alpha helps learn new information |
| **Data format** | Query-based for Q&A, summary-based for code |

---

## Further Work

- Experiment with different prompt templates to reduce hallucinations
- Explore semantic chunking for better dataset preparation
- Create chunks that stand alone as information entities
