# Optimizing Large Language Models with the OpenVINO™ Toolkit

**Source:** Intel Solution White Paper
**Authors:** Ria Cheruvu (Intel AI Evangelist), Ryan Loney (Intel OpenVINO Product Manager)
**Topic:** LLM optimization, compression, and deployment using OpenVINO

---

## Executive Summary

Large language models (LLMs) have enabled breakthroughs in natural language understanding, but they are massive—often over 100 billion parameters. This creates challenges for:
- Scaling to small devices
- Accessibility when disconnected from the internet
- Power consumption and environmental concerns

**Solution:** OpenVINO™ toolkit for optimizing and deploying LLMs through compression techniques.

---

## The OpenVINO™ Deployment Advantage

| Advantage | Description |
|-----------|-------------|
| **Small Binary Size** | Fewer dependencies, smaller footprint than Hugging Face/PyTorch |
| **Speed** | Optimized inference, full C/C++ API for high-performance production |
| **Official Intel Support** | Patches, monthly releases, feature updates from Intel engineers |
| **Flexibility** | Supports all kinds of models and architectures |
| **Hardware Support** | CPUs, integrated GPUs, discrete GPUs, ARM and x86/x64 |

---

## Brief Introduction to LLMs

### What LLMs Do

LLMs are massive neural networks built on transformers that excel in:
- Text completion
- Question-answering
- Content summarization
- Conversational AI

### Training LLMs

