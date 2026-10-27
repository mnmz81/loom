---
title: "WebMCP: דפי אינטרנט ככלים לסוכני AI"
summary: "מה זה WebMCP ומה הקשר שלו ל-MCP: דף רושם כלים עם document.modelContext, טופס הופך לכלי עם שתי תכונות, annotations, ‏iframes, ניסוי ב-Chrome, והסיכונים באבטחה."
date: 2026-10-13
tags: [ai, agents, mcp]
series: { key: ai-agents, order: 8 }
---

ב[פוסט על computer use](he/posts/ai-computer-use-skills/) סוכן מפעיל אתר מצילומי מסך: מנחש איזה פיקסל הוא "הוסף לעגלה", לוחץ, ומצלם שוב. זה איטי, יקר, ונשבר כשכפתור זז. **WebMCP** היא הצעה שבה הדף עצמו מפרסם מה הוא יודע לעשות, ככלים שהסוכן קורא להם.

העובדות כאן מבוססות על [טיוטת המפרט של WebMCP](https://webmachinelearning.github.io/webmcp/) ‏(Draft Community Group Report מ-9 באוקטובר 2026) ועל [התיעוד של Chrome ל-WebMCP](https://developer.chrome.com/docs/ai/webmcp). ‏WebMCP עדיין משתנה: הקוד לא הורץ בשביל הפוסט הזה, ושמות עוד עשויים להשתנות.

## מה זה, ומה זה לא

WebMCP הוא API של הדפדפן. דף רושם **כלים**, וסוכן שעובד בדפדפן מגלה אותם וקורא להם. הכלי רץ כ-JavaScript בתוך הדף הפתוח, עם הקוד של הדף והסשן של המשתמש, והמשתמש רואה את הדף משתנה.

המושגים הם אלה שב[פוסט על MCP](he/posts/ai-mcp/): כלים עם שם, תיאור שנכתב בשביל המודל, ‏JSON Schema לקלט. אבל WebMCP הוא לא הפרוטוקול MCP: אין JSON-RPC ואין תהליך של שרת. הכלים קיימים רק כל עוד הדף פתוח.

![משמאל: ב-MCP, מארח של סוכן מדבר ב-JSON-RPC עם תהליך נפרד של שרת MCP, שקורא ל-API שלכם עם הרשאות משלו. מימין: ב-WebMCP, דף אינטרנט בלשונית הדפדפן של המשתמש רושם כלים עם document.modelContext.registerTool, וסוכן בדפדפן קורא להם; ה-JavaScript רץ בדף עם הסשן של המשתמש.](/images/ai-webmcp/mcp-vs-webmcp.svg)

המצב שלו:

- **טיוטה** של W3C Web Machine Learning Community Group, עם עורכים מ-Microsoft ומ-Google. דוח של Community Group הוא לא תקן של W3C.
- ‏Chrome תומך בו ב-**origin trial** מגרסה 149 (דרך שבה אתרים מנסים יכולת חדשה ב-production לפני שהיא משוחררת). לבדיקות מקומיות מפעילים את `chrome://flags/#enable-webmcp-testing`.
- גרסאות מוקדמות השתמשו ב-`navigator.modelContext`. המפרט והתיעוד של Chrome משתמשים היום ב-`document.modelContext`.
- התיעוד של Chrome אומר שה-API "תוכנן בעיקר לתהליכי עבודה מקומיים בדפדפן, עם אדם בלולאה", ושסוכנים "חייבים לבקר באתר ישירות כדי לדעת אם יש בו כלים". אין רישום מרכזי של אתרים.

## ה-API האימפרטיבי: רישום כלי ב-JavaScript

אפליקציית משימות שמאפשרת לסוכן להוסיף פריטים:

```js
if ('modelContext' in document) {
  const controller = new AbortController();

  await document.modelContext.registerTool(
    {
      name: 'add_todo',
      description: "Add an item to the user's to-do list.",
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The to-do text' },
        },
        required: ['text'],
      },
      annotations: { readOnlyHint: false },
      async execute({ text }, { signal }) {
        const item = await addTodo(text, { signal });
        return { id: item.id, text: item.text };
      },
    },
    { signal: controller.signal },
  );

  // Later, when the tool should disappear:
  // controller.abort();
}
```

- ‏`'modelContext' in document` בודק תמיכה ב-WebMCP. בלעדיה הדף עובד כמו קודם.
- ‏`name`, ‏`description` ו-`execute` הם חובה. ‏`inputSchema` הוא JSON Schema, באותו פורמט כמו ב[כלים ו-function calling](he/posts/ai-tools-function-calling/).
- ‏`execute` מקבלת את הקלט כאובייקט, ועוד אובייקט אפשרויות שה-`signal` שלו מדווח על קריאה שבוטלה. העברת הקלט כמחרוזת JSON, כמו בגרסאות המוקדמות, מסומנת כ-deprecated מ-Chrome 155.
- מה ש-`execute` מחזירה עובר סריאליזציה למחרוזת JSON ונמסר לסוכן.
- אין `unregisterTool()`: מעבירים `AbortSignal` ברישום ומבטלים אותו.

אפליקציית עמוד יחיד רושמת ומסירה כלים כשהמשתמש עובר בין מסכים, וכך הסוכן רואה רק את מה שהגיוני במסך הנוכחי.

### Annotations

רמזים לסוכן ולדפדפן. המפרט מגדיר ארבעה, כולם `false` כברירת מחדל:

- ‏`readOnlyHint`: הכלי רק קורא.
- ‏`consequentialHint`: לכלי יש השלכות אמיתיות, כמו רכישה או מחיקה. המפרט מונה אותו כאמצעי הגנה שיכול להפעיל בקשת אישור מהמשתמש.
- ‏`untrustedContentHint`: התוצאה מכילה תוכן שהאתר לא שולט בו, כמו ביקורות או תגובות של משתמשים, ועלולה להכיל prompt injection.
- ‏`debugging`: כלי שמיועד לפיתוח.

## ה-API ההצהרתי: טופס הופך לכלי

‏[ה-API ההצהרתי של Chrome](https://developer.chrome.com/docs/ai/webmcp/declarative-api) הופך טופס לכלי עם שתי תכונות:

```html
<form toolname="search_flights"
      tooldescription="Search flights between two cities on a date."
      action="/search">
  <label for="from">From</label>
  <input id="from" name="from" required>

  <label for="to">To</label>
  <input id="to" name="to" required>

  <label for="date">Date</label>
  <input id="date" name="date" type="date" required>

  <button type="submit">Search</button>
</form>
```

ה-`name` של כל שדה הופך למאפיין בסכמת הקלט של הכלי. התיאור מגיע מ-`toolparamdescription` על השדה, או מה-`<label>` שלו, או מה-`aria-description` שלו. ‏`<select>` הופך ל-`enum` של האפשרויות שלו.

כשסוכן קורא לכלי, הדפדפן ממלא את הטופס מול העיניים של המשתמש, והמשתמש עדיין לוחץ על **Search**, אלא אם יש לטופס `toolautosubmit`. ה-pseudo-classes ‏`:tool-form-active` ו-`:tool-submit-active` ב-CSS מאפשרים לעצב טופס בזמן שסוכן ממלא אותו.

כדי להחזיר תוצאה לסוכן במקום לנווט, מטפלים באירוע ה-submit:

```js
const form = document.querySelector('form[toolname="search_flights"]');

form.addEventListener('submit', (event) => {
  if (!event.agentInvoked) return;
  event.preventDefault();
  event.respondWith(searchFlights(new FormData(form)));
});
```

‏`agentInvoked` הוא `true` כשסוכן שלח את הטופס. ‏`respondWith()` מקבלת promise, והערך שלו חוזר לסוכן כפלט של הכלי.

## מי קורא לכלים

הקורא העיקרי הוא **סוכן שמובנה בדפדפן** או תוסף לדפדפן. לבדיקות, התיעוד של Chrome מפנה לתוסף Model Context Tool Inspector, שמציג את הכלים של דף וקורא להם, ולתמיכה של DevTools בדיבאג שלהם. התוספים האלה נפרדים מ-Gemini in Chrome.

דף יכול גם להריץ **סוכן בתוך הדף**: ‏`document.modelContext.getTools()` מחזירה את הכלים הרשומים, ו-`executeTool()` קוראת לאחד מהם.

**iframes** נעולים כברירת מחדל. שני ה-APIs נשלטים על ידי Permissions Policy בשם `tools`, שברירת המחדל שלו היא `self`: ‏iframe ממקור אחר לא יכול לרשום כלים, אלא אם הדף המכיל מתיר את זה עם `<iframe allow="tools">`. ברישום, האפשרות `exposedTo` מפרטת אילו מקורות אחרים בדף רשאים לראות כלי.

## אבטחה

WebMCP פותח לסוכן פעולות בתוך סשן מחובר. המפרט מונה שלושה סיכונים:

- **Prompt injection.** תוצאות של כלים, ואפילו תיאורים של כלים, יכולים להכיל הוראות שמכוונות את הסוכן. כלי שמחזיר ביקורות של משתמשים מחזיר כל מה שתוקף כתב בביקורת. מסמנים כלים כאלה עם `untrustedContentHint`.
- **הצגה מטעה של הכוונה.** המפרט אומר במפורש: "אין שום הבטחה שהכוונה המוצהרת של כלי WebMCP תואמת את ההתנהגות שלו בפועל". כלי בשם `finalizeCart` עלול בפועל לבצע הזמנה.
- **דליפת פרטיות.** כלי שמבקש יותר פרמטרים ממה שהוא צריך יכול לגרום לסוכן למסור פרטים אישיים, כמו גיל או מיקום.

לבוני אתרים תקפים אותם הרגלים כמו בכל API:

- בודקים כל קלט ב-`execute` ובשרת. סוכן הוא עוד לקוח, והקלט יכול להיות כל דבר.
- חושפים רק מה שהמשתמש יכול לעשות בממשק בכל מקרה, עם אותן בדיקות הרשאה.
- מסמנים כלים שקונים, שולחים או מוחקים עם `consequentialHint`, ומשאירים להם שלב אישור.
- מחזירים תוצאות קטנות ומובנות, לא עמודים שלמים של תוכן משתמשים.

למשתמשים, הכלל מ[הפוסט על אבטחה](he/posts/ai-security/) נשאר: סוכן שפועל בדפדפן שלכם יכול לעשות כל מה שאתם יכולים. עוקבים אחרי מה שהוא עושה באתרים שחשובים לכם.

## להשתמש בזה כבר עכשיו?

WebMCP בשלב מוקדם, והאימוץ קטן. כמה קריאות `registerTool()` מאחורי בדיקת תמיכה, או `toolname` ו-`tooldescription` על טופס קיים, עולות מעט ולא משנות כלום למבקרים רגילים. לא כדאי לבנות מוצר על זה לפני שזה ישוחרר ביותר מדפדפן אחד.

הפוסט הבא סוגר את הסדרה עם ה-[harness](he/posts/ai-agent-harness/): כל מה שמסביב למודל ואפשר לשפר בלי לגעת במודל.
