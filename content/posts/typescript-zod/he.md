---
title: "‏zod לעומק: הרכבת schemas, ‏transforms ודוחות שגיאה"
summary: "מעבר ל-schema הראשון ב-zod: גזירת schemas כמו utility types, ‏discriminated unions, ‏transform ו-refine, מה קורה למפתחות לא מוכרים, הפיכת שגיאות להודעות בטופס, ומתי zod לא שווה את זה."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 29 }
---

[הפוסט על בדיקת נתונים בזמן ריצה](he/posts/typescript-runtime-validation/) הציג את [zod](https://zod.dev/): ‏schema, ‏`z.infer`, ‏`safeParse` ו-`parse`. הפוסט הזה מכסה את מה שפרויקט אמיתי צריך אחר כך.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2, ‏Node.js 24 ו-zod 4.6.5, מול [התיעוד של ה-API של zod](https://zod.dev/api).

## גזירת schemas

ל-schemas יש גרסאות משלהם של [utility types](he/posts/typescript-utility-types-in-practice/): ‏`pick`, ‏`omit`, ‏`partial` ו-`extend`. מגדירים את הצורה המלאה פעם אחת וגוזרים ממנה את השאר:

```typescript
// derive.ts
import * as z from "zod";

const User = z.object({
  id: z.int().positive(),
  name: z.string().min(1),
  email: z.email(),
});

const NewUser = User.omit({ id: true });
const UserPatch = NewUser.partial();
const Admin = User.extend({ permissions: z.array(z.string()) });

type UserPatch = z.infer<typeof UserPatch>;
const patch: UserPatch = { name: "Dana" };
console.log(UserPatch.parse(patch), NewUser.safeParse({ name: "Avi" }).success);
console.log(Object.keys(Admin.shape));
```

```text
{ name: 'Dana' } false
[ 'id', 'name', 'email', 'permissions' ]
```

‏`NewUser` הוא גוף של בקשת "יצירה", ‏`UserPatch` של "עדכון", ו-`Admin` מוסיף שדה. שנו את `email` ב-`User`, ושלושתם יתעדכנו.

## ‏Discriminated unions

‏[`z.discriminatedUnion`](https://zod.dev/api#discriminated-unions) מקבל את שם המבחין ואת האפשרויות. הוא בוחר אפשרות לפי השדה הזה, כך ששגיאה מדווחת מול האיבר הנכון:

```typescript
// result.ts
import * as z from "zod";

const ApiResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), data: z.object({ id: z.number() }) }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);
type ApiResult = z.infer<typeof ApiResult>;

function show(r: ApiResult) {
  return r.status === "ok" ? `id ${r.data.id}` : `failed: ${r.message}`;
}

console.log(show(ApiResult.parse({ status: "ok", data: { id: 7 } })));
const bad = ApiResult.safeParse({ status: "error" });
if (!bad.success) console.log(bad.error.issues[0].path, bad.error.issues[0].message);
```

```text
id 7
[ 'message' ] Invalid input: expected string, received undefined
```

הטיפוס המוסק הוא אותו [discriminated union](he/posts/typescript-discriminated-unions/) שהייתם כותבים ביד, אז `show` מצמצם לפי `status`.

## ‏transform ו-refine

‏`transform` משנה את הערך אחרי שעבר את הבדיקה, כך שטיפוס הקלט וטיפוס הפלט שונים. ‏`refine` מוסיף בדיקה שטיפוס לא יכול לבטא:

```typescript
// signup.ts
import * as z from "zod";

const Signup = z
  .object({
    birthday: z.iso.date().transform((s) => new Date(s)),
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

type SignupInput = z.input<typeof Signup>;
type Signup = z.output<typeof Signup>;

const form: SignupInput = { birthday: "1990-04-01", password: "s3cret-pass", confirm: "s3cret-pass" };
const ok: Signup = Signup.parse(form);
console.log(ok.birthday instanceof Date, ok.birthday.getFullYear());

const r = Signup.safeParse({ ...form, confirm: "other" });
if (!r.success) console.log(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
```

```text
true 1990
[ "confirm: Passwords don't match" ]
```

- ב-`z.input`, ‏`birthday` הוא `string`, מה שהטופס שולח. ב-`z.output` (זהה ל-`z.infer`), ‏`birthday` הוא `Date`.
- ‏`refine` רץ על האובייקט כולו אחרי שהשדות שלו עברו, ו-`path` מצמיד את השגיאה ל-`confirm`, איפה שטופס היה מציג אותה.

## מפתחות לא מוכרים

כברירת מחדל, `z.object` מקבל מפתחות נוספים ומסיר אותם מהתוצאה. שתי גרסאות משנות את זה:

```typescript
// keys.ts
import * as z from "zod";

const input = { name: "Dana", isAdmin: true };

console.log(z.object({ name: z.string() }).parse(input));
console.log(z.looseObject({ name: z.string() }).parse(input));
const strict = z.strictObject({ name: z.string() }).safeParse(input);
console.log(strict.success || strict.error.issues[0].message);
```

```text
{ name: 'Dana' }
{ name: 'Dana', isAdmin: true }
Unrecognized key: "isAdmin"
```

ברירת המחדל היא הבטוחה לבקשות נכנסות: ‏`isAdmin` תועה לא מגיע לקוד שלכם אף פעם. ‏`z.strictObject` מתאים לקובצי הגדרות, שבהם מפתח לא מוכר הוא בדרך כלל שגיאת כתיב.

## משגיאות להודעות בטופס

‏[`z.flattenError`](https://zod.dev/error-formatting) מקבץ את הבעיות לפי שדה ברמה העליונה, הצורה שטופס צריך:

```typescript
// form-errors.ts
import * as z from "zod";

const Contact = z.object({ name: z.string().min(2), email: z.email() });
const r = Contact.safeParse({ name: "D", email: "dana" });
if (!r.success) console.log(z.flattenError(r.error).fieldErrors);
```

```text
{
  name: [ 'Too small: expected string to have >=2 characters' ],
  email: [ 'Invalid email address' ]
}
```

כל שדה מקבל רשימת הודעות, מוכנה להצגה ליד השדה שלו. לאובייקטים מקוננים, `z.treeifyError` שומר על הקינון.

## מתי zod לא שווה את זה

- **נתונים שאף פעם לא חוצים גבול.** ערכים שהקוד שלכם יצר כבר נבדקו על ידי `tsc`. בודקים איפה שנתונים נכנסים: בקשות, תשובות, קבצים, משתני סביבה, `localStorage`.
- **גודל ה-bundle בדפדפן.** לקוד צד לקוח שבו הגודל חשוב, zod מגיעה עם `zod/mini`, ‏API קטן יותר עם אותן בדיקות. התיעוד משווה בין השניים.
- **שדה בודד.** ‏`Number(x)` ועוד `Number.isFinite` לא צריכים ספרייה.

## טעויות נפוצות של מתחילים

- **‏`z.infer` כשהכוונה לטיפוס הקלט.** עם `transform` או `default` הם שונים. תנו לסטייט של טופס את הטיפוס `z.input`.
- **‏`refine` על שדה כשהכלל מערב שני שדות.** הוא צריך לשבת על האובייקט, עם `path`.
- **‏`strictObject` לתשובות API.** כשהשרת מוסיף שדה, האפליקציה נשברת. השאירו את ברירת המחדל לנתונים שלא בשליטתכם.

## מה הלאה

בפוסט הבא: למה `any` לא שייך ל-API ציבורי, ובמה להשתמש במקומו.
