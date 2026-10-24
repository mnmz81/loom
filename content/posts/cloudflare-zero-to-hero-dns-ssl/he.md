---
title: "Cloudflare מאפס לגיבור: DNS, הענן הכתום ו-HTTPS"
summary: "מה זה DNS וסוגי הרשומות, להעביר דומיין ל-Cloudflare דרך nameservers, ההבדל בין proxied ל-DNS only, מצבי SSL/TLS, ומה נשמר ב-cache."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 28 }
---

הפוסט הזה צריך דומיין משלכם, שנקנה אצל רשם (registrar) כמו Namecheap או GoDaddy, או ב-Cloudflare Registrar עצמו. אין דומיין? אפשר לדלג לפוסט הבא: Workers עובדים גם בלי דומיין.

## מה זה DNS

DNS הוא ספר הטלפונים של האינטרנט: הוא הופך שם כמו `example.com` לכתובת IP. כל דומיין מחזיק רשימת **רשומות**:

| סוג | מה הוא אומר | דוגמה |
|---|---|---|
| `A` | השם מצביע לכתובת IPv4 | `example.com → 203.0.113.10` |
| `AAAA` | אותו דבר ל-IPv6 | `example.com → 2001:db8::10` |
| `CNAME` | השם הוא כינוי לשם אחר | `www → example.com` |
| `MX` | לאן נשלח מייל לדומיין | `example.com → mail.example.com` |
| `TXT` | טקסט חופשי, בעיקר לאימות בעלות ולמייל | `v=spf1 ...` |

מי שמחזיק את הרשומות הוא ה-**nameserver** של הדומיין. כדי ש-Cloudflare ינהל אותן, מעבירים את ה-nameservers אליו.

## להעביר דומיין ל-Cloudflare

([התיעוד המלא](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/))

1. בלוח הבקרה: **Domains ← Onboard a domain**, מזינים את הדומיין (`example.com`, בלי `www`) ובוחרים תוכנית. Free מספיקה.
2. Cloudflare סורק את הרשומות הקיימות. עוברים עליהן ובודקים שאין חסרות, במיוחד `MX` של המייל. רשומה שנשכחה כאן היא אתר או מייל שמפסיקים לעבוד.
3. אם DNSSEC פעיל אצל הרשם, מכבים אותו **לפני** שמחליפים nameservers. אחרת הדומיין עלול להפסיק להיפתח.
4. Cloudflare נותן שני nameservers. אצל הרשם מוחקים את הקיימים ומדביקים אותם בדיוק.
5. הסטטוס הוא **Pending** עד שהשינוי מתפשט, לפעמים עד 24 שעות. כשהוא **Active** מגיע מייל. אז אפשר להפעיל מחדש DNSSEC, הפעם דרך Cloudflare.

בודקים מהטרמינל:

```bash
dig ns example.com +short
```

כשהתשובה מראה שמות שמסתיימים ב-`ns.cloudflare.com`, הדומיין עבר.

## ענן כתום או אפור

לכל רשומת `A`, `AAAA` ו-`CNAME` יש מתג **Proxy status**:

- **Proxied (ענן כתום):** ה-DNS מחזיר כתובות של Cloudflare, ותעבורת HTTP ו-HTTPS עוברת דרכו. כך מקבלים cache, הגנה ו-HTTPS, וכתובת ה-origin מוסתרת.
- **DNS only (ענן אפור):** ה-DNS מחזיר את הכתובת האמיתית, ו-Cloudflare לא נוגע בתעבורה.

רשומות `MX` ו-`TXT` תמיד DNS only. גם שירות שאינו אתר, כמו SSH לשרת, צריך ענן אפור. אבל רשומה אפורה לאתר חושפת את כתובת ה-origin לכל מי ששואל, ואז אפשר לעקוף את Cloudflare ולתקוף את השרת ישירות. לאתרים: כתום.

## מצבי SSL/TLS

כשהרשומה כתומה יש שני חיבורים: גולש ← Cloudflare, ו-Cloudflare ← origin. מצב ההצפנה, תחת **SSL/TLS** בלוח הבקרה, קובע מה קורה בשני ([התיעוד](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)):

| מצב | גולש ← Cloudflare | Cloudflare ← origin |
|---|---|---|
| Off | HTTP | HTTP |
| Flexible | HTTPS | HTTP, לא מוצפן |
| Full | HTTPS | HTTPS, בלי בדיקת תעודה |
| Full (strict) | HTTPS | HTTPS עם תעודה תקפה |

הגולש רואה מנעול גם ב-Flexible, אבל הדרך ל-origin עוברת גלויה. Cloudflare ממליצים על Full או Full (strict). לשרת שלכם אפשר להוציא תעודה בחינם מ-Let's Encrypt או מ-Cloudflare Origin CA. ברירת המחדל, Automatic SSL/TLS, בודקת את ה-origin ובוחרת את המצב הבטוח ביותר שהוא תומך בו. Workers ואתרים שמוגשים מ-Cloudflare עצמו לא צריכים origin, אז השאלה הזו לא חלה עליהם.

## מה נשמר ב-cache

Cloudflare שומר ב-cache לפי סיומת הקובץ: תמונות, CSS, JS, פונטים, PDF ועוד. HTML ו-JSON **לא** נשמרים כברירת מחדל, כדי שתוכן דינמי לא יוגש ישן. הכותרת `cf-cache-status` מספרת מה קרה:

| ערך | משמעות |
|---|---|
| `HIT` | הוגש מה-cache |
| `MISS` | מתאים ל-cache אבל עוד לא היה שם, הגיע מה-origin |
| `EXPIRED` | היה ב-cache ופג תוקפו |
| `DYNAMIC` | לא מתאים ל-cache, למשל HTML |
| `BYPASS` | ה-origin ביקש לא לשמור (`no-store`, `private`) |

```bash
curl -sI https://example.com/style.css | grep -i cf-cache-status
```

בבקשה הראשונה לקובץ צפוי `MISS`, ובבקשה הבאה מאותו אזור `HIT`. כדי לשמור ב-cache גם HTML מוסיפים Cache Rule ([התיעוד](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)).
