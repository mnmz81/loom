---
title: "Cloudflare מאפס לגיבור: מסד נתונים ב-D1 וקבצים ב-R2"
summary: "מתי KV, מתי D1 ומתי R2, טבלת SQL ב-D1 עם schema ושאילתות מוגנות, העלאה והורדה של קבצים מ-R2, והכל מקומית לפני שנוגעים בענן."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 31 }
---

ה-API שנבנה כאן שומר פתקים במסד נתונים וקבצים באחסון, ורץ כולו מקומית. כל הדוגמאות הורצו עם Wrangler 4.152.

## איזה אחסון למה

| | KV | D1 | R2 |
|---|---|---|---|
| מה נשמר | מפתח וערך | טבלאות SQL | קבצים (objects) |
| מתאים ל | הגדרות, sessions, cache | משתמשים, הזמנות, כל מה שיש בו קשרים ושאילתות | תמונות, וידאו, גיבויים, קבצים גדולים |
| עקביות | eventual: כתיבה מגיעה לכל העולם תוך זמן מה | מסד SQLite אחד, עם העתקי קריאה כאופציה | חזקה, לכל קובץ |
| לזכור | כתיבה אחת בשנייה לאותו מפתח | עד 10GB למסד | אין עלות egress |

הכלל: צריך לחפש, לסנן או לחבר טבלאות? D1. קובץ? R2. ערך שנקרא הרבה ונכתב מעט? KV ([השוואה בתיעוד](https://developers.cloudflare.com/workers/platform/storage-options/)).

## הגדרות

```jsonc
{
  "name": "notes-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-24",
  "d1_databases": [
    { "binding": "DB", "database_name": "notes-db", "database_id": "local-only" }
  ],
  "r2_buckets": [
    { "binding": "FILES", "bucket_name": "notes-files" }
  ]
}
```

כמו ב-KV בפוסט הקודם, מקומית ה-`database_id` יכול להיות כל מחרוזת.

## D1: טבלה ושאילתות

ה-schema נכתב ב-SQL רגיל, בקובץ `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);
```

```bash
npx wrangler d1 execute notes-db --local --file=./schema.sql
```

`--local` מריץ על עותק מקומי ב-`.wrangler/state`. אותה פקודה עם `--remote` מריצה על המסד בענן. הקטעים הבאים נכנסים לתוך `fetch` מ[הפוסט על ה-Worker הראשון](he/posts/cloudflare-zero-to-hero-first-worker/), שמקבלת עכשיו גם `env` כפרמטר שני. `env.DB.prepare` מכין שאילתה ו-`bind` ממלא את סימני השאלה:

```typescript
if (url.pathname === "/notes" && request.method === "POST") {
  const { text } = await request.json<{ text: string }>();
  await env.DB.prepare("INSERT INTO notes (text) VALUES (?)").bind(text).run();
  return new Response("saved", { status: 201 });
}
if (url.pathname === "/notes") {
  const { results } = await env.DB.prepare("SELECT id, text FROM notes").run();
  return Response.json(results);
}
```

אף פעם לא מדביקים קלט של משתמש לתוך מחרוזת ה-SQL. `bind` מעביר את הערך בנפרד מהשאילתה, וכך חוסם SQL injection.

## R2: קבצים

```typescript
const key = url.pathname.slice(1);
if (url.pathname.startsWith("/files/") && request.method === "PUT") {
  await env.FILES.put(key, request.body);
  return new Response(`stored ${key}`, { status: 201 });
}
if (url.pathname.startsWith("/files/")) {
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body);
}
```

`put` מקבל את גוף הבקשה כ-stream, כך שגם קובץ גדול לא נטען כולו לזיכרון. `get` מחזיר `null` כשאין קובץ במפתח הזה.

## מריצים

מפעילים `npx wrangler dev`, ובטרמינל שני:

```bash
echo hello > hi.txt
curl -X POST localhost:8787/notes -d '{"text":"buy milk"}'
curl localhost:8787/notes
curl -X PUT --data-binary @hi.txt localhost:8787/files/hi.txt
curl localhost:8787/files/hi.txt
```

```text
saved
[{"id":1,"text":"buy milk"}]
stored files/hi.txt
hello
```

הנתונים נשארים ב-`.wrangler/state` גם אחרי שעוצרים את `wrangler dev`, ואפשר לבדוק אותם ישירות:

```bash
npx wrangler d1 execute notes-db --local --command="SELECT * FROM notes"
```

## לענן

```bash
npx wrangler d1 create notes-db
npx wrangler r2 bucket create notes-files
npx wrangler d1 execute notes-db --remote --file=./schema.sql
npx wrangler deploy
```

`d1 create` מדפיס `database_id` אמיתי. מחליפים בו את `local-only` לפני ה-`deploy`. ב-R2 אין מזהה כזה: השם ב-`bucket_name` מספיק.
