---
title: "Claude Code Mods: מה זה mod ומתי להשתמש בו"
summary: "Mod הוא plugin שקוד ה-JavaScript או TypeScript שלו רץ בתוך Claude Code. איך הוא עובד, מתי לבחור בו במקום hook, skill או MCP, השכבות שהוא רץ בהן והסיכונים. גרסה 2.1.295."
date: 2026-10-14
updated: 2026-10-19
tags: [claude-code]
series: { key: claude-code-mods, order: 1 }
---

ה-hooks שבקובץ ההגדרות מריצים פקודת shell באירוע מסוים, ויכולים לאשר, לחסום או להוסיף הקשר. מאוקטובר 2026 יש דרך שנייה לשנות את Claude Code: **mod**, plugin שפונקציות ה-JavaScript או TypeScript שלו רצות בתוך Claude Code ויכולות לשנות קריאות לכלים, prompts, פקודות ואת מה שמצויר על המסך.

נבדק מול [התיעוד של mods](https://code.claude.com/docs/en/plugins/mods/overview) על Claude Code 2.1.295. ה-API עדיין משתנה בין גרסאות. את ה-mod הראשון כותבים ב[פוסט הבא](he/posts/claude-code-mods-first-mod/).

## מה זה mod

Mod הוא [plugin](https://code.claude.com/docs/en/plugins) עם קובץ קוד, מודול ה-hooks, שמייצא פונקציה בשם `register`. Claude Code קורא לה בטעינה, והיא רושמת handlers עם `on` לאירועים כמו `tool.call` (לפני שכלי רץ), `prompt.submit`, `ui.render` ו-`command.run`.

כל handler, שבתיעוד נקרא hook, מקבל שלושה ארגומנטים:

- `$`: ה-API של ה-mods. כל מה שמחוץ לקוד של ה-mod עובר דרכו: לצייר, לרשום פקודה, לקרוא קובץ, להריץ תהליך, לקרוא למודל. בזכות זה Claude Code יכול להראות מה mod עושה לפני שהוא רץ.
- `e`: נתוני האירוע, למשל שם הכלי והפרמטרים. האובייקט קפוא, וכדי לשנות אותו מעבירים עותק.
- `next(e)`: מעביר את האירוע ל-mods הבאים ואחר כך ל-Claude Code, ומחזיר את התוצאה, כמו middleware ב-Express או ב-Koa.

ה-hooks רצים בכל מקום ש-Claude Code רץ בו, כולל `claude -p`, ה-Agent SDK והתוסף של VS Code. ציור מופיע רק בטרמינל ובלשונית Code של אפליקציית הדסקטופ.

### שלוש דרכים להגיב לאירוע

- **להסתכל**: לרשום משהו ולהחזיר `next(e)`.
- **לשכתב**: לקרוא ל-`next({ ...e, command: ... })` עם שדה אחד ששונה.
- **לענות לבד**: להחזיר תשובה בלי `next`, למשל `{ deny: 'reason' }` שחוסם קריאה לכלי. ההתנהגות הרגילה לא רצה בכלל.

## מתי mod ומתי משהו אחר

לפי ההשוואה שבתיעוד:

| | Mod | Hook בהגדרות | Skill | שרת MCP |
|---|---|---|---|---|
| מה זה | פונקציות בתוך Claude Code | פקודת shell, בקשת HTTP או prompt שרצים באירוע | קובץ `SKILL.md` עם הוראות | תהליך חיצוני שנותן ל-Claude כלים |
| מה אפשר לשנות | קריאות לכלים, prompts, פקודות, תורות ומה שמצויר | אם קריאה או prompt עוברים, הפרמטרים והתוצאה של כלי, הקשר נוסף | מה Claude יודע ועושה | אילו כלים יש ל-Claude |
| מצייר בממשק | כן | לא | לא | לא |
| כותבים ב- | JavaScript או TypeScript | סקריפט ושורה ב-`settings.json` | Markdown | כל שפה |

Mod שווה את זה ל-pane, לפס מעל ה-prompt, לפקודה שרצה בלי תור של Claude, או לשכתוב אירוע בדרך. אחרת מספיקים hook, skill או [MCP](he/posts/ai-mcp/).

## מאיפה זה הגיע

- **3 בספטמבר 2026**: ‏@poteat מצוות Claude Code הציע "function hooks" ב-[issue #91870](https://github.com/anthropics/claude-code/issues/91870).
- **9 בספטמבר**: הצוות החליט לשחרר בשם "Claude Mods". "function hook" נשאר השם הטכני. גישה מוקדמת נפתחה דרך משתנה סביבה.
- **1 באוקטובר**: הפיצ'ר עלה לאוויר.

Mods פעילים כברירת מחדל מגרסה 2.1.287 בטרמינל ו-2.1.286 בדסקטופ. גרסאות חדשות מתעלמות מ-`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`, גם עם `0`, אז אפשר למחוק אותו.

חלק מהפיצ'רים של Claude Code עצמו הם mods, ורואים אותם ב-`/plugin` תחת **Installed** ← **Built-in**: `cc-plugin-diff` (‏`/diff` וה-pane שלה), `cc-plugin-agents-md` (טוען את `AGENTS.md`), `cc-plugin-sec-default` (שומר על הגדרות, hooks וכללי הרשאות מנוהלים מפני mods של משתמשים) ועוד כמה. הקוד של חלקם, כולל טסטים, נמצא בתיקיית [`mods`](https://github.com/anthropics/claude-code/tree/main/mods) בריפו של Claude Code. ב-[`claude-code-playground`](https://github.com/anthropics/claude-code-playground/tree/main/claude-code/mods) יש דוגמאות כמו `blast-radius`, שעוצר פקודה מסוכנת כמו `rm -rf` ומראה מה היא הייתה משנה.

## שכבות וארגונים

Mods שמאזינים לאותו אירוע עוטפים זה את זה. כל אחד קורא ל-`next(e)` כדי להעביר את האירוע שכבה פנימה, והתוצאה חוזרת החוצה באותה דרך:

![אירוע tool.call עובר מבחוץ פנימה: mods השמירה של הארגון, ה-mods של המשתמש, ברירות המחדל של הארגון, ה-mods המובנים, ולבסוף Claude Code עצמו שמריץ את הכלי](/images/claude-code-mods/hook-layers.svg)

- **prepend**: ה-mods של הארגון ב-`prependPlugins`. עם הגדרות מנוהלות, או בתוכניות Team ו-Enterprise, יושב כאן גם `sec-default` המובנה.
- **user**: mods שהתקנתם או טענתם עם `--plugin-dir`.
- **append**: ברירות המחדל של הארגון, ב-`appendPlugins`.
- **builtin**: ה-mods שמגיעים עם Claude Code.

בהגדרות המנוהלות, `allowManagedModsOnly` מריץ hooks רק מ-mods של הארגון ומהמובנים, `disableSideloadFlags` חוסם את `--plugin-dir`, ו-`allowModsToOverrideDenyRules` קובע אם mod של משתמש יכול לאשר קריאה שכלל `deny` חוסם. ארגון יכול גם לכתוב mod מדיניות שמאזין ל-`plugin.register` ומסרב לטעון mods אחרים לפי מה שהם קוראים.

## אבטחה: mod רץ בהרשאות שלכם

Mod רץ בתור המשתמש שלכם, בלי sandbox. הוא יכול לקרוא ולכתוב את הקבצים שלכם, להריץ תהליכים, לשלוח בקשות רשת ולקרוא משתני סביבה והגדרות, כולל מפתחות API. הוא רואה כל prompt וכל קריאה לכלי, יכול לשכתב אותם, לשלוח prompt כאילו הקלדתם אותו, לאשר קריאה לכלי לפני שתישאלו ולצרוך טוקנים על חשבון התוכנית שלכם. ה-[sandbox](https://code.claude.com/docs/en/sandboxing) מבודד רק את פקודות ה-Bash של Claude, לא תהליכים שה-mod מפעיל.

הדבר היחיד שהתיעוד מבטיח הוא ש-mod לא יכול לשנות את חלון בקשת ההרשאה. לכן מתקינים mods רק ממקורות שסומכים עליהם, ומריצים עליהם קודם `claude plugin validate` (על הסיכונים הרחבים יותר: [אבטחת מערכות AI](he/posts/ai-security/)).

## להתקין, לכבות ולשתף

את הגרסה בודקים עם `claude --version`, או עם `/status` בדסקטופ. Mod מתקינים כמו כל plugin, בפורמט `<plugin>@<marketplace>`:

```bash
claude plugin install node-guard@my-mods
```

בתוך סשן: `/plugin install node-guard@my-mods`. אחרי התקנה מה-shell, `/reload-plugins` טוען את ה-mod בלי הפעלה מחדש.

כדי לכבות:

- **mod אחד**: מבטלים או מסירים אותו בלשונית **Installed** של `/plugin`.
- **כולם, לסשן אחד**: `--safe-mode`, שמכבה גם התאמות אחרות.
- **כל מה שהתקנתם, תמיד**: `"disableAllHooks": true` ב-`~/.claude/settings.json`, שעוצר גם את ה-hooks שבהגדרות ואת ה-status line המותאם.

אף אחת מהדרכים לא עוצרת את ה-mods המובנים. אותם מכבים אחד אחד ב-`/plugin`, חוץ מ-`sec-default`.

כדי לשתף, נותנים ל-mod גרסה ב-manifest כמו לכל plugin, ושולחים את התיקייה, מפרסמים ב-marketplace משלכם או מגישים לספרייה של Anthropic. שם שמתחיל ב-`claude-` נכשל ב-validate. כדאי לכתוב ב-README עם איזו גרסה של Claude Code בדקתם.
