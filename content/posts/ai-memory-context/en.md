---
title: "Memory and context management"
summary: "How agents keep working when a task outgrows the context window: context engineering, compaction, clearing tool results, notes and the memory tool, with safe file handling."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 5 }
---

A model has no memory between requests. Everything it "remembers" in a conversation is the history your code sends again every turn. An agent that runs for an hour, reading files and calling tools, fills even a 1M-token window, and gets worse well before it is full.

The facts follow Anthropic's [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) article and the official [memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), [compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) and [context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) docs. The path check was run with Python 3.9 and its output is real; the API code was not run.

## Context is a budget

The tokens post introduced context rot: recall gets worse as the context grows. The context engineering article concludes: treat context as a "finite resource with diminishing returns", and aim for the "smallest possible set of high-signal tokens" that gets the job done.

It calls this **context engineering**: not only writing the prompt, but deciding on every turn of an agent what is in the window, from the system prompt and tools to retrieved data and history. Some of its advice:

- **System prompts at the right altitude**: specific enough to guide, not a pile of hardcoded if-else rules. Start small and add what observed failures call for.
- **Few, clear tools** whose results are short.
- **Just-in-time retrieval**: keep references (file paths, queries) and load the content with a tool when needed, instead of loading everything up front.

## Compaction

When a conversation gets long, replace the older turns with a summary and continue. The article calls this **compaction** and suggests tuning the summary "for recall first": better to keep a detail that turns out unneeded than to lose one that matters.

To do it yourself, ask the model to summarize the history, then start a new conversation with that summary as the first message. The Claude API also offers server-side compaction, in beta at the time of writing, where the API writes the summary and replaces the old turns for you. Follow the [compaction docs](https://platform.claude.com/docs/en/build-with-claude/compaction) for the current parameters.

## Clearing old tool results

In an agent, most of the context is usually tool results: file contents, search results, command output. Once the model has used a result, it rarely needs the full text again. The article calls clearing old tool results a "light-touch" form of compaction. The API's **context editing** feature can do it automatically by rule; in your own loop, you can replace old `tool_result` contents with a short note such as "[file content removed, read it again if needed]".

## Notes and the memory tool

The third technique keeps information **outside** the window. The agent writes notes as it works (a progress log, a to-do list, decisions made) and reads them back later, even in a new session. The article calls this structured note-taking.

Claude's built-in form of this is the **memory tool**: the model asks to view, create, edit, rename or delete files under `/memories`, and your code carries out each operation on storage you control. The Python SDK includes a ready local-filesystem implementation:

```python
import anthropic
from anthropic.tools import BetaLocalFilesystemMemoryTool

client = anthropic.Anthropic()
memory = BetaLocalFilesystemMemoryTool(base_path="./memory")

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Remember that customer Acme Corp prefers email follow-ups."}],
    tools=[memory],
)
final_message = runner.until_done()
```

In a later conversation with the same tool and the same folder, the model checks its memory first. According to the docs, when the tool is present the API adds an instruction to view the memory directory before doing anything else.

## Keep memory inside its folder

If you write your own memory handler, the docs warn about one attack in particular: a path like `/memories/../../secrets.env` can escape the memory folder. Resolve every path and check that it stays inside:

```python
from pathlib import Path

BASE = Path("memory").resolve()

def to_real_path(memory_path):
    if not memory_path.startswith("/memories"):
        raise ValueError("must start with /memories")
    relative = memory_path[len("/memories"):].lstrip("/")
    real = (BASE / relative).resolve()
    real.relative_to(BASE)  # raises ValueError if real is outside BASE
    return real

for p in ["/memories/notes.md", "/memories/../../secrets.env"]:
    try:
        print("ok     ", to_real_path(p).relative_to(BASE.parent))
    except ValueError:
        print("blocked", p)
```

```text
ok      memory/notes.md
blocked /memories/../../secrets.env
```

The docs add more safeguards: limit file sizes, expire old memory files, and do not let sensitive data be written to memory.

## Which technique when

- A long chat → compaction.
- An agent that reads many files or runs many commands → clear old tool results.
- Work that spans sessions or days → notes or the memory tool.
- Subtasks that need a lot of reading → give them to subagents, which work in their own context and return only a summary. That is the next post.

The techniques combine: the memory tool docs recommend pairing compaction (to keep the active context small) with memory (to keep what must survive the summary).
