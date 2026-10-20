---
title: "TypeScript 7: הקומפיילר המהיר שנכתב ב-Go"
summary: "מה השתנה ב-TypeScript 7.0: קומפיילר native שנכתב ב-Go, אותה פקודת tsc ובנייה מהירה בהרבה. מה צריך לנקות ב-6.0 לפני המעבר, ולמה כלים שתלויים ב-API, כמו Angular, נשארים ב-6.0."
date: 2026-10-20
tags: [typescript]
series: { key: typescript, order: 30 }
---

‏[TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) יצאה ב-8 ביולי 2026. השפה לא השתנתה: הקומפיילר נכתב מחדש ב-Go, ורץ כקובץ native במקום JavaScript על Node.js. קוד שעובר את 6.0 עובר גם את 7.0, עם אותן שגיאות, בתנאי שה-tsconfig שלו נקי מאפשרויות ש-6.0 הוציאה משימוש.

כל פקודה הורצה עם TypeScript 6.0.3 ו-7.0.2, על Mac עם M2 ושמונה ליבות.

## התקנה

```bash
npm install --save-dev typescript
npx tsc --version
```

```text
Version 7.0.2
```

‏7.0.2 היא הגרסה `latest` ב-npm, אז התקנה רגילה כבר מביאה אותה. הפקודה נשארה `tsc`, ו-npm מתקין לצידה חבילה עם הקובץ שמתאים למערכת ההפעלה (אצלי `@typescript/typescript-darwin-arm64`).

## כמה מהר

לפי Microsoft, ‏7.0 מהירה בערך פי 10, ובבנייה מלאה בדרך כלל פי 8 עד 12. חלק מהשיפור מגיע מבדיקת טיפוסים במקביל: ‏`--checkers` קובע כמה תהליכי בדיקה רצים, וברירת המחדל היא 4.

מדדתי `tsc --noEmit` על פרויקט שיצרתי לבדיקה: 2,000 קבצים עם interfaces, ‏mapped types ופונקציות גנריות, שכל אחד מייבא את הקודם. שלוש הרצות לכל גרסה, זמן אמיתי (`time`):

```bash
time ./node_modules/.bin/tsc
```

| גרסה | זמן |
|---|---|
| ‏6.0.3 | ‏1.65 עד 1.93 שניות |
| ‏7.0.2 | ‏0.34 עד 0.39 שניות |
| ‏7.0.2 עם `--checkers 1` | ‏0.50 שניות |

בפרויקט הקטן הזה יצא פי 5 בערך. גם עם תהליך בדיקה אחד 7.0 מהירה פי 3 בערך, כלומר רוב השיפור מגיע מהקוד הנייטיב עצמו ולא רק מהמקביליות.

## לפני המעבר: 6.0 בלי אזהרות

‏[TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) הוציאה משימוש את `target: es5`, ‏`baseUrl`, ‏`moduleResolution: node` (‏`node10`), ‏`downlevelIteration` ועוד, ו-`outFile` כבר הוסר בה. ב-6.0 אפשר להשתיק את השגיאה עם `"ignoreDeprecations": "6.0"`, אבל ב-7.0 האפשרויות האלה פשוט לא קיימות:

```bash
npx -p typescript@6.0.3 tsc
npx -p typescript@7.0.2 tsc
```

```text
tsconfig.json(3,15): error TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
tsconfig.json(3,15): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.
```

לכן הסדר הוא: לשדרג ל-6.0, לתקן כל אזהרה בלי `ignoreDeprecations`, ורק אז לעבור ל-7.0. את `baseUrl` מחליפים כמו שמוסבר [בפוסט על monorepo](he/posts/typescript-monorepo/).

הבדל אחד נשאר גם בקוד נקי: ‏7.0 מסדרת טיפוסים פנימית בסדר אחר. זה יכול לשנות את הסדר של איברי union בקבצי `.d.ts` ובתצוגה בעורך, ובמקרים נדירים גם להוסיף או להעלים שגיאה. הדגל `--stableTypeOrdering` של 6.0 גורם לה לסדר כמו 7.0, כדי שאפשר יהיה להשוות את הפלט של שתי הגרסאות. הוא מאט את הבדיקה בעד 25%, ונועד לאבחון בלבד, לא לשימוש קבוע. גם [הבדיקה של קבצי JS](he/posts/typescript-migrate-from-js/) השתנתה ב-7.0.

## מה עוד לא עובד: ה-API

‏7.0 לא כוללת API לשימוש מתוך קוד, כזה שכלים כמו typescript-eslint או הקומפיילר של Angular בנויים עליו. ‏Microsoft כתבה שהיא מצפה ש-7.1 תגיע עם API חדש ושונה, ו-[7.1 beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/), שיצאה ב-20 באוקטובר 2026, כבר כוללת אותו.

בינתיים, כלים כאלה נשארים על 6.0. ‏[Angular 22 דורשת](https://angular.dev/reference/versions) TypeScript מגרסה 6.0.0 ועד לפני 6.1.0, ולכן בפרויקט Angular נשארים עם 6.0. ‏Microsoft מציעה לפרויקטים כאלה להריץ את 7.0 בשורת הפקודה לבדיקה מהירה של כל הפרויקט, ולהשאיר את 6.0 לעורך. כדי להריץ את שתיהן זו לצד זו, היא פרסמה את החבילה `@typescript/typescript6`, עם פקודה בשם `tsc6`.

### בגרסאות קודמות

לפני 7.0, הקומפיילר החדש היה זמין כ-preview בחבילה `@typescript/native-preview`, עם פקודה בשם `tsgo`. בפרויקטים שניסו אותו מוקדם, את `tsgo` מחליפים עכשיו ב-`tsc` הרגיל.

## טעויות נפוצות של מתחילים

- **לעבור ל-7.0 עם `ignoreDeprecations` ב-tsconfig.** ב-7.0 הוא לא עוזר, והאפשרויות הישנות הופכות לשגיאה.
- **לשדרג פרויקט Angular ל-7.0.** ‏Angular 22 תומכת רק ב-6.0, והקומפיילר שלה צריך את ה-API.
- **לא לבדוק איזה `tsc` רץ.** כשהתקנתי את `@typescript/typescript6` ליד `typescript@7.0.2`, ‏`npx tsc` הריץ פתאום 6.0.3, כי החבילה מביאה איתה TypeScript 6 עם פקודה באותו שם. כדאי להריץ `npx tsc --version` אחרי כל שינוי בתלויות.

## מה הלאה

זה הפוסט האחרון בסדרה. משם ממשיכים ל-[Angular מההתחלה ועד מומחה](he/series/angular/), שבנויה על TypeScript.
