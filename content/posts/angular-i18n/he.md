---
title: "i18n ב-Angular: ‏@angular/localize, ‏ng extract-i18n ו-build לכל שפה"
summary: "תרגום אפליקציית Angular עם i18n המובנה: סימון טקסט ב-i18n וב-$localize, ‏ng extract-i18n, קובץ תרגום לעברית, ו-build נפרד לכל שפה. וגם מתי מספיק מילון פשוט."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 68 }
---

ה-i18n המובנה של Angular מתרגם בזמן ה-build: מסמנים טקסט בקוד, מחלצים אותו לקובץ, מתרגמים, ו-`ng build` מוציא עותק נפרד של האפליקציה לכל שפה. החלפת שפה היא מעבר לכתובת אחרת, לא החלפה בזמן ריצה.

כל דוגמה נבדקה עם Angular 22.2.

## הוספת @angular/localize

```bash
ng add @angular/localize
```

```text
UPDATE src/main.ts (267 bytes)
UPDATE tsconfig.app.json (429 bytes)
UPDATE tsconfig.spec.json (436 bytes)
UPDATE angular.json (1999 bytes)
```

הפקודה מוסיפה את `@angular/localize/init` ל-`polyfills` ב-`angular.json`, ואת הטיפוסים של `$localize` ל-tsconfig ‏([התיעוד](https://angular.dev/guide/i18n/add-package)).

## סימון טקסט לתרגום

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <h1 i18n="site header|Welcome title@@welcome">Hello, reader!</h1>
    <button i18n-title title="Add one item" (click)="count.set(count() + 1)">+1</button>
    <p i18n>{count(), plural, =0 {No items} =1 {One item} other {{{ count() }} items}}</p>
    <p>{{ status }}</p>
  `,
})
export class App {
  protected readonly count = signal(0);
  protected readonly status = $localize`:@@status:Saved`;
}
```

[ארבע צורות סימון](https://angular.dev/guide/i18n/prepare):

- `i18n` מסמן את תוכן האלמנט. הערך בנוי כ-`meaning|description@@id`, וכל חלק בו אופציונלי. ה-meaning וה-description מגיעים למתרגם, וה-`@@id` קובע מזהה קבוע.
- `i18n-title` מסמן attribute, כאן `title`.
- ‏ICU ‏`plural` בוחר נוסח לפי מספר. בתרגום לעברית אפשר להוסיף מקרה של `=2`.
- `` $localize`:@@status:Saved` `` מסמן מחרוזת בקוד TypeScript, עם אותו פורמט מטא-דאטה בין נקודתיים.

בלי תרגום, האפליקציה מציגה את טקסט המקור: טסט שבדק את הקומפוננטה קיבל `No items`, ואחרי לחיצה `One item`.

## ‏ng extract-i18n

```bash
ng extract-i18n --output-path src/locale
```

```text
Extraction Complete. (Messages: 4)
```

הפקודה כותבת את `src/locale/messages.xlf` ‏(XLIFF 1.2). מעתיקים אותו ל-`messages.he.xlf` ומוסיפים `<target>` לכל יחידה:

```text
<trans-unit id="welcome" datatype="html">
  <source>Hello, reader!</source>
  <target>שלום, קוראים!</target>
  <note priority="1" from="description">Welcome title</note>
  <note priority="1" from="meaning">site header</note>
</trans-unit>
<trans-unit id="6358580996267558411" datatype="html">
  <source>{VAR_PLURAL, plural, =0 {No items} =1 {One item} other {<x id="INTERPOLATION"/> items}}</source>
  <target>{VAR_PLURAL, plural, =0 {אין פריטים} =1 {פריט אחד} =2 {שני פריטים} other {<x id="INTERPOLATION"/> פריטים}}</target>
</trans-unit>
```

(השמטנו מהקטע את שורות `context-group`.) ל-`welcome` יש המזהה שבחרנו. ל-plural, שלא קיבל `@@id`, יש מזהה שמחושב מהטקסט, ולכן שינוי בטקסט המקור יוצר יחידה חדשה.

## ‏build לכל שפה

ב-`angular.json` מגדירים את שפת המקור ואת קובצי התרגום, ומפעילים `localize` ‏([התיעוד](https://angular.dev/guide/i18n/merge)):

```json
"i18n": {
  "sourceLocale": "en-US",
  "locales": {
    "he": { "translation": "src/locale/messages.he.xlf" }
  }
},
"architect": {
  "build": {
    "options": {
      "localize": true
    }
  }
}
```

`ng build` מוציא תיקייה לכל שפה:

```text
dist/ng-template/browser/en-US/index.html
dist/ng-template/browser/en-US/main-OV5CLT5E.js
dist/ng-template/browser/he/index.html
dist/ng-template/browser/he/main-OV5CLT5E.js
```

ב-`he/index.html` ה-build כתב `<html lang="he" dir="rtl">` ו-`<base href="/he/">`, והטקסט `שלום, קוראים!` נמצא כבר בתוך ה-JavaScript. שרת ה-dev מגיש שפה אחת בכל פעם, ולכן לכל שפה מוסיפים configuration ומריצים, למשל, `ng serve --configuration=he`.

## חלופות בזמן ריצה

ספריות כמו Transloco ו-ngx-translate טוענות תרגומים בזמן ריצה ומחליפות שפה בלי טעינה מחדש, עם build אחד לכל השפות.

באתר קטן מספיק לפעמים מילון. הבלוג הזה לא משתמש ב-`@angular/localize`: יש בו אובייקט `he` ואובייקט `en` עם אותם מפתחות (TypeScript מוודא שלא חסר מפתח), ו-`LocaleService` עם signal של השפה ופונקציה `t(key)`. השפה מגיעה מה-route ‏(`/he/...` או `/en/...`), וה-build מרנדר מראש את שתיהן ([SSG](he/posts/angular-ssg/)).

## טעויות נפוצות של מתחילים

- **להוסיף טקסט ולא לעדכן את קובץ התרגום.** יחידה שחסרה ב-`messages.he.xlf` מציגה את טקסט המקור, וה-build מסתפק באזהרה: `No translation found for "status" ("Saved").` עם `"i18nMissingTranslation": "error"` ה-build נכשל.
- **לסמוך על מזהים אוטומטיים.** תיקון פסיק בטקסט המקור יוצר מזהה חדש, והתרגום הישן כבר לא מתאים לו. לטקסט שמשתנה נותנים `@@id`.
- **לערוך את `messages.xlf` עצמו.** כל הרצה של `ng extract-i18n` כותבת אותו מחדש. מתרגמים בעותק לכל שפה.

## מה הלאה

בפוסט הבא: הפיכת האפליקציה ל-PWA עם `ng add @angular/pwa`, ‏service worker ועבודה בלי רשת.
