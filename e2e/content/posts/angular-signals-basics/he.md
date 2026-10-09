---
title: "סיגנלים באנגולר — היסודות"
summary: "signal, computed ו-effect בקצרה."
date: 2026-09-20
tags: [angular, signals]
---

סיגנל (signal) הוא עטיפה סביב ערך שיודעת להודיע למי שקורא אותו כשהערך משתנה. אנגולר משתמשת בסיגנלים כדי לדעת בדיוק אילו חלקים בתבנית צריך לעדכן, וזה הבסיס לאפליקציות zoneless. יש שלושה כלים בסיסיים: `signal`, `computed` ו-`effect`.

## `signal` — ערך שאפשר לכתוב

```ts
import { signal } from '@angular/core';

const count = signal(0);

count();                     // קריאה: 0
count.set(5);                // כתיבה
count.update((n) => n + 1);  // כתיבה לפי הערך הקודם: 6
```

קוראים את הערך על ידי קריאה לסיגנל כמו לפונקציה — גם בתבנית: `{{ count() }}`.

## `computed` — ערך נגזר

```ts
import { computed } from '@angular/core';

const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity());

total(); // 200
quantity.set(3);
total(); // 300
```

`computed` הוא לקריאה בלבד. הוא עוקב אוטומטית אחרי כל סיגנל שנקרא בתוכו, מחושב רק כשמישהו קורא אותו (lazy), ושומר את התוצאה עד שאחת התלויות משתנה.

### טעות נפוצה

אל תכתבו לסיגנלים מתוך `computed`. פונקציית החישוב צריכה להיות טהורה — רק לקרוא ולהחזיר ערך.

## `effect` — תופעות לוואי

```ts
import { Component, effect, signal } from '@angular/core';

@Component({ selector: 'app-counter', template: `{{ count() }}` })
export class Counter {
  readonly count = signal(0);

  constructor() {
    effect(() => {
      localStorage.setItem('count', String(this.count()));
    });
  }
}
```

`effect` רץ לפחות פעם אחת, ושוב בכל פעם שאחד הסיגנלים שהוא קורא משתנה. הריצה מתוזמנת אסינכרונית, כך שכמה שינויים ברצף גורמים לריצה אחת. צריך ליצור אותו ב-injection context (למשל בבנאי), והוא נהרס אוטומטית יחד עם הקומפוננטה.

## מתי להשתמש במה

- **`signal`** — state שמשתנה.
- **`computed`** — כל דבר שאפשר לחשב מ-state אחר. זו ברירת המחדל.
- **`effect`** — רק לסנכרון עם העולם החיצוני: `localStorage`, לוגים, ספריות שאינן אנגולר. אם אתם מעתיקים ערך מסיגנל אחד לאחר בתוך `effect`, כנראה שרציתם `computed`.
