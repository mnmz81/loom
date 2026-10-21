---
title: "Angular DevTools: עץ קומפוננטות, גרף signals, ‏injectors ו-profiler"
summary: "תוסף הדפדפן Angular DevTools לפי התיעוד הרשמי: עץ הקומפוננטות, גרף ה-signals, עץ ה-injectors וה-profiler של change detection, ולמה הוא עובד רק על build של פיתוח."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 73 }
---

כשקומפוננטה לא מתעדכנת, או כשהמסך איטי, קל לנחש. ‏[Angular DevTools](https://angular.dev/tools/devtools) מאפשר להסתכל פנימה: תוסף לכרום ולפיירפוקס שמוסיף לכלי המפתחים לשונית Angular.

לא הרצתי את התוסף, ולכן מה שמתואר עליו נלקח מדפי התיעוד ב-[angular.dev/tools/devtools](https://angular.dev/tools/devtools). הקוד והבניות נבדקו עם Angular 22.2.

## התקנה ודרישות

מתקינים את התוסף מחנות התוספים של כרום או מ-Firefox Add-ons, פותחים את כלי המפתחים ובוחרים בלשונית Angular. לפי התיעוד:

- התוסף עובד רק על [build של פיתוח](https://angular.dev/tools/devtools#we-detected-an-application-built-with-production-configuration). האופטימיזציות של build ל-production מסירות את מה שהוא צריך.
- לפי התיעוד, אפשר להריץ אפליקציה שכבר פרוסה אם בונים אותה עם `"optimization": false`.

ההבדל בין שני סוגי ה-build, כפי שהוא נראה בפרויקט חדש:

```bash
ng build --configuration development
ng build
```

```text
Initial chunk files | Names         | Raw size
main.js             | main          |  1.35 MB |
styles.css          | styles        | 95 bytes |
                    | Initial total |  1.35 MB

main-777EMVSR.js    | main          | 195.05 kB |                53.36 kB
                    | Initial total | 195.05 kB |                53.36 kB
```

(הפלט מקוצר: הבלוק הראשון הוא מ-build הפיתוח והשני מ-build ה-production.) ה-build של פיתוח לא ממזער (`optimization: false`) ויוצר source maps: ‏`dist/ng-template/browser/main.js.map`. ב-build של production לא נוצרו קבצי map. ‏`ng serve` משתמש בהגדרת הפיתוח כברירת מחדל.

## עץ הקומפוננטות

הלשונית Components מציגה את מבנה האפליקציה כעץ של קומפוננטות ו-directives. לפי [התיעוד](https://angular.dev/tools/devtools/component):

- לחיצה על צומת מציגה את המאפיינים שלו בפאנל מצד ימין, ותיבת חיפוש מסננת את העץ לפי שם.
- אפשר לערוך ערך: לחצן ימני על הערך, והזנת ערך חדש עם Enter, כשהסוג שלו מאפשר עריכה.
- ‏`$ng0` בקונסול הוא המופע שנבחר כרגע, ו-`$ng1` הוא הקודם לו.
- כלי הבחירה שבפינה מאפשר לעמוד על אלמנט בעמוד ולבחור את הקומפוננטה שלו. לחיצה כפולה על צומת פותחת את האלמנט בלשונית Elements, ואייקון בפאנל פותח את הקוד המקורי.
- בלוקי `@defer` מופיעים בעץ עם הטריגרים שלהם, ובאפליקציות עם SSR העץ מציג את מצב ה-hydration של כל קומפוננטה.

## גרף ה-signals

אחרי בחירת קומפוננטה ולחיצה על Show Signal Graph, ‏DevTools מציג איך ה-signals שלה תלויים זה בזה. לפי [העמוד על גרף ה-signals](https://angular.dev/tools/devtools/signals) הצמתים הם `signal`, ‏`computed`, ‏`effect`, ‏`linkedSignal`, התבנית (שקוראת signals בזמן רינדור) ו-`resource`, והקווים ביניהם הם תלויות. אפשר ללחוץ על צומת כדי לראות את הערך הנוכחי, לקפוץ להגדרה, לשים breakpoint לעדכון (בדפדפנים מבוססי Chromium בלבד) או לעקוב אחרי עדכונים בקונסול. הגרף דורש Angular 19 ומעלה במצב פיתוח.

הצמתים מתויגים לפי `debugName`, ולכן כדאי לתת שמות:

```typescript
import { Component, computed, effect, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="count.set(count() + 1)">+1</button>
    <p>{{ doubled() }}</p>
  `,
})
export class App {
  protected readonly count = signal(0, { debugName: 'count' });
  protected readonly doubled = computed(() => this.count() * 2, { debugName: 'doubled' });

  constructor() {
    effect(() => console.log('count is', this.count()), { debugName: 'logCount' });
  }
}
```

בדיקת Vitest לוחצת על הכפתור ומוצאת `2` ב-`<p>`, כלומר הקוד מתקמפל ופועל. לפי התיעוד, הגרף שלה אמור להכיל את `count`, את `doubled`, את ה-effect בשם `logCount` ואת התבנית, שקוראת את `doubled`. בלי `debugName` אפשר לזהות [effect](he/posts/angular-effect/) ללא שם רק לפי מיקומו. רקע על ה-signals עצמם ב[פוסט על signals](he/posts/angular-signals/).

## עץ ה-injectors

הלשונית Injector Tree מציגה שני עצים: היררכיית ה-environment injectors והיררכיית ה-element injectors. לפי [התיעוד](https://angular.dev/tools/devtools/injectors), בחירת injector מדגישה את המסלול שאלגוריתם ה-DI עובר ממנו אל השורש, כולל המעבר מ-element injectors ל-environment injectors כשהתלות לא נמצאת, וגם רשימת ה-providers שלו עם אפשרות להדפיס כל אחד לקונסול. כך אפשר לראות מאיפה מתקבל מופע של שירות, למשל כשקומפוננטה מקבלת עותק משלה במקום את זה של ה-root ([providers](he/posts/angular-providers/)). העץ זמין לאפליקציות מגרסה 17 ומעלה. לשונית Router Tree מציגה את עץ הניווט.

## ה-profiler

הלשונית Profiler מודדת change detection. לפי [התיעוד](https://angular.dev/tools/devtools/profiler):

- מתחילים הקלטה בעיגול שבפינה, מבצעים פעולות באפליקציה, ועוצרים. ההקלטה אוספת אירועים כמו change detection וביצוע של lifecycle hooks.
- כל עמודה בתרשים היא סבב change detection אחד, וככל שהיא גבוהה יותר הסבב ארך יותר. בחירה בעמודה מראה כמה זמן לקחה כל קומפוננטה, ואומדן קצב פריימים אם הוא יורד מתחת ל-60.
- תצוגת flame graph מציגה את הזמן לפי היררכיית האלמנטים, והצבע משקף את הזמן יחסית לאריח האיטי ביותר.
- הסימון Change detection מסנן רק קומפוננטות שנבדקו. קומפוננטות שלא נבדקו, למשל OnPush שלא התעדכן, מופיעות באפור.
- אפשר לשמור הקלטה כקובץ JSON ולטעון אותה אחר כך.

התיעוד לא מזכיר איך ה-profiler מתנהג באפליקציה zoneless, ולכן לא ידוע לי מה המגבלות שם. הוא מתאים במיוחד כדי לראות את ההבדל בין קומפוננטות [Eager ל-OnPush](he/posts/angular-onpush/): ב-OnPush, קומפוננטה שה-inputs שלה לא השתנו נשארת אפורה.

## טעויות נפוצות של מתחילים

- **לנסות את התוסף על אפליקציית production.** ההודעה על build של production לא אומרת שמשהו נשבר, אלא שהמידע חסר.
- **למדוד ביצועים ב-`ng serve` ולהסיק מהם על production.** הקוד לא ממוזער, ולכן המספרים המוחלטים לא משקפים את מה שהמשתמשים יקבלו.
- **להשאיר signals בלי `debugName`.** בגרף של אפליקציה גדולה קשה למצוא צומת בלי שם.

## מה הלאה

בפוסט הבא: גודל ה-bundle. ‏budgets ב-`angular.json`, השפעת טעינה עצלה ו-`@defer`, וניתוח עם `--stats-json`.
