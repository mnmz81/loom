---
title: "Nx עם Angular: monorepo, ‏nx affected וגבולות בין ספריות"
summary: "יצירת workspace של Nx עם אפליקציית Angular וספריות, ‏apps מול libs, ‏nx affected שמריץ רק מה שהשתנה, מטמון ה-build, וכלל lint שאוכף גבולות בין ספריות עם tags."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 78 }
---

כשכמה אפליקציות וספריות חיות באותו repo, שלוש בעיות מופיעות: איך לבנות רק מה שהשתנה, איך לא לבנות פעמיים את אותו קוד, ואיך למנוע מ-feature אחד לייבא מהקצה של feature אחר. [Nx](https://nx.dev) הוא כלי build ל-monorepo שפותר אותן, והוא עובד מעל Angular CLI ולא במקומו.

כל דוגמה נבדקה עם create-nx-workspace 23.3.0. ה-workspace שנוצר התקין Nx 23.2.0 ו-Angular 22.1.

## יצירת workspace

```bash
npx create-nx-workspace@latest shop --preset=angular-monorepo --appName=store \
  --bundler=esbuild --unitTestRunner=vitest --linter=eslint --nxCloud=skip --interactive=false
```

בגרסה הזו ה-preset `angular-monorepo` מתורגם לתבנית `nrwl/angular-template`, ששומרת על workspace מלא ולא על שלד ריק: אפליקציית Angular (`shop`) עם e2e, אפליקציית API (`api`) וכמה ספריות. הפרמטרים משתנים בין גרסאות, ולכן כדאי לבדוק עם `npx create-nx-workspace@latest --help`. התיעוד הרשמי: [nx.dev](https://nx.dev/getting-started/intro).

## אפליקציות וספריות

```text
apps/
  shop/              app (Angular)
  api/               app (Node)
  shop-e2e/          e2e
packages/
  shop/
    data/            lib
    feature-products/        lib
    feature-product-detail/  lib
    shared-ui/       lib
  shared/models/     lib
  api/products/      lib
```

- **אפליקציה** היא מה שנבנה ומורץ. היא צריכה להיות דקה: ניתוב ושילוב.
- **ספרייה** היא קוד עם `index.ts` שמגדיר מה מיוצא. ספריות מיובאות בכינוי מ-`tsconfig.base.json`, למשל `@org/shop/data`.

מי תלוי במי, כפי ש-`nx graph` מחשב מה-imports:

```text
shop -> feature-products, feature-product-detail
feature-products -> data, models, shared-ui
feature-product-detail -> data, models, shared-ui
shared-ui -> models
data -> models
api -> products, models
```

## ‏nx affected

מוסיפים שורה לקובץ `index.ts` של `data` ושואלים מי מושפע:

```bash
nx show projects --affected
```

```text
["data","feature-product-detail","shop","shop-e2e","feature-products"]
```

‏`shared-ui`, ‏`models`, ‏`api` ו-`products` לא ברשימה. לפי [התיעוד](https://nx.dev/docs/features/ci-features/affected), ‏Nx שואל את git אילו קבצים השתנו, ממפה כל קובץ לפרויקט שלו דרך גרף הפרויקטים, ומוסיף כל פרויקט שתלוי בו. ברירת המחדל היא להשוות את `main` לעץ העבודה, וב-CI קובעים `--base` ו-`--head` במפורש (כאן הושוו השינויים ל-`HEAD`):

```bash
nx affected -t build --base=HEAD
```

```text
 NX   Running target build for project shop:
✔  nx run shop:build:production
 NX   Successfully ran target build for project shop
```

רק ל-`shop` יש יעד `build` (הספריות כאן לא נבנות לבד, האפליקציה מקמפלת אותן), ולכן זה כל מה שרץ.

## מטמון

בניית `shop` בפעם הראשונה לקחה 6.5 שניות. אחרי שהחזרתי את הקבצים למצב שכבר נבנה, אותה פקודה לא בנתה כלום:

```text
> nx run shop:build:production  [local cache]
 NX   Successfully ran target build for project shop
Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
  Cache:             1/1 hit (100%)
```

‏Nx מחשב מפתח מהקבצים של הפרויקט ושל התלויות שלו, ואם כבר הריץ את אותה משימה עם אותו קלט, הוא משחזר את התוצאה מהמטמון.

## גבולות עם tags

לכל פרויקט יש `tags` ב-`project.json`:

```json
{
  "name": "feature-products",
  "tags": ["scope:shop", "type:feature"]
}
```

וב-`eslint.config.mjs` של ה-workspace, הכלל `@nx/enforce-module-boundaries` מגדיר מי רשאי לייבא ממי:

```javascript
{
  sourceTag: 'scope:shop',
  onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared'],
},
```

אם `feature-products` מייבאת מספרייה של ה-API (`import '@org/api/products'`), `nx lint feature-products` נכשל:

```text
feature-products/src/lib/feature-products.routes.ts
  1:1  error  A project tagged with "scope:shop" can only depend on libs tagged with "scope:shop", "scope:shared"  @nx/enforce-module-boundaries
```

אחרי הסרת השורה, אותה פקודה עוברת. ‏[לפי התיעוד](https://nx.dev/docs/features/enforce-module-boundaries), פרויקט בלי tags לא יכול לתלות בפרויקט אחר אלא אם מתירים הכול עם `"*"`. כך הארכיטקטורה שמתוארת ב[פוסט הקודם](he/posts/angular-architecture/) נאכפת בכלי ולא רק בהסכמה.

## יצירת ספרייה חדשה

```bash
nx g @nx/angular:library packages/shop/cart --name=cart --tags=scope:shop,type:feature \
  --unitTestRunner=vitest-analog --dry-run
```

```text
CREATE packages/shop/cart/project.json
CREATE packages/shop/cart/src/index.ts
CREATE packages/shop/cart/src/lib/cart/cart.ts
CREATE packages/shop/cart/src/lib/cart/cart.html
UPDATE tsconfig.base.json
```

(מקוצר.) ‏`--dry-run` מראה מה ייווצר בלי לכתוב. ה-generator מוסיף גם כינוי ל-`tsconfig.base.json`, כך שהספרייה זמינה לייבוא מיד.

## טעויות נפוצות של מתחילים

- **להשאיר פרויקטים בלי tags.** בלי tags הכלל לא מגביל כלום, ו-Nx גם לא יאפשר להם תלות.
- **לייבא ספרייה בנתיב יחסי.** ‏`../../shop/data/src/...` עוקף את `index.ts` ואת בדיקת הגבולות.
- **להריץ `nx run-many` בכל שינוי ב-CI.** ‏`nx affected` שומר על זמן ה-CI כשה-repo גדל.

## מה הלאה

בפוסט הבא: ספריות Angular. ‏`ng generate library`, ‏`public-api.ts` ו-ng-packagr, בלי Nx.
