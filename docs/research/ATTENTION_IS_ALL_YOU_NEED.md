# Attention Is All You Need: The Transformer Paper

**Source:** NIPS 2017 (31st Conference on Neural Information Processing Systems)
**Authors:** Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin
**Institutions:** Google Brain, Google Research, University of Toronto
**Significance:** Foundational paper introducing the Transformer architecture

---

## Abstract

> "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely."

**Key Results:**
- **28.4 BLEU** on WMT 2014 English-to-German (2+ BLEU improvement over prior best)
- **41.8 BLEU** on WMT 2014 English-to-French (new state-of-the-art)
- Trained in **3.5 days on 8 GPUs** (fraction of prior training costs)
- Successfully generalizes to English constituency parsing

---

## The Problem with Recurrent Models

| Issue | Impact |
|-------|--------|
| **Sequential computation** | Hidden state ht depends on ht-1, preventing parallelization |
| **Memory constraints** | Limits batching across examples at longer sequences |
| **Long-range dependencies** | Difficult to learn due to path length |

**Attention mechanisms** had been used with RNNs but not as the sole mechanism.

---

## The Transformer Architecture

### Core Innovation

The Transformer is the **first transduction model relying entirely on self-attention** to compute representations—no RNNs, no convolutions.

### Encoder-Decoder Structure

#### Encoder Stack
- **N = 6** identical layers
- Each layer has **two sub-layers:**
  1. Multi-head self-attention mechanism
  2. Position-wise fully connected feed-forward network
- Residual connections + layer normalization around each sub-layer
- Output dimension: dmodel = 512

#### Decoder Stack
- **N = 6** identical layers
- **Three sub-layers** per layer:
  1. Masked multi-head self-attention
  2. Multi-head attention over encoder output
  3. Position-wise feed-forward network
- Masking prevents attending to subsequent positions (preserves auto-regressive property)

---

## Attention Mechanisms

### Scaled Dot-Product Attention

```
Attention(Q, K, V) = softmax(QK^T / √dk) V
```

| Component | Description |
|-----------|-------------|
| **Q (Query)** | What we're looking for |
| **K (Key)** | What we're matching against |
| **V (Value)** | What we retrieve |
| **√dk scaling** | Prevents softmax saturation for large dk |

**Why dot-product over additive attention?**
- Much faster in practice
- More space-efficient
- Uses optimized matrix multiplication

### Multi-Head Attention

```
MultiHead(Q, K, V) = Concat(head1, ..., headh) W^O
where headi = Attention(Q W^Q_i, K W^K_i, V W^V_i)
```

| Parameter | Value |
|-----------|-------|
| Number of heads (h) | 8 |
| dk = dv | 64 |
| dmodel | 512 |

**Benefit:** Allows model to jointly attend to information from different representation subspaces at different positions.

### Three Uses of Attention

| Location | Q Source | K/V Source | Purpose |
|----------|----------|------------|---------|
| **Encoder-decoder** | Previous decoder layer | Encoder output | Attend to all input positions |
| **Encoder self-attention** | Previous encoder layer | Same | Each position attends to all positions |
| **Decoder self-attention** | Previous decoder layer | Same (masked) | Preserve auto-regressive property |

---

## Position-wise Feed-Forward Networks

```
FFN(x) = max(0, xW1 + b1)W2 + b2
```

| Dimension | Value |
|-----------|-------|
| Input/Output (dmodel) | 512 |
| Inner layer (dff) | 2048 |

Applied to each position separately and identically.

---

## Positional Encoding

Since there's no recurrence or convolution, position information must be injected explicitly.

### Sinusoidal Encoding

```
PE(pos, 2i) = sin(pos / 10000^(2i/dmodel))
PE(pos, 2i+1) = cos(pos / 10000^(2i/dmodel))
```

**Why sinusoidal?**
- Allows model to learn relative positions
- PE(pos+k) can be represented as linear function of PE(pos)
- May extrapolate to longer sequences than seen during training

---

## Why Self-Attention?

### Comparison of Layer Types

| Layer Type | Complexity per Layer | Sequential Ops | Max Path Length |
|------------|---------------------|----------------|-----------------|
| **Self-Attention** | O(n² · d) | O(1) | O(1) |
| **Recurrent** | O(n · d²) | O(n) | O(n) |
| **Convolutional** | O(k · n · d²) | O(1) | O(logk(n)) |
| **Restricted Self-Attention** | O(r · n · d) | O(1) | O(n/r) |

