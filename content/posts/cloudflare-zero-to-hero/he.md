---
title: "Cloudflare מאפס לגיבור: מה זה ואיך פותחים חשבון בטוח"
summary: "מה Cloudflare עושה בין הגולש לשרת, מפת השירותים שהסדרה מכסה, חשבון עם אימות דו-שלבי, API tokens מוגבלים, ומה נותנת התוכנית החינמית."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 27 }
---

הסדרה מתחילה מאפס: בלי ידע קודם ב-Cloudflare, ב-DNS או בשרתים. בסופה יהיה לכם דומיין שמנוהל ב-Cloudflare, API שרץ על Workers עם מסד נתונים ואחסון קבצים, ואתר שמתעדכן לבד בכל push ל-GitHub. צריך רק Node.js מותקן וטרמינל.

## מה Cloudflare עושה

כשגולש נכנס לאתר, הדפדפן שואל קודם את ה-DNS מה הכתובת (IP) של השם, ואז שולח בקשה לכתובת הזו. השרת שבו האתר באמת יושב נקרא **origin**.

Cloudflare נכנס באמצע, כ-**reverse proxy**: ה-DNS מחזיר כתובת של Cloudflare במקום כתובת ה-origin, הבקשה מגיעה למרכז נתונים של Cloudflare הקרוב לגולש, ורק משם, אם צריך, ממשיכה ל-origin. מה שזה נותן:

- **מהירות:** קבצים כמו תמונות ו-CSS נשמרים ב-cache קרוב לגולש.
- **הגנה:** כתובת ה-origin נשארת מוסתרת, והתקפות DDoS נבלמות ברשת של Cloudflare.
- **HTTPS:** Cloudflare מנפיק תעודה ומטפל בהצפנה מול הגולש.

אפשר לראות את זה בכל אתר שעובר דרך Cloudflare:

```bash
curl -sI https://www.cloudflare.com/favicon.ico | grep -iE "server|cf-cache-status|cf-ray"
```

```text
cf-cache-status: HIT
server: cloudflare
cf-ray: a4f767146dd93d7c-TLV
```

`HIT` אומר שהקובץ הגיע מה-cache, ו-`TLV` בסוף `cf-ray` הוא קוד מרכז הנתונים שענה, כאן תל אביב.

## המפה

| שירות | מה הוא עושה | פוסט |
|---|---|---|
| DNS, proxy ו-SSL | מנהלים את הדומיין, מסתירים את ה-origin, HTTPS | 2 |
| Workers | קוד שרץ ברשת של Cloudflare, בלי שרת לנהל | 3–4 |
| KV | אחסון מפתח-ערך מהיר לקריאה | 4 |
| D1 | מסד נתונים SQL (מבוסס SQLite) | 5 |
| R2 | אחסון קבצים, תואם S3 | 5 |
| Static assets | אתר סטטי שמוגש מ-Worker | 6 |

לכל שירות יש תיעוד מסודר ב-[developers.cloudflare.com](https://developers.cloudflare.com/).

## חשבון בטוח

נרשמים ב-[dash.cloudflare.com](https://dash.cloudflare.com/sign-up) ומאמתים את כתובת המייל. בלי מייל מאומת אי אפשר להפעיל אימות דו-שלבי, וזה הצעד הבא.

**אימות דו-שלבי (2FA):** בלוח הבקרה פותחים **My Profile ← Authentication** ([התיעוד](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/)). יש שלוש אפשרויות:

- אפליקציית אימות (TOTP), כמו Google Authenticator.
- מפתח אבטחה: Touch ID, Windows Hello או YubiKey. מומלץ לרשום יותר ממפתח אחד.
- קוד במייל.

בזמן ההגדרה מתקבלים **backup codes**. שומרים אותם במנהל סיסמאות: כל קוד עובד פעם אחת, והם הדרך להיכנס אם הטלפון אבד.

### API tokens

כלים כמו Wrangler ו-GitHub Actions צריכים גישה לחשבון. נותנים להם **API token** ולא את הסיסמה או את ה-Global API Key, שיש לו גישה מלאה לכל החשבון. token מוגבל להרשאות ולמשאבים שבחרתם, אפשר להגביל אותו גם לכתובות IP ולתוקף, ואפשר לבטל אותו בלי לגעת בשאר.

יוצרים token ב-**My Profile ← API Tokens ← Create Token**, בדרך כלל מתבנית מוכנה ([התיעוד](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)). הערך מוצג פעם אחת בלבד, אז מעתיקים אותו מיד למקום מאובטח. נשתמש בזה בפוסט 6.

## התוכנית החינמית

אפשר לעבור את כל הסדרה בלי לשלם. בזמן הכתיבה, ב-Workers בחינם יש 100,000 בקשות ביום ו-10 מילישניות CPU לכל בקשה, ול-KV, ל-D1 ול-R2 יש מכסות חינמיות משלהם. ב-R2 אין תשלום על תעבורה יוצאת (egress). המספרים משתנים, אז בדקו אותם ב[עמוד המחירים](https://developers.cloudflare.com/workers/platform/pricing/) לפני שבונים עליהם.
