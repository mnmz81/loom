---
title: "אבטחה ב-Angular: sanitization, ‏DomSanitizer, ‏CSP ו-XSRF"
summary: "איך Angular מגן מ-XSS: escaping באינטרפולציה ו-sanitization של [innerHTML], הסיכון ב-bypassSecurityTrustHtml, ‏CSP עם autoCsp, ‏Trusted Types, והגנת XSRF של HttpClient."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 75 }
---

רוב ההגנה של Angular מפני XSS פועלת בלי שעושים כלום, ונשברת כשעוקפים אותה. הפוסט מראה מה Angular עושה לבד, איפה עוקפים אותו, ומה מוסיפים מעל: CSP, ‏Trusted Types והגנת XSRF.

כל דוגמה נבדקה עם Angular 22.2 ו-Vitest. הכללים המלאים ב-[מדריך האבטחה](https://angular.dev/best-practices/security).

## אינטרפולציה, ‏innerHTML ועקיפה

```typescript
import { Component, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-comment',
  template: `
    <p>{{ html() }}</p>
    <div class="safe" [innerHTML]="html()"></div>
    <div class="trusted" [innerHTML]="trusted()"></div>
  `,
})
export class Comment {
  readonly html = input('');
  private readonly sanitizer = inject(DomSanitizer);
  // Dangerous: Angular no longer checks this value.
  protected trusted = () => this.sanitizer.bypassSecurityTrustHtml(this.html());
}
```

בדיקה מעבירה ל-`html` את הטקסט `<b>hi</b><img src="x" onerror="alert(1)">`, ומדפיסה את ה-HTML של כל אחד משלושת האלמנטים ואת האזהרה בקונסול:

```text
WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss
p: &lt;b&gt;hi&lt;/b&gt;&lt;img src="x" onerror="alert(1)"&gt;
safe: <b>hi</b><img src="x">
trusted: <b>hi</b><img src="x" onerror="alert(1)">
```

- **אינטרפולציה** תמיד עושה escaping: התגיות מוצגות כטקסט ולא מתפרשות.
- ‏**`[innerHTML]`** עובר sanitization: ‏`<b>` נשאר, ו-`onerror` נמחק. במצב פיתוח Angular מדפיס אזהרה כשהוא משנה ערך.
- ‏**`bypassSecurityTrustHtml`** מכניס את הערך כמו שהוא, כולל `onerror`. בדפדפן אמיתי הקוד הזה ירוץ.

לפי המדריך, Angular מנקה ערכים בשלושה הקשרים: HTML, ‏style ו-URL. כתובת של משאב, כמו `<script src>`, הוא לא מנקה בכלל, כי היא יכולה להכיל כל קוד. לכל הקשר יש מתודת `bypassSecurityTrust*` משלה, ומשתמשים בה רק על ערך שאתם יצרתם או בדקתם, לעולם לא על קלט של משתמש. כשחייבים לעבוד עם DOM ישירות, ‏`sanitizer.sanitize(SecurityContext.HTML, value)` מנקה ערך באותה דרך.

## ‏CSP עם autoCsp

‏Content Security Policy אומר לדפדפן מאילו מקורות מותר להריץ סקריפטים. ‏`autoCsp` ב-`angular.json` מייצר מדיניות כזו בזמן ה-build:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "security": { "autoCsp": true }
  }
}
```

ב-`index.html` שנבנה נוספה תגית בראש `<head>`:

```text
<meta http-equiv="Content-Security-Policy" content="script-src 'strict-dynamic' 'sha256-wF0Y260ovXauJMW0rJcr7ehPGcq9k3TMfOWs2BNmVuE=' https: 'unsafe-inline';object-src 'none';base-uri 'self';">
```

ה-CLI מחשב hash לכל סקריפט inline ב-`index.html`, ו-`'strict-dynamic'` מאפשר לסקריפט המאושר לטעון את שאר הקבצים. כך אפשר להשתמש ב-CSP גם באתר סטטי, בלי nonce שמשתנה בכל בקשה. לפי המדריך, ‏`autoCsp` מכסה רק סקריפטים (את `style-src` מגדירים לבד) ולא עובד עם SSR. בתיאור האפשרות בסכמה של ה-builder כתוב שהיא תהפוך לברירת מחדל "once we are out of experimental/preview phases", כלומר היא עדיין לא יציבה.

עם שרת שיכול לייצר nonce לכל תגובה, המדריך מציע את `ngCspNonce` על אלמנט השורש או את ה-token ‏`CSP_NONCE`.

## ‏Trusted Types

‏Trusted Types היא יכולת של הדפדפן שחוסמת השמה של מחרוזת רגילה ל-API מסוכן כמו `innerHTML`. ‏Angular תומך בה דרך policies בשמות קבועים. לפי המדריך, הכותרת המינימלית היא:

```text
Content-Security-Policy: trusted-types angular; require-trusted-types-for 'script';
```

‏`angular` מכסה ערכים ש-Angular ניקה. אפליקציה שמשתמשת ב-`bypassSecurityTrust*` צריכה גם `angular#unsafe-bypass`, וטעינה עצלה של chunks צריכה `angular#bundler`. היתרון: כל עקיפה צריכה policy בשם מפורש, וקל למצוא אותה. התמיכה בדפדפנים לא מלאה, ו-`DomSanitizer` ממשיך לעבוד בכל מקרה.

## ‏XSRF ב-HttpClient

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('XSRF', () => {
  it('sends the cookie value as a header on POST only', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    document.cookie = 'XSRF-TOKEN=abc123';
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.post('/api/save', {}).subscribe();
    http.get('/api/items').subscribe();

    const post = backend.expectOne('/api/save').request;
    const get = backend.expectOne('/api/items').request;
    console.log('POST', post.headers.get('X-XSRF-TOKEN'), '| GET', get.headers.get('X-XSRF-TOKEN'));
    expect(post.headers.get('X-XSRF-TOKEN')).toBe('abc123');
    expect(get.headers.has('X-XSRF-TOKEN')).toBe(false);
  });
});
```

```text
POST abc123 | GET null
```

‏`HttpClient` קורא את העוגייה `XSRF-TOKEN` ושולח אותה בכותרת `X-XSRF-TOKEN`, רק בבקשות שמשנות מידע (כמו POST) ולכתובות יחסיות או מאותו origin. אתר אחר לא יכול לקרוא את העוגייה, ולכן לא יכול לשלוח את הכותרת. אבל זה רק חצי מההגנה: השרת צריך לקבוע את העוגייה ולבדוק שהכותרת תואמת. שמות אחרים מגדירים עם `withXsrfConfiguration({ cookieName, headerName })`, ומכבים עם `withNoXsrfProtection()`.

## טעויות נפוצות של מתחילים

- ‏**`bypassSecurityTrustHtml` כדי להעלים את האזהרה.** האזהרה אומרת ש-Angular הסיר משהו מסוכן, והעקיפה מחזירה אותו.
- **לכתוב ל-`element.innerHTML` דרך `ElementRef`.** ‏API של ה-DOM לא עובר sanitization. עדיף binding בתבנית.
- **לחשוב שהגנת XSRF עובדת בלי השרת.** בלי שרת שבודק את הכותרת, היא לא מגינה על כלום.

## מה הלאה

בפוסט הבא: ניהול state באפליקציה גדולה. שירות עם signals, ומתי כדאי לעבור ל-NgRx SignalStore.
