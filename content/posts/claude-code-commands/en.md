---
title: "Claude Code slash commands: my cheat sheet, rechecked"
summary: "The Claude Code slash commands worth knowing, grouped by what you're doing. Checked against the official docs for v2.1.294."
date: 2026-10-08
updated: 2026-10-09
tags: [claude-code, cli, cheatsheet]
---

I keep a list of Claude Code commands in Notion so I don't have to remember them. This is that list, checked line by line against the official docs and current as of v2.1.294. The date it was last updated is at the top of the page.

## If you only learn six

- `/init` creates a starter `CLAUDE.md` for the project. Once per project is enough.
- `/plan` shows what Claude intends to touch before it touches anything. Worth it before any big edit.
- `/compact` summarizes the conversation to free up context. It costs tokens itself, so don't wait until you're out of room.
- `/clear` starts fresh. The old session isn't lost; `/resume` brings it back.
- `/rewind` rolls code and conversation back to an earlier checkpoint. It can even restore what was there before a `/clear`.
- `/usage` shows what the session cost and where you stand against your plan limits.

## Context and conversation

- `/context [all]` draws your context usage as a colored grid. It's the quickest way to decide when to compact.
- `/btw [question]` asks a side question without adding it to the conversation. With no question, it shows your earlier ones.
- `/recap` gives a one-line summary of the session.
- `/export [file]` saves the conversation as plain text.
- `/copy [N]` copies the last response, or the Nth-latest, with a picker for individual code blocks.
- `/rename [name]` names the session. Leave the name out and it makes one up.
- `/autocompact [auto|tokens]` sets how full the context gets before it compacts on its own, e.g. `500k`. Remembered per model.
- `/focus` hides the noise: your last prompt, a one-line tool summary and the final answer.
- `/output-style [style]` lists or switches output styles.

## Models and effort

- `/model [model]` switches model and saves it as the default. Press `s` in the picker to switch for this session only.
- `/effort [level|auto|status]` sets how hard it thinks: `low`, `medium`, `high`, `xhigh`, `max` or `auto`. `max` doesn't persist past the session.
- `/effort ultracode [on|off]` adds automatic workflow orchestration on top of deep reasoning.
- `/advisor [model|off]` lets a second model weigh in at key moments.
- `/fast [on|off]` toggles fast mode.

## Working on its own

- `/goal [condition|clear]` keeps Claude going until a condition is true, like "tests pass". With no argument it shows the current goal.
- `/loop [interval] [prompt]` repeats a prompt while the session is open, e.g. `/loop 5m check if the deploy finished`. Skip the interval and Claude paces itself.
- `/workflows` opens the progress view for running workflows, where you can pause, resume or save them.

## Parallel agents

- `/background [prompt]` detaches the session as a background agent (`/bg`). `/tasks` lists what's running.
- `/branch [name]` forks the conversation so you can try another direction. `/resume` takes you back.
- `/fork [prompt]` copies the conversation into a new background session and keeps you where you are.
- `/subtask <task>` hands a side task to a background subagent that inherits the whole conversation and reports back into this one.
- `/batch <instruction>` breaks a big change into 5–30 independent pieces and runs a subagent per piece in its own worktree. You approve the plan first.
- `/list-agents` shows which subagents, teammates and sessions you can message, and the name to use for each (`/peers`).
- `/deep-research <question>` runs parallel web searches, cross-checks the sources and returns a cited report.
- `/schedule` sets up cloud routines (`/routines`), and `/autofix-pr` watches your branch's PR and fixes CI failures and review comments.

## Reviewing and shipping

- `/diff` is an interactive viewer for uncommitted changes and per-turn diffs.
- `/code-review [level] [--fix] [--comment] [--max-findings n|all|default] [target]` looks for bugs and cleanups. `--fix` applies what it finds, `--comment` posts to the PR, and `ultra` runs the deep cloud review. Your `--max-findings` choice sticks until you set it back to `default`. `/review` is an alias.
- `/simplify [target]` cleans up changed code for reuse, simplicity and efficiency. It doesn't hunt bugs; that's `/code-review`'s job.
- `/security-review` is a read-only security pass over the pending changes.
- `/ultrareview [PR]` is the same as `/code-review ultra`. Pro and Max get three free runs.

