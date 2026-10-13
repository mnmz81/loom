---
title: "What is an LLM"
summary: "A large language model predicts the next token, over and over. What that means, what it gets you, and your first API call to one in Python."
date: 2026-10-12
tags: [ai, llm, tutorial]
series: { key: ai-basics, order: 1 }
---

An LLM (large language model) is a program that takes text in and produces text out. ChatGPT, Claude and Gemini are products built on top of LLMs. This post explains what happens inside the loop at the simplest level, and then makes a first call from Python.

The code follows the [official Anthropic quickstart](https://platform.claude.com/docs/en/get-started). It was not run for this post, so every output block below is **example output**: the structure matches the docs, but the text of a real answer will differ on every run.

## What an LLM is

An LLM is a very large function. It was trained on a huge amount of text, and it learned one task: given the text so far, estimate which piece of text is likely to come next.

The pieces are called tokens. A token is usually a word or part of a word. The next post covers tokens and the context window in detail; for now, think of a token as a small chunk of text.

Everything else an LLM does, such as answering questions, translating, summarizing or writing code, comes from that one skill. Nobody wrote a rule for translation. The model picked it up because translated text was part of what it learned from.

## How it generates text

The model does not write a whole answer at once. It runs a loop:

1. It reads all the text so far.
2. It produces a probability for every possible next token.
3. One token is picked, usually a likely one.
4. The token is appended to the text, and the loop starts again.

![The model reads the text so far, produces probabilities for the next token, one token is picked and appended, and the loop repeats](/images/ai-what-is-llm/next-token-loop.svg)

The loop stops when the model emits a special stop token, or when it reaches the token limit you set. Because a token is picked from a probability distribution, the same question can produce different answers. That is also the root of hallucinations: the model produces text that is likely, not text that was checked. Both are covered in a later post.

## Your first call

To call a model you need an API key in the `ANTHROPIC_API_KEY` environment variable and the `anthropic` package (`pip install anthropic`). The SDK reads the key from the environment on its own.

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1000,
    messages=[{"role": "user", "content": "In one sentence, what is an LLM?"}],
)

for block in message.content:
    if block.type == "text":
        print(block.text)
```

The three parameters `model`, `max_tokens` and `messages` are required, according to the [Messages API reference](https://platform.claude.com/docs/en/api/messages). `max_tokens` is a ceiling on the length of the answer, not a target. The response content is a list of blocks, so the code loops over them and prints the text ones.

```text
An LLM is a neural network trained on large amounts of text to predict the next
token, which lets it generate, summarize and translate language.
```

This is example output. Model names change over time, so check the [models overview](https://platform.claude.com/docs/en/models/overview) for the current list before you copy the name above.

## What comes back

The response is more than text. It also tells you why the model stopped and how many tokens the call used:

```python
print(message.stop_reason)
print(message.usage.input_tokens, message.usage.output_tokens)
```

```text
end_turn
17 31
```

`stop_reason` of `end_turn` means the model finished on its own. A value of `max_tokens` means the answer was cut at your limit. `usage` counts tokens in and out, and that is what you are billed for. The numbers above are example output.

## Where this series goes next

Knowing the loop explains most of what comes later: why the context window has a limit, why prompts matter, why a model can sound sure and be wrong, and why giving it tools or documents changes what it can do.

The next posts in this series cover how models are built, tokens and the context window, prompting, structured outputs, reasoning models and multimodal input. After that come RAG, tools and agents, fine-tuning, and what it takes to run all of this in production.
