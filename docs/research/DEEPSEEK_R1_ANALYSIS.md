# Brief Analysis of DeepSeek R1 and Its Implications for Generative AI

**Authors:**
- Sarah Mercer (The Alan Turing Institute) - *Corresponding author*
- Samuel Spillard (The Alan Turing Institute)
- Daniel P. Martin (The Alan Turing Institute)

**First Published:** arXiv:2502.02523v3 [cs.LG] 7 Feb 2025

---

## Abstract

In late January 2025, DeepSeek released their new reasoning model (DeepSeek R1); which was developed at a fraction of the cost yet remains competitive with OpenAI's models, despite the US's GPU export ban. This report discusses the model, and what its release means for the field of Generative AI more widely.

**Key Factors in Model Capabilities:**
- Innovative use of Mixture of Experts (MoE)
- Reinforcement Learning (RL)
- Clever engineering

---

## 1. Introduction

The relatively short history of Generative AI has been punctuated with big steps forward in model capability. This happened again over the last few weeks triggered by papers released by DeepSeek.

### Timeline

| Release Date | Model | Description |
|-------------|-------|-------------|
| Late December 2024 | DeepSeek-V3 | Direct competitor to GPT-4o, trained for ~$5.6M (1/50th of comparable models) |
| January 20, 2025 | DeepSeek-R1 | Set of reasoning models with performance comparable to OpenAI's o1 |

The models are released as **open weights** (MIT license) - freely usable and buildable upon, but without training data (not truly open source). However, more details than usual were shared about the training process.

---

## 2. DeepSeek Models

### 2.1 DeepSeek V3 - Base Model

DeepSeek-V3 employs two major efficiencies:

#### Mixture of Experts (MoE) Architecture

At a high level, MoE essentially divides the model into specialized smaller models (one for maths, one for coding, etc.) to ease training burden.

**MoE Timeline:**
- 2020: Google's GShard (machine translation)
- January 2024: Mixtral LLM
- January 2024: DeepSeek published their MoE approach
- End of 2024: Several MoE techniques presented at NeurIPS

**Key Insight:** Architecturally, DeepSeek V3 was not an out-of-the-blue breakthrough (with 20/20 hindsight).

### 2.2 DeepSeek R1 - Reasoning

**Goal:** Improve reasoning capabilities using pure Reinforcement Learning (RL), without supervised data, focusing on self-evolution.

**Process:**
1. Started with V3 model (671B parameters)
2. Employed scalable Group Relative Policy Optimization (GRPO) as RL framework
3. Resulting R1-Zero showed improved reasoning but challenges (poor readability, language mixing)
4. Reintroduced supervised fine-tuning → R1 model

#### Performance Benchmarks (AIME 2024)

| Model | AIME 2024 Score |
|-------|-----------------|
| V3 Base | 15.6% |
| R1-Zero | 71.0% |
| R1-Zero (majority voting) | 86.7% |
| R1 Final (with readability tweaks) | 79.8% |
| OpenAI o1-0912 | ~71% (comparable) |

#### Emergent Behaviors

The RL process encourages the model to generate more tokens (more "thinking time"). As test-time computation increases, behaviors emerge spontaneously:
- Reflection
- Exploration of alternative approaches
- **"Aha moment"** - when the model learns to rethink

**Research Question:** Is the model "learning" how to answer better through self-reflection, similar to how it learned to write prose? Will these internal functions enable better generalization?

#### Distillation Finding

Reasoning patterns from larger models can be distilled into smaller models via supervised fine-tuning datasets. Distilled versions perform better than if the same RL was performed directly on the model.

| Distilled Model | Performance |
|-----------------|-------------|
| R1-Distill-Qwen-32B | Outperforms OpenAI o1-mini on coding/math |
| R1-Distill-Llama-70B | Outperforms OpenAI o1-mini on coding/math |

### 2.3 Replication Efforts

**Hong Kong University of Science and Technology (Jan 25, 2025):**
- Recreated R1-Zero approach on Qwen2.5-Math-7B (7B parameters)
- Used only 8k MATH examples (vs 50x more data for rStar-MATH)
- Used PPO instead of GRPO for RL
- Observed same increase in Chain-of-Thought length and emergent self-reflection

| Model | AIME | MATH |
|-------|------|------|
| Qwen2.5-Math-7B Base | 16.7% | 52.4% |
| After RL | 33.3% | 77.2% |

**HuggingFace Open R1 Project:**
- Fully open-sourcing with complete data and training pipeline
- Aiming to replicate entire pipeline including missing components

---

## 3. Related Work of Note

### Other Chinese Models (January 2025)

