---
title: "Cloudflare מאפס לגיבור: ה-Worker הראשון"
summary: "מה זה Worker ולמה אין שרת לנהל, ליצור פרויקט עם C3, פונקציית fetch שמחזירה טקסט ו-JSON לפי נתיב, להריץ מקומית עם wrangler dev, ולפרוס ל-workers.dev."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 29 }
---

**Worker** הוא פונקציה שרצה ברשת של Cloudflare בכל פעם שמגיעה בקשה. אין שרת להתקין, לעדכן או להגדיל: Cloudflare מריץ את הקוד במרכז הנתונים הקרוב לגולש, ומחייב (אם בכלל) לפי בקשות. כל הדוגמאות הורצו עם Wrangler 4.152 ו-Node.js 24.

## יוצרים פרויקט

```bash
npm create cloudflare@latest -- first-worker
```

C3, האשף של Cloudflare, שואל כמה שאלות. לפוסט הזה בוחרים **Hello World example**, אחר כך **Worker only** ו-**TypeScript**. הוא יוצר:

| קובץ | תפקיד |
|---|---|
| `src/index.ts` | הקוד של ה-Worker |
| `wrangler.jsonc` | שם ה-Worker, קובץ הכניסה ותאריך התאימות |
| `package.json` | Wrangler כתלות, וסקריפטים `dev` ו-`deploy` |
| `test/` | בדיקות עם Vitest |

## הקוד

כל Worker מייצא אובייקט עם פונקציה `fetch`. היא מקבלת `Request` ומחזירה `Response`, אותם אובייקטים של ה-Fetch API שמכירים מהדפדפן. מחליפים את התוכן של `src/index.ts`:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Hello from the edge!");
    }
    if (url.pathname === "/api/time") {
      return Response.json({ now: new Date().toISOString(), method: request.method });
    }
    return new Response("Not found", { status: 404 });
  },
};
```

`new URL(request.url)` מפרק את הכתובת, ו-`pathname` הוא החלק שאחרי הדומיין. `Response.json` הופך אובייקט ל-JSON ומוסיף את הכותרת `Content-Type: application/json`. בלי `status`, התשובה היא 200.

## מריצים מקומית

```bash
cd first-worker
npx wrangler dev
```

Wrangler מריץ את ה-Worker על המחשב, באותה סביבת ריצה (workerd) ש-Cloudflare משתמשים בה, ומאזין ב-`http://localhost:8787`. כל שמירה של הקובץ טוענת אותו מחדש. בטרמינל אחר:

```bash
curl localhost:8787/
curl localhost:8787/api/time
curl -i localhost:8787/nope
```

```text
Hello from the edge!
{"now":"2026-10-24T07:50:52.916Z","method":"GET"}
HTTP/1.1 404 Not Found
```

`wrangler dev` לא צריך חשבון. עוצרים אותו עם `x` או `Ctrl+C`.

## עולים לאוויר

```bash
npx wrangler deploy
```

בפעם הראשונה Wrangler פותח דפדפן כדי להתחבר לחשבון Cloudflare ולאשר לו גישה. אם עוד אין לכם תת-דומיין ב-`workers.dev`, הוא מציע ליצור אחד. בסוף הוא מדפיס את הכתובת הציבורית:

```text
https://first-worker.<subdomain>.workers.dev
```

הכתובת עובדת מיד, עם HTTPS, מכל העולם. ה-Worker מופיע גם בלוח הבקרה תחת **Workers & Pages**, עם לוגים וגרפים של בקשות. כל `deploy` נוסף מחליף את הגרסה הקודמת תוך שניות.

בפוסט הבא: איך Wrangler מחזיק הגדרות, משתנים, סודות ואחסון KV, ואיך חוזרים לגרסה קודמת כשמשהו נשבר.
