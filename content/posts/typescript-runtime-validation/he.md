---
title: "בדיקת נתונים בזמן ריצה ב-TypeScript: ‏type guards ו-zod"
summary: "הטיפוסים נמחקים לפני הריצה, ולכן נתונים מבחוץ (JSON, ‏API, משתני סביבה, טפסים) צריך לבדוק. ‏type guard שכותבים ביד, ואז zod: סכמה אחת, טיפוס שנגזר ממנה ו-safeParse."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 27 }
---

‏TypeScript בודקת את הקוד, לא את הנתונים. ‏`JSON.parse` ו-`response.json()` מחזירים `any`, ובזמן ריצה אין שום טיפוס שיעצור JSON שחסר בו שדה, כמו בדוגמה מ[הפוסט על async](he/posts/typescript-async/). כל מה שמגיע מבחוץ, תשובת API, קובץ הגדרות, משתנה סביבה או טופס, צריך בדיקה בקוד שרץ.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2, ‏Node.js 24 ו-zod 4.6.7.

## בדיקה ביד: type guard על unknown

```typescript
// guard.ts
type User = { id: number; email: string };

function isUser(value: unknown): value is User {
  return (
    typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "number" &&
    "email" in value && typeof value.email === "string"
  );
}

const input: unknown = JSON.parse('{"id":"7","email":"dana@example.com"}');
if (isUser(input)) console.log(input.email);
else console.log("invalid user");
```

```text
invalid user
```

מתחילים מ-`unknown` ולא מ-`any`, כדי ש-TypeScript תכריח לבדוק לפני שימוש. ‏`value is User` הוא type predicate: כשהפונקציה מחזירה `true`, ‏`input` מצומצם ל-`User`. כאן `id` הגיע כמחרוזת, ולכן הבדיקה נכשלת. זה עובד, אבל לכל שדה צריך שורה, והטיפוס והבדיקה הם שני דברים נפרדים שעלולים להתרחק זה מזה.

## ‏zod: לתאר את הנתונים פעם אחת

[zod](https://zod.dev/) היא ספרייה שבה כותבים סכמה, והיא גם בודקת וגם נותנת את הטיפוס. מתקינים אותה בפרויקט עם `"type": "module"` ב-`package.json`:

```typescript
// user.ts
import * as z from "zod";

const User = z.object({
  id: z.int().positive(),
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});
type User = z.infer<typeof User>;

const draft: User = { id: 7, email: "dana@example.com" };

const result = User.safeParse(JSON.parse('{"id":"7","email":"dana"}'));
if (result.success) console.log(result.data.role);
else console.log(z.prettifyError(result.error));

console.log(User.parse({ id: 7, email: "dana@example.com" }));
```

```bash
npm install zod
tsc --noEmit user.ts
node user.ts
```

```text
user.ts(11,7): error TS2741: Property 'role' is missing in type '{ id: number; email: string; }' but required in type '{ id: number; email: string; role: "admin" | "member"; }'.
✖ Invalid input: expected number, received string
  → at id
✖ Invalid email address
  → at email
{ id: 7, email: 'dana@example.com', role: 'member' }
```

- [`z.infer<typeof User>`](https://zod.dev/basics) גוזר את הטיפוס מהסכמה, ולכן אין מה לסנכרן. זה טיפוס הפלט: אחרי `default`, ‏`role` תמיד קיים, ו-`tsc` דורש אותו ב-`draft`. לטיפוס הקלט, שבו `role` אופציונלי, יש `z.input`.
- `safeParse` לא זורק. הוא מחזיר discriminated union: `success: true` עם `data`, או `success: false` עם `error`. ‏[`z.prettifyError`](https://zod.dev/error-formatting) הופך את השגיאה לטקסט, וכאן הוא מראה את שתי הבעיות בבת אחת.
- `parse` מחזיר את הנתונים אחרי בדיקה ומשלים ערכי ברירת מחדל, וכשהבדיקה נכשלת הוא זורק `ZodError`.

## משתני סביבה וטפסים

משתני סביבה וערכים מטופס הם תמיד מחרוזות. ‏[`z.coerce.number()`](https://zod.dev/api) מריץ `Number(input)` לפני הבדיקה, ולכן `"3000"` עובר כמספר ו-`"abc"` נכשל. בודקים את `process.env` פעם אחת בעליית התוכנית, ומשתמשים בתוצאה המוקלדת בכל מקום אחר.

ב-Python אותו רעיון נקרא pydantic: מחלקה עם type hints שבודקת את הנתונים. ראו את [הפוסט על pydantic](he/posts/python-pydantic/).

## טעויות נפוצות של מתחילים

- **‏`as User` על JSON.** זה לא בודק כלום, רק משתיק את TypeScript.
- **לכתוב גם `type` וגם סכמה לאותם נתונים.** כשמשנים אחד, השני נשאר מאחור. גוזרים עם `z.infer`.
- **לבדוק בכל פונקציה מחדש.** בודקים בגבול, איפה שהנתונים נכנסים, ומשם עובדים עם הטיפוס.

## מה הלאה

בפוסט הבא: type guards לעומק, לנתונים שלא בשליטתכם.
