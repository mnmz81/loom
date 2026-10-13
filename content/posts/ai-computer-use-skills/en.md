---
title: "Computer use and Agent Skills"
summary: "Agents that operate a desktop through screenshots, mouse and keyboard, and skills: folders of instructions and scripts that give an agent expertise only when it needs it."
date: 2026-10-13
tags: [ai, agents, tutorial]
series: { key: ai-agents, order: 7 }
---

This last post in the agents series covers two capabilities that extend what an agent can do. **Computer use** lets a model operate a graphical desktop, for programs that have no API. **Agent Skills** package expertise (instructions, scripts and reference files) so an agent loads it only when a task needs it.

The facts follow the official [computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) and [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) docs. The code was not run for this post.

## Computer use: a desktop as a tool

Computer use is the tool loop again, with a screen as the environment. The model asks for an action, such as a screenshot, a click at a position, typing text or pressing a key. Your application performs it in a desktop environment you control and returns the result, usually a new screenshot. The model looks at the screenshot and picks the next action.

The docs list the actions the current toolset offers: screenshot and zoom, mouse actions (clicks, drag, move, scroll), keyboard actions (type, key, hold key) and wait. On the current models the tool type is `computer_toolset_20260801` and needs no beta header:

```python
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    tools=[{"type": "computer_toolset_20260801"}],
    messages=[{"role": "user", "content": "Open the settings app and turn on dark mode."}],
)
```

From here, your code runs the standard loop: perform each requested action, return one result per action (an image for screenshots), and call the model again. Coordinates refer to the pixels of the screenshots you send, so if you resize screenshots, scale the coordinates back to the real screen.

## Computer use is risky

A model that can click anything can also click the wrong thing, or be tricked. The docs recommend:

- Run it in a **dedicated VM or container** with minimal privileges, never on your own machine with your accounts signed in.
- Keep **sensitive data and credentials** away from it.
- Limit internet access to an **allowlist** of domains.
- Require **human confirmation** for consequential actions such as payments or accepting terms.

The docs also warn about **prompt injection**: the model may follow instructions it sees on a web page or in an image, even when they conflict with yours. Anthropic adds classifiers that scan tool results, but the docs say they do not replace these precautions.

Use computer use when there is no API. When there is one, a normal tool is faster, cheaper and far more reliable.

## Agent Skills

A system prompt has to hold everything up front, and the context budget from the previous posts limits how much that can be. **Skills** solve this with folders. A skill is a directory with a `SKILL.md` file, and optionally more instructions, scripts and reference files:

```text
pdf-processing/
├── SKILL.md        name, description, main instructions
├── FORMS.md        extra guide, read only when filling forms
├── REFERENCE.md    detailed reference
└── scripts/
    └── fill_form.py
```

`SKILL.md` starts with YAML frontmatter. The `description` says what the skill does **and** when to use it, because that is what the model matches requests against:

```markdown
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
---

# PDF Processing

## Quick start

Use pdfplumber to extract text from PDFs. For form filling, see FORMS.md.
```

## Progressive disclosure

Skills load in three levels, so installing many costs little:

1. **Metadata** (the name and description, about 100 tokens per skill) is always in the system prompt.
2. **Instructions** (the body of `SKILL.md`, under 5k tokens per the docs) load only when a request matches the skill.
3. **Resources** load only when the instructions point to them. Scripts are run, and only their output enters the context, never their code.

This is the just-in-time retrieval idea from the memory post, applied to know-how instead of data.

## Where skills run

Skills need an environment with a filesystem and code execution. The docs list the surfaces: the Claude API (with the code execution tool, including pre-built skills for PowerPoint, Excel, Word and PDF), Claude Code (folders in `~/.claude/skills/` or `.claude/skills/`), the Agent SDK, and claude.ai. Custom skills do not sync between these surfaces.

Treat skills like installing software. The docs say to use only skills you wrote or got from a trusted source, and to audit every file in an unknown one: a malicious skill can direct the agent to run code or leak data.

The last post in the series looks at WebMCP, a proposal that lets websites hand agents real tools instead of pixels to click.
