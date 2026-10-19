---
title: "Reasoning models: thinking before answering"
summary: "What thinking is, how adaptive thinking and the effort parameter control it, how to read thinking blocks, and what it costs."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 7 }
---

A model that answers in a single pass has to get everything right on the first token. **Reasoning models** first work through the problem, and only then write the answer.

The facts and code follow the official [thinking](https://platform.claude.com/docs/en/build-with-claude/thinking) and [effort](https://platform.claude.com/docs/en/build-with-claude/effort) docs. The code was not run for this post, so the output block is **example output**.

## What thinking is

With thinking, the model writes its working before the answer: it restates the problem, tries approaches, checks intermediate results and drops paths that do not hold up. The docs describe this as the reason thinking helps on math, coding, analysis and long agent tasks: the quality depends on intermediate work that would otherwise be skipped.

The thinking arrives in separate `thinking` blocks, before the `text` blocks of the answer. Two facts about cost matter:

- Thinking tokens are billed as **output tokens**, even when the thinking text is not shown to you.
- They count toward `max_tokens`, together with the answer. A small `max_tokens` can cut the answer off.

## Adaptive thinking and effort

On current models, the model itself decides when and how much to think. The docs call this **adaptive thinking**. On Claude Opus 5.5, Sonnet 5.5, Haiku 5.5 and Fable 5.1 it is on by default and needs no configuration; on Opus 5.5 it cannot be turned off at all.

The main control is **effort**, set in `output_config`. It accepts `low`, `medium`, `high`, `xhigh` and `max` (not every level on every model). The docs describe it as "a behavioral signal, not a strict token budget": at low effort the model thinks less and answers faster and cheaper; at high effort it thinks more and tends to be more thorough. Effort affects all output, including tool calls, not only thinking. The default is `medium` on Opus 5.5 and Haiku 5.5, and `high` on the other models.

## Seeing the thinking

On current models the thinking text is hidden by default (`display: "omitted"`): you get the blocks, but their `thinking` field is empty. To see it, opt in with `display: "summarized"`:

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "high"},
    messages=[{"role": "user", "content": "Is 1001 a prime number? Answer yes or no."}],
)

for block in message.content:
    if block.type == "thinking":
        print("THINKING:", block.thinking)
    elif block.type == "text":
        print("ANSWER:", block.text)
```

```text
THINKING: Check small divisors. 1001 / 7 = 143, and 143 = 11 x 13, so 1001 = 7 x 11 x 13.
ANSWER: No. 1001 = 7 x 11 x 13.
```

What you see is a **summary** of the reasoning, written by a different model; the docs say no setting returns the raw chain of thought.

## Thinking and tools

When a model thinks and then calls a tool, you must send the thinking block back unchanged together with the tool result. Each block carries a `signature` field, and the docs say the API rejects modified thinking blocks. In practice: when you build the next request, copy the assistant's `content` list as it came back. The tools post shows the full loop.

## When to raise or lower effort

- Simple tasks such as classification, extraction or short chat: `low` or `medium`.
- Hard reasoning, tricky bugs, long agent tasks: `high` or above, with a large `max_tokens`.
- Do not guess: the docs recommend running an "effort sweep" on your own evaluation set and picking the lowest level that keeps quality. The post on evals later in the series shows how.
