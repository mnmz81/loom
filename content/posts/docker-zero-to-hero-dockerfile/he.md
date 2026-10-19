---
title: "Docker מאפס לגיבור: Dockerfile לאפליקציה שלנו"
summary: "מכניסים אפליקציית Node קטנה ל-container: כותבים Dockerfile ו-.dockerignore, בונים ומריצים, שכבות ו-build cache, בנייה רב-שלבית, ו-CMD מול ENTRYPOINT."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 31 }
---

[בחלק הראשון](he/posts/docker-zero-to-hero/) הרצנו images שמישהו אחר בנה. כאן נבנה image לאפליקציה שלנו, ה-`hello-app` שילווה את שאר הסדרה.

## האפליקציה שלנו, ב-container

יוצרים תיקייה `hello-app` עם שרת Node זעיר:

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

מריצים `npm install` פעם אחת כדי שיהיה `package-lock.json`. עכשיו ה-**Dockerfile**: קובץ טקסט של הוראות, שכל אחת מהן הופכת לשכבה של ה-image. שומרים אותו בשם `Dockerfile` (בלי סיומת):

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

- `FROM node:24-slim` מתחיל מ-image בסיס שכבר יש בו Node. כל Dockerfile מתחיל ב-`FROM`.
- `WORKDIR /app` קובע את תיקיית העבודה להוראות הבאות, ויוצר אותה.
- `COPY package*.json ./` מעתיק קודם רק את קבצי ה-package (הסעיף הבא מסביר למה).
- `RUN npm ci --omit=dev` מריץ פקודה ב*זמן הבנייה* ושומר את התוצאה כשכבה. כאן היא מתקינה תלויות.
- `COPY . .` מעתיק ל-image את שאר הפרויקט.
- `USER node` מריץ את האפליקציה כמשתמש `node` חסר ההרשאות שמגיע עם ה-images של Node, ולא כ-root.
- `EXPOSE 3000` *מתעד* שהאפליקציה מאזינה ל-3000. הוא לא מפרסם שום דבר (את זה עושים [פורטים](he/posts/docker-zero-to-hero-ports-volumes-networks/)).
- `CMD ["node", "server.js"]` היא פקודת ברירת המחדל כש-container עולה.

מוסיפים לידו `.dockerignore`, כדי שזבל לא ייכנס לבנייה:

```plain text
node_modules
.git
.env
*.md
```

התבניות עובדות כמו ב-`.gitignore`. ‏`node_modules` נשאר בחוץ כי ה-image מתקין לעצמו, ו-`.env` כי סודות לא שייכים ל-images.

בונים ומריצים:

```bash
docker build -t hello-app .
docker run -d --name hello -p 3000:3000 hello-app
curl localhost:3000
```

```plain text
Hello from a container
```

הדגל `-t hello-app` נותן tag ל-image, והנקודה `.` היא ה-**build context**: התיקייה שהבנייה רשאית להעתיק ממנה. עכשיו כל מי שיש לו Docker מריץ את אותן פקודות ומקבל אותה תוצאה, בלי להתקין Node.

### שכבות ו-build cache

image הוא מחסנית של שכבות (layers), אחת לכל הוראה. Docker שומר שכבות ב-cache: אם הוראה וכל מה שהיא תלויה בו לא השתנו, הוא משתמש שוב בשכבה במקום להריץ אותה מחדש. אבל ברגע ששכבה אחת משתנה, כל השכבות שאחריה נבנות מחדש.

![מחסנית שכבות ל-Dockerfile: ‏FROM node:24-slim, ‏WORKDIR /app, ‏COPY של קבצי ה-package, ‏RUN npm ci, ‏COPY של קוד המקור, ושכבת container דקה לקריאה וכתיבה למעלה. ארבע השכבות התחתונות מסומנות כ-cached וה-COPY של קוד המקור מסומן כ-rebuilt.](/images/docker-zero-to-hero/image-layers.svg)

הקוד משתנה כל היום, התלויות לעתים רחוקות. כי `package*.json` מועתק ומותקן *לפני* הקוד, עריכה של `server.js` בונה מחדש רק את ה-`COPY` האחרון, וה-`npm ci` האיטי מגיע מה-cache. בסדר ההפוך כל עריכה מתקינה הכול מחדש. הכלל: **למעלה מה שמשתנה לעתים רחוקות, למטה מה שמשתנה לעתים קרובות.**

container מוסיף שכבה דקה לקריאה וכתיבה מעל ה-image. מה שהוא כותב הולך לשם ונמחק איתו, ולכן נתונים צריכים [volumes](he/posts/docker-zero-to-hero-ports-volumes-networks/).

מלכודת cache ב-images מבוססי Debian: מריצים `apt-get update` ו-`apt-get install` באותו `RUN` כדי שלא ישתמשו ברשימת חבילות ישנה, ומנקים באותה שורה כדי שהשכבה תישאר קטנה:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
    && rm -rf /var/lib/apt/lists/*
```

### בנייה רב-שלבית: בונים גדול, שולחים קטן

כלי בנייה (מהדרים, תלויות פיתוח) נחוצים כדי לבנות את האפליקציה אבל לא כדי להריץ אותה. **בנייה רב-שלבית** (multi-stage) בונה בשלב אחד ומעתיקה רק את התוצאה ל-image סופי קטן:

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

בשלב הראשון יש Node וכל תלויות הפיתוח; ה-image הסופי הוא רק nginx והקבצים הבנויים. (תיקיית הפלט, כאן `dist`, תלויה בפרויקט.) כך שולחים בדרך כלל אפליקציית front-end.

### שתי דרכים לכתוב את פקודת ההפעלה

`CMD` קובע את פקודת ברירת המחדל, ו-`ENTRYPOINT` קובע את הקובץ שתמיד רץ, כש-`CMD` מספק ארגומנטי ברירת מחדל:

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

אז `docker run image` מריץ `s3cmd --help`, ו-`docker run image ls s3://bucket` מריץ `s3cmd ls s3://bucket`. משתמשים ב-**exec form**, מערך ה-JSON (‏`["node", "server.js"]`), ולא במחרוזת: התוכנית הופכת לתהליך הראשי ומקבלת אותות כמו בקשת העצירה, ובצורת ה-shell יש shell באמצע שעלול לבלוע אותם.