**Key Advantages:**
1. **Constant sequential operations** - All positions connected in O(1) operations
2. **Faster than recurrent** when sequence length n < representation dimension d
3. **Shorter path lengths** for learning long-range dependencies
4. **More interpretable** - Attention heads learn distinct linguistic functions

---

## Training Details

### Data
- **English-German:** 4.5M sentence pairs, 37K BPE tokens
- **English-French:** 36M sentences, 32K word-piece vocabulary

### Hardware & Schedule

| Model | Hardware | Step Time | Total Steps | Total Time |
|-------|----------|-----------|-------------|------------|
| Base | 8× P100 GPUs | 0.4 sec | 100K | 12 hours |
| Big | 8× P100 GPUs | 1.0 sec | 300K | 3.5 days |

### Optimizer
- Adam with β1=0.9, β2=0.98, ε=10⁻⁹
- Learning rate warmup for 4000 steps, then inverse square root decay

### Regularization

| Technique | Value |
|-----------|-------|
| Residual Dropout | Pdrop = 0.1 |
| Label Smoothing | εls = 0.1 |

---

## Results

### Machine Translation (BLEU Scores)

| Model | EN-DE | EN-FR | Training FLOPs (EN-DE) |
|-------|-------|-------|------------------------|
| GNMT + RL | 24.6 | 39.92 | 2.3 × 10¹⁹ |
| ConvS2S | 25.16 | 40.46 | 9.6 × 10¹⁸ |
| **Transformer (base)** | 27.3 | 38.1 | 3.3 × 10¹⁸ |
| **Transformer (big)** | **28.4** | **41.8** | 2.3 × 10¹⁹ |

**Key Finding:** Transformer (big) outperforms all previous models including ensembles while using less training compute.

### Model Variations

| Variation | Impact |
|-----------|--------|
| Single attention head | -0.9 BLEU vs best |
| Too many heads | Quality drops |
| Smaller dk | Hurts quality (compatibility harder) |
| Bigger models | Better performance |
| Dropout | Very helpful for avoiding overfitting |
| Learned vs sinusoidal positional encoding | Nearly identical results |

### English Constituency Parsing

| Setting | WSJ 23 F1 |
|---------|-----------|
| Transformer (WSJ only) | 91.3 |
| Transformer (semi-supervised) | **92.7** |

Outperforms BerkeleyParser even with only 40K training sentences.

---

## Model Configuration

### Base Model

| Parameter | Value |
|-----------|-------|
| N (layers) | 6 |
| dmodel | 512 |
| dff | 2048 |
| h (heads) | 8 |
| dk = dv | 64 |
| Pdrop | 0.1 |
| Parameters | 65M |

### Big Model

| Parameter | Value |
|-----------|-------|
| N (layers) | 6 |
| dmodel | 1024 |
| dff | 4096 |
| h (heads) | 16 |
| Pdrop | 0.3 |
| Parameters | 213M |

---

## Attention Visualizations

The paper includes visualizations showing:

1. **Long-distance dependencies:** Attention heads following verb phrases across many tokens (e.g., "making...more difficult")

2. **Anaphora resolution:** Heads learning to resolve pronouns (e.g., "its" attending to "The Law")

3. **Structural patterns:** Different heads learning different syntactic/semantic tasks

---

## Key Contributions

| Contribution | Significance |
|--------------|--------------|
| **Self-attention only architecture** | First transduction model without RNN/CNN |
| **Multi-head attention** | Enables learning multiple representation subspaces |
| **Scaled dot-product attention** | Efficient and stable attention computation |
| **Positional encoding** | Injects sequence order without recurrence |
| **Parallelization** | Dramatically faster training |

---

## Impact and Legacy

The Transformer architecture became the foundation for:
- **BERT** (Bidirectional Encoder Representations)
- **GPT series** (Generative Pre-trained Transformer)
- **T5** (Text-to-Text Transfer Transformer)
- **Vision Transformers (ViT)**
- All modern large language models

> "We are excited about the future of attention-based models and plan to apply them to other tasks... involving input and output modalities other than text."

---

## Code

Available at: https://github.com/tensorflow/tensor2tensor
