---
title: "Claude Code commands: an up-to-date cheat sheet"
summary: "The slash commands I use in Claude Code, grouped by what I'm doing, plus what changed recently: commands removed, replaced and added."
date: 2026-10-08
tags: [claude-code, cli, cheatsheet]
---

A cheat sheet for Claude Code's slash commands, grouped by what you're doing mid-session. Checked against the official docs as of 2026-10-08 (version 2.1.294). A command that was added or changed recently is marked with an asterisk (*).

## What changed since the previous list

- `/ultraplan` was **removed**. Use `/plan` instead.
- `/vim` was **removed** (2.1.92). Switch between Vim and Normal editing in `/config` → Editor mode.
- `/pr-comments` was **removed** (2.1.91). Ask Claude directly to read the PR comments.
- `/fork` and `/subtask` now split the job. `/fork` copies the conversation into a separate background session; `/subtask` sends a subagent that reports back into the current conversation.
- `/checkup` is not in the official docs. The setup checkup is now `/doctor`.
- `/effort` gained `status` and `ultracode on|off`. `ultracode` is no longer a level but a separate switch.
- Added: `/subtask`, `/autocompact`, `/focus`, `/import`, `/output-style`, `/skill-doctor`, `/workflows`, `/list-agents`, `/artifacts` and more, detailed below.
- `/code-review` gained `--max-findings`, and `/claude-api` gained `managed-agents-onboard`.

## Daily drivers

- `/init` — Scan the repo and generate a starter `CLAUDE.md`. Run once per project.
- `/help` — List all commands, including custom, plugin and MCP commands.
- `/compact [instructions]` — Summarize the conversation to free context window space. It consumes tokens itself, and you can say what to keep.
- `/clear [name]` — Start a new conversation with empty context. The previous one stays on disk and is resumable with `/resume`; you can name it. Aliases: `/reset`, `/new`.
- `/usage` — Session cost, plan limits and activity stats. Aliases: `/cost`, `/stats`.
- `/plan [description]` — Plan mode: see which files Claude will change, why and in what order, before anything changes. With a description it starts planning right away.

## Context and conversation

- `/context [all]` — Context usage as a colored grid, with suggestions. `all` shows the per-item breakdown.
- `/btw [question]` — A side question that doesn't bloat the conversation. With no question it shows your earlier side questions.
- `/recap` — A one-line summary of the session.
- `/export [filename]` — Export the conversation as plain text.
- `/copy [N]` — Copy the last (or Nth-latest) response, with a code-block picker.
- `/rename [name]` — Rename the session.
- `/autocompact [auto|tokens]` * — Set how full the context gets before auto-compact, for example `500k`. Saved per model.
- `/focus` * — A compact view: your last prompt, a one-line tool summary and the final answer.
- `/output-style [style]` * — List or switch output styles.

## Models, effort and speed

- `/model [model]` — Switch the model and save it as the default. Press `s` in the picker to switch for this session only.
- `/effort [level|auto|status]` — Reasoning depth: `low`, `medium`, `high`, `xhigh`, `max` or `auto`. `max` is session-only. `status` prints the current level.
- `/effort ultracode [on|off]` * — Turn `ultracode` on or off. It combines deep reasoning with automatic workflow orchestration.
- `/advisor [model|off]` — Enable an advisor: a second model you consult at key moments.
- `/fast [on|off]` — Fast mode.

## Autonomous work and planning

- `/goal [condition|clear]` — Claude keeps working until the condition holds, for example "tests pass". With no argument it shows the current goal. `clear` stops it.
- `/loop [interval] [prompt]` — Repeat a prompt while the session is open, for example `/loop 5m check if the deploy finished`. Without an interval Claude paces itself.
- `/workflows` * — The progress view for workflows: watch, pause, resume and save.

## Parallel agents and orchestration

- `/agents` — Manage subagent configurations.
- `/list-agents` * — List the subagents, teammates and sessions you can message, with the name to use. Alias: `/peers`.
- `/tasks` — View and manage background tasks. Alias: `/bashes`.
- `/background [prompt]` — Detach the current session as a background agent. Alias: `/bg`.
- `/batch <instruction>` — Break a large change into 5–30 independent units and run one subagent per unit in its own worktree. It shows a plan for approval first.
- `/branch [name]` — Branch the current conversation to try another direction. Return to the original with `/resume`.
- `/fork [prompt]` * — Copy the conversation into a new background session while you keep working here. With a prompt, the copy starts on it immediately.
- `/subtask <task>` * — A background subagent that inherits the whole conversation; its result comes back to the current conversation when it finishes.
- `/deep-research <question>` — Parallel web searches, cross-checked sources and a cited report.
- `/schedule [description]` — Create and run cloud routines. Alias: `/routines`.
- `/autofix-pr [prompt]` — A cloud session that watches the branch's PR and fixes CI failures and review comments.

## Code review and shipping

- `/diff` — Interactive viewer for uncommitted changes and per-turn diffs.
- `/review [PR]` — Review a pull request locally.
- `/code-review [level] [--fix] [--comment] [--max-findings n|all|default] [target]` — Review for bugs and cleanups. `--fix` applies fixes, `--comment` posts to the PR, `ultra` runs the deep cloud review. The `--max-findings` choice persists until you set `default`.
- `/simplify [target]` — Review changed code for reuse, simplification and efficiency, then apply fixes. It does not hunt for bugs; use `/code-review` for that.
- `/security-review` — A read-only security review of the pending changes on the branch.
- `/ultrareview [PR]` — Alias for `/code-review ultra`, a deep bug hunt in the cloud. Includes 3 free runs on Pro and Max.

