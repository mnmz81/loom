---
title: "Five workflow patterns"
summary: "Prompt chaining, routing, parallelization, orchestrator-workers and evaluator-optimizer: the patterns that solve most LLM tasks without a full agent, with short Python for each."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 4 }
---

The previous post argued for the simplest solution that works. Between a single call and a full agent there is a middle ground: **workflows**, where your code fixes the structure and the model fills in each step. Anthropic's [Building effective agents](https://www.anthropic.com/research/building-effective-agents) names five patterns that cover most cases.

The code was not run for this post, so the output block is **example output**. All examples use this small helper:

```python
import anthropic

client = anthropic.Anthropic()

def llm(prompt, system="", effort="low"):
    message = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=4000,
        system=system,
        output_config={"effort": effort},
        messages=[{"role": "user", "content": prompt}],
    )
    return next(b.text for b in message.content if b.type == "text")
```

![Five patterns: prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer](/images/ai-workflow-patterns/patterns.svg)

## 1. Prompt chaining

Split the task into fixed steps, where each call gets the previous output. Between steps, your code can check the result and stop early. The article's example: write an outline, check it, then write the document. You trade latency for accuracy, because each call has a simpler job.

```python
outline = llm(f"Write a 5-point outline for a blog post about: {topic}")

if outline.count("\n") < 4:
    raise ValueError("Outline too short, stopping before the expensive step")

post = llm(f"Write the blog post following this outline exactly:\n\n{outline}", effort="medium")
```

## 2. Routing

Classify the input first, then send it to a handler built for that category. Each handler gets a focused prompt, and easy cases can go to a smaller, cheaper model:

```python
CATEGORIES = ["billing", "technical", "other"]

category = llm(
    f"Classify this support message as one of {CATEGORIES}. Answer with the word only.\n\n{ticket}"
).strip().lower()

handlers = {
    "billing": "You are a billing specialist. Be precise about amounts and dates.",
    "technical": "You are a support engineer. Ask for logs if something is unclear.",
}
answer = llm(ticket, system=handlers.get(category, "You are a helpful support agent."))
print(category)
```

```text
billing
```

In production, use structured outputs for the classification instead of parsing a word, so the category is always valid.

## 3. Parallelization

Run independent calls at the same time and combine the results in code. The article lists two forms:

- **Sectioning**: different parts of the job in parallel, for example one call answers while another checks the input against your policy.
- **Voting**: the same task several times, for example three reviews of the same code, flagging an issue if any of them finds one.

```python
from concurrent.futures import ThreadPoolExecutor

checks = {
    "security": "List security problems in this code, or say NONE.",
    "performance": "List performance problems in this code, or say NONE.",
    "readability": "List readability problems in this code, or say NONE.",
}

with ThreadPoolExecutor() as pool:
    futures = {name: pool.submit(llm, f"{task}\n\n{code}") for name, task in checks.items()}
    reports = {name: f.result() for name, f in futures.items()}

problems = {name: r for name, r in reports.items() if r.strip() != "NONE"}
```

## 4. Orchestrator-workers

A lead model reads the task, decides which subtasks are needed, hands them to worker calls, and combines the results. Unlike parallelization, the subtasks are not known in advance. The article's example is a code change that touches an unknown number of files. In code, the orchestrator returns a list of subtasks (ideally as structured output), your code runs a worker for each, and a final call merges the results. It sits close to an agent, and the multi-agent post builds on it.

## 5. Evaluator-optimizer

One call writes, another evaluates against clear criteria and gives feedback, in a loop until it passes or a limit is reached. The article says it fits when evaluation criteria are clear and iterating measurably helps, such as translation:

```python
draft = llm(f"Translate to Hebrew:\n\n{text}", effort="medium")

for attempt in range(3):
    review = llm(
        "Review this translation for accuracy and natural Hebrew. "
        "Answer PASS if it is good, otherwise list concrete fixes.\n\n"
        f"Original:\n{text}\n\nTranslation:\n{draft}"
    )
    if review.strip().startswith("PASS"):
        break
    draft = llm(f"Apply these fixes to the translation:\n{review}\n\nTranslation:\n{draft}")
```

## Choosing a pattern

- Steps known and in order → **chaining**.
- Inputs of clearly different types → **routing**.
- Independent checks, or you want several opinions → **parallelization**.
- Subtasks unknown until you read the task → **orchestrator-workers**.
- Quality improves with feedback and you can state the criteria → **evaluator-optimizer**.

The patterns combine: a router can send hard cases to a chain, and a chain step can be an evaluator loop. Start with the simplest one, measure, and add structure only where the measurements show a gain.

The next post covers memory and context management: how agents keep working when a task outgrows the context window.
