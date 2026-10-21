---
title: "Angular וכלי AI: שרת MCP, קבצי הנחיות, Agent Skills ו-WebMCP"
summary: "מה Angular מספק לעבודה עם סוכני קוד: שרת ה-MCP של ה-CLI (ng mcp), ‏ng generate ai-config, ‏llms.txt והנחיות, Agent Skills ו-WebMCP הניסיוני, עם הרצה אמיתית ותווית היציבות של כל חלק."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 83 }
---

סוכן קוד שלא יודע באיזו גרסה של Angular אתם עובדים עלול לכתוב קוד בסגנון ישן, כמו `*ngIf` ו-`@Input()`. ‏Angular מפרסם כמה דברים שנועדו לתקן את זה, וגם דרך לחשוף את האפליקציה עצמה לסוכנים. כל חלק מסומן כאן לפי מה שכתוב עליו ב-[angular.dev/ai](https://angular.dev/ai).

כל דוגמה נבדקה עם Angular CLI 22.2 ו-Angular 22.2. לא נבדקה עבודה מול סוכן או דפדפן אמיתיים: שרת ה-MCP נבדק בשיחה ישירה איתו, ו-WebMCP נבדק מול מימוש מדומה של הדפדפן.

## שרת MCP של ה-CLI

‏[Model Context Protocol](https://modelcontextprotocol.io) הוא פרוטוקול שמאפשר לסוכן לקרוא לכלים של תוכנה אחרת. ה-CLI של Angular מגיע עם שרת כזה. לפי [התיעוד](https://angular.dev/ai/mcp) מגדירים אותו בקובץ ההגדרות של הכלי, למשל `.vscode/mcp.json` ב-VS Code (שם המפתח `servers`) או `.cursor/mcp.json` ב-Cursor (שם המפתח `mcpServers`):

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

בתוך workspace אפשר גם `ng mcp` ישירות. הפקודה מדברת MCP על stdin ו-stdout, אז בטרמינל היא לא מדפיסה כלום. כדי לראות מה היא מציעה שלחתי לה את הודעות ה-handshake של הפרוטוקול וביקשתי רשימת כלים:

```text
ai_tutor
get_best_practices
search_documentation
list_projects
onpush_zoneless_migration
run_target
devserver_start
devserver_stop
devserver_wait_for_build
```

ביניהם: ‏`get_best_practices` מחזיר את מדריך השיטות המומלצות, ‏`run_target` מריץ build או בדיקות, ו-`onpush_zoneless_migration` מציע תוכנית מעבר ל-[OnPush](he/posts/angular-onpush/) ול-[zoneless](he/posts/angular-zoneless-migration/).

שני דגלים מצמצמים את הרשימה. ‏`--read-only` רושם רק כלים שלא משנים את הפרויקט (הרשימה ירדה ל-6: נעלמו `run_target`, ‏`devserver_start` ו-`devserver_stop`), ו-`--local-only` רושם רק כלים שלא צריכים אינטרנט (נעלם `search_documentation`). מוסיפים אותם ל-`args`, למשל `["-y", "@angular/cli", "mcp", "--read-only"]`.

בעמוד המדריך לשימוש ב-AI כתוב על השרת "experimental", ובעמוד ההגדרה שלו אין תווית יציבות. לכן כדאי להתייחס אליו כאל משהו שעשוי להשתנות, ולהתחיל עם `--read-only`.

## קבצי הנחיות לכלי ה-AI

סוכן שקורא קובץ הנחיות בפרויקט מקבל את השיטות המומלצות בלי שמבקשים. ‏CLI יוצר אותו בשבילכם:

```bash
ng generate ai-config --tool=claude-code
```

```text
CREATE CLAUDE.md (2970 bytes)
CREATE .mcp.json (121 bytes)
```

‏`ng new` מקבל את אותה בחירה בדגל `--ai-config`. הערכים האפשריים לפי `--help`: ‏`claude-code`, ‏`cursor`, ‏`gemini-cli`, ‏`open-ai-codex`, ‏`vscode` ו-`none`. הפקודה כתבה גם את הגדרת ה-MCP מהסעיף הקודם, ותוכן `CLAUDE.md` פותח כך:

```text
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
```

אותו תוכן זמין גם כקבצים ציבוריים, שאפשר להוריד ולהדביק לכלי שלא ברשימה. לפי [העמוד על פיתוח עם AI](https://angular.dev/ai/develop-with-ai):

- ‏[`llms.txt`](https://angular.dev/llms.txt): אינדקס של קישורים למשאבים מרכזיים, בפורמט שהאתר מגדיר כ"proposed standard".
- ‏[`llms-full.txt`](https://angular.dev/assets/context/llms-full.txt): אוסף מלא יותר שמתאר איך Angular עובד. בבדיקה הוא שוקל כ-850KB, ולכן הוא מיועד לכלים עם חלון הקשר גדול.
- ‏[`best-practices.md`](https://angular.dev/assets/context/best-practices.md): ההנחיות עצמן, קצרות. מוסיפים אותן כ-system instructions או כהקשר לפרומפט.

הקובץ שנוצר הוא עותק: אחרי שדרוג Angular יוצרים אותו מחדש.

## ‏Agent Skills

‏Agent Skills הן חבילות הוראות שסוכן טוען רק כשהמשימה דורשת אותן. לפי [התיעוד](https://angular.dev/ai/agent-skills) הן נמצאות ב-[github.com/angular/skills](https://github.com/angular/skills) ומותקנות כך:

```bash
npx skills add https://github.com/angular/skills
```

יש שתיים: ‏`angular-developer` לכתיבת קוד והכוונה ארכיטקטונית (קומפוננטות, שירותים, signals, טפסים, ניווט, SSR, נגישות ובדיקות), ו-`angular-new-app` ליצירת אפליקציה חדשה עם ה-CLI. לא הרצתי אותן, כי הן נטענות על ידי הסוכן ולא על ידי Angular. בתפריט הניווט של האתר הן מסומנות "New", ובעמוד עצמו אין תווית יציבות.

## ‏WebMCP: האפליקציה כמקור כלים

הסעיפים הקודמים עוזרים לסוכן לכתוב את האפליקציה. ‏[WebMCP](https://angular.dev/ai/webmcp) הוא הכיוון ההפוך: האפליקציה שרצה בדפדפן מציגה לסוכן כלים. לפי התיעוד זה תקן מוצע, ו-Angular מוסיף לו תמיכה ניסיונית שבה כלי חי כל עוד ה-injector שרשם אותו חי. התיעוד קובע במפורש ש"APIs are subject to change even outside of major versions".

```typescript
import { ApplicationConfig, inject, provideExperimentalWebMcpTools } from '@angular/core';
import { Todos } from './todos';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalWebMcpTools([
      {
        name: 'add_todo',
        description: 'Adds an item to the todo list shown on the page.',
        inputSchema: {
          type: 'object',
          properties: { title: { type: 'string', description: 'The item text' } },
          required: ['title'],
        },
        execute: ({ title }) => {
          const todos = inject(Todos);
          if (!title.trim()) return 'Rejected: empty title';
          todos.items.update((items) => [...items, title]);
          return `Added: ${title}`;
        },
      },
    ]),
  ],
};
```

‏(`Todos` הוא [`@Service()`](he/posts/angular-service-decorator/) עם signal של רשימה.) ל-`execute` יש גישה ל-`inject`, וה-`title` מקבל טיפוס `string` מתוך הסכמה. בדיקת Vitest הגדירה `navigator.modelContext` מדומה עם `registerTool`, ואת התוצאה הדפיסה:

```text
registered: [ 'add_todo' ]
Added: Buy milk
Rejected: empty title
```

כלומר הרישום קורה בהפעלת האפליקציה, והכלי רץ בהקשר ההזרקה. מה שלא נבדק: דפדפן שבו `navigator.modelContext` קיים, וסוכן שקורא לכלי. לפי הקוד של Angular, אם הדפדפן לא מספק `modelContext`, הרישום פשוט מדלג.

שלוש אזהרות מהתיעוד: Angular לא מאמת שהקלט תואם לסכמה, ולכן בודקים ב-`execute` (כמו שהכלי למעלה בודק כותרת ריקה); שם כלי חייב להיות ייחודי, ורישום כפול זורק שגיאה; וכלי שנרשם ב-route נשאר זמין אחרי שעוזבים אותו, אלא אם משתמשים ב-`withAutoCleanupInjectors` של הראוטר.

## טעויות נפוצות של מתחילים

- **להפעיל את שרת ה-MCP בלי `--read-only` על פרויקט שלא שמור ב-git.** כלים כמו `run_target` מריצים פקודות בפרויקט.
- **להסתמך על קובץ ההנחיות בלי לבדוק את הקוד.** הוא מקטין טעויות בגרסה, לא מבטל אותן.

## מה הלאה

זה הפוסט האחרון בסדרה. עמוד הסדרה [Angular מההתחלה ועד מומחה](he/series/angular/) מרכז את כל הפוסטים, ואפשר לחזור אליו לפי מה שהאפליקציה שלכם צריכה.
