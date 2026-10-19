---
title: "OrbStack: Docker ו-Linux ב-Mac בלי הכבדות"
summary: "להתקין OrbStack, להשתמש בפקודת docker הרגילה, לפתוח קונטיינרים ב-name.orb.local, להריץ מכונות Linux עם orb ולבדוק את ההתקנה עם orbctl doctor."
date: 2026-10-19
tags: [docker, containers, macos, dev-tools]
series: { key: mac-dev-setup, order: 5 }
---

Docker צריך Linux, ובמק אין, אז משהו צריך להריץ בשבילכם מכונת Linux קטנה. [OrbStack](https://orbstack.dev/) היא אפליקציה שעושה את זה, כתחליף ל-Docker Desktop. כך גם Homebrew מתאר אותה. נבדק עם OrbStack 2.2 מול [התיעוד](https://docs.orbstack.dev/). הרישוי שונה בין שימוש אישי למסחרי, אז בדקו באתר לפני שמשתמשים בו בעבודה.

## התקנה

```bash
brew install --cask orbstack
orbctl start
```

פותחים את האפליקציה פעם אחת כדי שתסיים הגדרה. `orbctl status` מדפיס `Running` כשהמנוע פעיל. בהגדרות אפשר להפעיל אותו בכניסה למערכת (`app.start_at_login`, כבוי כברירת מחדל).

## פקודות docker לא משתנות

OrbStack מתקין את ה-CLI של `docker` ומכוון Docker context למנוע שלו:

```bash
docker context ls
```

```text
NAME         DESCRIPTION   DOCKER ENDPOINT
orbstack *   OrbStack      unix:///Users/<you>/.orbstack/run/docker.sock
```

כל מה שב-[Docker from zero to hero](he/posts/docker-zero-to-hero/) עובד כמו שהוא: `docker run`, `docker build`, `docker compose`. אם החלפתם context, `docker context use orbstack` מחזיר.

## לקונטיינרים יש שם דומיין

כל קונטיינר זמין ב-`<name>.orb.local`, בלי מיפוי פורטים:

```bash
docker run -d --rm --name web nginx:alpine
curl -s -o /dev/null -w "%{http_code}\n" http://web.orb.local
```

```text
200
```

אפשר עדיין לפרסם פורטים עם `-p` כרגיל. כברירת מחדל פורטים שפורסמו זמינים גם ברשת המקומית (`docker.expose_ports_to_lan: true` ב-`orbctl config show`), אז כבו את זה אם אתם עובדים ברשת משותפת.

## מכונות Linux

כשצריך Linux מלא ולא רק קונטיינר, יוצרים מכונה:

```bash
orbctl create ubuntu dev
orb -m dev uname -a
orbctl list
```

`orb` בלי ארגומנטים פותח shell במכונת ברירת המחדל. כל פקודה עם הקידומת `orb` רצה על Linux, והקבצים של macOS זמינים באותם נתיבים.

## בדיקה ועצירה

```bash
orbctl doctor
orbctl stop
```

`orbctl doctor` בודק ש-`docker`, `docker-compose` ו-`kubectl` נמצאים ושאין משהו אחר ב-`PATH` שתופס את מקומם. `orbctl stop` בלי ארגומנטים עוצר את כל השירות, כולל Docker.

הבא בתור: [pre-commit](he/posts/pre-commit/).
