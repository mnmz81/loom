---
title: "Git מאפס לגיבור: לקרוא diff והיסטוריה"
summary: "חלק 2 במדריך ל-Git: איך קוראים git diff, מה כל פקודת diff משווה, הודעות commit טובות, git log, ומה באמת יש בתוך commit."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 2 }
---

בספר המתכונים מ[חלק 1](he/posts/git-zero-to-hero/) יש שני commits. בחלק הזה קוראים מה השתנה ומה Git שמר.

## לקרוא diff

משנים את זמן הבישול ב-`pasta.md` ומריצים `git diff`:

```text
diff --git a/pasta.md b/pasta.md
index 54af23a..e1f3b27 100644
--- a/pasta.md
+++ b/pasta.md
@@ -1,3 +1,3 @@
 # Pasta
-Boil water. Cook 9 minutes.
+Boil water. Cook 10 minutes.
 Add salt to the water.
```

- `diff --git a/... b/...` נותנת שם לקובץ. `index 54af23a..e1f3b27 100644` מכילה hash קצר של התוכן הישן והחדש ואת מצב הקובץ, ואפשר להתעלם ממנה.
- `--- a/...` ו-`+++ b/...` הן הגרסה הישנה והחדשה של הקובץ.
- `@@ -1,3 +1,3 @@`: הקטע הזה (*hunk*) מכסה שלוש שורות משורה 1 בקובץ הישן, ושלוש שורות משורה 1 בחדש.
- שורה שמתחילה ב-`-` הוסרה, ב-`+` נוספה, וברווח היא הקשר שלא השתנה.

מה בדיוק מושווה תלוי בדגלים:

| פקודה | משווה |
| --- | --- |
| `git diff` | את תיקיית העבודה מול ה-staging (מה שעוד לא הכנסנו) |
| `git diff --staged` | את ה-staging מול ה-commit האחרון (מה שה-commit הבא יכיל) |
| `git diff HEAD` | את תיקיית העבודה מול ה-commit האחרון (הכול, עם staging או בלי) |

## לכתוב הודעת commit טובה

הודעת commit היא פתק למי שיקרא את ההיסטוריה, בדרך כלל אנחנו בעוד חצי שנה:

```text
Fix crash when the recipe list is empty

The list view assumed at least one recipe and read the first item
without checking. Show the empty-state message instead.
```

- **שורה ראשונה קצרה** (בערך 50 תווים) בלשון ציווי: "Fix", "Add", "Remove". קוראים אותה כמו "ה-commit הזה ... יתקן את הקריסה".
- **שורה ריקה**, ואחריה גוף אופציונלי שמסביר *למה*. מה השתנה, ה-diff כבר מראה.
- רעיון אחד בכל commit, כדי שההודעה תהיה קצרה ונכונה.

## להסתכל על ההיסטוריה

```bash
git log --oneline
```

```text
9c1d4e2 (HEAD -> main) Add salt to pasta
3f2a1b9 Add pasta recipe
```

כל שורה היא commit: מזהה קצר (hash) והודעה. מתחת לפני השטח:

![שלושה commits, A, B ו-C, משמאל לימין, עם חצים מכל commit להורה שלו. שם הענף main מצביע על ה-commit החדש ביותר, ו-HEAD מצביע על main.](/images/git-zero-to-hero/commit-chain.svg)

- כל commit מצביע על **ההורה** שלו, ה-commit שלפניו. ההיסטוריה היא שרשרת.
- **ענף** (כמו `main`) הוא תווית שמצביעה על commit אחד. כשעושים commit, התווית זזה קדימה.
- **HEAD** הוא "איפה אנחנו עכשיו". בדרך כלל הוא מצביע על ענף.

כל השאר ב-Git הוא הזזה של התוויות האלה. כמה דרכים שימושיות להסתכל:

```bash
git log --oneline --graph --all   # תמונה של כל הענפים
git show 3f2a1b9                  # מה commit אחד שינה
git diff 3f2a1b9 9c1d4e2          # השוואה בין שני commits
```

### מה יש בתוך commit

`git cat-file -p HEAD` מדפיסה את הרשומה האמיתית:

```text
tree 9f1e0c8d2b7a4c3e5d6f708192a3b4c5d6e7f809
parent 3f2a1b94c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
author Dana Levi <dana@example.com> 1791540000 +0300
committer Dana Levi <dana@example.com> 1791540000 +0300

Add salt to pasta
```

- `tree` מצביע על הצילום של כל הקבצים באותו רגע.
- `parent` הוא ה-commit שלפניו, החץ בתרשימים. ל-commit של מיזוג יש שתי שורות `parent`.
- `author` ו-`committer` הם מי כתב ומי רשם, עם חותמת זמן. ואחריהם ההודעה.

ה-**hash** (כמו `9c1d4e2`) הוא טביעת אצבע של התוכן הזה בדיוק. משנים משהו (קבצים, הודעה, הורה, אפילו חותמת זמן) ומקבלים hash אחר. בגלל זה `git commit --amend` ו-`git rebase` יוצרות commits *חדשים* במקום לערוך ישנים. שבעה תווים בדרך כלל מספיקים, כל עוד הם ייחודיים בריפו.
