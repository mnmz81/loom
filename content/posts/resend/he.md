---
title: "Resend: לשלוח אימייל מהקוד דרך API"
summary: "מפתח API עם הרשאת שליחה בלבד, מייל ראשון עם curl ועם ה-SDK של Node, טיפול בשגיאות, אימות דומיין משלכם, ושליחה חוזרת בלי כפילויות עם idempotency key."
date: 2026-10-24
tags: [email, dev-tools]
---

[Resend](https://resend.com/docs) הוא שירות לשליחת מיילים מאפליקציה: אישור הרשמה, איפוס סיסמה, התראות. במקום להפעיל שרת SMTP שולחים בקשת HTTP אחת. קוד ה-SDK נבדק עם `resend` 6.34. שליחה אמיתית דורשת חשבון, ולכן תגובת ההצלחה לקוחה מהתיעוד, ושגיאת המפתח הלא תקין הורצה בפועל.

## מפתח API

יוצרים מפתח בלוח הבקרה תחת API Keys. יש שתי רמות הרשאה:

- `full_access`: יצירה, מחיקה ועדכון של כל משאב בחשבון.
- `sending_access`: שליחת מיילים בלבד, ואפשר להגביל אותה לדומיין אחד.

לאפליקציה מספיק `sending_access`. המפתח מתחיל ב-`re_` ומוצג פעם אחת בלבד, אז שומרים אותו מיד במשתנה סביבה `RESEND_API_KEY` ולא בקוד.

## מייל ראשון

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "html": "<p>it works!</p>"
  }'
```

```json
{ "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }
```

`onboarding@resend.dev` הוא שולח לבדיקות בלבד, עד שמאמתים דומיין משלכם. `delivered@resend.dev` היא כתובת בדיקה של Resend שמדמה מסירה מוצלחת, בלי לשלוח לאדם אמיתי. השדות `from`, `to` ו-`subject` חובה, ובנוסף צריך לפחות אחד מ-`html` או `text`. `to` מקבל עד 50 נמענים.

## ה-SDK של Node

```bash
npm install resend
```

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "Acme <onboarding@resend.dev>",
  to: ["delivered@resend.dev"],
  subject: "Hello",
  html: "<strong>It works!</strong>",
});

if (error) throw new Error(error.message);
console.log(data.id);
```

ה-SDK לא זורק חריגה כשה-API מחזיר שגיאה. הוא מחזיר `{ data, error }`, ובכל קריאה צריך לבדוק את `error`. כך נראה מפתח לא תקין:

```text
{
  data: null,
  error: {
    message: 'API key is invalid',
    name: 'validation_error',
    statusCode: 401
  }
}
```

ה-SDK עובד גם ב-Cloudflare Workers ([המדריך של Resend](https://resend.com/docs/send-with-cloudflare-workers)); את המפתח שומרים שם כסוד עם `wrangler secret put RESEND_API_KEY`, כמו שמוסבר ב[פוסט על Wrangler](he/posts/cloudflare-wrangler/).

## דומיין משלכם

כדי לשלוח מכתובת שלכם מוסיפים דומיין תחת Domains ומאמתים אותו ([התיעוד](https://resend.com/docs/add-a-domain)):

1. משתמשים בתת-דומיין, למשל `updates.example.com`, ולא בדומיין הראשי. כך המוניטין של המיילים האוטומטיים לא משפיע על המיילים הרגילים שלכם.
2. מעתיקים את הרשומות מלשונית Records אל ספק ה-DNS, בדיוק כפי שהן: רשומת DKIM ורשומות SPF מסוג `TXT` ו-`MX`, או `CNAME` בדומיינים חדשים. ב-Cloudflare מכבים את ה-proxy (הענן הכתום) על רשומות `CNAME`, אחרת האימות לא יעבור.
3. האימות מסתיים בדרך כלל תוך כ-15 דקות, ולפעמים לוקח עד 72 שעות.
4. אחרי האימות מוסיפים רשומת DMARC, שעוזרת לספקי מייל לסמוך על הדומיין ולדחות זיופים.

## בלי כפילויות

רשת שנופלת באמצע בקשה משאירה אתכם בלי לדעת אם המייל יצא. אם תשלחו שוב, הנמען עלול לקבל אותו פעמיים. `idempotencyKey` פותר את זה:

```typescript
await resend.emails.send(
  { from, to, subject, html },
  { idempotencyKey: `welcome-email/${userId}` },
);
```

ה-SDK שולח את המפתח בכותרת `Idempotency-Key`. בקשה חוזרת עם אותו מפתח בתוך 24 שעות לא שולחת מייל נוסף. המפתח צריך להיות ייחודי לכל פעולה ועד 256 תווים, ולכן בונים אותו ממה שמזהה את הפעולה (סוג המייל ומזהה המשתמש) ולא מערך אקראי.

מגבלת הקצב ברירת המחדל היא 10 בקשות בשנייה לצוות, ומעבר לה מתקבל `429`. לכמה מיילים בבת אחת יש `resend.batch.send`, שמקבל מערך של הודעות בבקשה אחת (בלי קבצים מצורפים). המגבלות והמחירים משתנים לפי תוכנית; בדקו אותם ב[תיעוד](https://resend.com/docs).
