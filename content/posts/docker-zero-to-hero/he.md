---
title: "Docker מאפס לגיבור"
summary: "מדריך מעשי ל-Docker עם תרשימים: images ו-containers, כתיבת Dockerfile, שכבות ו-cache, פורטים, volumes, רשתות, Docker Compose, ניקוי וההרגלים ששומרים על images קטנים ובטוחים."
date: 2026-10-10
tags: [docker, containers, tutorial]
---

"אצלי זה עובד" הוא המשפט הכי ישן בעולם התוכנה. Docker הוא הכלי שמפרק אותו ברוב המקרים: אורזים את האפליקציה יחד עם כל מה שהיא צריכה, ואז היא רצה אותו דבר על הלפטופ שלך, על הלפטופ של חבר צוות ועל שרת.

המדריך בונה אפליקציית web קטנה אחת ומכניס אותה ל-container צעד אחר צעד. כל רעיון חדש מופיע ברגע שהאפליקציה צריכה אותו: images, Dockerfile, פורטים, נתונים, מסד נתונים לידה, ובסוף Docker Compose כדי להריץ את הכול בפקודה אחת.

## מה זה Docker

Docker היא פלטפורמה פתוחה לפיתוח, להפצה ולהרצה של אפליקציות. היא אורזת אפליקציה ב-**container**: סביבה מבודדת שמחזיקה את האפליקציה ואת מה שהיא צריכה כדי לרוץ, כך שהיא לא תלויה במה שמותקן במחשב המארח.

שלוש מילים נושאות את רוב אוצר המילים:

- **Image** הוא תבנית לקריאה בלבד: האפליקציה שלך יחד עם סביבת הריצה, הספריות והקבצים שלה. בונים אותו פעם אחת.
- **Container** הוא מופע רץ של image. אפשר להפעיל, לעצור ולמחוק containers כמה פעמים שרוצים, ו-image אחד יכול להפעיל הרבה מהם.
- **Registry** מאחסן images. **Docker Hub** הוא הציבורי ש-Docker משתמש בו כברירת מחדל, ואפשר להריץ גם registry פרטי.

![Dockerfile נבנה ל-image עם docker build. הפקודה docker run מפעילה container אחד או יותר מה-image. אפשר לדחוף image ל-registry כמו Docker Hub עם docker push ולהוריד אותו עם docker pull.](/images/docker-zero-to-hero/image-to-container.svg)

מאחורי הקלעים ל-Docker יש שני חלקים: ה-**daemon** (‏`dockerd`), שעושה את העבודה של ניהול images, containers, רשתות ו-volumes, וה-**client** (‏`docker`), הפקודה שאתה מקליד. ה-client שולח את הפקודה ל-daemon. גם Docker Compose הוא client, לאפליקציות שמורכבות מכמה containers.

### container הוא לא מכונה וירטואלית

מכונה וירטואלית (VM) נושאת מערכת הפעלה שלמה עם ליבה (kernel) משלה. container הוא תהליך מבודד שחולק את הליבה של המארח, ומשתמש בתכונות של Linux כמו namespaces לבידוד. בגלל זה containers עולים בשניות ותופסים הרבה פחות מקום, אז אפשר להריץ יותר מהם על אותו חומרה.

![משמאל: מחסנית של מכונות וירטואליות עם חומרה, מערכת הפעלה מארחת עם hypervisor, ושתי מכונות וירטואליות, לכל אחת מערכת הפעלה אורחת, ספריות ואפליקציה משלה. מימין: מחסנית של containers עם חומרה, מערכת הפעלה מארחת, Docker Engine ושלושה containers שמחזיקים רק ספריות ואפליקציה וחולקים את הליבה של המארח.](/images/docker-zero-to-hero/containers-vs-vms.svg)

הצד השני: container מבודד כברירת מחדל, אבל הוא לא מכונה נפרדת, ולכן הבידוד חלש מזה של VM. (במחשב Mac או Windows, Docker Desktop מריץ ברקע מכונה וירטואלית קטנה של Linux, כי containers צריכים ליבת Linux. כמעט אף פעם לא מרגישים בזה.)

## מתקינים ובודקים שזה עובד

