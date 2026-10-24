---
title: "Cloudflare מאפס לגיבור: Wrangler, משתנים, סודות ו-KV"
summary: "wrangler.jsonc, פיתוח מקומי עם KV וסודות ב-.dev.vars, טיפוסים עם wrangler types, ופריסה, לוגים חיים ו-rollback עם Wrangler 4."
date: 2026-10-24
tags: [cloudflare, cloud, cli]
series: { key: devops, order: 30 }
---

[Wrangler](https://developers.cloudflare.com/workers/wrangler/) הוא ה-CLI שכבר הריץ ופרס את [ה-Worker הראשון](he/posts/cloudflare-zero-to-hero-first-worker/). הוא גם יוצר משאבים כמו KV, מנהל סודות וחוזר לגרסאות קודמות. C3 מתקין אותו כתלות של הפרויקט, ולא גלובלית, ולכן מריצים `npx wrangler`. כל הדוגמאות המקומיות הורצו עם Wrangler 4.152.

## wrangler.jsonc

```jsonc
{
  "name": "hello-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-24",
  "vars": { "GREETING": "Hello" },
  "kv_namespaces": [{ "binding": "VISITS", "id": "local-only" }]
}
```

`compatibility_date` נועל את התנהגות סביבת הריצה לתאריך מסוים, כך ששינויים של Cloudflare לא שוברים Worker קיים. `vars` הם משתנים רגילים. **binding** מחבר את ה-Worker למשאב של Cloudflare, כאן namespace של KV: אחסון מפתח-ערך, מעין מילון גלובלי שמהיר מאוד לקריאה. כל binding, כמו `VISITS`, מגיע לקוד דרך `env`. בפיתוח מקומי ה-`id` של KV יכול להיות כל מחרוזת; את האמיתי יוצרים לפני הפריסה:

```typescript
export default {
  async fetch(request, env): Promise<Response> {
    const count = Number((await env.VISITS.get("count")) ?? 0) + 1;
    await env.VISITS.put("count", String(count));
    return new Response(`${env.GREETING}! visit #${count}, token set: ${Boolean(env.API_TOKEN)}`);
  },
} satisfies ExportedHandler<Env>;
```

Cloudflare ממליצים על `wrangler.jsonc` בפרויקטים חדשים. `wrangler.toml` עדיין נתמך, באותו מבנה ([תיעוד ההגדרות](https://developers.cloudflare.com/workers/wrangler/configuration/)).

## פיתוח מקומי

סודות לפיתוח נכנסים ל-`.dev.vars` ליד קובץ ההגדרות, בפורמט dotenv:

```bash
echo 'API_TOKEN="dev-only-value"' > .dev.vars
npx wrangler dev
```

```text
Using secrets defined in .dev.vars
Your Worker has access to the following bindings:
Binding                         Resource                  Mode
env.VISITS (local-only)         KV Namespace              local
env.GREETING ("Hello")          Environment Variable      local
env.API_TOKEN ("(hidden)")      Environment Variable      local
[wrangler:info] Ready on http://localhost:8787
```

שתי בקשות ל-`localhost:8787` מחזירות `visit #1` ואז `visit #2`: ה-KV המקומי שומר מצב בין בקשות, ולא נוגע בנתונים בענן. `--remote` מריץ את ה-Worker על Cloudflare עם המשאבים האמיתיים.

הוסיפו `.dev.vars*` ו-`.env*` ל-`.gitignore`, ואל תשימו סודות ב-`vars`: הם נכנסים לקובץ ההגדרות שב-Git.

## טיפוסים

```bash
npx wrangler types
```

הפקודה קוראת את ההגדרות ו-`.dev.vars` וכותבת `worker-configuration.d.ts` עם ממשק `Env`:

```typescript
interface __BaseEnv_Env {
	VISITS: KVNamespace;
	GREETING: "Hello";
	API_TOKEN: string;
}
```

מריצים אותה מחדש אחרי כל שינוי ב-`wrangler.jsonc`. ב-CI, `wrangler types --check` נכשל אם הקובץ לא מעודכן.

## משאבים, סודות ופריסה

```bash
npx wrangler login
npx wrangler kv namespace create VISITS
npx wrangler secret put API_TOKEN
npx wrangler deploy
```

- `login` פותח דפדפן לאישור החשבון; `wrangler whoami` מראה לאיזה חשבון אתם מחוברים.
- `kv namespace create` יוצר namespace בענן ומדפיס את ה-`id` שלו. מחליפים בו את `local-only` ב-`wrangler.jsonc`.
- `secret put` שואל את הערך בלי להציג אותו, ויוצר גרסה חדשה של ה-Worker שנפרסת מיד.
- `deploy` מעלה את ה-Worker לכתובת `<name>.<subdomain>.workers.dev`. `deploy --dry-run` בונה ומציג גודל ו-bindings בלי להעלות.

לסביבת staging מגדירים בלוק `env.staging` בקובץ ופורסים עם `--env staging`. bindings לא עוברים בירושה בין סביבות, אז מגדירים אותם מחדש בכל אחת.

## לוגים, גרסאות ו-rollback

```bash
npx wrangler tail --status error
npx wrangler versions list
npx wrangler rollback
```

`tail` מזרים את הלוגים של ה-Worker בזמן אמת, כאן רק בקשות שנכשלו. `versions list` מציג את עשר הגרסאות האחרונות. `rollback` בלי מזהה חוזר לגרסה שלפני האחרונה, ומשפיע מיד על כל הנתיבים והדומיינים. לפריסה הדרגתית יש `wrangler versions upload` ואז `wrangler versions deploy` עם אחוזי תעבורה לכל גרסה ([רשימת הפקודות](https://developers.cloudflare.com/workers/wrangler/commands/workers/)).
