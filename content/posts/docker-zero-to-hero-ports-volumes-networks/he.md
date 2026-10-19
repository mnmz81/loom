---
title: "Docker מאפס לגיבור: פורטים, volumes ורשתות"
summary: "מחברים containers לעולם: פרסום פורטים בלי לחשוף יותר מדי, volumes, ‏bind mounts ו-tmpfs, רשתות שבהן containers מוצאים זה את זה לפי שם, והעברת הגדרות וסודות."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 32 }
---

ה-image ‏`hello-app` [מהחלק על ה-Dockerfile](he/posts/docker-zero-to-hero-dockerfile/) רץ לבד. כאן הוא מקבל פורט שאפשר להגיע אליו, נתונים ששורדים את ה-container ומסד נתונים Postgres לידו.

## פורטים

ל-container יש רשת משלו. כברירת מחדל שום דבר מבחוץ לא מגיע אליו, ולכן **מפרסמים** פורט עם `-p HOST:CONTAINER`:

```bash
docker run -d -p 8080:80 nginx                 # פורט 8080 במארח -> פורט 80 ב-container
docker run -d -p 127.0.0.1:8080:80 nginx       # נגיש רק מהמחשב הזה
docker run -d -p 80 nginx                      # Docker בוחר פורט פנוי במארח (ראו docker ps)
docker run -d -P nginx                         # מפרסם כל פורט שעשו לו EXPOSE לפורטים אקראיים
```

![הדפדפן מגיע ל-container בשם web דרך פורט 8080 במארח שממופה ל-3000 ב-container. ה-containers‏ web ו-db חולקים רשת מוגדרת-משתמש, ולכן web מגיע למסד הנתונים לפי שם בפורט 5432. הפורט של מסד הנתונים לא מפורסם, ולכן שום דבר מבחוץ לא יכול להגיע אליו.](/images/docker-zero-to-hero/ports-and-networks.svg)

פורט מפורסם מאזין כברירת מחדל בכל ממשקי הרשת, כך שכל מי שמגיע למחשב מגיע לאפליקציה. מסדי נתונים ושירותים רגישים לא מפרסמים, או קושרים ל-`127.0.0.1` כמו למעלה. ו-`EXPOSE` הוא רק תיעוד: רק `-p` או `-P` פותחים פורט.

## נתונים: volumes ו-bind mounts

מערכת הקבצים של container נעלמת איתו. לנתונים שחייבים לשרוד (מסד נתונים, העלאות) מחברים משהו מבחוץ. יש שלושה סוגים:

![שלושה מקורות שמזינים container: volume שמנוהל על ידי Docker ושורד מחיקת ה-container, bind mount שהוא תיקייה במחשב שלנו שאפשר לערוך בזמן אמת, ו-tmpfs שנשמר בזיכרון ונעלם כשה-container נעצר.](/images/docker-zero-to-hero/storage-options.svg)

- **Volume** הוא אחסון שמנוהל על ידי Docker. זו הדרך המועדפת לשמור נתונים: קל לגבות או להעביר, ובטוח לשיתוף בין containers.
- **Bind mount** ממפה תיקייה מהמחשב שלנו לתוך ה-container. משתמשים בו כשצריך להגיע לאותם קבצים משני הצדדים, למשל כדי לערוך קוד בזמן אמת בפיתוח.
- **tmpfs** חי בזיכרון ואף פעם לא נכתב לדיסק. מתאים למצב זמני ורגיש.

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=dev-only -v pgdata:/var/lib/postgresql/data postgres:17
docker run --rm -it -v "$(pwd)":/app -w /app node:24-slim sh    # bind mount: התיקייה שלנו, בזמן אמת
docker run -d -v pgdata:/data:ro nginx                         # volume לקריאה בלבד
```

מוחקים את ה-container בשם `db` ומפעילים חדש עם אותו `-v pgdata:...`, והנתונים עדיין שם. (נתיב הנתונים תלוי ב-image והשתנה בין גרסאות של Postgres, אז בודקים בדף ה-image ב-Docker Hub.)

`-v` היא הצורה הקצרה; ‏`--mount` מפורשת יותר ונדרשת לאפשרויות מתקדמות:

```bash
docker run -d --name devtest --mount source=myvol,target=/app nginx
```

מחיקת container לא מוחקת את ה-volumes שלו:

```bash
docker volume ls
docker volume rm pgdata
docker volume prune       # מוחק volumes שאף אחד לא משתמש בהם
```

## רשתות: containers שמדברים זה עם זה

containers על אותה **רשת מוגדרת-משתמש** מוצאים זה את זה *לפי שם*: ‏Docker מריץ בשביל זה שרת DNS קטן. ברשת ברירת המחדל (default bridge) containers מגיעים זה לזה רק לפי כתובת IP, ולכן לכל דבר רציני יוצרים רשת משלנו:

```bash
docker network create app-net
docker run -d --name db --network app-net -e POSTGRES_PASSWORD=dev-only postgres:17
docker run -d --name web --network app-net -p 8080:3000 -e DATABASE_URL=postgres://postgres:dev-only@db:5432/postgres hello-app
```

בתוך `web`, השם `db` מתורגם עכשיו ל-container של מסד הנתונים. מסד הנתונים לא קיבל `-p`: רק `web` צריך להגיע אליו. בין ה-containers של אותה רשת הפורטים פתוחים, ומבחוץ מגיעים אליהם רק כשמפרסמים אותם.

למקרים מיוחדים: ‏`--network host` חולק את הרשת של המארח, ו-`--network none` מנתק את ה-container לגמרי.

## הגדרות וסודות

מעבירים הגדרות כמשתני סביבה, ולא אופים אותן ל-image:

```bash
docker run -e LOG_LEVEL=debug hello-app
docker run --env-file .env hello-app
```

התיעוד של Docker מזהיר מפני משתני סביבה לסיסמאות אמיתיות: הם מופיעים ב-`docker inspect` ויכולים לדלוף. משתמשים ב-secrets (‏Compose ו-Swarm תומכים בהם) או במאגר הסודות של הפלטפורמה. סיסמאות `dev-only` כמו למעלה בסדר מקומית. אף פעם לא עושים `COPY` לקובץ `.env` או למפתח לתוך image: כל מי שמושך אותו יכול לקרוא, ושכבה ש"נמחקה" אחר כך עדיין נשארת בהיסטוריה.
