---
title: "Cost and latency: prompt caching, batches and model choice"
summary: "Where the money and time go in an LLM system, and the levers that cut them: the right model and effort, shorter outputs, prompt caching, the Batch API and streaming."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 3 }
---

You pay for tokens, and you wait for tokens. Input tokens are cheaper and fast to process; output tokens (including thinking) are more expensive and come one at a time. Almost every cost and latency improvement either sends fewer tokens, generates fewer tokens, or reuses work.

The cost calculation was run with Python 3.9 and its output is real; it uses the prices listed in the [models overview](https://platform.claude.com/docs/en/models/overview) and the multipliers in the [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) docs at the time of writing, and prices change. The API code follows the [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) and [batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) docs and was not run.

## The biggest levers

In rough order of impact:

1. **The model.** A smaller model can cost many times less per token and answers faster. Route easy requests to a small model and keep the large one for hard requests (the routing pattern). Check with an eval that quality holds.
2. **Effort and output length.** Thinking and long answers are output tokens. Lower `effort` where the eval allows it, ask for short answers in the prompt, and set `max_tokens` to a sensible limit.
3. **Input size.** Send the chunks the task needs, not whole documents; trim old tool results in agents.
4. **Reuse**: prompt caching for repeated prefixes, batches for work that can wait.

## Prompt caching

Many applications send the same large prefix again and again: a long system prompt, tool definitions, a document the user asks several questions about. **Prompt caching** stores that prefix after the first request, so later requests read it from the cache, which is cheaper and faster. The simplest form is one top-level setting:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    cache_control={"type": "ephemeral"},
    system=LONG_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": "What is the refund policy for annual plans?"}],
)

u = response.usage
print(u.cache_creation_input_tokens, u.cache_read_input_tokens, u.input_tokens)
```

```text
0 20000 300
```

In this example output, 20,000 tokens were read from the cache and only 300 new tokens were processed at the full price. The docs list the rules: by default the cache lives 5 minutes and every hit refreshes it (a 1-hour option exists); writing to the cache costs 1.25 times the input price, reading costs a fraction of it (10% on most models, 5% on Opus 5.5 and Sonnet 5.5); and the prefix must be **identical**, so a timestamp or user name placed before the cached part breaks it. Put stable content first and changing content last.

## What caching saves

A support bot with a 20,000-token system prompt, answering 10,000 questions of 300 tokens each with 400-token answers, priced at Opus 5.5 list prices at the time of writing:

```python
# Prices in USD per million tokens (Claude Opus 5.5, from the models overview at the time of writing)
INPUT, OUTPUT = 4.00, 20.00
CACHE_WRITE = INPUT * 1.25   # 5-minute cache write
CACHE_READ = INPUT * 0.05    # cache read on Opus 5.5

requests = 10_000
system_prompt, question, answer = 20_000, 300, 400   # tokens per request

def per_million(tokens, price):
    return tokens / 1_000_000 * price

plain = requests * (per_million(system_prompt + question, INPUT) + per_million(answer, OUTPUT))
cached = (per_million(system_prompt, CACHE_WRITE)                       # first request writes the cache
          + (requests - 1) * per_million(system_prompt, CACHE_READ)     # the rest read it
          + requests * (per_million(question, INPUT) + per_million(answer, OUTPUT)))

print(f"no caching:   ${plain:,.2f}")
print(f"with caching: ${cached:,.2f}")
print(f"batch, no caching: ${plain * 0.5:,.2f}")
```

```text
no caching:   $892.00
with caching: $132.10
batch, no caching: $446.00
```

The calculation assumes the cache stays warm, meaning requests arrive often enough. With traffic spread thin, use the 1-hour cache or accept some cache misses.

## The Batch API

Work that does not need an immediate answer, such as nightly reports, classifying a backlog, generating eval or distillation data, can go through the **Message Batches API**. The docs list a 50% discount, with most batches done within an hour and a limit of 24 hours:

```python
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"ticket-{i}",
            "params": {
                "model": "claude-opus-5-5",
                "max_tokens": 200,
                "messages": [{"role": "user", "content": f"Classify this ticket: {text}"}],
            },
        }
        for i, text in enumerate(tickets)
    ]
)
print(batch.id, batch.processing_status)
```

Poll until `processing_status` is `ended`, then read the results with `client.messages.batches.results(batch.id)`. Each result carries its `custom_id`, because the order is not guaranteed. The docs say results stay available for 29 days.

## Latency the user feels

Some latency cannot be removed, but it can be hidden or overlapped:

- **Stream** the answer, so the first words appear in about a second instead of after the whole answer.
- **Run independent calls in parallel** (the parallelization pattern) instead of one after another.
- **Lower effort** for interactive features; keep high effort for background work.
- **Cache** the long prefix: Anthropic's contextual retrieval article reports that caching cut latency by more than 2x for a large prompt, not only cost.
- **Move simple, high-volume tasks** to a small model, or to a local one.

Measure before and after with the traces from the previous post. The next post covers security: what can go wrong when an LLM reads untrusted text and takes actions.
