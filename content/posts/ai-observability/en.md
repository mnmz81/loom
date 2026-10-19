---
title: "Observability: seeing what an LLM system does"
summary: "What to log for every model call and agent step, traces and spans, a tiny tracer in Python, the metrics worth watching, privacy, and turning production failures into evals."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 2 }
---

An eval tells you how the system does on cases you prepared. **Observability** tells you what it does on the cases you did not: real users, real documents, real agent runs. LLM systems need it more than most software, because the same code can produce a different answer, take a different path through tools, or cost ten times more on the next request.

The tracer was run with Python 3.9 and its output is real; the model and search calls in it are stand-ins, and the millisecond values change on every run.

## What to record

For every model call, record at least:

- **What went in**: the model, the prompt template and its version, the settings (effort, max_tokens), and the input (or a reference to it, see privacy below).
- **What came out**: the text or tool calls, and `stop_reason`.
- **What it cost**: `usage.input_tokens`, `usage.output_tokens`, and the cache fields when you use caching.
- **How long it took**, and any error.

For agents, also record every tool call: the tool, its input, a short version of its result, and whether it failed. When an agent gives a bad answer, the reason is almost always visible in that sequence: a search that returned nothing, a file it never opened, an error it misread.

## Traces and spans

A user request can trigger many steps: a retrieval, a rerank, several model calls, a few tools. A **trace** groups all of them under one id, and each step is a **span** with its own timing and data. The whole trace answers "why was this request slow?" or "why did it cost $2?".

A minimal tracer shows the idea: every step logs one JSON line with the trace id:

```python
import json, time

def traced(step_name):
    def wrap(fn):
        def inner(*args, trace_id, **kwargs):
            start = time.perf_counter()
            result = fn(*args, **kwargs)
            span = {
                "trace_id": trace_id,
                "step": step_name,
                "ms": round((time.perf_counter() - start) * 1000),
                "input_tokens": result.get("input_tokens"),
                "output_tokens": result.get("output_tokens"),
            }
            print(json.dumps(span))
            return result
        return inner
    return wrap

@traced("retrieve")
def retrieve(question):
    time.sleep(0.02)  # stand-in for a vector search
    return {"chunks": ["..."]}

@traced("generate")
def generate(question, chunks):
    time.sleep(0.05)  # stand-in for the model call
    return {"text": "...", "input_tokens": 1830, "output_tokens": 212}

trace_id = "req-0001"  # in production: a unique id per request
chunks = retrieve("How many vacation days?", trace_id=trace_id)["chunks"]
generate("How many vacation days?", chunks, trace_id=trace_id)
```

```text
{"trace_id": "req-0001", "step": "retrieve", "ms": 23, "input_tokens": null, "output_tokens": null}
{"trace_id": "req-0001", "step": "generate", "ms": 57, "input_tokens": 1830, "output_tokens": 212}
```

## Use a standard instead of your own

In a real system, use **OpenTelemetry**, the open standard for traces, metrics and logs, which most monitoring tools understand. It has a set of [semantic conventions for generative AI](https://github.com/open-telemetry/semantic-conventions-genai) that define standard names for model calls, token usage and agent steps; they are still evolving, so check the current version. Many LLM frameworks and dedicated LLM observability tools (open-source and hosted) emit these traces for you, and show them as a timeline per request.

## Metrics worth watching

- **Latency**, especially p95 and p99, not only the average. Agents have long tails.
- **Tokens and cost per request**, and per user or feature. A prompt change that doubles input tokens shows up here first.
- **`stop_reason` distribution**: a rise in `max_tokens` means answers are being cut off; a rise in `refusal` means something in the inputs changed.
- **Tool error rate** and **steps per agent run**. An agent that suddenly needs twice the steps is struggling.
- **User feedback** (thumbs up/down, edits, retries), linked to the trace.

Alert on sudden changes, not only on absolute limits.

## Privacy

Prompts and answers often contain personal data. Decide what you log before you log it: mask or drop personal fields, keep raw text only where you need it and only as long as you need it, restrict who can read traces, and follow your data retention rules. The guardrails post shows a simple redaction function.

## Close the loop

Observability feeds evals. When a trace shows a bad answer, a slow path or a confused agent, turn it into an eval case, fix the system, and confirm the fix with the eval. Over time the eval set becomes a record of every way the system has failed.

The next post covers cost and latency: how to make the system cheaper and faster once you can measure it.