הדרך הקלה היא **Docker Desktop** (ל-Mac, ל-Windows ול-Linux), מ-[docker.com](https://docs.docker.com/get-started/get-docker/). בשרת Linux אפשר להתקין במקום זה את **Docker Engine** לבדו. שימו לב ש-Docker Desktop דורש מנוי בתשלום לשימוש מסחרי בחברות גדולות (התיעוד מציב את הגבול בלמעלה מ-250 עובדים או למעלה מ-10 מיליון דולר הכנסה שנתית), והוא חינמי לשימוש אישי ולעסקים קטנים.

ואז בודקים:

```bash
docker --version
docker compose version
docker run hello-world
```

הפקודה האחרונה מורידה image זעיר, מריצה אותו, מדפיסה הודעת ברכה ומסיימת. אם רואים את ההודעה, Docker עובד.

## ה-container הראשון

בואו נריץ שרת web בלי להתקין אותו:

```bash
docker run -d --name web -p 8080:80 nginx
```

פותחים `http://localhost:8080` ורואים את דף הפתיחה של nginx. מה הפקודה אמרה:

- `docker run` יוצרת container מ-image ומפעילה אותו. אם ה-image עוד לא על המחשב, Docker מוריד אותו קודם מ-Docker Hub.
- `-d` (‏*detached*) מריץ ברקע.
- `--name web` נותן לו שם, כדי שלא נצטרך להשתמש במזהה האקראי.
- `-p 8080:80` מעביר פורט 8080 במחשב שלך לפורט 80 בתוך ה-container.
- `nginx` הוא ה-image.

עכשיו מסתכלים עליו:

```bash
docker ps                 # containers שרצים
docker ps -a              # כל ה-containers, כולל אלה שנעצרו
docker logs web           # מה הוא הדפיס (אפשר להוסיף -f כדי לעקוב)
docker exec -it web sh    # פותח shell בתוכו; מקלידים exit כדי לצאת
docker stop web           # עוצר אותו
docker start web          # מפעיל שוב את אותו container
docker rm web             # מוחק אותו (קודם עוצרים, או משתמשים ב-rm -f)
```

container חי כל עוד התהליך הראשי שלו חי. ‏`hello-world` מדפיס את ההודעה והתהליך נגמר, ולכן ה-container נעצר. ‏`nginx` ממשיך לרוץ עד שעוצרים אותו. אם container שהפעלת "יוצא מיד", התהליך שבפנים הסתיים או קרס: בודקים `docker logs`.

כמה דגלים של `docker run` שישמשו אותך כל הזמן:

| דגל | מה הוא עושה |
|---|---|
| `-d` | רץ ברקע |
| `-it` | טרמינל אינטראקטיבי, ל-shell (‏`docker run -it ubuntu bash`) |
| `--rm` | מוחק את ה-container אוטומטית כשהוא יוצא |
| `--name <name>` | בוחר את שם ה-container |
| `-p host:container` | מפרסם פורט |
| `-e KEY=value` | מגדיר משתנה סביבה |
| `-v name:/path` | מחבר volume |

הפקודה `docker run --rm -it ubuntu bash` היא Linux חד-פעמי נחמד: מקבלים shell, וה-container נעלם כשיוצאים.

## Images ו-tags

```bash
docker pull node:24-slim     # מוריד image
docker images                # מציג את ה-images המקומיים
docker rmi node:24-slim      # מוחק אחד
```

שם של image נראה כך: ‏`node:24-slim`: השם, נקודתיים, ו-**tag** שבדרך כלל מקודד גרסה וטעם. כמה הרגלים:

- tags יכולים לזוז. ‏`latest` הוא סתם tag ומשמעותו "מה שהמפרסם תייג אחרון", לא "החדש ביותר" ולא "הטוב ביותר". בכל דבר שרוצים לשחזר, משתמשים בגרסה מפורשת.
- לשחזור מלא אפשר לקבע **digest** (‏`image@sha256:...`), שמזהה תוכן מדויק. הוא לא משתנה, אבל מעדכנים אותו ידנית (או נותנים לכלי כמו Dependabot).
- מעדיפים **Docker Official Images** ומפרסמים מאומתים ב-Docker Hub, וגרסאות קטנות (‏`-slim`, ‏`alpine`) כשהן מתאימות.

## האפליקציה שלנו, ב-container

צריך משהו להכניס ל-container. יוצרים תיקייה `hello-app` עם שרת Node זעיר:

```js
// server.js
const http = require('node:http');

const port = process.env.PORT || 3000;
http
  .createServer((req, res) => res.end('Hello from a container\n'))
  .listen(port, () => console.log(`listening on ${port}`));
```

```json
{
  "name": "hello-app",
  "version": "1.0.0",
  "scripts": { "start": "node server.js" }
}
```

מריצים `npm install` פעם אחת כדי שיהיה `package-lock.json` (נצטרך אותו). עכשיו ה-**Dockerfile**: קובץ טקסט של הוראות, שכל אחת מהן הופכת לשכבה של ה-image. שומרים אותו בשם `Dockerfile` (בלי סיומת):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

שורה אחר שורה:

- `FROM node:24-slim` מתחיל מ-image בסיס שכבר יש בו Node. כל Dockerfile מתחיל ב-`FROM`.
- `WORKDIR /app` קובע את תיקיית העבודה להוראות הבאות, ויוצר אותה.
- `COPY package*.json ./` מעתיק קודם רק את קבצי ה-package. תזכרו את זה, זה חשוב עוד רגע.
- `RUN npm ci --omit=dev` מריץ פקודה ב*זמן הבנייה* ושומר את התוצאה כשכבה. כאן היא מתקינה תלויות.
- `COPY . .` מעתיק ל-image את שאר הפרויקט.
- `USER node` מריץ את האפליקציה כמשתמש `node` חסר ההרשאות שבאים עם ה-images של Node, ולא כ-root.
- `EXPOSE 3000` *מתעד* שהאפליקציה מאזינה ל-3000. הוא לא מפרסם שום דבר (עוד על זה בהמשך).
- `CMD ["node", "server.js"]` היא פקודת ברירת המחדל כש-container מתחיל.

מוסיפים לידו `.dockerignore`, כדי שזבל לא ייכנס לבנייה:

```plain text
node_modules
.git
.env
*.md
```

התבניות עובדות כמו ב-`.gitignore`. כדאי להשאיר את `node_modules` בחוץ כי ה-image מתקין לעצמו, ואת `.env` בחוץ כי סודות לא שייכים ל-images.

בונים ומריצים:

```bash
docker build -t hello-app .
docker run -d --name hello -p 3000:3000 hello-app
curl localhost:3000
```

```plain text
Hello from a container
```

הדגל `-t hello-app` נותן שם (tag) ל-image, והנקודה `.` היא **build context**: התיקייה שהבנייה רשאית להעתיק ממנה קבצים. הרגע אריזת אפליקציה. כל מי שיש לו Docker יכול להריץ את אותן שתי פקודות ולקבל אותה תוצאה, בלי להתקין Node.

### שכבות ו-build cache

כל הוראה ב-Dockerfile יוצרת **שכבה** (layer), ו-image הוא מחסנית שלהן. Docker שומר שכבות ב-cache: אם הוראה וכל מה שהיא תלויה בו לא השתנו, הוא משתמש שוב בשכבה במקום להריץ אותה מחדש. אבל ברגע ששכבה אחת משתנה, כל השכבות שאחריה נבנות מחדש.

![מחסנית שכבות ל-Dockerfile: ‏FROM node:24-slim, ‏WORKDIR /app, ‏COPY של קבצי ה-package, ‏RUN npm ci, ‏COPY של קוד המקור, ושכבת container דקה לקריאה וכתיבה למעלה. ארבע השכבות התחתונות מסומנות כ-cached וה-COPY של קוד המקור מסומן כ-rebuilt.](/images/docker-zero-to-hero/image-layers.svg)

זה מסביר את הסדר ב-Dockerfile שלנו. עורכים קבצי מקור כל היום, אבל התלויות משתנות לעתים רחוקות. כשמעתיקים את `package*.json` ומתקינים *לפני* שמעתיקים את המקור, עריכה של `server.js` בונה מחדש רק את ה-`COPY` האחרון, וה-`npm ci` האיטי מגיע מה-cache. אם מהפכים את הסדר, כל עריכה קטנה מתקינה הכול מחדש.

הכלל: **שמים למעלה את מה שמשתנה לעתים רחוקות, ולמטה את מה שמשתנה לעתים קרובות.**

containers מוסיפים עוד דבר אחד: שכבה דקה לקריאה וכתיבה מעל ה-image. כל מה ש-container כותב הולך לשם, והיא נמחקת עם ה-container. בגלל זה נתונים צריכים volumes (בהמשך).

עוד מלכודת cache ב-images מבוססי Debian: מריצים `apt-get update` ו-`apt-get install` באותו `RUN`, כדי שלא ישתמשו שוב ברשימת חבילות ישנה מה-cache, ומנקים באותה שורה כדי לשמור על שכבה קטנה:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
    && rm -rf /var/lib/apt/lists/*
```

### בנייה רב-שלבית: בונים גדול, שולחים קטן

כלי בנייה (מהדרים, תלויות פיתוח) נחוצים כדי לבנות את האפליקציה אבל לא כדי להריץ אותה. **בנייה רב-שלבית** (multi-stage) משתמשת בשלב אחד לבנייה ומעתיקה רק את התוצאה ל-image סופי קטן:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

בשלב הראשון יש Node וכל תלויות הפיתוח. ה-image הסופי הוא רק nginx והקבצים הבנויים, ושלב הבנייה נזרק. (תיקיית הפלט, כאן `dist`, תלויה בפרויקט.) זו הדרך הסטנדרטית לשלוח אפליקציית front-end כמו זו שהבלוג הזה בנוי ממנה.

### שתי דרכים לכתוב את פקודת ההפעלה

`CMD` קובע את פקודת ברירת המחדל, ו-`ENTRYPOINT` קובע את הקובץ שתמיד רץ, כש-`CMD` מספק ארגומנטי ברירת מחדל:

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

אז `docker run image` מריץ `s3cmd --help`, ו-`docker run image ls s3://bucket` מריץ `s3cmd ls s3://bucket`. תמיד משתמשים ב-**exec form**, מערך ה-JSON (‏`["node", "server.js"]`), ולא במחרוזת רגילה: הוא מריץ את התוכנית ישירות כתהליך הראשי של ה-container, כך שהיא מקבלת אותות כמו בקשת העצירה. בצורת ה-shell יש shell באמצע שעלול לבלוע אותם.

## פורטים

ל-container יש רשת משלו. כברירת מחדל שום דבר מבחוץ לא יכול להגיע אליו, ולכן **מפרסמים** פורט עם `-p HOST:CONTAINER`:

```bash
docker run -d -p 8080:80 nginx                 # פורט 8080 במארח -> פורט 80 ב-container
docker run -d -p 127.0.0.1:8080:80 nginx       # נגיש רק מהמחשב הזה
docker run -d -p 80 nginx                      # Docker בוחר פורט פנוי במארח (ראו docker ps)
docker run -d -P nginx                         # מפרסם כל פורט שעשו לו EXPOSE לפורטים אקראיים
```

![הדפדפן מגיע ל-container בשם web דרך פורט 8080 במארח שממופה ל-3000 ב-container. ה-containers‏ web ו-db חולקים רשת מוגדרת-משתמש, ולכן web מגיע למסד הנתונים לפי שם בפורט 5432. הפורט של מסד הנתונים לא מפורסם, ולכן שום דבר מבחוץ לא יכול להגיע אליו.](/images/docker-zero-to-hero/ports-and-networks.svg)

שני דברים לזכור. כברירת מחדל פורט מפורסם מאזין בכל ממשקי הרשת של המחשב, כך שכל מי שמגיע למחשב שלך מגיע לאפליקציה. לבסיסי נתונים ולשירותים רגישים, או לא מפרסמים בכלל או קושרים ל-`127.0.0.1` כמו למעלה. ו-`EXPOSE` ב-Dockerfile הוא רק תיעוד: הוא לא מפרסם כלום. רק `-p` או `-P` פותחים פורט החוצה.

## נתונים: volumes ו-bind mounts

מערכת הקבצים של container נעלמת איתו. לנתונים שחייבים לשרוד (מסד נתונים, העלאות) מחברים משהו מבחוץ. יש שלושה סוגים:

![שלושה מקורות שמזינים container: volume שמנוהל על ידי Docker ושורד מחיקת ה-container, bind mount שהוא תיקייה במחשב שלך שאפשר לערוך בזמן אמת, ו-tmpfs שנשמר בזיכרון ונעלם כשה-container נעצר.](/images/docker-zero-to-hero/storage-options.svg)

- **Volume** הוא אחסון שמנוהל על ידי Docker. זו הדרך המועדפת לשמור נתונים: קל לגבות או להעביר, ובטוח לשיתוף בין containers.
- **Bind mount** ממפה תיקייה מהמחשב שלך לתוך ה-container. משתמשים בו כשצריך להגיע לאותם קבצים משני הצדדים, למשל כדי לערוך קוד בזמן אמת בפיתוח.
- **tmpfs** חי בזיכרון ולא נכתב לדיסק לעולם. טוב למצב זמני ורגיש.

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=dev-only -v pgdata:/var/lib/postgresql/data postgres:17
docker run --rm -it -v "$(pwd)":/app -w /app node:24-slim sh    # bind mount: התיקייה שלך, בזמן אמת
docker run -d -v pgdata:/data:ro nginx                         # volume לקריאה בלבד
```

מוחקים את ה-container בשם `db` ומפעילים חדש עם אותו `-v pgdata:...`, והנתונים עדיין שם. (נתיב הנתונים בתוך image תלוי ב-image, והוא השתנה בין כמה גרסאות ראשיות של ה-image של Postgres, אז בודקים בדף ה-image ב-Docker Hub מה הנתיב הנכון.)

`-v` היא הצורה הקצרה. ‏`--mount` מפורשת יותר, והיא זו שצריך לאפשרויות מתקדמות:

```bash
docker run -d --name devtest --mount source=myvol,target=/app nginx
```

volumes לא נמחקים אוטומטית כשמוחקים container. מנקים בעצמכם:

```bash
docker volume ls
docker volume rm pgdata
docker volume prune       # מוחק volumes שאף אחד לא משתמש בהם
```

## רשתות: containers שמדברים זה עם זה

containers על אותה **רשת מוגדרת-משתמש** מוצאים זה את זה *לפי שם*. Docker מריץ בשביל זה שרת DNS קטן. ברשת ברירת המחדל (default bridge) containers יכולים להגיע זה לזה רק לפי כתובת IP, ולכן לכל דבר רציני יוצרים רשת משלכם:

```bash
docker network create app-net
docker run -d --name db --network app-net -e POSTGRES_PASSWORD=dev-only postgres:17
docker run -d --name web --network app-net -p 8080:3000 -e DATABASE_URL=postgres://postgres:dev-only@db:5432/postgres hello-app
```

בתוך `web`, שם המארח `db` מתורגם עכשיו ל-container של מסד הנתונים. שימו לב שמסד הנתונים לא קיבל `-p`: הוא לא צריך להיות נגיש מהמחשב שלך, רק מ-`web`. פורטים ברשת פתוחים בין ה-containers שלה, ונגישים מבחוץ רק כשמפרסמים אותם.

יש גם דרייברים אחרים למקרים מיוחדים: ‏`--network host` מסיר את הבידוד וחולק את הרשת של המארח, ו-`--network none` מנתק את ה-container לגמרי.

## הגדרות וסודות

מעבירים הגדרות כמשתני סביבה, ולא אופים אותן ל-image:

```bash
docker run -e LOG_LEVEL=debug hello-app
docker run --env-file .env hello-app
```

אזהרה אחת מהתיעוד של Docker עצמו: לא משתמשים במשתני סביבה לנתונים רגישים כמו סיסמאות בשום דבר אמיתי. הם מופיעים ב-`docker inspect` ויכולים לדלוף. משתמשים ב-secrets (גם Compose וגם Swarm תומכים בהם) או במאגר הסודות של הפלטפורמה. לפיתוח מקומי, סיסמאות מסוג `dev-only` כמו למעלה בסדר. ולעולם לא עושים `COPY` לקובץ `.env` או למפתח לתוך image: כל מי שיכול למשוך את ה-image יכול לקרוא אותו, ושכבה ש"מחקת" אחר כך עדיין נמצאת בהיסטוריה של ה-image.

## Docker Compose: כל האפליקציה בקובץ אחד

להקליד את שורות ה-`docker run` האלה נמאס מהר. **Docker Compose** מתאר אפליקציה מרובת containers בקובץ אחד ומריץ אותה בפקודה אחת. אבני הבניין שלו הם **services** (ה-containers), **networks** ו-**volumes**. יוצרים `compose.yaml` (Compose מחפש את השם הזה קודם):

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

קוראים את זה כמו משפט: *שירות `web` שנבנה מהתיקייה הזאת, מפורסם על 8080, שמחכה לשירות `db` שנוצר מה-image של Postgres, והנתונים שלו חיים ב-volume בשם `pgdata`.* Compose גם מכניס אוטומטית את שני השירותים לרשת משותפת, ולכן `web` מגיע למסד הנתונים בשם `db`. (השרת הזעיר שלנו עדיין לא קורא את `DATABASE_URL`; הוא כאן כדי להראות את החיווט.)

ה-`healthcheck` יחד עם `condition: service_healthy` הוא החלק שמפספסים. ‏`depends_on` רגיל קובע רק סדר הפעלה: Compose מחשיב תלות כמוכנה ברגע שה-container שלה *רץ*, לא כשהתוכנה שבפנים מקבלת חיבורים. למסד נתונים יכולות לקחת שניות להתאתחל, ובדיקת הבריאות היא מה שגורם ל-`web` לחכות באמת.

הפקודות שצריך:

```bash
docker compose up -d            # בונה אם צריך, יוצר רשתות ו-volumes, מפעיל הכול
docker compose ps               # השירותים והפורטים שלהם
docker compose logs -f web      # עוקב אחרי הלוגים של שירות אחד
docker compose up -d --build    # בונה מחדש images אחרי שינוי קוד
docker compose down             # עוצר ומוחק את ה-containers ואת הרשת
docker compose down -v          # ...וגם את ה-volumes בעלי השם (זה מוחק את הנתונים שלך)
```

שימו לב לרווח: ‏`docker compose` היא הפקודה הנוכחית, מובנית ב-Docker. ‏`docker-compose` העצמאית הישנה היא הדור הקודם.

כדי להוציא הגדרות מהקובץ, משתמשים ב-`environment` (כמו למעלה) או ב-`env_file`:

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

החשודים הרגילים: האפליקציה מאזינה ל-`127.0.0.1` בתוך ה-container במקום ל-`0.0.0.0` (ולכן הפורט המפורסם לא מגיע אליה), פורט שכבר תפוס במארח, משתנה סביבה חסר, קובץ חסר כי `.dockerignore` החריג אותו, או נתיב ששונה בין המחשב שלך ל-container.

## ניקוי

Docker נדיב עם מקום בדיסק. images ישנים, containers שנעצרו ו-build cache מצטברים:

```bash
docker system df              # מה תופס מקום
docker system prune           # מוחק containers שנעצרו, רשתות לא בשימוש, images "תלויים", build cache לא בשימוש
docker system prune -a        # ...וגם כל image שאף container לא משתמש בו
docker builder prune          # רק את ה-build cache
```

‏`docker system prune` מבקש אישור, וכברירת מחדל **לא** נוגע ב-volumes, כך שהנתונים שלך בטוחים. הוספת `--volumes` מוחקת גם volumes אנונימיים שלא בשימוש, אז קוראים את האזהרה לפני שאומרים כן.

## images קטנים ובטוחים

- **images בסיס קטנים.** מתחילים מ-image מהימן ומינימלי (‏`-slim`, ‏`alpine`) ומשתמשים בבנייה רב-שלבית כדי שכלי בנייה לא יגיעו לפרודקשן.
- **עניין אחד לכל container.** אפליקציית web ומסד הנתונים שלה הם שני containers, לא אחד.
- **לא רצים כ-root.** מוסיפים `USER` (ב-images של Node יש משתמש `node`). אם תוקף נכנס ל-container, יש לו פחות הרשאות.
- **מסדרים בשביל ה-cache.** תלויות קודם, מקור אחרון.
- **מחזיקים `.dockerignore`.** בנייה מהירה יותר, context קטן יותר, בלי סודות במקרה.
- **מקבעים גרסאות** של images בסיס (ו-digests כשצריך דיוק), ובונים מחדש בקביעות כדי לקבל תיקוני אבטחה.
- **בלי סודות ב-images או ב-Dockerfiles.** לא כ-`ENV`, לא כקובץ מועתק.
- **סורקים את ה-images** לפגיעויות ידועות עם סורק ב-CI, ומעדכנים את ה-image הבסיס כשהוא מדווח על תיקון.
- **תהליך אחד, בחזית.** התהליך הראשי של ה-container הוא ה-container. כותבים ל-standard output וקוראים עם `docker logs`.

## דף העזר

| אני רוצה... | פקודה |
|---|---|
| להריץ משהו ולמחוק אותו אחר כך | `docker run --rm -it <image> sh` |
| להפעיל container ברקע עם פורט | `docker run -d --name <n> -p 8080:80 <image>` |
| להציג containers | `docker ps` (‏`-a` לכולם) |
| לראות לוגים / לעקוב | `docker logs <n>` / `docker logs -f <n>` |
| לפתוח shell בפנים | `docker exec -it <n> sh` |
| לעצור / להפעיל / למחוק | `docker stop <n>` / `docker start <n>` / `docker rm <n>` |
| לבנות image | `docker build -t <name> .` |
| להציג / למחוק images | `docker images` / `docker rmi <image>` |
| ליצור volume | `docker volume create <name>` |
| ליצור רשת | `docker network create <name>` |
| להפעיל אפליקציית Compose | `docker compose up -d` |
| לעצור אותה (ולשמור נתונים) | `docker compose down` |
| לפנות מקום בדיסק | `docker system prune` |

## מילון מונחים

- **Image:** תבנית לקריאה בלבד (אפליקציה + תלויות) שמפעילים ממנה containers.
- **Container:** מופע רץ ומבודד של image.
- **Dockerfile:** קובץ הטקסט של ההוראות שבונה image.
- **Layer (שכבה):** צעד אחד של image, נשמר ב-cache ומשמש שוב.
- **Build context:** התיקייה ש-`docker build` רשאי להעתיק ממנה קבצים.
- **Registry / Docker Hub:** המקום שבו images נשמרים ומשותפים.
- **Tag / digest:** תווית גרסה ידידותית / טביעת אצבע מדויקת של התוכן.
- **Volume:** אחסון שמנוהל על ידי Docker ושורד containers.
- **Bind mount:** תיקיית מארח שמחוברת ל-container.
- **Network (רשת):** רשת מקומית וירטואלית בין containers; במוגדרות-משתמש יש חיפוש לפי שם.
- **פרסום פורט (‏`-p`):** העברת פורט במארח לפורט ב-container.
- **Compose:** כלי שמריץ אפליקציה מרובת containers מ-`compose.yaml`.
- **Service:** הגדרה של container אחד בקובץ Compose.
- **Multi-stage build:** בנייה בשלב אחד ושליחה של התוצאה בלבד.
- **Daemon:** התהליך ברקע (‏`dockerd`) שעושה את העבודה.

## לאן ממשיכים

עכשיו אתה מכיר את התמונה כולה: image נבנה מ-Dockerfile, container הוא image רץ, פורטים, volumes ורשתות מחברים אותו לעולם, ו-Compose מתאר אפליקציה שלמה בקובץ אחד. כדי לקבע את זה, מכניסים ל-container משהו שכבר יש לך: כותבים Dockerfile, מוסיפים `.dockerignore`, ומריצים עם Compose לצד מסד הנתונים שלו.

צעד טבעי הבא הוא לתת לרובוטים לעשות את זה: לבנות ולדחוף את ה-image אוטומטית בכל מיזוג עם workflow של GitHub Actions. את היסודות של Actions ראו ב-[GitHub מאפס לגיבור](he/posts/github-zero-to-hero/), ואת [Git מאפס לגיבור](he/posts/git-zero-to-hero/) אם בקרת גרסאות עדיין חדשה. ה-[Get started](https://docs.docker.com/get-started/) של Docker עצמו וה-[Dockerfile best practices](https://docs.docker.com/build/building/best-practices/) הם הקריאה הבאה הכי טובה.
