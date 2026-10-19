---
title: "Prompting: how to ask a model"
summary: "The system prompt, clear instructions with a reason, few-shot examples, XML tags and long documents: the prompting techniques the official guide recommends."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 5 }
---

The prompt is the main way to steer a model. The techniques below are the ones the official [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) guide recommends for all current models.

The code was not run for this post, so the output blocks are **example output**.

## The system prompt

A request has two places for instructions. The `messages` list holds the conversation. The `system` parameter holds instructions that apply to the whole conversation: who the model is, what it should and should not do, what format to use.

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="You are a helpful coding assistant specializing in Python.",
    messages=[{"role": "user", "content": "How do I sort a list of dictionaries by key?"}],
)
print(message.content[0].text)
```

```text
Use sorted() with a key function:

    people = [{"name": "Dana", "age": 31}, {"name": "Avi", "age": 25}]
    by_age = sorted(people, key=lambda p: p["age"])
...
```

The guide says that setting a role in the system prompt focuses behavior and tone, and that "even a single sentence makes a difference".

## Be clear, and explain why

The guide's main advice: treat the model like "a brilliant but new employee" who does not know your norms. Its golden rule is to show the prompt to a colleague with no context; if they would be confused, the model will be too.

- Say exactly what you want, including the format and the limits.
- When order matters, write the steps as a numbered list.
- Give the reason behind a rule. The guide's example: instead of "NEVER use ellipses", explain that the answer will be read by a text-to-speech engine that cannot pronounce them. The model generalizes from the reason.

## Examples (few-shot)

Examples are one of the most reliable ways to control format and tone. The guide recommends 3 to 5 examples that are relevant, varied enough to cover edge cases, and wrapped in tags so they are not confused with the instructions:

```text
Classify the sentiment of the review as positive, negative or mixed.

<examples>
<example>
Review: Fast delivery, but the box was crushed.
Sentiment: mixed
</example>
<example>
Review: Works exactly as described.
Sentiment: positive
</example>
<example>
Review: Stopped working after two days.
Sentiment: negative
</example>
</examples>

Review: {{REVIEW}}
```

If all your examples look alike, the model may copy details you did not mean, such as their length.

## XML tags for structure

When a prompt mixes instructions, context, examples and input, wrap each kind in its own tag (`<instructions>`, `<context>`, `<input>`). The guide says this reduces misinterpretation. The tag names are not special keywords; use clear names and use them consistently.

## Long documents

For inputs of 20k tokens or more, the guide recommends putting the documents **at the top** and the question **at the end**, and notes that queries at the end can improve quality "by up to 30 percent" in its tests. With several documents, wrap each one with its source:

```text
<documents>
  <document index="1">
    <source>annual_report_2025.pdf</source>
    <document_content>
      {{ANNUAL_REPORT}}
    </document_content>
  </document>
</documents>

Using only the report above, list the three biggest risks it mentions.
```

## What changed on current models

Two older tricks no longer work on current Claude models:

- **Prefill.** Ending `messages` with a partial assistant message to force the start of the answer is rejected on Claude Opus 4.6 and later Opus models, according to the migration guide. Use structured outputs or system prompt instructions instead.
- **Sampling parameters**, covered in the previous post.
