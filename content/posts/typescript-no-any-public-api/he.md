---
title: "לעולם לא any ב-API ציבורי"
summary: "למה any בחתימה מיוצאת מכבה את בדיקת הטיפוסים לכל מי שקורא לה, ה-any של JSON.parse שמצב strict לא תופס, ומה לייצא במקומו: unknown, ‏generics או הטיפוס האמיתי."
date: 2026-10-29
tags: [typescript]
series: { key: typescript, order: 30 }
---

[הפוסט על any ו-unknown](he/posts/typescript-any-unknown-never/) הראה ש-`any` מכבה את הבדיקה לערך אחד. ב-API ציבורי (כל מה שמיוצא ממודול, מספרייה או מחבילה משותפת) הוא מכבה אותה לכל מי שקורא לו, בקוד שלעולם לא תראו.

כל דוגמה נבדקה עם TypeScript 6.0.3 ו-7.0.2 והורצה ב-Node.js 24.

## ‏any מתפשט

פונקציה שמחזירה `any` מוסרת לקורא ערך בלי טיפוס, וכל מה שמחושב ממנו גם הוא בלי טיפוס:

```typescript
// spread.ts
function loadConfig(text: string): any {
  return JSON.parse(text);
}

const config = loadConfig('{"port":3000}');
const port = config.prot;
const next = port + 1;
const url: string = `http://localhost:${next}`;
console.log(url);
```

```text
http://localhost:NaN
```

‏`config.prot` הוא שגיאת כתיב, ‏`port` הוא `any`, ‏`next` הוא `any`, ו-`tsc` לא מדווח כלום. הבאג צץ שלוש שורות אחר כך, כ-`NaN` בתוך URL. הקורא לא עשה שום דבר רע: הוא סמך על החתימה.

## ‏unknown מכריח את הקורא לבדוק

החזירו `unknown` כשהצורה באמת לא ידועה. הקורא חייב לצמצם אותו לפני שימוש, ושגיאת הכתיב לא יכולה לקרות:

```typescript
// unknown.ts
function loadConfig(text: string): unknown {
  return JSON.parse(text);
}

const config = loadConfig('{"port":3000}');
console.log(config.port);

if (typeof config === "object" && config !== null && "port" in config && typeof config.port === "number") {
  console.log(config.port + 1);
}
```

```text
unknown.ts(7,13): error TS18046: 'config' is of type 'unknown'.
3000
3001
```

טוב עוד יותר: כשהמודול מכיר את הצורה, בודקים אותה פעם אחת בפנים ומייצאים את הטיפוס האמיתי. [הפוסט על zod](he/posts/typescript-zod/) מראה איך: הקורא מקבל ערך עם טיפוס, והבדיקה יושבת איפה שהנתונים נכנסים.

## מצב strict לא תופס את זה

‏`noImplicitAny`, שהוא חלק מ-`strict`, מדווח רק על `any` ש-TypeScript נאלצה לנחש, כמו פרמטר בלי טיפוס. ‏`any` שמגיע מטיפוס של ספרייה הוא לא implicit. ‏`JSON.parse` מוצהר כמחזיר `any`, אז פונקציה שמחזירה את התוצאה שלו מייצאת `any` בלי שגיאה:

```typescript
// config.ts
export function loadConfig(text: string) {
  return JSON.parse(text);
}

export function onMessage(handler: (data: any) => void) {
  handler({ text: "hi" });
}

onMessage((data) => console.log(data.txet));
```

```text
undefined
```

```bash
tsc --strict --declaration --emitDeclarationOnly --outDir out config.ts
cat out/config.d.ts
```

```text
export declare function loadConfig(text: string): any;
export declare function onMessage(handler: (data: any) => void): void;
```

קובץ ה-`.d.ts` הוא מה שמשתמשי החבילה רואים. לייצר אותו ולחפש בו `any` זו בדיקה מהירה של API ציבורי. הפונקציה השנייה מראה את הצורה האחרת: `any` בפרמטר של callback נותן טיפוס ל-handler של כל קורא, אז `data.txet` עובר.

## מה לייצא במקום

- **את הטיפוס האמיתי**, כשאתם מכירים אותו. כתבו טיפוס החזרה לפונקציות מיוצאות, כך ש-`any` מבפנים לא ידלוף החוצה בלי שתשימו לב.
- **‏`unknown`**, כשאתם לא מכירים אותו והקורא צריך לבדוק.
- **‏generic**, כשהטיפוס תלוי בקורא. ‏`onMessage<T>(handler: (data: T) => void)` הוגן רק אם משהו בודק את `T`. אחרת זו [המרה בתחפושת](he/posts/typescript-generics-beyond/).
- **‏`Record<string, unknown>`** במקום `Record<string, any>` לאוסף אפשרויות שמעבירים הלאה בלי לגעת בו.

## איפה any בסדר

‏`any` לא אסור בכל מקום. ה-`ReturnType` של TypeScript עצמה מוצהר ב-`lib.es5.d.ts` כ-`ReturnType<T extends (...args: any) => any>`. שם זו הגבלה שמשמעותה "כל פונקציה שהיא", ואף ערך מטיפוס `any` לא מגיע לקורא. אותו דבר לגבי `any` מקומי בתוך גוף של פונקציה שהחתימה המיוצאת שלה מוגדרת עד הסוף. הכלל עוסק בגבול: שום `any` לא חוצה אותו.

## לאכוף את זה

ל-`tsc` אין אפשרות שאוסרת `any` מפורש. ‏linter כן: ל-[typescript-eslint](https://typescript-eslint.io/rules/no-explicit-any/) יש את `no-explicit-any`, וכללי ה-`no-unsafe-*` שלו (כמו [`no-unsafe-return`](https://typescript-eslint.io/rules/no-unsafe-return/)) מדווחים על `any` שיוצא מפונקציה, כולל המקרה של `JSON.parse` שלמעלה. הם צריכים מידע על טיפוסים, אז הם רצים כשמופעל typed linting.

## טעויות נפוצות של מתחילים

- **פונקציות מיוצאות בלי טיפוס החזרה.** הטיפוס המוסק יכול להיות `any` בלי אזהרה. כתבו אותו במפורש.
- **‏`as any` כדי להשתיק שגיאה בטיפוס ציבורי.** השגיאה נעלמת אצלכם וחוזרת כבאג בזמן ריצה אצל הקורא.
- **טיפוס `any` לנתונים של callback "בשביל הגמישות".** השתמשו ב-`unknown`, או בפרמטר טיפוס שהקורא קובע.

## מה הלאה

בפוסט הבא: קובצי הצהרה `.d.ts`.
