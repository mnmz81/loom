---
title: "Docker מאפס לגיבור: images, containers וההרצה הראשונה"
summary: "מה זה Docker, מה הם images, containers ו-registry, במה container שונה ממכונה וירטואלית, התקנה, הרצה וניהול של ה-container הראשון, ו-tags של images."
date: 2026-10-10
updated: 2026-10-19
tags: [docker, containers]
series: { key: devops, order: 11 }
---

"אצלי זה עובד" הוא המשפט הכי ישן בעולם התוכנה. Docker מפרק אותו ברוב המקרים: אורזים את האפליקציה יחד עם כל מה שהיא צריכה, ואז היא רצה אותו דבר על הלפטופ שלנו, על הלפטופ של חבר צוות ועל שרת. בארבעה פוסטים נכניס ל-container אפליקציית web קטנה אחת, וכל רעיון יגיע ברגע שהאפליקציה צריכה אותו. הפוסט הזה מכסה את אוצר המילים ואת ההרצה של images שאחרים בנו.

## מה זה Docker

Docker היא פלטפורמה פתוחה לפיתוח, להפצה ולהרצה של אפליקציות. היא אורזת אפליקציה ב-**container**: סביבה מבודדת שמחזיקה את האפליקציה ואת מה שהיא צריכה כדי לרוץ, כך שהיא לא תלויה במה שמותקן במחשב המארח.

רוב המונחים נשענים על שלוש מילים:

- **Image** הוא תבנית לקריאה בלבד: האפליקציה שלנו יחד עם סביבת הריצה, הספריות והקבצים שלה. בונים אותו פעם אחת.
- **Container** הוא מופע רץ של image. אפשר להפעיל, לעצור ולמחוק containers כמה פעמים שרוצים, ו-image אחד יכול להפעיל הרבה מהם.
- **Registry** מאחסן images. **Docker Hub** הוא הציבורי ש-Docker משתמש בו כברירת מחדל, ואפשר להריץ גם registry פרטי.

![Dockerfile נבנה ל-image עם docker build. הפקודה docker run מפעילה container אחד או יותר מה-image. אפשר לדחוף image ל-registry כמו Docker Hub עם docker push ולהוריד אותו עם docker pull.](/images/docker-zero-to-hero/image-to-container.svg)

מאחורי הקלעים ל-Docker יש שני חלקים: ה-**daemon** (‏`dockerd`), שמנהל images, ‏containers, רשתות ו-volumes, וה-**client** (‏`docker`), הפקודה שמקלידים, שמעבירה את הפקודה ל-daemon. גם Docker Compose הוא client, לאפליקציות שמורכבות מכמה containers.

### container הוא לא מכונה וירטואלית

מכונה וירטואלית (VM) נושאת מערכת הפעלה שלמה עם ליבה (kernel) משלה. container הוא תהליך מבודד שחולק את הליבה של המארח, ומשתמש בתכונות של Linux כמו namespaces לבידוד. בגלל זה containers עולים בשניות ותופסים הרבה פחות מקום, אז אפשר להריץ יותר מהם על אותה חומרה.

![משמאל: מחסנית של מכונות וירטואליות עם חומרה, מערכת הפעלה מארחת עם hypervisor, ושתי מכונות וירטואליות, לכל אחת מערכת הפעלה אורחת, ספריות ואפליקציה משלה. מימין: מחסנית של containers עם חומרה, מערכת הפעלה מארחת, Docker Engine ושלושה containers שמחזיקים רק ספריות ואפליקציה וחולקים את הליבה של המארח.](/images/docker-zero-to-hero/containers-vs-vms.svg)

מצד שני, container הוא לא מכונה נפרדת, ולכן הבידוד שלו חלש מזה של VM. (ב-Mac וב-Windows, Docker Desktop מריץ ברקע VM קטן של Linux, כי containers צריכים ליבת Linux.)

## מתקינים ובודקים שזה עובד

הדרך הקלה היא **Docker Desktop** (ל-Mac, ל-Windows ול-Linux), מ-[docker.com](https://docs.docker.com/get-started/get-docker/). בשרת Linux אפשר להתקין את **Docker Engine** לבדו. Docker Desktop דורש מנוי בתשלום בחברות גדולות (מעל 250 עובדים או 10 מיליון דולר הכנסה) והוא חינמי לשימוש אישי ולעסקים קטנים.

```bash
docker --version
docker compose version
docker run hello-world
```

הפקודה האחרונה מורידה image זעיר, מריצה אותו, מדפיסה הודעת ברכה ומסיימת. אם ההודעה מופיעה, Docker עובד.

## ה-container הראשון

שרת web, בלי להתקין אותו:

```bash
docker run -d --name web -p 8080:80 nginx
```

פותחים `http://localhost:8080` ורואים את דף הפתיחה של nginx.

- `docker run` יוצרת container מ-image ומפעילה אותו. אם ה-image עוד לא על המחשב, Docker מוריד אותו קודם מ-Docker Hub.
- `-d` (‏*detached*) מריץ ברקע.
- `--name web` נותן לו שם, כדי שלא נצטרך להשתמש במזהה האקראי.
- `-p 8080:80` מעביר פורט 8080 במחשב שלנו לפורט 80 בתוך ה-container.
- `nginx` הוא ה-image.

ניהול:

```bash
docker ps                 # containers שרצים
docker ps -a              # כל ה-containers, כולל אלה שנעצרו
docker logs web           # מה הוא הדפיס (אפשר להוסיף -f כדי לעקוב)
docker exec -it web sh    # פותח shell בתוכו; מקלידים exit כדי לצאת
docker stop web           # עוצר אותו
docker start web          # מפעיל שוב את אותו container
docker rm web             # מוחק אותו (קודם עוצרים, או משתמשים ב-rm -f)
```

container חי כל עוד התהליך הראשי שלו חי. ‏`hello-world` מדפיס הודעה ונעצר; ‏`nginx` רץ עד שעוצרים אותו. אם container "יוצא מיד", התהליך שבפנים הסתיים או קרס: בודקים ב-`docker logs`.

הדגלים של `docker run` שנשתמש בהם כל הזמן:

| דגל | מה הוא עושה |
|---|---|
| `-d` | רץ ברקע |
| `-it` | טרמינל אינטראקטיבי, ל-shell |
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

- tags יכולים לזוז. ‏`latest` פירושו "מה שהמפרסם תייג אחרון", לא "החדש ביותר". בכל דבר שרוצים לשחזר, משתמשים בגרסה מפורשת.
- לדיוק מלא מקבעים **digest** (‏`image@sha256:...`). הוא לא משתנה, אבל מעדכנים אותו ידנית (או עם כלי כמו Dependabot).
- מעדיפים **Docker Official Images**, מפרסמים מאומתים וגרסאות קטנות (‏`-slim`, ‏`alpine`).
