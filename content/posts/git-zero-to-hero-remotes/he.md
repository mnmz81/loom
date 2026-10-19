---
title: "Git מאפס לגיבור: remotes ו-GitHub"
summary: "חלק 6 במדריך ל-Git: ‏clone, ‏push, ‏fetch ו-pull, ענפי מעקב ו-ahead/behind, מה עושים כש-push נדחה, force-with-lease ותגיות."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 15 }
---

כל מה שבחלקים 1 עד 5 נמצא על המחשב שלנו. כדי לשתף את ספר המתכונים צריך **remote**: עותק של הריפו במקום אחר, בדרך כלל GitHub.

## עבודה עם GitHub

אם הפרויקט כבר קיים ב-GitHub, משכפלים אותו:

```bash
git clone https://github.com/dana/recipes.git
```

אם התחלנו מקומית, יוצרים ריפו ריק ב-GitHub, מתחברים אליו ודוחפים:

```bash
git remote add origin https://github.com/dana/recipes.git
git push -u origin main
```

`origin` הוא הכינוי של אותו remote, ו-`-u` מקשרת את `main` המקומי אליו (עם `push.autoSetupRemote` מ[חלק 1](he/posts/git-zero-to-hero/), `git push` רגילה עושה את זה בענפים חדשים).

![שני ריפואים. ה-remote origin מחזיק commits A, B ו-C. במחשב המקומי יש A ו-B ותווית origin/main. git fetch מורידה את C אל origin/main בלי לגעת ב-main המקומי. git push מעלה את ה-commits המקומיים אל origin. git pull היא fetch ואחריה merge.](/images/git-zero-to-hero/remote.svg)

- `git fetch` **מורידה** את מה שחדש אל `origin/main` אבל לא נוגעת בענף המקומי. תמיד בטוחה.
- `git pull` היא fetch **ועוד** מיזוג שלו לענף הנוכחי. (`git pull --rebase` מורידה ואז עושה rebase.)
- `git push` **מעלה** את ה-commits המקומיים.

### ענפי מעקב, upstream ו-ahead/behind

אחרי `git clone` או `git fetch`, `git branch -a` מציגה ענפים כמו `origin/main`. אלה **ענפי מעקב מרוחקים** (remote-tracking branches): העותק האחרון שהמחשב מכיר של הענף בשרת. אי אפשר לעשות עליהם commit, ורק `fetch`, `pull` ו-`push` מזיזות אותם.

אפשר לקשר ענף מקומי לאחד מהם. הקישור הוא ה-**upstream**, ובזכותו `git status` ו-`git branch -vv` אומרות איפה אנחנו עומדים:

```bash
git status
```

```text
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)
```

```bash
git branch -vv
```

```text
* main  9c1d4e2 [origin/main: ahead 1] Add salt to pasta
  pizza b7e3f10 [origin/pizza] Add baking time
```

*Ahead* אומר שיש לנו commits שאין בשרת, אז דוחפים. *Behind* אומר שיש בשרת commits שאין לנו, אז עושים pull. *Diverged* אומר גם וגם, וצריך למזג או לעשות rebase. כדאי להריץ `git fetch` קודם כדי שהמספרים יהיו עדכניים.

### כשה-push נדחה

```text
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:dana/recipes.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

מישהו דחף ל-`main` מאז הסנכרון האחרון, ו-Git לא נותן לדרוס את ה-commits שלו. מריצים `git pull` (או `git pull --rebase`), פותרים קונפליקט אם יש, ואז `git push` שוב. מי שעושה pull לפני שמתחיל ולפני שדוחף, נתקל בזה לעתים רחוקות.

הקיצור המפתה, `git push --force`, דורס את השרת ו**מוחק** את ה-commits שלהם. לא בענפים משותפים. אם שכתבנו ענף משלנו עם [rebase](he/posts/git-zero-to-hero-rebase/), משתמשים ב-`git push --force-with-lease`: היא מסרבת כשיש בשרת commits שעוד לא ראינו.

אפשר לדחוף רק לריפו שמותר לנו לכתוב אליו. לפרויקט של מישהו אחר קודם [עושים fork](he/posts/github-zero-to-hero-collaboration/). הלולאה היומיומית ב-GitHub, ענף, push, ‏pull request, מיזוג, נמצאת ב[GitHub: ‏pull requests](he/posts/github-zero-to-hero-pull-requests/).

## תגיות

תגית נותנת ל-commit שם קבוע, בדרך כלל לגרסאות:

```bash
git tag -a v1.0 -m "First release"
git push --tags
```

לרשימת הפקודות המלאה, עם דגלים לכל מה שבמדריך הזה, יש את [דף העזר שלי ל-Git](he/posts/git-commands/). וכשמשהו מרגיש לא בסדר, `git status` ו-`git log --oneline --graph --all` יגידו בדרך כלל בדיוק איפה אנחנו.