| Model | Company | Release Date | Key Features |
|-------|---------|-------------|--------------|
| **Doubao-1.5-pro** | ByteDance | Jan 22 | Outperforms GPT-4o, 50x cheaper, MoE, 60M active users |
| **Spark Deep Reasoning X1** | iFlytek | Jan 15 | Trained on domestic computing, strong Chinese math capabilities |
| **Kimi k1.5** | Moonshot AI | Jan 20 | 77.5% AIME, 96.2% MATH, multimodal, 128k context |
| **Qwen2.5-VL** | Qwen | Late Jan | Multi-modal (visual/text), improved recognition |

### OpenAI Response

**Feb 2, 2025:** OpenAI announced **Deep Research**, claiming "It accomplishes in tens of minutes what would take a human many hours."

---

## 4. Reactions and Observations

### 4.1 Implications and Repercussions

| Impact | Description |
|--------|-------------|
| **Algorithmic Efficiency** | High performance achievable with significantly fewer resources |
| **Price Competition** | OpenAI cut prices twice; pressure to expose reasoning tokens |
| **Nvidia Stock** | Shares fell 17%, losing ~$600bn market value |
| **Export Controls** | US CHIPS Act may have inadvertently encouraged Chinese innovation |
| **Adoption** | DeepSeek app topped App Store charts in UK, US, and China |

### 4.2 AI Research Community Observations

**Positive:**
- Smaller models can run locally, for free, with increased privacy
- Available via HuggingFace and Ollama
- Chain of Thought shows self-doubt internally but confident output → builds user trust

**Concerns:**
- Can be brittle and difficult to prompt
- Reasoning capabilities can be used to jailbreak itself
- Weak safety guardrails
- Skepticism about reported training costs ($5.6M)

**Technical Insights:**
- Similar approaches tried 2 years ago didn't work as well → base model quality is key
- RLCoT (Chain of Thought via RL) is emergent, doesn't happen until ~1.5B size models
- Choice of simple RL algorithm doesn't matter much

### 4.3 Political Commentary

**Censorship Concerns:**
- Model refuses questions on certain CCP-related topics
- Risk profile changes if majority shift from American-aligned to CCP-aligned LLMs
- Censorship appears absent when model run locally

**Government Responses:**

| Entity | Action |
|--------|--------|
| US Navy | Banned application on "security and ethical" grounds |
| Australia | Raised concerns about staff use |
| Italy | Banned country-wide pending privacy investigation |

**Data Security:**
- Recent breach exposed 1M+ plain-text chat histories
- Concerning data-handling practices in fast-paced AI environment

**Distillation Allegations:**
- White House AI czar: "substantial evidence that DeepSeek distilled knowledge out of OpenAI's models"
- OpenAI reviewing allegations

---

## 5. Discussion

### Key Thesis

This flurry of reasoning model releases represents **China's technical response to data and compute scaling limitations**. The models demonstrate:
- Innovative mix of KISS approaches
- Clever engineering
- Building on open-source literature
- Traceable techniques through recent papers

### Research Questions

1. **Skill Transfer:** If simple RL allows upskilling with small datasets (8k MATH), what other skills could be developed? Only effective for pass/fail datasets, or also for creative tasks?

2. **Model Forensics:** What insights about development pipeline can be gleaned from a released model? Can training datasets be inferred?

3. **Data Degradation:** Will using GenAI to create training datasets suffer from the same degradation as training LLMs on LLM-generated material?

### Implications for Smaller Models

| Implication | Impact |
|-------------|--------|
| **Distillation** | Proven ability to transfer knowledge from large → small models provides shortcut in post-training |
| **Simple RL** | Can yield significant narrow performance improvements at lower computational costs |
| **Risk Threshold** | Changes across D&NS portfolio: malicious cyber, mis/disinformation, deepfake generation |

### Adoption Question

Although these models don't fix hallucinations, the open weights release raises the question: **Are these models "good enough"?**

Evidence of grassroots adoption:
- Distilled Qwen running on RaspberryPI (1.2 tokens/second)
- Developers writing VSCode plugins using DeepSeek instead of GitHub Copilot
- Shift in ubiquity rather than ability may be key step toward AGI

---

## Key Statistics Summary

| Metric | Value |
|--------|-------|
| DeepSeek V3 Training Cost | ~$5.6M |
| Cost Comparison | 1/50th of comparable models |
| V3 Parameters | 671B |
| R1 AIME 2024 Score | 79.8% |
| R1-Zero Peak AIME Score | 86.7% (majority voting) |
| Nvidia Market Value Loss | ~$600B |
| Doubao Active Users | 60M |
| Kimi k1.5 MATH Score | 96.2% |

---

## References

[1-47] Full reference list included in original paper, covering DeepSeek documentation, replication studies, related Chinese models, market reactions, and security analyses.

---

**Note:** This think piece was written to a tight timescale, providing broad coverage of the topic, and serves as introductory material for understanding the model's technical advancements and its place in the ecosystem.
