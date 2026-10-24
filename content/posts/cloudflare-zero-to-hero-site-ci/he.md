---
title: "Cloudflare מאפס לגיבור: אתר סטטי, דומיין משלכם ופריסה מ-GitHub"
summary: "להגיש אתר סטטי מ-Worker עם static assets, עמוד 404 ו-SPA, לחבר דומיין משלכם עם custom_domain, ולפרוס אוטומטית בכל push עם GitHub Actions ו-wrangler-action."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 32 }
---

אתר סטטי הוא תיקייה של קבצי HTML, CSS ו-JS מוכנים, כמו הפלט של `npm run build` ב-Angular, React או Astro. Worker יכול להגיש אותו ישירות מהרשת של Cloudflare, בלי שורת קוד. כל הדוגמאות המקומיות הורצו עם Wrangler 4.152.

## אתר סטטי

```text
my-site/
├── wrangler.jsonc
└── public/
    ├── index.html
    ├── 404.html
    └── style.css
```

```jsonc
{
  "name": "my-site",
  "compatibility_date": "2026-10-24",
  "assets": {
    "directory": "./public",
    "not_found_handling": "404-page"
  }
}
```

אין כאן `main`: בלי קוד, Wrangler מגיש את הקבצים שב-`directory` כמו שהם. `npx wrangler dev` מראה את זה מקומית:

```text
GET /           → 200, index.html
GET /style.css  → 200, Content-Type: text/css; charset=utf-8
GET /missing    → 404, 404.html
```

ב-`not_found_handling` יש שתי אפשרויות שימושיות:

- `404-page`: נתיב שלא קיים מקבל את `404.html`.
- `single-page-application`: נתיב שלא קיים מקבל את `index.html` עם 200, ואז ה-router של האפליקציה בצד הלקוח מטפל בו.

צריך גם API? מוסיפים `main` עם Worker כמו בפוסטים הקודמים. הקבצים הסטטיים מוגשים קודם, וה-Worker מקבל רק בקשות שלא תאמו לקובץ ([התיעוד](https://developers.cloudflare.com/workers/static-assets/)).

## דומיין משלכם

אם הדומיין כבר ב-Cloudflare ([פוסט 2](he/posts/cloudflare-zero-to-hero-dns-ssl/)), מוסיפים ל-`wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "www.example.com", "custom_domain": true }
]
```

ב-`deploy` הבא Cloudflare יוצר בעצמו את רשומת ה-DNS ואת תעודת ה-HTTPS. אסור שתהיה כבר רשומת `CNAME` על אותו שם: מוחקים אותה קודם ([התיעוד](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).

## פריסה אוטומטית מ-GitHub

עד עכשיו פרסנו מהמחשב. ב-CI אין דפדפן להתחבר בו, ולכן GitHub Actions צריך API token ([פוסט 1](he/posts/cloudflare-zero-to-hero/)) ואת מזהה החשבון:

1. **My Profile ← API Tokens ← Create Token**, בוחרים את התבנית **Edit Cloudflare Workers** ומגבילים אותה לחשבון שלכם.
2. את ה-Account ID מדפיס `npx wrangler whoami`, והוא מופיע גם בלוח הבקרה.
3. שומרים את שניהם כ-secrets של המאגר:

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

`gh` שואל את הערך בלי להציג אותו. לא שומרים את ה-token בקוד או בקובץ במאגר. איך secrets עובדים ב-Actions מוסבר ב[פוסט על secrets ופריסה](he/posts/github-actions-zero-to-hero-secrets-deploy/).

עכשיו workflow ב-`.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v7
      - uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`wrangler-action` מתקין את Wrangler ומריץ `wrangler deploy` כברירת מחדל ([התיעוד](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)). אתר שצריך build מקבל לפני כן צעדים של `actions/setup-node`, `npm ci` ו-`npm run build`. מעכשיו כל push ל-`main` מעלה גרסה חדשה, ואם משהו נשבר, `wrangler rollback` מ[פוסט 4](he/posts/cloudflare-wrangler/) מחזיר את הקודמת.
