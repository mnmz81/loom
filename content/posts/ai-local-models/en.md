---
title: "Running models locally: Ollama and quantization"
summary: "Why run an open-weight model on your own machine, how much memory it needs, what quantization does, and how to call a local model with Ollama, including from the Anthropic SDK."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-tuning, order: 3 }
---

Hosted models run on the provider's servers. **Open-weight** models publish their weights, so you can download them and run them yourself: on a laptop, a server or a phone.

The memory and quantization examples were run with Python 3.9 and their output is real. The Ollama commands follow the official [quickstart](https://docs.ollama.com/quickstart), [chat API](https://docs.ollama.com/api/chat) and [Anthropic compatibility](https://docs.ollama.com/api/anthropic-compatibility) docs and were not run, so their output is **example output**.

## Why run a model locally

- **Privacy**: the data never leaves your machine or your network.
- **Offline work** and no dependency on an outside service.
- **Cost at volume**: no per-token bill, only your own hardware.
- **Control**: a fixed model version, your own fine-tuned adapters, all sampling settings.

The trade-off: the open models you can run on ordinary hardware are smaller, and usually less capable than the largest hosted ones. They are strong at focused tasks (classification, extraction, summarizing, simple coding help) and weaker at long, hard reasoning.

## How much memory a model needs

The weights must fit in memory (GPU memory, or unified memory on Apple Silicon). The size is roughly the number of parameters times the bytes per parameter:

```python
params = 7_000_000_000  # a 7B-parameter model

for name, bits in [("16-bit", 16), ("8-bit", 8), ("4-bit", 4)]:
    gb = params * bits / 8 / 1e9
    print(f"{name}: {gb:.1f} GB for the weights alone")
```

```text
16-bit: 14.0 GB for the weights alone
8-bit: 7.0 GB for the weights alone
4-bit: 3.5 GB for the weights alone
```

On top of the weights, the model needs memory for the context it is processing, which grows with the context length: a model that "fits" with a short prompt may not fit with a long document.

## Quantization

**Quantization** stores each weight with fewer bits. A simple form maps the weights to 8-bit integers using one scale factor:

```python
weights = [0.42, -1.37, 0.05, 0.91, -0.26]

scale = max(abs(w) for w in weights) / 127   # map the largest weight to 127
quantized = [round(w / scale) for w in weights]
restored = [q * scale for q in quantized]

print("int8:    ", quantized)
print("restored:", [round(r, 3) for r in restored])
```

```text
int8:     [39, -127, 5, 84, -24]
restored: [0.421, -1.37, 0.054, 0.906, -0.259]
```

The restored values are close but not exact. Real methods are smarter (per-group scales, special 4-bit formats), but the trade-off is the same: less memory and faster loading, for a small loss of quality that grows as the bits shrink. Local tools usually ship models already quantized, often in the GGUF file format used by llama.cpp; the model name or tag tells you the precision.

## Ollama

**Ollama** downloads, runs and serves open models with one command:

```bash
ollama run gemma4:e2b
```

This downloads the model and opens a chat in the terminal (type `/bye` to exit). Ollama also runs a local server on port 11434. Its own chat API accepts the sampling options from the temperature post, which current hosted Claude models no longer accept:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gemma4:e2b",
  "messages": [{"role": "user", "content": "Suggest a name for a coffee shop."}],
  "stream": false,
  "options": {"temperature": 0.7, "top_p": 0.9, "seed": 42}
}'
```

Setting `seed` makes the output repeatable for the same model, prompt and options, which is useful in tests.

## The same code for local and hosted

Ollama also exposes an Anthropic-compatible endpoint, so the `anthropic` SDK from the rest of this series can talk to a local model by changing only the address. The docs say the API key is "required but ignored":

```python
import anthropic

client = anthropic.Anthropic(
    base_url="http://localhost:11434",
    api_key="ollama",  # required but ignored
)

message = client.messages.create(
    model="gemma4:e2b",
    max_tokens=200,
    extra_body={"temperature": 0.2},  # SDK v1.0+ has no temperature argument
    messages=[{"role": "user", "content": "In one sentence, what is quantization?"}],
)
print(message.content[0].text)
```

```text
Quantization stores a model's weights with fewer bits to save memory and speed it up.
```

The compatibility docs list what works (messages, streaming, system prompts, tools, base64 images, thinking) and what does not (token counting, `tool_choice`, prompt caching, batches, citations and PDF documents). That makes it easy to develop against a local model and switch to a hosted one, or to send simple requests to a local model and hard ones to a hosted model, the routing pattern from the agents series.

This ends the series on adapting models. The last series covers what it takes to run all of this in production: evals, observability, cost, security and guardrails.
