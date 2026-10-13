---
title: "Multi-agent systems and subagents"
summary: "When several agents beat one: the orchestrator-subagent design, what Anthropic measured in its research system, the token cost, and subagents in the Claude Agent SDK."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 6 }
---

One agent with one context window eventually runs into the limits from the previous post: too much to read, too much to remember. A **multi-agent system** splits the work: a lead agent plans and delegates, and **subagents** do focused parts of the job, each in its own fresh context, returning only a short result.

The numbers come from Anthropic's article [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system). The code follows the [Agent SDK subagents docs](https://code.claude.com/docs/en/agent-sdk/subagents) and was not run for this post.

## The orchestrator and the subagents

The research system uses the orchestrator-workers pattern from the workflow post, with agents instead of single calls:

- A **lead agent** reads the question, makes a plan, saves the plan to memory, and starts several subagents.
- Each **subagent** searches on its own part of the question, in parallel with the others, and returns a condensed summary.
- The lead agent combines the summaries, may start more subagents, and writes the answer. A separate step adds citations.

The key benefit is **context isolation**. A subagent may read dozens of pages, but the lead agent only sees its short summary, so the lead's context stays small and focused.

## What it gained, and what it cost

The article reports that a system with Claude Opus 4 as lead and Claude Sonnet 4 subagents "outperformed single-agent Claude Opus 4 by 90.2%" on its internal research evaluation.

The cost side is just as clear. In their data, agents used about 4 times the tokens of a chat, and multi-agent systems about **15 times**. On one benchmark, token usage alone explained 80% of the difference in performance. Multi-agent systems win largely by spending more tokens, in parallel, across separate context windows.

## When it fits, and when it does not

The article lists where multi-agent setups are a poor fit:

- Tasks whose value does not justify roughly 15 times the tokens.
- Tasks where all agents need the same context, or where the parts depend heavily on each other.
- Most coding tasks, which have fewer truly parallel parts than research.

They fit broad, parallel work: research across many sources, reviewing a code base from several angles (security, tests, style), or analyzing many documents independently.

## Lessons from building one

The article's engineering lessons apply to any multi-agent setup:

- **Write detailed task briefs** for subagents: the goal, the output format, the tools to use and the limits. Vague briefs led to duplicated work.
- **Scale effort to the question.** Early versions started many subagents for simple questions; explicit rules fixed it.
- **Search broad first, then narrow.**
- **Give tools clear, distinct purposes.** Having the model rewrite flawed tool descriptions cut task time by 40% in their tests.
- **Evaluate early** with a small set of about 20 realistic questions and an LLM judge, plus human testing for edge cases.

## Subagents in the Claude Agent SDK

The Agent SDK lets you define subagents in code. Each one has a `description` (when to use it), a `prompt` (its system prompt), and optionally a restricted list of `tools` and a `model`:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Review the authentication module for security issues",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Agent"],
            agents={
                "code-reviewer": AgentDefinition(
                    description="Expert code review specialist. Use for quality and security reviews.",
                    prompt="You are a code review specialist. Identify security vulnerabilities "
                           "and suggest specific fixes. Be thorough but concise.",
                    tools=["Read", "Grep", "Glob"],  # read-only
                    model="sonnet",
                ),
                "test-runner": AgentDefinition(
                    description="Runs and analyzes test suites.",
                    prompt="You run tests and report failing tests with a likely cause.",
                    tools=["Bash", "Read", "Grep"],
                ),
            },
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

The main agent starts a subagent through the `Agent` tool, based on the description. The docs list the four benefits: context isolation, parallel work, specialized instructions, and tool restrictions (the reviewer above can read but never edit).

## Keep the tree under control

A subagent can start subagents of its own, so one prompt can grow into a tree of agents. The SDK has limits for depth, concurrency and spend:

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Grep", "Glob", "Agent"],
    env={
        "CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH": "1",   # subagents cannot start their own
        "CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS": "5",
    },
    max_budget_usd=5.0,                                # stop the whole query at $5
)
```

Set them before you run a multi-agent system on a real task. The next post covers agents that act on a computer screen, and skills that package expertise for agents.
