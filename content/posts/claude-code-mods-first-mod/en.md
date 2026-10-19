---
title: "A first Claude Code mod: write, check, test and run it"
summary: "Building a mod that blocks npm commands that skip a wrapper script and adds a /node-guard command: the files, claude plugin validate, a test, running it, letting Claude write it, and the pitfalls."
date: 2026-10-19
tags: [claude-code]
series: { key: claude-code-mods, order: 2 }
---

In this blog every npm command must go through `./scripts/with-node.sh`, because the system Node is too old. This [mod](en/posts/claude-code-mods/) blocks every `npm` or `npx` that skips the script, and adds a `/node-guard` command that counts the blocks. Every example ran with Claude Code 2.1.295.

## Three files

```text
node-guard/
├── .claude-plugin/
│   └── plugin.json
└── hooks/
    ├── hooks.json
    └── register.ts
```

`plugin.json` is an ordinary plugin manifest:

```json
{
  "name": "node-guard",
  "version": "0.1.0",
  "description": "Blocks npm and npx commands that skip ./scripts/with-node.sh, and adds a /node-guard command",
  "author": { "name": "Moris Maor Zakay" }
}
```

In `hooks.json`, the `modules` field is what makes a plugin a mod:

```json
{
  "modules": ["./register.ts"]
}
```

`hooks/register.ts`:

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

- `{ tool: 'Bash' }` is a matcher: the hook runs only on Bash calls.
- A hook that throws is skipped, so the command it guards would run. Every guarding hook needs a `.catch`.
- `command.run` answers without `next`, so `/node-guard` replies with no Claude turn and no tokens.
- Claude Code loads `.ts` directly, with no Node, bundler or build; `import type` from `claude-code` gives types only.

## Check before you run

`claude plugin validate` analyzes the code without running it:

```bash
claude plugin validate ./node-guard
```

```text
  ❯ ./register.ts hooks: session.start, tool.call{tool=Bash}, command.run{command=node-guard}
  ❯ ./register.ts answers its own command: command.run{command=node-guard}
  ❯ ./register.ts gating hook with .catch: tool.call{tool=Bash}
  ❯ ./register.ts calls: $.command.register, $.ui.status

✔ Validation passed
```

`hooks:` lists the events, `calls:` what the mod asks Claude Code to do. Run it on someone else's mod before installing to see whether it reads files, sends requests or runs processes.

## A test

`claude plugin test` runs `*.test.ts` files with no session, sign-in or network. Hooks the test registers sit beneath the mod and play Claude Code. `node-guard/tests/node-guard.test.ts`:

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

## Run it

`--plugin-dir` loads the folder for one session without installing it, and reloads the mod on every save:

```bash
claude --plugin-dir ./node-guard
```

When Claude tries `npm test`, it gets the mod's message instead of the output. The command, without an interactive session:

```bash
claude -p "/node-guard" --plugin-dir ./node-guard
```

```text
node-guard: Blocked 0 npm commands since the mod loaded
```

The counter resets on every reload. A value that must survive goes in `$.state` (the session) or `$.store` (across sessions). Installing and sharing are in the [previous post](en/posts/claude-code-mods/).

## Let Claude write it

Ask in a normal session, for example "make a mod that shows the current git branch above the prompt". Claude uses the built-in `plugin-authoring` skill (or `/plugin-authoring`), which knows your installed version's events and methods.

- The mod goes to `~/.claude/dev-mods/<session-id>/<mod-name>/`.
- On the first save, Claude Code asks whether to enable hot reloading. After **Enable for this session**, the mod loads at the end of the turn and reloads after every turn that changes it.
- The folder is deleted after `cleanupPeriodDays`. To keep the mod, copy it elsewhere and run it with `--plugin-dir`.

On every load Claude Code writes TypeScript declarations for your version into the mod's `.claude-plugin/types/`. When they and the website disagree, the files are right.

## Pitfalls

- **Write `$` out in full.** `validate` reads the code statically, so `const ui = $.ui` or destructuring `$` fails.
- **The event name is a string literal**, not a variable or a loop over names.
- **Plain `import` only**, no `require` or dynamic `import()`; files from inside the plugin folder, types and helpers from `claude-code`.
- **No DOM and no Node.** Everything outside goes through `$`: `$.fs`, `$.process`, `$.http`.
- **10 seconds per hook**, or it is skipped. Time inside `next` and `$` calls doesn't count, except `$.clock.sleep`. A `.catch` handler gets one second.
- **A mod that does nothing**: `claude --debug` logs why a hook was skipped or a UI tree refused.

Every event, method and element is in the [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference).
