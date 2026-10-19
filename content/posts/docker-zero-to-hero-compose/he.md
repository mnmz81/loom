---
title: "Docker מאפס לגיבור: Compose, דיבוג וניקוי"
summary: "מריצים את האפליקציה ואת מסד הנתונים מקובץ compose.yaml אחד עם בדיקות בריאות, פקודות Compose, ארגז כלים לדיבוג, פינוי מקום בדיסק והרגלים ל-images של פרודקשן."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 33 }
---

[בחלק הקודם](he/posts/docker-zero-to-hero-ports-volumes-networks/) חיברנו את `hello-app` ל-Postgres עם רשת, volume ושלוש שורות `docker run` ארוכות. Compose מחליף את השורות האלה בקובץ אחד.

## Docker Compose: כל האפליקציה בקובץ אחד

**Docker Compose** מתאר אפליקציה מרובת containers בקובץ אחד ומריץ אותה בפקודה אחת. אבני הבניין שלו הן **services** (ה-containers), ‏**networks** ו-**volumes**. יוצרים `compose.yaml` (‏Compose מחפש את השם הזה קודם):

```yaml
services:
  web:
    build: .
    ports:
      - "8080:3000"
    environment:
      DATABASE_URL: postgres://postgres:dev-only@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: dev-only
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

Compose מכניס את שני השירותים לרשת משותפת, ולכן `web` מגיע למסד הנתונים בשם `db`. (השרת הזעיר שלנו לא קורא את `DATABASE_URL`; הוא רק מראה את החיווט.)

את ה-`healthcheck` עם `condition: service_healthy` נוטים לפספס. ‏`depends_on` רגיל קובע רק סדר הפעלה: תלות נחשבת מוכנה כשה-container שלה *רץ*, לא כשהתוכנה שבפנים מקבלת חיבורים. מסד נתונים יכול לקחת כמה שניות לעלות, ובדיקת הבריאות גורמת ל-`web` לחכות באמת.

הפקודות שצריך:

```bash
docker compose up -d            # בונה אם צריך, יוצר רשתות ו-volumes, מפעיל הכול
docker compose ps               # השירותים והפורטים שלהם
docker compose logs -f web      # עוקב אחרי הלוגים של שירות אחד
docker compose up -d --build    # בונה מחדש images אחרי שינוי קוד
docker compose down             # עוצר ומוחק את ה-containers ואת הרשת
docker compose down -v          # ...וגם את ה-volumes בעלי השם (זה מוחק את הנתונים שלנו)
```

שימו לב לרווח: ‏`docker compose` היא הפקודה הנוכחית; ‏`docker-compose` העצמאית היא הדור הקודם.

כדי להוציא הגדרות מהקובץ, משתמשים ב-`env_file`:

```yaml
services:
  web:
    env_file:
      - path: ./defaults.env
      - path: ./overrides.env
        required: false
```

קבצים מאוחרים דורסים מוקדמים, ו-`required: false` מדלג על קובץ חסר. לערך חד-פעמי, `docker compose run -e LOG_LEVEL=debug web` דורס אותו רק להרצה הזאת.

## ארגז כלים לדיבוג

כשמשהו לא עובד, הולכים מבחוץ פנימה:

```bash
docker ps -a                       # האם הוא רץ? האם הוא יצא?
docker logs --tail 50 <name>       # מה הוא אמר לפני שמת?
docker exec -it <name> sh          # מסתכלים בפנים
docker inspect <name>              # כל הפרטים: IP, mounts, env, קוד יציאה
docker stats                       # CPU וזיכרון חיים לכל container
docker cp <name>:/app/file.txt .   # מעתיק קובץ החוצה מ-container
```

החשודים הרגילים: האפליקציה מאזינה ל-`127.0.0.1` בתוך ה-container במקום ל-`0.0.0.0` (ולכן הפורט המפורסם לא מגיע אליה), פורט שכבר תפוס במארח, משתנה סביבה חסר, קובץ חסר כי `.dockerignore` החריג אותו, או נתיב ששונה בין המחשב שלנו ל-container.

## ניקוי

images ישנים, containers שנעצרו ו-build cache מצטברים:

```bash
docker system df              # מה תופס מקום
docker system prune           # מוחק containers שנעצרו, רשתות לא בשימוש, images "תלויים", build cache לא בשימוש
docker system prune -a        # ...וגם כל image שאף container לא משתמש בו
docker builder prune          # רק את ה-build cache
```

‏`docker system prune` מבקש אישור ו**לא** נוגע ב-volumes כברירת מחדל. ‏`--volumes` מוחק גם volumes אנונימיים שלא בשימוש, אז קוראים את האזהרה קודם.

## הרגלים ל-images של פרודקשן

מעבר ל-image בסיס קטן, בנייה רב-שלבית, `USER`, סדר שמתאים ל-cache, ‏`.dockerignore` ובלי סודות ב-image:

- **עניין אחד לכל container.** אפליקציית web ומסד הנתונים שלה הם שני containers.
- **מקבעים גרסאות של images בסיס ובונים מחדש בקביעות** בשביל תיקוני אבטחה.
- **סורקים את ה-images** לפגיעויות ידועות ב-CI.
- **תהליך אחד, בחזית,** שכותב ל-standard output בשביל `docker logs`.

## לאן ממשיכים

כדי לקבע את זה, מכניסים ל-container אפליקציה קיימת, עם Dockerfile, ‏`.dockerignore` ו-Compose לצד מסד הנתונים שלה.

הצעד הבא: לבנות ולדחוף את ה-image אוטומטית בכל מיזוג. ‏[GitHub Actions מאפס לגיבור](he/posts/github-actions-zero-to-hero/) בונה בדיוק את ה-pipeline הזה, ‏[GitHub מאפס לגיבור](he/posts/github-zero-to-hero/) מכסה את הצד של הריפוזיטורי, ו-[Git מאפס לגיבור](he/posts/git-zero-to-hero/) שם אם בקרת גרסאות עדיין חדשה. ה-[Get started](https://docs.docker.com/get-started/) של Docker וה-[Dockerfile best practices](https://docs.docker.com/build/building/best-practices/) הם ההמשך הטוב ביותר.

כדי להריץ הרבה containers על כמה מכונות, עם ריפוי עצמי ועדכונים בלי השבתה, ממשיכים ל-[Kubernetes מאפס לגיבור](he/posts/kubernetes-zero-to-hero/). כדי להריץ containers בענן, מתחילים במפה ב-[AWS מאפס לגיבור](he/posts/aws-zero-to-hero/). ואם הפקודות שמקלידים בתוך container הן החלק הלא מוכר, ב[דף העזר לפקודות Linux](he/posts/linux-commands/) יש אותן.
