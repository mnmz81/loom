---
title: "Decision map: prompt, RAG, tools, agent or fine-tune?"
summary: "The whole series in one place: a decision map for choosing the right technique, what each one changes and costs, a worked example, and a checklist before going to production."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 6 }
---

This series covered a lot of techniques. In practice, the hard part is not how each one works but which one to reach for. This post puts them side by side, with a map for choosing, and links each choice back to the post that explains it.

The map follows the advice that runs through the official sources quoted in the series, most of all Anthropic's [Building effective agents](https://www.anthropic.com/research/building-effective-agents): find the simplest solution that works, and add complexity only when measurements show it helps.

## The map

Go down the questions in order and stop at the first one that addresses your actual problem. Then measure, and only go further if the problem remains.

![Decision map: better prompt, RAG, tools, workflow, agent, fine-tune, small or local model, from the top down](/images/ai-decision-map/decision-map.svg)

The order matters. Each step down costs more to build, run and maintain than the one above it. Teams that start at the bottom (fine-tuning a model for a problem that a clear prompt or a retrieval step would have solved) pay for it in time and money.

## What each technique changes

| Technique | What it changes | Fixes | Cost to build and run |
|---|---|---|---|
| Prompt | the instructions | unclear task, format, tone | lowest |
| Structured outputs | the output's shape | invalid JSON, missing fields | low |
| RAG | what the model can read | missing, fresh or private knowledge | medium |
| Tools | what the model can do | needs live data or actions | medium |
| Workflow | the steps, fixed in code | multi-step tasks with a known shape | medium |
| Agent | the steps, chosen by the model | open-ended tasks | high, and less predictable |
| Fine-tuning | the model's weights | behavior that prompting cannot fix | high, plus maintenance |
| Small, distilled or local model | which model runs | cost, latency, privacy at volume | varies |

They combine. A typical production system uses a good prompt, structured outputs, RAG over its documents, a few tools, and a workflow around them, with fine-tuning rare and agents reserved for the tasks that need them.

## A worked example

A team builds a support assistant for their product:

1. **Prompt.** A system prompt with the product's tone and rules answers general questions well, but invents details about pricing. That is missing knowledge, so the next step is RAG, not a longer prompt.
2. **RAG** over the help center fixes pricing answers. An eval of 50 real questions shows retrieval misses error codes, so they add **hybrid search** with BM25.
3. **Tools.** Users ask "where is my order?". That needs live data, so they add a read-only `get_order_status` tool.
4. **Workflow.** Refund requests need a fixed process: classify, check the policy, prepare a refund for a human to approve. They build it as a **routing** workflow, not as an agent, because the steps are known.
5. **Production.** They add **guardrails** (an input screen, PII redaction, confirmation before any refund), **observability** with traces, and **prompt caching** for the long system prompt.
6. **Not needed (yet):** an agent and fine-tuning. The eval shows no problem that they would fix.

## Before you ship

A checklist that collects the production series:

- **An eval set** of real cases, with code checks where possible and a validated LLM judge where not.
- **`stop_reason` handled** everywhere: `max_tokens`, `refusal`, `tool_use`.
- **Untrusted content kept apart** from instructions, and tools with least privilege.
- **Human confirmation** before irreversible or outward-facing actions.
- **Limits**: max tokens, steps, requests and budget per user and per task.
- **Traces** for every request, with privacy rules for what is stored.
- **Cost checked**: the right model and effort, caching for repeated prefixes, batches for work that can wait.
- **A plan for change**: model versions are retired and prices change. Rerun the eval when you switch models.

## Where to go from here

The field moves fast, and some details in this series (model names, prices, beta features) will change. The concepts change much more slowly: tokens and context, retrieval, the tool loop, workflows versus agents, evals. When something new comes out, ask the same questions as in the map: what does it change, what problem does it fix, and how will you measure that it helped?

For the terms used across the series, see the [AI glossary cheat sheet](en/posts/ai-glossary/).

To see the map applied to one real app, step by step, read [Putting it together](en/posts/ai-end-to-end-app/).
