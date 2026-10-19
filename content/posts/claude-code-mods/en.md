---
title: "Claude Code mods: what they are and when to use one"
summary: "A mod is a plugin whose JavaScript or TypeScript runs inside Claude Code. How it works, when to pick it over a hook, skill or MCP server, the layers it runs in, and its risks. Version 2.1.295."
date: 2026-10-14
updated: 2026-10-19
tags: [claude-code]
series: { key: claude-code-mods, order: 1 }
---

Settings hooks run a shell command on an event and can allow, block or add context. Since October 2026 there is a second way to change Claude Code: the **mod**, a plugin whose JavaScript or TypeScript functions run inside Claude Code and can change tool calls, prompts, commands and what is drawn on screen.

Checked against the [official mods docs](https://code.claude.com/docs/en/plugins/mods/overview) on Claude Code 2.1.295. The API still changes between releases. Writing one is the [next post](en/posts/claude-code-mods-first-mod/).

## What a mod is

A mod is a [plugin](https://code.claude.com/docs/en/plugins) with a code file, the hooks module, that exports a `register` function. Claude Code calls it on load, and it registers handlers with `on` for events such as `tool.call` (before a tool runs), `prompt.submit`, `ui.render` and `command.run`.

Each handler, which the docs call a hook, gets three arguments:

- `$`: the mods API. Everything outside the mod's own code goes through it: drawing, registering a command, reading a file, running a process, calling a model. That is how Claude Code can show what a mod does before it runs.
- `e`: the event's data, such as the tool's name and arguments. It is frozen; to change it, pass a copy.
- `next(e)`: passes the event to the next mods and then to Claude Code, and returns the result, like Express or Koa middleware.

Hooks run wherever Claude Code runs, including `claude -p`, the Agent SDK and the VS Code extension. Drawing shows up only in the terminal and the desktop app's Code tab.

### Three ways to handle an event

- **Observe**: record something and return `next(e)`.
- **Rewrite**: call `next({ ...e, command: ... })` with one field changed.
- **Answer**: return a result without `next`, for example `{ deny: 'reason' }` to block a tool call. The usual behavior never runs.

## When a mod, and when something else

Based on the comparison in the docs:

| | Mod | Settings hook | Skill | MCP server |
|---|---|---|---|---|
| What it is | Functions inside Claude Code | A shell command, HTTP request or prompt run on an event | A `SKILL.md` file of instructions | An external process that gives Claude tools |
| What it can change | Tool calls, prompts, commands, turns and what is drawn | Whether a call or prompt goes ahead, a tool's arguments and result, extra context | What Claude knows and does | Which tools Claude has |
| Draws in the interface | Yes | No | No | No |
| Written in | JavaScript or TypeScript | A script and a `settings.json` entry | Markdown | Any language |

A mod is worth it for a pane, a band above the prompt, a command that runs without a Claude turn, or rewriting an event on its way. Otherwise use a hook, a skill or [MCP](en/posts/ai-mcp/).

## Where it came from

- **September 3, 2026**: @poteat from the Claude Code team proposed "function hooks" in [issue #91870](https://github.com/anthropics/claude-code/issues/91870).
- **September 9**: the team decided to ship it as "Claude Mods"; "function hook" stays the technical name. Early access opened through an environment variable.
- **October 1**: the feature went live.

Mods are on by default from 2.1.287 in the terminal and 2.1.286 in the desktop app. Newer versions ignore `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`, even `0`, so you can delete it.

Some of Claude Code's own features are mods, listed in `/plugin` under **Installed** → **Built-in**: `cc-plugin-diff` (`/diff` and its pane), `cc-plugin-agents-md` (loads `AGENTS.md`), `cc-plugin-sec-default` (protects managed settings, hooks and permission rules from user mods) and a few more. The source of some, tests included, is in the [`mods`](https://github.com/anthropics/claude-code/tree/main/mods) folder of the Claude Code repository; [`claude-code-playground`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods) has samples such as `blast-radius`, which holds a risky command like `rm -rf` and shows what it would change.

## Layers and organizations

Mods that listen to the same event wrap each other. Each calls `next(e)` to pass the event one layer in, and the result comes back out the same way:

![A tool.call event passes from the outside in: the organization's guard mods, the user's mods, the organization's defaults, the built-in mods, and finally Claude Code itself, which runs the tool](/images/claude-code-mods/hook-layers.svg)

- **prepend**: the organization's mods in `prependPlugins`. With managed settings, or on Team and Enterprise plans, the built-in `sec-default` sits here too.
- **user**: mods you installed or loaded with `--plugin-dir`.
- **append**: the organization's defaults, in `appendPlugins`.
- **builtin**: mods that ship with Claude Code.

In managed settings, `allowManagedModsOnly` runs hooks only from organization and built-in mods, `disableSideloadFlags` rejects `--plugin-dir`, and `allowModsToOverrideDenyRules` decides whether a user's mod may approve a call a `deny` rule refuses. An organization can also write a policy mod that listens to `plugin.register` and refuses other mods based on what they call.

## Security: a mod runs with your permissions

A mod runs as your user, with no sandbox. It can read and write your files, run processes, send network requests, and read environment variables and settings, API keys included. It sees every prompt and tool call, can rewrite them, submit a prompt as if you typed it, approve a tool call before you are asked, and spend tokens on your plan. The [sandbox](https://code.claude.com/docs/en/sandboxing) isolates only Claude's Bash commands, not processes a mod starts.

The docs promise only that a mod cannot change the permission prompt. Install mods only from sources you trust, and run `claude plugin validate` on them first ([AI security](en/posts/ai-security/) covers the wider risks).

## Install, turn off and share

Check your version with `claude --version`, or `/status` in the desktop app. A mod installs like any plugin, as `<plugin>@<marketplace>`:

```bash
claude plugin install node-guard@my-mods
```

Inside a session it is `/plugin install node-guard@my-mods`; after installing from the shell, `/reload-plugins` loads it without a restart.

To turn mods off:

- **One mod**: disable or uninstall it on the **Installed** tab of `/plugin`.
- **All of them, for one session**: `--safe-mode`, which also turns off your other customizations.
- **All you installed, always**: `"disableAllHooks": true` in `~/.claude/settings.json`, which also stops settings hooks and your custom status line.

None of these stops built-in mods; turn those off one by one in `/plugin`, except `sec-default`.

To share a mod, version it in the manifest like any plugin, then send the folder, publish it in your own marketplace or submit it to Anthropic's directory. A name starting with `claude-` fails validation. State in the README which Claude Code version you tested with.
