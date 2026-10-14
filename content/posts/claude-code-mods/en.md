---
title: "Claude Code mods: changing Claude Code from the inside"
summary: "What a mod is, where it came from, when to pick it over a hook or a skill, and how to write, check, run and share a first one. Tested on version 2.1.295."
date: 2026-10-14
tags: [claude-code]
---

Until now, if you wanted to change how Claude Code behaves, you used the hooks in your settings file: a shell command that runs on an event and can allow, block or add context. Since October 2026 there is another way, the **mod**. It is a plugin whose code is JavaScript or TypeScript functions that run inside Claude Code itself, so it can change almost anything: tool calls, the prompt, commands, and even what is drawn on screen.

The details here were checked against the [official mods docs](https://code.claude.com/docs/en/plugins/mods/overview), and every example ran with Claude Code 2.1.295, the version that ships with the desktop app. The API still changes between releases, so read this post as a snapshot. The general command list is in the [Claude Code commands](en/posts/claude-code-commands/) post.

## What a mod is

A mod is a [plugin](https://code.claude.com/docs/en/plugins) with one code file, called the hooks module, that exports a function named `register`. Claude Code calls it when the mod loads, and inside it you register handlers for events with `on`: before a tool runs (`tool.call`), when a prompt is submitted (`prompt.submit`), when the spinner is drawn (`ui.render`), when a command runs (`command.run`), and many more.

Each of these handlers, which the docs call a hook, gets three arguments:

- `$`: the mods API. Everything the mod does outside its own code goes through it: drawing, registering a command, reading a file, running a process, calling a model. That is what lets Claude Code show what a mod does before you run it.
- `e`: the event's data, such as the tool's name and its arguments. It is frozen; to change it, you pass a copy.
- `next(e)`: passes the event on, to the next mods and then to Claude Code's own behavior, and returns the result. If you have written Express or Koa middleware, the shape will look familiar.

Hooks run wherever Claude Code runs, including `claude -p`, the Agent SDK and the VS Code extension. What a mod draws shows up only in the terminal and in the desktop app's Code tab.

### Three ways to handle an event

- **Observe**: record something and return `next(e)`, so everything goes on as usual.
- **Rewrite**: call `next({ ...e, command: ... })` with a copy in which one field changed.
- **Answer**: return a result without calling `next`, for example `{ deny: 'reason' }`, which blocks a tool call. The usual behavior never runs.

## When a mod, and when something else

Mods overlap with tools that already exist. This table is based on the comparison in the docs:

| | Mod | Settings hook | Skill | MCP server |
|---|---|---|---|---|
| What it is | Functions that run inside Claude Code | A shell command, HTTP request or prompt that runs on an event | A `SKILL.md` file of instructions | An external process that gives Claude tools |
| What it can change | Tool calls, prompts, commands, turns and what is drawn | Whether a call or prompt goes ahead, a tool's arguments and result, extra context | What Claude knows and does | Which tools Claude has |
| Draws in the interface | Yes | No | No | No |
| Written in | JavaScript or TypeScript | A script and a `settings.json` entry | Markdown | Any language |

If an existing hook already does the job, if you only need instructions (a skill), or if you need access to an external system ([MCP](en/posts/ai-mcp/)), there is no reason to write a mod. It is worth the effort when you want a pane, a band above the prompt, a command that runs without a Claude turn, or to rewrite an event on its way.

## Where it came from

- **September 3, 2026**: @poteat from the Claude Code team opened [issue #91870](https://github.com/anthropics/claude-code/issues/91870) with a proposal for "function hooks", demo videos and an architecture document, and asked the community whether it wanted this.
- **September 9**: the decision to ship was made, and the product name became "Claude Mods". "Function hook" stays the technical name for what mods are built on. Early access opened through an environment variable.
- **October 1**: an update on the issue announced that the feature was live.

Today mods are on by default, from version 2.1.287 in the terminal and 2.1.286 in the desktop app. If you set `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` during early access, you can delete it: newer versions ignore it, so even `0` turns nothing off.

## What already runs as a mod

Some of Claude Code's own features are written as mods. You can see them in `/plugin`, on the **Installed** tab, under **Built-in**:

- `cc-plugin-diff`: the `/diff` command and its pane.
- `cc-plugin-agents-md`: loads `AGENTS.md` as project instructions.
- `cc-plugin-sec-default`: protects what the organization manages (settings, hooks, permission rules) from mods a user installs.
- `cc-plugin-telemetry`, `cc-plugin-plugin-authoring` and `cc-plugin-you-should-know`.

The source of some of them is public in the [`mods`](https://github.com/anthropics/claude-code/tree/main/mods) folder of the Claude Code repository, tests included, and it is the best way to see what a real mod looks like. There are also sample mods in [`claude-code-playground`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods), such as `blast-radius`, which holds a risky command like `rm -rf` and shows what it would change.

## A first mod: an npm guard

In this blog every npm command must go through `./scripts/with-node.sh`, because the system Node is too old. Instead of hoping Claude remembers, you can write a mod that blocks every `npm` or `npx` that skips the script, and adds a `/node-guard` command that shows how many times that happened.

### Three files

```text
node-guard/
├── .claude-plugin/
│   └── plugin.json
└── hooks/
    ├── hooks.json
    └── register.ts
```

`plugin.json` is an ordinary plugin manifest, with no special fields:

```json
{
  "name": "node-guard",
  "version": "0.1.0",
  "description": "Blocks npm and npx commands that skip ./scripts/with-node.sh, and adds a /node-guard command",
  "author": { "name": "Moris Maor Zakay" }
}
```

`hooks.json` points to the code. The `modules` field is what makes a plugin a mod:

```json
{
  "modules": ["./register.ts"]
}
```

And the code itself, `hooks/register.ts`:

```typescript
import type { Register } from 'claude-code'

// npm or npx at the start of a command, or after ; && || |
const NPM = /(^|[;&|]\s*)(npm|npx)\s/
let blocked = 0

export const register: Register = on => {
  // Add the /node-guard command when the session starts
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'node-guard',
      description: 'Show how many npm commands the guard blocked',
    })
    return next(e)
  })

  // Runs before every Bash command Claude wants to run
  on('tool.call', { tool: 'Bash' }, ($, e, next) => {
    if (NPM.test(e.command) && !e.command.includes('with-node.sh')) {
      blocked += 1
      $.ui.status(`node-guard: blocked ${blocked}`)
      return { deny: 'Run npm through ./scripts/with-node.sh (this project needs Node 24).' }
    }
    return next(e)
  }).catch(($, e, next) =>
    // If the hook itself failed, refuse rather than let the command through
    next.called ? next(e) : { deny: 'node-guard failed, so the command was not run.' },
  )

  // Answers /node-guard without starting a Claude turn
  on('command.run', { command: 'node-guard' }, async () => ({
    text: `Blocked ${blocked} npm commands since the mod loaded`,
  }))
}
```

A few things worth noticing:

- `{ tool: 'Bash' }` is a matcher: the hook runs only on calls to the Bash tool.
- `.catch` matters in any hook that guards something. A hook that throws is simply skipped, and the command it was meant to block runs. The `.catch` handler refuses in its place.
- The `command.run` hook answers by itself, without `next`, so `/node-guard` replies at once, with no Claude turn and no tokens.
- Claude Code loads `.ts` files directly, with no Node, no bundler and no build. The `import type` from `claude-code` gives types only.

### Check before you run

`claude plugin validate` reads the code without running it and shows what Claude Code sees in it:

```bash
claude plugin validate ./node-guard
```

The output ends with these lines:

```text
  ❯ ./register.ts hooks: session.start, tool.call{tool=Bash}, command.run{command=node-guard}
  ❯ ./register.ts answers its own command: command.run{command=node-guard}
  ❯ ./register.ts gating hook with .catch: tool.call{tool=Bash}
  ❯ ./register.ts calls: $.command.register, $.ui.status

✔ Validation passed
```

The `hooks:` line shows which events the mod registers for, and `calls:` shows what it asks Claude Code to do. The same command is useful before you install someone else's mod: you see up front whether it reads files, sends network requests or runs processes.

### A test

`claude plugin test` runs `*.test.ts` files with no session, no sign-in and no network. The hooks the test registers sit beneath the mod and play the part of Claude Code. Save the file as `node-guard/tests/node-guard.test.ts`:

```typescript
import { expect, test } from 'claude-code/testing'

test('blocks npm without with-node.sh and lets the wrapped one run', async ($, on) => {
  // Stand in for Claude Code: every tool call that gets this far "runs"
  on('tool.call', () => ({ result: 'ran' }))

  const bare = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(bare.deny).toContain('with-node.sh')

  const wrapped = await $.tool.call({ tool: 'Bash', command: './scripts/with-node.sh npm test' })
  expect(wrapped.deny).toBeUndefined()

  const answer = await $.command.run({ command: 'node-guard', args: '' })
  expect(answer.text).toBe('Blocked 1 npm commands since the mod loaded')
})
```

```bash
cd node-guard && claude plugin test
```

```text
tests/node-guard.test.ts:
(pass) blocks npm without with-node.sh and lets the wrapped one run [18.72ms]

 1 pass
 0 fail
Ran 1 test across 1 file. [0.17s]
```

### Run it

`--plugin-dir` loads the folder for one session, without installing it, and watches it: every file save reloads the mod.

```bash
claude --plugin-dir ./node-guard
```

From now on, when Claude tries to run `npm test`, the call is blocked and Claude gets the mod's message instead of the command's output. To check the new command without an interactive session:

```bash
claude -p "/node-guard" --plugin-dir ./node-guard
```

```text
node-guard: Blocked 0 npm commands since the mod loaded
```

Claude Code puts the plugin's name in front of the text. The counter resets on every reload, because the module's variables start over. A value that has to survive goes in `$.state` (for the session) or `$.store` (across sessions).

## Let Claude write the mod

You don't have to write it yourself. You can ask in a normal session, for example "make a mod that shows the current git branch above the prompt". Claude works from a built-in skill named `plugin-authoring` (you can also load it yourself with `/plugin-authoring`), which knows which events and methods your installed version has.

- Claude writes the mod to `~/.claude/dev-mods/<session-id>/<mod-name>/`.
- When the first file is saved, Claude Code asks whether to enable hot reloading for the session. After **Enable for this session**, the mod loads when the turn ends, and reloads at the end of every turn that changes it.
- That folder is temporary and is deleted after `cleanupPeriodDays`. To keep a mod, copy its folder somewhere permanent and run it with `--plugin-dir`.

On every load Claude Code writes TypeScript declaration files for your installed version into the mod's `.claude-plugin/types/`. They are the most accurate documentation there is: when they and the website disagree, the files are right.

## Layers and organizations

When several mods listen to the same event, they wrap each other, like middleware. Each one calls `next(e)` to pass the event one layer in, and the result comes back out the same way:

![A tool.call event passes from the outside in: the organization's guard mods, the user's mods, the organization's defaults, the built-in mods, and finally Claude Code itself, which runs the tool](/images/claude-code-mods/hook-layers.svg)

- **prepend**: the organization's mods listed in `prependPlugins`, which run before any user mod. On a machine with managed settings, or on Team and Enterprise plans, the built-in `sec-default` sits here too.
- **user**: the mods you installed or loaded with `--plugin-dir`.
- **append**: the organization's defaults, in `appendPlugins`.
- **builtin**: the mods that ship with Claude Code.

Managed settings have a few switches worth knowing: `allowManagedModsOnly` runs hooks only from the organization's mods and the built-in ones, `disableSideloadFlags` rejects `--plugin-dir`, and `allowModsToOverrideDenyRules` decides whether a user's mod may approve a call that a `deny` rule refuses. An organization can also write a policy mod of its own that listens to `plugin.register` and refuses to load other mods based on what they call.

## Security: a mod runs with your permissions

A mod is code that runs as your user, with no sandbox:

- It can read and write any file your user can, run processes and send network requests.
- It sees environment variables and settings files, including API keys kept in them.
- It sees every prompt and every tool call, and can rewrite them or submit a prompt as if you had typed it.
- It can approve a tool call before you are asked, and spend tokens on your plan.
- Even with the [sandbox](https://code.claude.com/docs/en/sandboxing) on, only Claude's Bash commands are isolated. A process the mod starts runs outside it.

The one thing the docs promise a mod cannot change is the permission prompt. So install mods only from sources you trust, and run `claude plugin validate` on the code before installing. More on these risks in the [AI security](en/posts/ai-security/) post.

## Install, turn off and share

Check your version with `claude --version` in the terminal, or with `/status` in the desktop app's Code tab. You install a mod like any plugin, from a marketplace, as `<plugin>@<marketplace>`:

```bash
claude plugin install node-guard@my-mods
```

Inside a session the command is `/plugin install node-guard@my-mods`. If you installed from the shell while a session is open, `/reload-plugins` loads the mod without a restart.

To turn mods off:

- **One mod**: disable or uninstall it on the **Installed** tab of `/plugin`.
- **Every mod, for one session**: start with `--safe-mode`, which also turns off your other customizations.
- **Every mod you installed, always**: `"disableAllHooks": true` in `~/.claude/settings.json`. This also stops your settings hooks and your custom status line.

None of these stops the built-in mods. You turn those off one by one in `/plugin`, except `sec-default`.

To share, a mod has a version in its manifest like any plugin. You can send the folder, publish it in your own marketplace or submit it to Anthropic's directory. A name that starts with `claude-` fails validation, because it looks like an Anthropic plugin. Say in the README which Claude Code version you tested with, because the API is still moving.

## Pitfalls

- **Write `$` out in full.** `validate` analyzes the code without running it, so `const ui = $.ui` or destructuring `$` fails. Write `$.ui.status(...)` everywhere.
- **The event name is a string literal.** `on(name, ...)` with a variable, or a loop over a list of names, fails.
- **Plain `import` only.** No `require` and no dynamic `import()`. Import files from inside the plugin folder only, and types and helpers from `claude-code`.
- **No DOM and no Node.** The code runs in an isolated environment, and everything outside goes through `$`: `$.fs`, `$.process`, `$.http`.
- **A time budget.** A hook that runs for more than 10 seconds is skipped. Time inside `next` and inside `$` calls does not count, except `$.clock.sleep`. A `.catch` handler gets one second.
- **A mod that does nothing.** `claude --debug` writes to the log why a hook was skipped or why a UI tree was refused.

The full list of events, methods and elements is in the [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference).
