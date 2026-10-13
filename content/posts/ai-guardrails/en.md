---
title: "Guardrails: checks around the model"
summary: "Layered guardrails for LLM applications: screening input with a small model, validating and redacting output, checking actions, limits, and what to show the user when a check fails."
date: 2026-10-13
tags: [ai, llmops, security]
series: { key: ai-production, order: 5 }
---

The previous post covered attacks. **Guardrails** are the broader set of checks that keep a system's input and output within bounds, against attacks and also against ordinary mistakes: a hallucinated number, a leaked phone number, a request that is off-topic, an answer in the wrong format. The model itself is one layer; the rest is code you write around it.

The redaction example was run with Python 3.9 and its output is real. The screening code follows the official guide to [mitigating jailbreaks and prompt injections](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks) and the [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) docs, and was not run.

## Layers, not one wall

No single check catches everything, and each one makes mistakes. Put several cheap, simple checks in a row, each able to block, fix or fall back:

![Request flow: input checks, the model, output checks, action checks; each can block or fall back](/images/ai-guardrails/guardrail-layers.svg)

## Input checks

Before a request reaches the main model:

- **Plain validation**: length limits, allowed file types, rate limits per user. Cheap and reliable.
- **A screen with a small model**: the official guide suggests a lightweight model with structured output that answers one narrow question, such as "is this harmful?" or "is this on-topic for our product?":

```python
import anthropic
from pydantic import BaseModel

client = anthropic.Anthropic()

class Screen(BaseModel):
    on_topic: bool
    harmful: bool

def screen(user_text):
    response = client.messages.parse(
        model="claude-haiku-5-5",
        max_tokens=200,
        messages=[{"role": "user", "content":
            "A user sent this message to a customer support bot for a software product:\n"
            f"<message>{user_text}</message>\n"
            "Is it on-topic for product support? Is it harmful, illegal or explicit?"}],
        output_format=Screen,
    )
    if response.stop_reason == "refusal":
        return Screen(on_topic=False, harmful=True)   # the docs: treat a refusal as harmful
    return response.parsed_output
```

The guide notes that the small model's own safety classifiers can decline the screening request, and recommends treating `stop_reason: "refusal"` as a harmful verdict, as the code does.

## Output checks

After the model answers, before the user sees it:

- **Format**: with structured outputs the schema is guaranteed, but still check the values that matter (a date in range, a price that exists in your catalog).
- **Grounding**: for RAG answers, check that claims are supported by the retrieved text, with the LLM-judge from the evals post, run on a sample or on high-risk answers.
- **Sensitive data**: do not show personal data the user should not see. A first, simple layer is pattern-based redaction:

```python
import re

PATTERNS = {
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    "card": re.compile(r"\b(?:\d[ -]?){13,16}\b"),
    "phone": re.compile(r"\b0\d{1,2}-?\d{7}\b"),
}

def redact(text):
    for name, pattern in PATTERNS.items():
        text = pattern.sub(f"[{name.upper()}]", text)
    return text

answer = "Contact dana@example.com or 054-1234567. Card on file: 4111 1111 1111 1111."
print(redact(answer))
```

```text
Contact [EMAIL] or [PHONE]. Card on file: [CARD].
```

Regular expressions miss things and sometimes over-match, so treat them as one layer, not a guarantee. The phone pattern above, for example, only matches one local format. Dedicated PII-detection tools do better, and the best protection is not retrieving data the user may not see in the first place.

## Action checks

For agents, the most important guardrail sits between the model's decision and the real world:

- **Allowlists**: which tools, which folders, which domains, which recipients.
- **Argument checks in code**: a refund tool rejects amounts over a limit, whatever the model asked.
- **Human confirmation** for anything irreversible or outward-facing: show exactly what will happen ("Send this email to these 3 people?") and wait for a yes.
- **Budgets**: maximum steps, tokens and money per task and per user.

## When a check fails

A guardrail is only as good as what happens after it fires:

- **Tell the user something useful**: "I can only help with questions about the product" is better than a generic error.
- **Fall back safely**: answer without the risky part, hand off to a human, or ask a clarifying question.
- **Log it** with the trace, and watch the rates. A sudden rise in blocks means either an attack or a check that is too strict.
- **Test the guardrails too**: add blocked and allowed examples to the eval set, so you know both that they stop the bad cases and that they do not stop good users.

The next and last post in the series puts everything together: a decision map for choosing between prompting, RAG, tools, agents and fine-tuning.
