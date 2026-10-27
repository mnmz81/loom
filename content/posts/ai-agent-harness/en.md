---
title: "The harness: a frozen model and the layer you improve"
summary: "How to build an agent around a model you don't change: what goes into the harness, what common diagrams leave out, how to improve it with an eval loop, and what 2026 research found."
date: 2026-10-27
tags: [ai, agents]
series: { key: ai-agents, order: 9 }
---

An agent has two parts: a model, and all the code around it. Most teams don't train the model: it stays **frozen**, and what changes is the **harness**. The [Meta-Harness](https://arxiv.org/abs/2603.28052) paper defines a harness as "the code that determines what information to store, retrieve, and present to the model". That covers the prompt, the tools, memory, the loop and the checks.

The payoff: a harness change is a code change. It is cheaper than [fine-tuning](en/posts/ai-fine-tuning/), takes effect at once, and rolls back with `git revert`.

## Five groups, not eight boxes

A common "harness layer" diagram shows eight equal boxes: system prompt, guardrails, memory, tool guidance, subagents, skills, validation scripts and plugins. They are not equal. Each does a different job, and grouping them by role is more useful:

| Group | What's in it | The question it answers |
|---|---|---|
| Context | system prompt, tool descriptions, [skills](en/posts/ai-computer-use-skills/) | What does the model see right now? |
| State | [memory](en/posts/ai-memory-context/), progress files, git | What survives between steps and sessions? |
| Control | the loop, limits, [subagents](en/posts/ai-multi-agent/) | Who picks the next step, and when does it stop? |
| Checks | [guardrails](en/posts/ai-guardrails/), tests, sandbox | How do you know an action is right and safe? |
| Extensions | the tools themselves, [MCP](en/posts/ai-mcp/), plugins | What can the agent do in the world? |

![Left: the harness sends context to a frozen model and runs its tool calls, in five groups. Right: the improvement loop: an eval set, a run, reading traces, one change, and keeping it only if the score rises](/images/ai-agent-harness/harness-loop.svg)

## What the common diagram leaves out

- **The loop itself.** One arrow from harness to model doesn't describe an [agent](en/posts/ai-agents/). An agent runs in a cycle: the model picks an action, your code runs it, the result goes back into the context. Someone has to set a step limit, a budget, and what happens when a tool fails.
- **Context management.** Anthropic calls it [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): compaction when the window fills up, notes in a file outside the window, and subagents that return only a summary. Long sessions break agents here more than anywhere else.
- **Evals.** Without a fixed task set and a score, you can't tell whether a harness change helped. See the [evals](en/posts/ai-evals/) post.
- **Traces.** To fix a prompt you need to see where the agent went wrong, step by step. That is the job of [observability](en/posts/ai-observability/).
- **Tool design.** "Tool guidance" is only the description. According to [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents), more tools don't always give better results. Prefer a few focused tools, unambiguous parameters (`user_id`, not `user`), and short responses with pagination or truncation.

## Improve the harness, not the model

The loop on the right of the diagram is the working method:

1. Build a set of real tasks, each with an outcome you can check.
2. Run the agent and keep a full trace.
3. Read the traces, not just the score.
4. Change one thing: a tool description, a limit, a memory rule.
5. Run again. If the score rose, the change stays; if not, roll it back.

Keep a held-out set of tasks you never use while improving, and test on it at the end, or the harness fits only the tasks you tuned it on.

Two 2026 papers made this loop automatic, with an agent proposing the changes:

- **[Meta-Harness](https://arxiv.org/abs/2603.28052)** gives an agent the code, scores and traces of every earlier version. On text classification, the harness it found beat a leading context-management system by 7.7 points with 4x fewer tokens.
- **[Agentic Harness Engineering](https://arxiv.org/abs/2604.25850)** raised Terminal-Bench 2 from 69.7% to 77.0% in ten rounds, above the hand-designed Codex-CLI harness (71.9%). The model didn't change. In the ablation, the gain came from tools, middleware and long-term memory. Changing the system prompt alone did not help.

The practical takeaway: before rewriting the prompt for the tenth time, look at the tools, the memory and the checks.

## Example: an agent that works across many sessions

Anthropic's [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) shows a whole harness built without touching the model. An agent writing an app over many context windows failed in two ways: it tried to build everything at once, or it declared the job done too early. The fix was all in the harness:

- **A first session with its own prompt** that sets up an `init.sh` script, a progress file and a first commit.
- **A feature list in JSON**, every item marked failing. The agent may change only the status. Anthropic found JSON safer than Markdown, because the model is less likely to rewrite it.
- **One feature per session**, ending in clean code and a descriptive commit.
- **Testing in a browser** like a real user, which caught bugs that unit tests and curl missed.

Each of these falls into a different group in the table: context, state, control, checks.

## When the agent edits its own harness

In Claude Code, for example, an agent can write a skill or update a memory file. That is useful, but it needs limits:

- **The agent never edits the guardrails or the eval set.** An agent that can change the test can pass it without improving anything.
- **Every change runs through the same eval set** as a human change, and stays only if the score rose.
- **Changes to permissions, the sandbox or plugins get human review.** An external plugin is someone else's code running on your machine: pin its version and read it before installing.

This ends the agents series. The next series covers adapting a model itself: fine-tuning, distillation and running models locally.
