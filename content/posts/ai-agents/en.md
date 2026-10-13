---
title: "Agents: a model with tools in a loop"
summary: "What makes a system an agent, how it differs from a workflow, when an agent is worth it and when it is not, a minimal agent in Python, and the Claude Agent SDK."
date: 2026-10-13
tags: [ai, agents, tutorial]
series: { key: ai-agents, order: 3 }
---

"Agent" is the most overloaded word in AI right now. This post uses the definition from Anthropic's [Building effective agents](https://www.anthropic.com/research/building-effective-agents): an agent is a system where the model "dynamically directs its own processes and tool usage". In practice that is the tool loop from two posts ago, running until the task is done, with the model choosing every step.

The code follows the official docs and was not run for this post, so the output block is **example output**. The Agent SDK example follows the [Agent SDK quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart).

## What an agent is

The article starts from the **augmented LLM**: a model with retrieval, tools and memory, which can write its own search queries, pick tools and decide what to keep. An agent runs that augmented LLM in a loop:

1. The model looks at the task and everything it has seen so far.
2. It picks an action: call a tool, or finish.
3. Your code runs the tool and returns the result, the "ground truth from the environment".
4. Back to step 1.

The model sees the real result of each action, such as a test that failed or a file that does not exist, and adjusts. That feedback loop is what lets an agent handle tasks whose steps cannot be planned in advance.

## Workflow or agent

The article separates two kinds of agentic systems:

- **Workflows**: the model and tools are orchestrated "through predefined code paths". Your code decides the steps.
- **Agents**: the model decides the steps.

![Workflow: code decides a fixed path of steps. Agent: the model decides, acts, observes and decides again](/images/ai-agents/workflow-vs-agent.svg)

Both are useful. A workflow is predictable, cheaper and easier to test. An agent is flexible, but it costs more, takes longer, and its errors can compound over many steps.

## When to build an agent

The article's main advice is to find "the simplest solution possible" and add complexity only when needed, which "might mean not building agentic systems at all". A good rule of thumb:

- **A single call** with good retrieval and examples is enough for most tasks: answering, summarizing, extracting.
- **A workflow** fits when the task splits into known steps. The next post shows the common patterns.
- **An agent** fits open-ended problems where the number of steps cannot be predicted, and where you can trust the model's choices: fixing a bug across a code base, researching a question across many sources.

## A minimal agent

An agent is the tool loop plus a goal, a few tools and a hard limit on the number of steps. Here the agent can list and read files in one folder:

```python
import pathlib
import anthropic

client = anthropic.Anthropic()
ROOT = pathlib.Path("./project").resolve()

def safe_path(name):
    path = (ROOT / name).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise ValueError("path is outside the project folder")
    return path

def list_files(folder="."):
    return "\n".join(p.name for p in safe_path(folder).iterdir())

def read_file(name):
    return safe_path(name).read_text()[:5000]

TOOL_FUNCTIONS = {"list_files": list_files, "read_file": read_file}
tools = [
    {"name": "list_files", "description": "List the files in a folder of the project.",
     "input_schema": {"type": "object", "properties": {"folder": {"type": "string"}}}},
    {"name": "read_file", "description": "Read a text file from the project (first 5000 characters).",
     "input_schema": {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}},
]

def agent(task, max_steps=10):
    messages = [{"role": "user", "content": task}]
    for step in range(max_steps):
        response = client.messages.create(model="claude-opus-5-5", max_tokens=8000,
                                          tools=tools, messages=messages)
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return next(b.text for b in response.content if b.type == "text")
        results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"step {step}: {block.name}({block.input})")
                try:
                    output = TOOL_FUNCTIONS[block.name](**block.input)
                    results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
                except Exception as error:
                    results.append({"type": "tool_result", "tool_use_id": block.id,
                                    "content": f"Error: {error}", "is_error": True})
        messages.append({"role": "user", "content": results})
    return "Stopped: step limit reached."

print(agent("Which Python version does this project require? Check the config files."))
```

```text
step 0: list_files({})
step 1: read_file({'name': 'pyproject.toml'})
The project requires Python 3.12 or newer (requires-python = ">=3.12" in pyproject.toml).
```

Notice what the code controls and the model does not: which tools exist, which folder they can touch (`safe_path`), how much a tool returns, and how many steps the agent gets. The model only chooses within those limits.

## Agent frameworks

You do not have to write the loop yourself. The **Claude Agent SDK** gives you the same agent loop, built-in tools (read, edit, search, run commands, web search), permissions and context management that power Claude Code, as a Python or TypeScript library:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs that would cause crashes. Fix any issues you find.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits",
        ),
    ):
        if isinstance(message, ResultMessage):
            print(f"Done: {message.subtype}")

asyncio.run(main())
```

`allowed_tools` decides what the agent may do without asking, and `permission_mode` how much it must ask. The article's advice on frameworks still applies: they help you start, but they hide the prompts and responses underneath, so understand what runs below before you rely on one.

## Guardrails for agents

Because an agent acts on its own, the limits are your job:

- **Step and cost limits**: a maximum number of turns and a budget. An agent stuck in a loop otherwise burns money.
- **Least privilege**: only the tools the task needs, with the narrowest access (one folder, read-only where possible).
- **Human checkpoints** before irreversible actions: deleting, sending, paying, deploying.
- **A sandbox** for anything that runs code: a container or a VM, not your laptop or production.
- **Logs** of every step, so you can see what the agent did and why. The observability post covers this.

The next post covers the five workflow patterns from the same article, which solve many problems without a full agent.
