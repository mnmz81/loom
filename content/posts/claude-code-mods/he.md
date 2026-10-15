---
title: "Claude Code Mods: לשנות את Claude Code מבפנים"
summary: "מה זה mod, מאיפה הוא הגיע, מתי לבחור בו במקום hook או skill, ואיך כותבים, בודקים, מריצים ומשתפים mod ראשון. נבדק על גרסה 2.1.295."
date: 2026-10-14
tags: [claude-code]
---

עד עכשיו, מי שרצה לשנות את ההתנהגות של Claude Code השתמש ב-hooks שבקובץ ההגדרות: פקודת shell שרצה באירוע מסוים ויכולה לאשר, לחסום או להוסיף הקשר. מאוקטובר 2026 יש דרך נוספת, **mod**. זה plugin שהקוד שלו הוא פונקציות JavaScript או TypeScript שרצות בתוך Claude Code עצמו, ולכן הוא יכול לשנות כמעט הכול: קריאות לכלים, את ה-prompt, פקודות, ואפילו את מה שמצויר על המסך.

הפרטים נבדקו מול [התיעוד של mods](https://code.claude.com/docs/en/plugins/mods/overview), וכל הדוגמאות הורצו עם Claude Code 2.1.295, הגרסה שמגיעה עם אפליקציית הדסקטופ. ה-API עדיין משתנה בין גרסאות, אז כדאי לקרוא את הפוסט כתמונת מצב. רשימת הפקודות נמצאת בפוסט על [פקודות Claude Code](he/posts/claude-code-commands/).

## מה זה mod

Mod הוא [plugin](https://code.claude.com/docs/en/plugins) עם קובץ קוד אחד, שנקרא מודול ה-hooks, שמייצא פונקציה בשם `register`. Claude Code קורא לה כשה-mod נטען, ובתוכה רושמים handlers לאירועים עם `on`: לפני שכלי רץ (`tool.call`), כשנשלח prompt (`prompt.submit`), כשהספינר מצויר (`ui.render`), כשמריצים פקודה (`command.run`), ועוד הרבה.

כל handler כזה, שבתיעוד נקרא hook, מקבל שלושה ארגומנטים:

- `$`: ה-API של ה-mods. כל מה שה-mod עושה מחוץ לקוד של עצמו עובר דרכו: לצייר, לרשום פקודה, לקרוא קובץ, להריץ תהליך, לקרוא למודל. בזכות זה Claude Code יכול להראות מה mod עושה לפני שמריצים אותו.
- `e`: נתוני האירוע, למשל שם הכלי והפרמטרים. האובייקט קפוא, וכדי לשנות אותו מעבירים עותק.
- `next(e)`: מעביר את האירוע הלאה, ל-mods הבאים ואחר כך ל-Claude Code עצמו, ומחזיר את התוצאה. middleware ב-Express או ב-Koa נראה אותו דבר.

ה-hooks רצים בכל מקום ש-Claude Code רץ בו, כולל `claude -p`, ה-Agent SDK והתוסף של VS Code. מה שה-mod מצייר מופיע רק בטרמינל ובלשונית Code של אפליקציית הדסקטופ.

### שלוש דרכים להגיב לאירוע

- **להסתכל**: לרשום משהו ולהחזיר `next(e)`, וכל השאר ממשיך כרגיל.
- **לשכתב**: לקרוא ל-`next({ ...e, command: ... })` עם עותק שבו שדה אחד השתנה.
- **לענות לבד**: להחזיר תשובה בלי לקרוא ל-`next`, למשל `{ deny: 'reason' }` שחוסם קריאה לכלי. ההתנהגות הרגילה לא רצה בכלל.

## מתי mod ומתי משהו אחר

Mods חופפים חלקית לכלים שכבר קיימים. הטבלה מבוססת על ההשוואה שבתיעוד:

| | Mod | Hook בהגדרות | Skill | שרת MCP |
|---|---|---|---|---|
| מה זה | פונקציות שרצות בתוך Claude Code | פקודת shell, בקשת HTTP או prompt שרצים באירוע | קובץ `SKILL.md` עם הוראות | תהליך חיצוני שנותן ל-Claude כלים |
| מה אפשר לשנות | קריאות לכלים, prompts, פקודות, תורות ומה שמצויר | אם קריאה או prompt עוברים, הפרמטרים והתוצאה של כלי, הקשר נוסף | מה Claude יודע ועושה | אילו כלים יש ל-Claude |
| מצייר בממשק | כן | לא | לא | לא |
| כותבים ב- | JavaScript או TypeScript | סקריפט ושורה ב-`settings.json` | Markdown | כל שפה |

אם hook קיים עושה את העבודה, אם צריך רק הוראות (skill), או מערכת חיצונית ([MCP](he/posts/ai-mcp/)), אין סיבה לכתוב mod. הוא שווה את זה ל-pane, לפס מעל ה-prompt, לפקודה שרצה בלי תור של Claude, או לשכתוב אירוע בדרך.

## מאיפה זה הגיע

- **3 בספטמבר 2026**: ‏@poteat מצוות Claude Code פתח את [issue #91870](https://github.com/anthropics/claude-code/issues/91870) עם הצעה ל-"function hooks", סרטוני הדגמה ומסמך ארכיטקטורה, וביקש מהקהילה לומר אם זה מעניין אותה.
- **9 בספטמבר**: הצוות החליט לשחרר, ושם המוצר נקבע ל-"Claude Mods". המונח "function hook" נשאר השם הטכני של מה שה-mods בנויים עליו. גישה מוקדמת נפתחה דרך משתנה סביבה.
- **1 באוקטובר**: עדכון ב-issue הודיע שהפיצ'ר באוויר.

היום mods פעילים כברירת מחדל, מגרסה 2.1.287 בטרמינל ו-2.1.286 באפליקציית הדסקטופ. את `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` מהגישה המוקדמת אפשר למחוק: הגרסאות החדשות מתעלמות ממנו, גם עם `0`.

## מה כבר רץ כ-mod

חלק מהפיצ'רים של Claude Code עצמו כתובים כ-mods. רואים אותם ב-`/plugin`, בלשונית **Installed**, תחת **Built-in**:

- `cc-plugin-diff`: הפקודה `/diff` וה-pane שלה.
- `cc-plugin-agents-md`: טוען את `AGENTS.md` כהוראות פרויקט.
- `cc-plugin-sec-default`: שומר על מה שהארגון מנהל (הגדרות, hooks, כללי הרשאות) מפני mods שמשתמש מתקין.
- `cc-plugin-telemetry`, `cc-plugin-plugin-authoring` ו-`cc-plugin-you-should-know`.

הקוד של חלקם פתוח בתיקיית [`mods`](https://github.com/anthropics/claude-code/tree/main/mods) בריפו של Claude Code, כולל טסטים: הדרך הטובה ביותר לראות mod אמיתי. גם ב-[`claude-code-playground`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods) יש דוגמאות, למשל `blast-radius`, שעוצר פקודה מסוכנת כמו `rm -rf` ומראה מה היא הייתה משנה.

## mod ראשון: שומר על npm

בבלוג הזה כל פקודת npm חייבת לרוץ דרך `./scripts/with-node.sh`, כי ה-Node של המערכת ישן מדי. במקום לקוות ש-Claude יזכור, כותבים mod שחוסם כל `npm` או `npx` שלא עובר דרך הסקריפט, ומוסיף פקודה `/node-guard` שמראה כמה פעמים זה קרה.

### שלושה קבצים

```text
node-guard/
├── .claude-plugin/
│   └── plugin.json
└── hooks/
    ├── hooks.json
    └── register.ts
```

`plugin.json` הוא manifest רגיל של plugin, בלי שדות מיוחדים:

```json
{
  "name": "node-guard",
  "version": "0.1.0",
  "description": "Blocks npm and npx commands that skip ./scripts/with-node.sh, and adds a /node-guard command",
  "author": { "name": "Moris Maor Zakay" }
}
```

`hooks.json` מצביע על הקוד. השדה `modules` הוא מה שהופך plugin ל-mod:

```json
{
  "modules": ["./register.ts"]
}
```

והקוד עצמו, `hooks/register.ts`:

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

כמה פרטים בקוד:

- `{ tool: 'Bash' }` הוא matcher: ה-hook רץ רק על קריאות לכלי Bash.
- `.catch` חשוב בכל hook ששומר על משהו. hook שזורק שגיאה פשוט מדולג, והפקודה שהוא היה אמור לחסום רצה. ה-handler של `.catch` מסרב במקומו.
- ה-hook של `command.run` עונה לבד, בלי `next`, ולכן `/node-guard` עונה מיד, בלי תור של Claude ובלי טוקנים.
- Claude Code טוען קבצי `.ts` ישירות, בלי Node, בלי bundler ובלי build. ה-`import type` מ-`claude-code` נותן טיפוסים בלבד.

### לבדוק לפני שמריצים

`claude plugin validate` קורא את הקוד בלי להריץ אותו ומראה מה Claude Code רואה בו:

```bash
claude plugin validate ./node-guard
```

הפלט מסתיים בשורות האלה:

```text
  ❯ ./register.ts hooks: session.start, tool.call{tool=Bash}, command.run{command=node-guard}
  ❯ ./register.ts answers its own command: command.run{command=node-guard}
  ❯ ./register.ts gating hook with .catch: tool.call{tool=Bash}
  ❯ ./register.ts calls: $.command.register, $.ui.status

✔ Validation passed
```

השורה `hooks:` מראה לאילו אירועים ה-mod נרשם, ו-`calls:` מראה מה הוא מבקש מ-Claude Code לעשות. אותה פקודה שימושית גם לפני שמתקינים mod של מישהו אחר: רואים מראש אם הוא קורא קבצים, שולח בקשות רשת או מריץ תהליכים.

### טסט

`claude plugin test` מריץ קבצי `*.test.ts` בלי סשן, בלי התחברות ובלי רשת. ה-hooks שהטסט רושם יושבים מתחת ל-mod ומשחקים את התפקיד של Claude Code. את הקובץ שומרים ב-`node-guard/tests/node-guard.test.ts`:

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

### להריץ

`--plugin-dir` טוען את התיקייה לסשן אחד, בלי להתקין, ועוקב אחריה: כל שמירה של קובץ טוענת את ה-mod מחדש.

```bash
claude --plugin-dir ./node-guard
```

מעכשיו, כש-Claude מנסה להריץ `npm test`, הקריאה נחסמת ו-Claude מקבל את ההודעה מה-mod במקום תוצאת הפקודה. כדי לבדוק את הפקודה החדשה בלי סשן אינטראקטיבי:

```bash
claude -p "/node-guard" --plugin-dir ./node-guard
```

```text
node-guard: Blocked 0 npm commands since the mod loaded
```

Claude Code מוסיף את שם ה-plugin לפני הטקסט. המונה מתאפס בכל טעינה מחדש, כי המשתנים של המודול מתחילים מאפס. ערך שצריך לשרוד שומרים ב-`$.state` (לאורך הסשן) או ב-`$.store` (בין סשנים).

## לתת ל-Claude לכתוב את ה-mod

לא חייבים לכתוב לבד. אפשר לבקש בסשן רגיל, למשל "make a mod that shows the current git branch above the prompt". Claude עובד עם skill מובנה בשם `plugin-authoring` (אפשר גם להפעיל אותו ידנית עם `/plugin-authoring`), שיודע אילו אירועים ופונקציות יש בגרסה המותקנת.

- Claude כותב את ה-mod לתיקייה `~/.claude/dev-mods/<session-id>/<mod-name>/`.
- כשהקובץ הראשון נשמר, Claude Code שואל אם להפעיל hot reloading לסשן. אחרי **Enable for this session** ה-mod נטען בסוף התור, ונטען מחדש בסוף כל תור שמשנה אותו.
- התיקייה הזו זמנית ונמחקת אחרי `cleanupPeriodDays`. כדי לשמור mod, מעתיקים את התיקייה שלו למקום קבוע ומריצים אותו עם `--plugin-dir`.

בכל טעינה Claude Code כותב לתוך `.claude-plugin/types/` של ה-mod קבצי הצהרות TypeScript של הגרסה המותקנת. הם מדויקים יותר מכל תיעוד: כשהם והאתר לא מסכימים, הקבצים צודקים.

## שכבות וארגונים

כשכמה mods מאזינים לאותו אירוע, הם עוטפים זה את זה, כמו middleware. כל אחד קורא ל-`next(e)` כדי להעביר את האירוע שכבה פנימה, והתוצאה חוזרת החוצה באותה דרך:

![אירוע tool.call עובר מבחוץ פנימה: mods השמירה של הארגון, ה-mods של המשתמש, ברירות המחדל של הארגון, ה-mods המובנים, ולבסוף Claude Code עצמו שמריץ את הכלי](/images/claude-code-mods/hook-layers.svg)

- **prepend**: ה-mods של הארגון שמופיעים ב-`prependPlugins` ורצים לפני כל mod של משתמש. במחשב עם הגדרות מנוהלות, או בתוכניות Team ו-Enterprise, יושב כאן גם `sec-default` המובנה.
- **user**: ה-mods שהתקנתם או טענתם עם `--plugin-dir`.
- **append**: ברירות המחדל של הארגון, ב-`appendPlugins`.
- **builtin**: ה-mods שמגיעים עם Claude Code.

בהגדרות המנוהלות יש כמה מתגים שכדאי להכיר: `allowManagedModsOnly` מריץ hooks רק מ-mods של הארגון ומהמובנים, `disableSideloadFlags` חוסם את `--plugin-dir`, ו-`allowModsToOverrideDenyRules` קובע אם mod של משתמש יכול לאשר קריאה שכלל `deny` חוסם. ארגון יכול גם לכתוב mod מדיניות משלו שמאזין ל-`plugin.register` ומסרב לטעון mods אחרים לפי מה שהם קוראים.

## אבטחה: mod רץ בהרשאות שלכם

Mod הוא קוד שרץ בתור המשתמש שלכם, בלי sandbox:

- הוא יכול לקרוא ולכתוב כל קובץ שהמשתמש שלכם יכול, להריץ תהליכים ולשלוח בקשות רשת.
- הוא רואה משתני סביבה וקבצי הגדרות, כולל מפתחות API שיושבים בהם.
- הוא רואה כל prompt וכל קריאה לכלי, ויכול לשכתב אותם או לשלוח prompt כאילו הקלדתם אותו.
- הוא יכול לאשר קריאה לכלי לפני שתישאלו, ולצרוך טוקנים על חשבון התוכנית שלכם.
- גם כש-[sandbox](https://code.claude.com/docs/en/sandboxing) פעיל, הוא מבודד רק את פקודות ה-Bash של Claude. תהליך שה-mod מפעיל רץ מחוץ לו.

הדבר היחיד שהתיעוד מבטיח ש-mod לא יכול לשנות הוא חלון בקשת ההרשאה. לכן מתקינים mods רק ממקורות שסומכים עליהם, ומריצים `claude plugin validate` על הקוד לפני ההתקנה. עוד על הסיכונים האלה בפוסט על [אבטחת מערכות AI](he/posts/ai-security/).

## להתקין, לכבות ולשתף

את הגרסה בודקים עם `claude --version` בטרמינל, או עם `/status` בלשונית Code של הדסקטופ. Mod מתקינים כמו כל plugin, מ-marketplace, בפורמט `<plugin>@<marketplace>`:

```bash
claude plugin install node-guard@my-mods
```

בתוך סשן הפקודה היא `/plugin install node-guard@my-mods`. אם התקנתם מה-shell בזמן שסשן פתוח, `/reload-plugins` טוען את ה-mod בלי להפעיל מחדש.

כדי לכבות:

- **mod אחד**: מבטלים או מסירים אותו בלשונית **Installed** של `/plugin`.
- **כל ה-mods, לסשן אחד**: מפעילים עם `--safe-mode`, שמכבה גם התאמות אחרות.
- **כל ה-mods שהתקנתם, תמיד**: `"disableAllHooks": true` ב-`~/.claude/settings.json`. זה עוצר גם את ה-hooks שבהגדרות ואת ה-status line המותאם.

אף אחת מהדרכים האלה לא עוצרת את ה-mods המובנים. אותם מכבים אחד אחד ב-`/plugin`, חוץ מ-`sec-default`.

לשיתוף, ל-mod יש גרסה ב-manifest כמו לכל plugin. אפשר לשלוח את התיקייה, לפרסם ב-marketplace משלכם או להגיש לספרייה של Anthropic. שם שמתחיל ב-`claude-` ייכשל ב-validate, כי הוא נראה כמו plugin של Anthropic. כדאי לכתוב ב-README עם איזו גרסה של Claude Code בדקתם, כי ה-API עוד זז.

## מלכודות

- **`$` נכתב במלואו.** `validate` מנתח את הקוד בלי להריץ אותו, ולכן `const ui = $.ui` או destructuring של `$` נכשלים. כותבים `$.ui.status(...)` בכל מקום.
- **שם האירוע הוא מחרוזת קבועה.** `on(name, ...)` עם משתנה, או לולאה על רשימת שמות, נכשלים.
- **רק `import` רגיל.** אין `require` ואין `import()` דינמי. מייבאים קבצים מתוך תיקיית ה-plugin בלבד, וטיפוסים ועזרים מ-`claude-code`.
- **אין DOM ואין Node.** הקוד רץ בסביבה מבודדת, וכל גישה החוצה עוברת דרך `$`: `$.fs`, `$.process`, `$.http`.
- **תקציב זמן.** hook שרץ יותר מ-10 שניות מדולג. הזמן שבתוך `next` ובקריאות ל-`$` לא נספר, חוץ מ-`$.clock.sleep`. ל-handler של `.catch` יש שנייה אחת.
- **mod שלא עושה כלום.** `claude --debug` כותב ללוג למה hook דולג או למה עץ UI נדחה.

הרשימה המלאה של האירועים, הפונקציות והאלמנטים נמצאת ב-[Mods reference](https://code.claude.com/docs/en/plugins/mods/reference).