## Sessions

- `/resume [session]` reopens an older conversation by ID, name or picker.
- `/stop` stops a background session you're attached to. The transcript and worktree stay.
- `/exit` leaves the CLI. Inside a background session it only detaches.

## Settings, permissions and memory

- `/config` is the settings screen (theme, model, editor mode). It also takes `key=value`, e.g. `/config theme=dark`.
- `/permissions` manages allow, ask and deny rules.
- `/fewer-permission-prompts` scans your transcripts and builds an allowlist from the read-only calls you keep approving.
- `/update-config [request]` takes a plain description, like "allow `npm test`", and edits the right `settings.json`.
- `/memory` edits your `CLAUDE.md` files and auto-memory. `/hooks` shows your hooks.
- `/add-dir <path>` lets Claude read another directory without moving the session. `/cd <path>` actually moves it.
- `/import [codex|gemini|cursor]` brings over instruction files, MCP servers, commands, subagents and skills from those tools. Add `--dry-run` to preview.
- `/team-onboarding` writes a getting-started guide for a teammate from your last 30 days of usage.
- `/auto-mode-setup` drafts `autoMode.environment` entries from your project and recent sessions, and saves them after you review.
- `/sandbox` toggles sandbox mode where the platform supports it.

## Skills, plugins and MCP

- `/skills` lists skills. `t` sorts by token cost.
- `/skill-doctor` shows what each skill costs in context and how often it's used, so you can switch off the dead weight.
- `/reload-skills` and `/reload-plugins` pick up changes without a restart. `/plugin` manages plugins.
- `/run` starts your app and drives it to see a change actually work, and `/verify` goes further and checks the behavior, not just the tests. `/run-skill-generator` writes the project skill they rely on.
- `/mcp` manages MCP connections and OAuth. `/ide` and `/chrome` handle the IDE and Claude in Chrome.

Custom commands are written as skills (`.claude/skills/`). Old files in `.claude/commands/` still work, and if a skill and a command share a name, the skill wins.

## Account and limits

- `/login` and `/logout` do what they say.
- `/rate-limit-options` is what you open when a usage limit blocks you: wait for the reset, add credits, or upgrade.
- `/usage-credits` sets up credits (or requests them from your admin), and `/upgrade` opens the plan page.
- `/privacy-settings` is for your privacy options on Pro and Max.

## Everything else

- Between devices: `/teleport` pulls a web session into the terminal, `/desktop` continues in the desktop app, `/mobile` shows a QR code, and `/remote-control` (`/rc`) makes the session reachable from claude.ai.
- Terminal and looks: `/terminal-setup` (Shift+Enter), `/theme`, `/statusline`, `/keybindings`, `/color`, `/voice` for dictation, and `/tui fullscreen` for the flicker-free renderer.
- Setup and diagnosis: `/doctor` checks your setup and proposes fixes you confirm first (`/doctor prompt-audit` checks your instructions instead). `/debug` turns on debug logging. `/heapdump` writes a memory snapshot, and only the `-diagnostics.json` file is safe to share. The snapshot holds your whole conversation.
- Cloud and apps: `/setup-bedrock`, `/setup-vertex`, `/install-github-app`, `/install-slack-app`, `/web-setup`, `/remote-env`.
- Bundled skills: `/claude-api`, `/dataviz`, `/design`, `/design-sync`, `/slides`, `/workflow-authoring`, `/plugin-authoring`.
- Discovery: `/insights` builds a report on how you use Claude Code, `/powerup` has short interactive lessons, `/release-notes` and `/status` do what they say, and `/artifacts` lists your artifacts.
- Odds and ends: `/bug` and `/feedback`, `/radio`, `/stickers`, `/passes`.

If a command misbehaves, `/help` shows what your version actually has, and the [official reference](https://code.claude.com/docs/en/commands) is the source of truth. Commands change almost every release, so treat any list, this one included, as a snapshot.
