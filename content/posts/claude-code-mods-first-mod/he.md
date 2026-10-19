---
title: "mod ראשון ל-Claude Code: לכתוב, לבדוק, לבחון ולהריץ"
summary: "בונים mod שחוסם פקודות npm שלא עוברות דרך סקריפט עוטף ומוסיף פקודה /node-guard: הקבצים, claude plugin validate, טסט, הרצה, לתת ל-Claude לכתוב אותו, ומלכודות."
date: 2026-10-19
tags: [claude-code]
series: { key: claude-code-mods, order: 2 }
---

בבלוג הזה כל פקודת npm חייבת לרוץ דרך `./scripts/with-node.sh`, כי ה-Node של המערכת ישן מדי. ה-[mod](he/posts/claude-code-mods/) הזה חוסם כל `npm` או `npx` שלא עובר דרך הסקריפט, ומוסיף פקודה `/node-guard` שסופרת את החסימות. כל הדוגמאות הורצו עם Claude Code 2.1.295.

## שלושה קבצים

```text
node-guard/
├── .claude-plugin/
│   └── plugin.json
└── hooks/
    ├── hooks.json
    └── register.ts
```

`plugin.json` הוא manifest רגיל של plugin:

```json
{
  "name": "node-guard",
  "version": "0.1.0",
  "description": "Blocks npm and npx commands that skip ./scripts/with-node.sh, and adds a /node-guard command",
  "author": { "name": "Moris Maor Zakay" }
}
```

ב-`hooks.json`, השדה `modules` הוא מה שהופך plugin ל-mod:

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

- `{ tool: 'Bash' }` הוא matcher: ה-hook רץ רק על קריאות ל-Bash.
- hook שזורק שגיאה מדולג, והפקודה שהוא שומר עליה רצה. לכן כל hook ששומר על משהו צריך `.catch`.
- `command.run` עונה בלי `next`, ולכן `/node-guard` עונה בלי תור של Claude ובלי טוקנים.
- Claude Code טוען `.ts` ישירות, בלי Node, bundler או build. ה-`import type` מ-`claude-code` נותן טיפוסים בלבד.

## לבדוק לפני שמריצים

`claude plugin validate` מנתח את הקוד בלי להריץ אותו:

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

`hooks:` מראה את האירועים, ו-`calls:` מה ה-mod מבקש מ-Claude Code לעשות. כדאי להריץ את זה על mod של מישהו אחר לפני ההתקנה, כדי לראות אם הוא קורא קבצים, שולח בקשות או מריץ תהליכים.

## טסט

`claude plugin test` מריץ קבצי `*.test.ts` בלי סשן, התחברות או רשת. ה-hooks שהטסט רושם יושבים מתחת ל-mod ומשחקים את Claude Code. שומרים ב-`node-guard/tests/node-guard.test.ts`:

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

## להריץ

`--plugin-dir` טוען את התיקייה לסשן אחד בלי להתקין, וטוען את ה-mod מחדש בכל שמירה:

```bash
claude --plugin-dir ./node-guard
```

כש-Claude מנסה `npm test`, הוא מקבל את ההודעה של ה-mod במקום הפלט. הפקודה, בלי סשן אינטראקטיבי:

```bash
claude -p "/node-guard" --plugin-dir ./node-guard
```

```text
node-guard: Blocked 0 npm commands since the mod loaded
```

המונה מתאפס בכל טעינה מחדש. ערך שצריך לשרוד שומרים ב-`$.state` (לאורך הסשן) או ב-`$.store` (בין סשנים). התקנה ושיתוף ב[פוסט הקודם](he/posts/claude-code-mods/).

## לתת ל-Claude לכתוב

מבקשים בסשן רגיל, למשל "make a mod that shows the current git branch above the prompt". Claude משתמש ב-skill המובנה `plugin-authoring` (או `/plugin-authoring`), שמכיר את האירועים והפונקציות של הגרסה המותקנת.

- ה-mod נכתב ל-`~/.claude/dev-mods/<session-id>/<mod-name>/`.
- בשמירה הראשונה Claude Code שואל אם להפעיל hot reloading. אחרי **Enable for this session** ה-mod נטען בסוף התור, ונטען מחדש אחרי כל תור שמשנה אותו.
- התיקייה נמחקת אחרי `cleanupPeriodDays`. כדי לשמור את ה-mod, מעתיקים אותו למקום אחר ומריצים עם `--plugin-dir`.

בכל טעינה Claude Code כותב ל-`.claude-plugin/types/` של ה-mod הצהרות TypeScript של הגרסה שלכם. כשהן והאתר לא מסכימים, הן צודקות.

## מלכודות

- **`$` נכתב במלואו.** `validate` קורא את הקוד בלי להריץ אותו, ולכן `const ui = $.ui` או destructuring של `$` נכשלים.
- **שם האירוע הוא מחרוזת קבועה**, לא משתנה ולא לולאה על שמות.
- **רק `import` רגיל**, בלי `require` ובלי `import()` דינמי. קבצים מתוך תיקיית ה-plugin, טיפוסים ועזרים מ-`claude-code`.
- **אין DOM ואין Node.** כל גישה החוצה עוברת דרך `$`: `$.fs`, `$.process`, `$.http`.
- **10 שניות ל-hook**, אחרת הוא מדולג. הזמן שבתוך `next` וקריאות ל-`$` לא נספר, חוץ מ-`$.clock.sleep`. ל-handler של `.catch` יש שנייה אחת.
- **mod שלא עושה כלום**: `claude --debug` כותב ללוג למה hook דולג או למה עץ UI נדחה.

כל האירועים, הפונקציות והאלמנטים ב-[Mods reference](https://code.claude.com/docs/en/plugins/mods/reference).
