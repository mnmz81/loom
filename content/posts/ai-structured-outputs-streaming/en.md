---
title: "Structured outputs and streaming"
summary: "Get JSON that always matches your schema with structured outputs and Pydantic, and show the answer while it is being written with streaming."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 6 }
---

Two features turn a model from a chat toy into a component of an application. **Structured outputs** give you data your code can rely on. **Streaming** lets a user see the answer as it is written, instead of staring at a spinner.

The code follows the official [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) and [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) docs. It was not run for this post, so the output blocks are **example output**.

## Why "answer in JSON" is not enough

You can ask for JSON in the prompt, and most of the time you will get it. Sometimes you will get JSON wrapped in a sentence, a missing field, or a string where you expected a boolean. For code that parses the answer, "most of the time" is a bug.

**Structured outputs** fix this at the source: you give the API a JSON schema, and the model's output is constrained to match it. The docs list the setting as `output_config.format` with type `json_schema`.

## Structured outputs with Pydantic

The Python SDK can build the schema from a Pydantic model and validate the answer for you, using `messages.parse()`:

```python
from pydantic import BaseModel
import anthropic

class ContactInfo(BaseModel):
    name: str
    email: str
    plan_interest: str
    demo_requested: bool

client = anthropic.Anthropic()

response = client.messages.parse(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": "Extract the key information from this email: "
                   "John Smith (john@example.com) is interested in our Enterprise plan "
                   "and wants to schedule a demo for next Tuesday at 2pm.",
    }],
    output_format=ContactInfo,
)

contact = response.parsed_output
print(contact.name, contact.email, contact.demo_requested)
```

```text
John Smith john@example.com True
```

`parsed_output` is a `ContactInfo` instance, so your editor knows its fields and the types are already checked. To send a raw schema without Pydantic, pass `output_config={"format": {"type": "json_schema", "schema": {...}}}` to `messages.create()` and parse the text block with `json.loads`.

## Limits worth knowing

The docs list restrictions on the schema and on the output:

- Every object needs `additionalProperties: false`, and recursive schemas are not supported.
- Numeric and length constraints such as `minimum` or `maxLength` are not enforced by the API. The Pydantic helper moves them into descriptions and validates them in your code.
- If the model refuses (`stop_reason: "refusal"`) or runs out of tokens (`stop_reason: "max_tokens"`), the output may not match the schema. Check `stop_reason`.
- The first request with a new schema is slower while the schema is compiled; it is then cached for 24 hours.

The same mechanism exists for tools: adding `"strict": True` to a tool definition guarantees that the tool's input matches its schema. Tools are covered in the agents series.

## Streaming

Without streaming, the API returns the whole answer at the end. A long answer can take many seconds. With streaming, the SDK hands you text as it arrives:

```python
with client.messages.stream(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain streaming in two sentences."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    final = stream.get_final_message()

print()
print(final.usage.output_tokens)
```

```text
Streaming sends the answer in small pieces as the model writes it, instead of waiting
for the full response. The user starts reading almost immediately.
38
```

`stream.get_final_message()` collects everything into a normal message object, so you still get `usage` and `stop_reason` at the end.

## What travels over the wire

Under the hood, streaming uses server-sent events. The docs list the order of events:

```text
message_start          a message with empty content
content_block_start    a block begins (text, thinking, tool_use)
content_block_delta    a piece of the block: text_delta, input_json_delta, ...
content_block_stop     the block ends
message_delta          final fields such as stop_reason and usage
message_stop           the end
```

Most of the time the SDK handles these events for you. You need them when you stream to a browser yourself, or when you want to show tool calls and thinking as they happen.

The next post covers reasoning models: models that think before they answer.
