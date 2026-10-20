---
title: "בדיקות ל-TypeScript עם Vitest"
summary: "מריצים בדיקות על קבצי .ts עם Vitest בלי שלב קומפילציה, רואים למה בדיקה עוברת גם כשהטיפוסים שגויים, וכותבים בדיקות לטיפוסים עצמם עם expectTypeOf ו-assertType."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 29 }
---

‏[Vitest](https://vitest.dev/guide/) מריץ קבצי בדיקה ב-TypeScript ישירות, בלי לקמפל אותם קודם. כמו Node, הוא לא בודק טיפוסים בזמן הריצה. לשם כך יש לו מצב נפרד של בדיקות טיפוסים.

כל פקודה הורצה עם Vitest 5.0.5, ‏TypeScript 6.0.3 ו-Node.js 24.21. מהפלט נשארו רק השורות הרלוונטיות.

## התקנה

```bash
npm install --save-dev vitest
```

ב-`package.json` מוסיפים `"test": "vitest"` תחת `scripts`. ‏`npx vitest` רץ במצב watch ומריץ מחדש בכל שמירה, ו-`npx vitest run` רץ פעם אחת, כמו שצריך ב-CI. ‏Vitest 5 דורש Node.js 22.12 ומעלה. כברירת מחדל הוא מחפש קבצים שבשם שלהם יש `.test.` או `.spec.`.

## בדיקה ראשונה

הפונקציה שנבדוק:

```typescript
// list.ts
export function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
```

והבדיקה, בקובץ `src/list.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { first } from "./list.ts";

describe("first", () => {
  it("returns the first item", () => {
    expect(first(["a", "b"])).toBe("a");
  });

  it("returns undefined for an empty list", () => {
    expect(first([])).toBeUndefined();
  });
});
```

```bash
npx vitest run --reporter=verbose
```

```text
 ✓ src/list.test.ts > first > returns the first item 1ms
 ✓ src/list.test.ts > first > returns undefined for an empty list 0ms

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

‏`describe` מקבץ בדיקות, ‏`it` היא בדיקה אחת, ו-`expect(...).toBe(...)` משווה ערכים. הכול מיובא מ-`vitest` עם הטיפוסים שלו, כך שגם בקובץ הבדיקה יש השלמה אוטומטית.

## ‏Vitest לא בודק טיפוסים

הבדיקה הזו מעבירה מחרוזת לפונקציה שמצפה למערך:

```typescript
import { expect, it } from "vitest";
import { first } from "./list.ts";

it("passes a string", () => {
  expect(first("abc")).toBe("a");
});
```

היא עוברת, כי `"abc"[0]` הוא `"a"` בזמן ריצה. רק `tsc` מוצא את הבעיה:

```bash
npx tsc
```

```text
src/wrong.test.ts(5,16): error TS2345: Argument of type 'string' is not assignable to parameter of type 'readonly unknown[]'.
```

לכן ב-CI מריצים גם `tsc` וגם `vitest run`. בדיקה ירוקה לא אומרת שהטיפוסים נכונים.

## בדיקות לטיפוסים

בספרייה, הטיפוס שהפונקציה מחזירה הוא חלק מה-API, ושינוי שלו שובר את מי שמשתמש בה. [בדיקות טיפוסים](https://vitest.dev/guide/testing-types) תופסות שינוי כזה. כותבים אותן בקובץ שנגמר ב-`.test-d.ts`:

```typescript
import { assertType, expectTypeOf, test } from "vitest";
import { first } from "./list.ts";

test("first keeps the item type", () => {
  expectTypeOf(first(["a", "b"])).toEqualTypeOf<string | undefined>();

  // @ts-expect-error a string is not an array
  assertType(first("abc"));
});
```

- ‏[`expectTypeOf`](https://vitest.dev/api/expect-typeof) בודק טיפוס: ‏`toEqualTypeOf` דורש שהטיפוסים יהיו זהים לגמרי.
- ‏[`assertType`](https://vitest.dev/api/assert-type) עם `@ts-expect-error` בודק שקריאה שגויה באמת נכשלת. אם יום אחד `first` תקבל גם מחרוזות, ההערה לא תהיה נחוצה יותר והבדיקה תיכשל.

‏Vitest לא מריץ את הקבצים האלה, אלא מעביר אותם ל-`tsc --noEmit`, ורק עם `--typecheck`:

```bash
npx vitest run --typecheck
```

```text
Testing types with tsc and vue-tsc is an experimental feature.
Breaking changes might not follow SemVer, please pin Vitest's version when using it.

 Test Files  2 passed (2)
      Tests  3 passed (3)
Type Errors  no errors
```

התכונה מסומנת כניסיונית, ולכן כדאי לקבע גרסה מדויקת של Vitest ב-`package.json`. עכשיו נניח שמישהו "פישט" את `first` ל-`function first(items: readonly any[])`. בדיקות הריצה עדיין עוברות, ובדיקת הטיפוסים נכשלת:

```text
 FAIL  src/list.test-d.ts:4 > first keeps the item type
TypeCheckError: Type 'string | undefined' does not satisfy the constraint 'never'.
  Type 'undefined' is not assignable to type 'never'.
 ❯ src/list.test-d.ts:5:49
```

ההודעה לא ברורה במבט ראשון. מה שחשוב הוא המיקום: השורה של `toEqualTypeOf`, כלומר הטיפוס שהפונקציה מחזירה כבר לא `string | undefined`. ‏`first` מחזירה עכשיו `any`.

## טעויות נפוצות של מתחילים

- **להריץ רק את Vitest ב-CI.** הבדיקות עוברות גם עם שגיאות טיפוסים. מריצים `tsc` לידן.
- **לשכוח את `--typecheck`.** בלי הדגל, קבצי `.test-d.ts` לא נבדקים בכלל, ולא מופיעה שום אזהרה.
- **שגיאת כתיב מתחת ל-`@ts-expect-error`.** גם שם משתנה שגוי הוא שגיאה, ולכן ההערה "מצליחה". ‏[התיעוד](https://vitest.dev/guide/testing-types) ממליץ לבדוק שהשגיאה היא זו שציפיתם לה.

## מה הלאה

בפוסט הבא, האחרון בסדרה: ‏TypeScript 7 והקומפיילר החדש שנכתב ב-Go.