| Aspect | Details |
|--------|---------|
| **Data source** | Extensive text data crawled from web pages |
| **Training task** | Predict the next word in a sequence |
| **Cost** | Millions of GPU hours (Meta's Llama 2: 3M+ GPU hours, ~$2M USD) |
| **Result** | Compresses >10TB of text into 1GB-200GB of parameters |

### Fine-tuning LLMs

| Method | Description |
|--------|-------------|
| **Standard fine-tuning** | Adapt pre-trained knowledge to specific tasks |
| **LoRA** | Low Rank Adaptation for memory-efficient fine-tuning |
| **QLoRA** | Quantized LoRA for even lower memory requirements |

**Example:** Fine-tuning Llama 2-7B with LoRA: ~16 hours on single GPU, <10GB GPU memory

---

## Popular Open-Source LLMs (March 2024)

| Model | Developer |
|-------|-----------|
| Baichuan 2 7B | Baichuan Intelligent Technology |
| ChatGLM3 6B | Tsinghua University |
| Llama 2 (7B, 13B, 70B) | Meta |
| Mistral 7B | Mistral AI |
| Mixtral-8x7B | Mistral AI |
| Qwen 7B | Alibaba |
| StableLM 7B | Stability AI |
| Vicuna 7B | LMSYS |
| Zephyr 7B | Hugging Face |

---

## System Requirements for LLMs

### Standard Requirements

| Requirement | Details |
|-------------|---------|
| **Storage** | 2GB (small models) to 300GB+ (large models) |
| **RAM** | At least as much as model file size |
| **GPU vRAM** | At least as much as model file size (if using GPU) |

### Example: Llama 2-70B

- Uncompressed: ~140GB storage needed
- With INT4 compression: significantly reduced

---

## Weight Compression with OpenVINO™

### Why Compress?

Weight compression reduces LLM size by quantizing weights to lower precision formats:

| Original Format | Compressed Format | Size Reduction |
|-----------------|-------------------|----------------|
| FP32 | INT8 | 1/4 original size |
| FP32 | INT4 | ~1/8 original size |

**Example:** Zephyr-7B-beta
- FP32 format: 28GB
- INT4 compressed: 4GB (with similar accuracy)

### Benefits of Weight Compression

1. **Enable large models** on devices that couldn't otherwise accommodate them
2. **Reduce storage and memory** overhead
3. **Improve inference speed** by reducing memory access latency
4. **Easier than full quantization** (no calibration data needed)

### Compression Data Types

| Type | Description | Use Case |
|------|-------------|----------|
| **INT8** | 8-bit quantization | Balance between size reduction and accuracy |
| **INT4_SYM** | 4-bit symmetric | Speed prioritized over accuracy |
| **INT4_ASYM** | 4-bit asymmetric | Better accuracy than symmetric, faster than INT8 |

### Comparison Table

| Compression | Memory Reduction | Latency Improvement | Accuracy Loss |
|-------------|------------------|---------------------|---------------|
| INT8 | Low | Medium | Low |
| INT4 Symmetric | High | High | High |
| INT4 Asymmetric | High | Medium | Medium |

---

## Two Approaches to OpenVINO™ LLM Deployment

### Option 1: Hugging Face with Optimum Intel

| Aspect | Details |
|--------|---------|
| **Ease of use** | Lower learning curve, quick integration |
| **Dependencies** | Many Hugging Face dependencies |
| **Languages** | Python only |
| **Best for** | Python-centric projects, rapid prototyping |

### Option 2: Native OpenVINO™ API

| Aspect | Details |
|--------|---------|
| **Ease of use** | Higher learning curve |
| **Dependencies** | Lightweight (numpy, etc.) |
| **Languages** | Python and C/C++ |
| **Best for** | High-performance, resource-optimized production |

---

## Quick Start Example (Hugging Face)

```python
from optimum.intel import OVModelForCausalLM
from transformers import AutoTokenizer, pipeline

# Load model from Hugging Face (auto-converts to OpenVINO IR)
model_id = "HuggingFaceH4/zephyr-7b-beta"
model = OVModelForCausalLM.from_pretrained(model_id, export=True)
tokenizer = AutoTokenizer.from_pretrained(model_id)

# Optional: run on GPU
# model.to("GPU")

# Set up pipeline and generate
pipe = pipeline("text-generation", model=model, tokenizer=tokenizer, max_length=50)
results = pipe("My cat's favorite foods are")
print(results)
```

---

## Weight Compression Example

```python
from optimum.intel.openvino import OVModelForCausalLM
from transformers import AutoTokenizer

# Load and compress to INT8
model = OVModelForCausalLM.from_pretrained(
    model_id,
    export=True,
    compression_option="int8"
)

# Save compressed model
model.save_pretrained("zephyr-7b-beta-int8-ov")
tokenizer.save_pretrained("zephyr-7b-beta-int8-ov")
```

### Compression Options

| Option | Description |
|--------|-------------|
| `int8` | INT8 compression using NNCF |
| `int4_sym_g128` | Symmetric INT4, group size 128 |
| `int4_asym_g128` | Asymmetric INT4, group size 128 |
| `int4_sym_g64` | Symmetric INT4, group size 64 |
| `int4_asym_g64` | Asymmetric INT4, group size 64 |

---

## CLI Conversion Tools

### Convert Model

```bash
optimum-cli export openvino --model meta-llama/Llama-2-7b-chat-hf ov_llama_2
```

### Convert with Quantization

```bash
optimum-cli export openvino --model gpt2 --weight-format int8 ov_gpt2_model
```

### Convert Tokenizer

```bash
convert_tokenizer HuggingFaceH4/zephyr-7b-beta --with-detokenizer -o openvino_tokenizer
```

---

## LLM Inference Pipeline Stages

### Stage 1: Load Model

```python
import openvino as ov

core = ov.Core()
model = core.compile_model("openvino_model.xml")
```

### Stage 2: Tokenize Input

Convert text to tokens the model can understand.

### Stage 3: Run Token Generation Loop

For each iteration:
1. Run inference on input sequence
2. Generate and select new token
3. Append token to sequence
4. Repeat until EOS token or max length

### Stage 4: De-tokenize Outputs

Convert token IDs back to human-readable text.

---

## Benchmark Performance

### CPU Benchmarks (tokens/second throughput)

| Processor | Model | INT4 | INT8 | FP32 |
|-----------|-------|------|------|------|
| Intel Core i9-13900K | Llama-2-7b-chat | 8.9 | 6.7 | 2.2 |
| Intel Xeon Platinum 8380 | Llama-2-7b-chat | 17.4 | 10.4 | 3.6 |
| Intel Xeon Platinum 8490H | Llama-2-7b-chat | 27.0 | 20.1 | N/A |

### GPU Benchmarks (tokens/second throughput)

| Processor | Model | INT4 | INT8 |
|-----------|-------|------|------|
| Intel Core Ultra 7 165H iGPU | Llama-2-7b-chat | 8.5 | 5.4 |
| Intel Arc A770M dGPU | Llama-2-7b-chat | 8.6 | 10.3 |
| Intel Data Center GPU Flex 170 | Llama-2-7b-chat | 12.0 | 15.3 |

---

## OpenVINO™ Model Server

For serving LLMs at scale, OpenVINO™ provides a Model Server with:
- REST and gRPC APIs
- Scalable deployment
- Load balancing
- Model versioning

---

## Key Takeaways

1. **Weight compression is essential** for practical LLM deployment
2. **INT4 quantization** reduces model size to ~1/8 with acceptable accuracy loss
3. **OpenVINO™** provides both Python and C/C++ APIs for maximum flexibility
4. **Hugging Face integration** enables rapid prototyping
5. **Native API** enables high-performance production deployment
6. **Hardware flexibility** across Intel CPUs, integrated GPUs, and discrete GPUs
7. **Official Intel support** ensures long-term maintenance and updates

---

## Resources

- OpenVINO™ Documentation
- Optimum Intel Extension
- OpenVINO™ Notebooks (Jupyter examples)
- Neural Network Compression Framework (NNCF)
- OpenVINO™ Model Server
- OpenVINO™ GenAI GitHub Repository
