---
title: "Tokens and the context window"
summary: "What a token is, how to count tokens before you send a request, what fills the context window, and what happens when it runs out."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 3 }
---

Tokens are the unit everything about an LLM is measured in: what it reads, what it writes, what it costs and how much it can handle at once. This post explains what a token is, how to count tokens, and what the context window is.

The facts and code follow the official [context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) and [token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting) docs. The code was not run, so the output blocks are **example output**.

## What a token is

A model does not read letters or whole words. A **tokenizer** first splits the text into pieces from a fixed vocabulary, and each piece is a token. Common English words are often a single token; rare words, code and names are split into several. Hebrew and other languages usually need more tokens per word than English.

Every model family has its own tokenizer, so the same text can produce a different number of tokens on different models. The docs give a concrete case: Claude Opus 4.7 and later models use a newer tokenizer, and the same text produces roughly 30 percent more tokens than on earlier models. A rough rule of thumb for English is a few characters per token, but do not plan a budget on a rule of thumb. Count.

## Counting tokens

The API has an endpoint that counts the tokens of a request without running it. It takes the same input as a real call:

```python
import anthropic

client = anthropic.Anthropic()

count = client.messages.count_tokens(
    model="claude-opus-5-5",
    system="You are a scientist",
    messages=[{"role": "user", "content": "Hello, Claude"}],
)
print(count.input_tokens)
```

```text
14
```

According to the docs, token counting is free (it has its own rate limit) and the result is an estimate that can differ slightly from the real call. Count with the model you plan to use, because the tokenizer differs between models.

## The context window

The **context window** is everything the model can see in one request, including the answer it is writing. The docs list what counts: the system prompt, every message in the conversation (including tool results, images and documents), the tool definitions, and the output, including thinking.

![The context window holds the system prompt, tool definitions, earlier turns, the new message and the answer](/images/ai-tokens-context-window/context-window.svg)

A model has no memory between requests. In a chat, your application resends the whole conversation every turn, so the window fills up as the conversation grows. At the time of writing, the current Claude models have a 1M-token window and can write up to 128k tokens in one answer; check the [models overview](https://platform.claude.com/docs/en/models/overview) for current numbers.

## Bigger is not automatically better

A large window lets you send whole documents, but the docs warn that "more context isn't automatically better": as the token count grows, accuracy and recall degrade. They call this **context rot**.

In practice that means:

- Send what the task needs, not everything you have. Choosing the right pieces is the job of RAG, covered later in the series.
- Put long documents at the top of the prompt and the question at the end. The prompting guide recommends this order for long inputs.
- In long conversations and agents, summarize or drop old content. The post on memory and context management covers the tools for that.

## When the window runs out

Two things can happen. If the input alone is larger than the window, the API rejects the request with a 400 error ("prompt is too long"). If the input fits but the answer reaches the limit while it is being written, the answer stops and the response says why:

```python
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=128000,
    messages=[{"role": "user", "content": very_long_text}],
)
print(message.stop_reason)
```

```text
model_context_window_exceeded
```

A `stop_reason` of `max_tokens` is the more common cousin: the answer hit the `max_tokens` limit you set. In both cases the answer is cut, so check `stop_reason` before you trust the text.

The next post covers the parameters that control how the next token is picked, and why models hallucinate.