## Sessions, history and recovery

- `/resume [session]` — Pick up a previous session by ID, name or picker. Alias: `/continue`.
- `/rewind` — Restore the code and/or conversation to a previous checkpoint. It can also restore context from before `/clear`. Aliases: `/checkpoint`, `/undo`. In IDEs, press `Esc` twice.
- `/stop` — Stop an attached background session. The transcript and worktree are kept.
- `/exit` — Exit; in a background session it only detaches. Alias: `/quit`.

## Config, permissions and memory

- `/config` — The settings interface: theme, model, editor mode (including Vim). Alias: `/settings`.
- `/permissions` — Allow / ask / deny rules for tools. Alias: `/allowed-tools`.
- `/fewer-permission-prompts` — Scan transcripts and add an allowlist to `.claude/settings.json`.
- `/update-config [request]` * — Describe a settings change (an allowed command, an env var, a hook) and Claude edits the right `settings.json`.
- `/auto-mode-setup` * — Draft `autoMode.environment` entries from your project and recent sessions, and save them after you review.
- `/memory` — Edit `CLAUDE.md` files, toggle auto-memory and view entries.
- `/hooks` — Hook configurations by event, for example PostToolUse on file save.
- `/add-dir <path>` — Grant access to another directory without moving the session. Useful in monorepos.
- `/cd <path>` — Move the session to a new working directory, keeping the conversation. `Tab` completes the path.
- `/import [codex|gemini|cursor]` * — Import config from Codex, Gemini CLI or Cursor: instruction files, MCP servers, commands, subagents and skills. `--dry-run` previews only.
- `/team-onboarding` — Generate a team onboarding guide from your last 30 days of usage.
- `/theme`, `/statusline`, `/keybindings` — Interface look, status line and keyboard shortcuts.

## Skills and plugins

- `/skills` — List skills. `t` sorts by token count and `Space` changes visibility.
- `/skill-doctor` * — Show what each skill costs in context and how often it is used, to find ones to turn off.
- `/reload-skills` — Re-scan the skill directories without restarting.
- `/plugin [subcommand]` — Manage plugins: `list`, `install`, `enable`, `disable` or the menu.
- `/reload-plugins [--force]` — Reload plugins.
- `/run` — Launch and drive your app to see a change working.
- `/verify` — Build, run and observe the app's behavior, not just the tests.
- `/run-skill-generator` — Write a project skill so `/run` and `/verify` know how to launch your app.

> Custom commands are now written as **skills** (`.claude/skills/`). Files in `.claude/commands/` still work, and if a skill and a command share a name, the skill wins.

## MCP, IDE and cross-device

- `/mcp [reconnect <server>|enable|disable]` — Manage MCP connections and OAuth.
- `/mcp__<server>__<prompt>` — Dynamic prompts exposed by a connected MCP server.
- `/ide` — Manage IDE integrations and show status.
- `/chrome` — Claude in Chrome settings.
- `/teleport` — Pull a web session into the terminal. Alias: `/tp`.
- `/desktop` — Continue the session in the desktop app. Alias: `/app`.
- `/mobile` — A QR code for the mobile app. Aliases: `/ios`, `/android`.
- `/remote-control` — Make the session available from claude.ai. Alias: `/rc`.
- `/terminal-setup` — Configure Shift+Enter and terminal shortcuts.
- `/tui [default|fullscreen]` * — Choose the terminal renderer. `fullscreen` is the flicker-free one.

## Diagnostics and cloud setup

- `/doctor [prompt-audit [path]]` — A setup checkup: diagnoses installation, settings, extension and `CLAUDE.md` problems and proposes fixes Claude applies after you confirm. `prompt-audit` checks the instructions themselves.
- `/debug [description]` — Turn on debug logging mid-session.
- `/setup-bedrock`, `/setup-vertex` — Setup wizards for Amazon Bedrock and Google Vertex AI.
- `/install-github-app` — Install the Claude GitHub App for a repo, with an optional GitHub Actions setup.
- `/web-setup` — Connect GitHub for cloud sessions using your local `gh` credentials.

## Discovery and extras

- `/insights` — An HTML report on your session patterns and friction points.
- `/powerup` — Short interactive lessons for discovering features.
- `/release-notes` — An interactive changelog version picker.
- `/status` — The status tab: version, model, account and connectivity.
- `/artifacts` * — List your artifacts: attach one to the session, open it in the browser or copy its link.
- `/claude-api [migrate|upgrade|managed-agents-onboard|...]` * — Claude API and Managed Agents reference material for your project's language.
- `/bug [report]`, `/feedback [report]` — Report a bug or send feedback, after a consent screen.
- `/color`, `/radio`, `/stickers` — Prompt bar color, lo-fi radio and stickers.

## A note on the source

The original list was a Notion page that had not been updated. Commands change in almost every release, so I added what was removed and what was replaced. When a command doesn't work, run `/help` and check the [official docs](https://code.claude.com/docs/en/commands).
