---
title: "GitHub מאפס לגיבור: ה-GitHub flow ו-pull requests"
summary: "חלק 2 במדריך ל-GitHub: ה-GitHub flow צעד אחר צעד, pull request טוב, ביקורת קוד עם הערות ו-suggestions, ושלוש הדרכים למזג."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 8 }
---

ספר המתכונים נמצא ב-GitHub מאז [חלק 1](he/posts/github-zero-to-hero/). בחלק הזה משנים אותו כמו שצוות היה משנה, בלי לשבור את `main` אף פעם.

## ה-GitHub flow

GitHub ממליץ על לולאה קצרה, **GitHub flow**:

![שש קופסאות בשורה: יוצרים ענף, commit ו-push, פותחים pull request, ביקורת ודיון, ממזגים את ה-pull request, מוחקים את הענף. חץ מקווקו מהביקורת חזרה ל-commit ו-push אומר: ביקשו שינויים, דוחפים עוד commits.](/images/github-zero-to-hero/github-flow.svg)

1. **יוצרים ענף** מתוך `main` עם שם קצר ותיאורי (`add-soup-recipe`). `main` נשאר בשקט.
2. **‏Commit ו-push.** ‏commits קטנים, כל אחד שינוי שלם ומבודד שאפשר לבטל לבדו. push קבוע הוא גם גיבוי.
3. **פותחים pull request** כדי לבקש משוב. לא בטוחים שזה מוכן? פותחים pull request במצב *draft*.
4. **ביקורת ודיון.** עונים להערות בדחיפת commits נוספים לאותו ענף, וה-pull request מתעדכן מעצמו.
5. **ממזגים** כשהוא אושר והבדיקות ירוקות.
6. **מוחקים את הענף.** ה-pull request וההיסטוריה נשארים, רק התווית נעלמת.

```bash
git switch -c add-soup-recipe
echo "# Soup" > soup.md
echo "Simmer for 30 minutes." >> soup.md
git add soup.md
git commit -m "Add soup recipe"
git push -u origin add-soup-recipe
```

(עם `push.autoSetupRemote true` מה[מדריך על Git](he/posts/git-zero-to-hero/), ה-`-u` מיותר.) הפלט של ה-push מדפיס קישור לפתיחת pull request, ובדף הריפוזיטורי מופיע כפתור צהוב **Compare & pull request**.

## Pull requests

Pull request (PR) הוא שיחה על ענף. הוא מראה את ההבדל בין הענף שלנו ליעד, מאפשר להגיב על שורות מסוימות, ואוסף את התוצאות של בדיקות אוטומטיות. PR טוב כולל:

- **כותרת ברורה** שנקראת כמו הודעת commit: "Add soup recipe".
- **תיאור** שאומר *מה* השתנה, *למה*, ואיך בודקים, בשביל קורא בלי הקשר. בעוד שלושה חודשים הקורא הזה הוא אנחנו.
- **קישור ל-issue שהוא פותר.** כותבים `Closes #12` (או `Fixes`, `Resolves`) בתיאור, והמיזוג סוגר את issue 12 אוטומטית. זה עובד רק כש-PR מכוון לענף ברירת המחדל של הריפוזיטורי.
- **מטרה אחת וגודל קטן.** PR של 30 שורות מקבל ביקורת קפדנית. PR של 3,000 שורות מקבל "נראה בסדר".

```bash
gh pr create --fill              # כותרת וגוף מתוך ה-commits שלנו
gh pr create --draft             # פותח כ-draft, עוד לא מוכן לביקורת
gh pr view --web                 # פותח אותו בדפדפן
gh pr status                     # PRs שקשורים לחשבון
```

### ביקורת קוד

הסוקרים פותחים את הלשונית **Files changed** ויכולים:

- ללחוץ על ה-`+` ליד שורה כדי **להגיב** בדיוק עליה.
- לכתוב **suggestion**: הערה עם תחליף מוצע, שהכותב מחיל בלחיצה אחת.
- לסיים באחד משלושה פסקי דין: **Comment**, **Approve** או **Request changes**.

ככותבים, עונים בדחיפת commits נוספים ואז מסמנים שיחות כנפתרו (resolved). כשסוקרים, מבקרים את הקוד ולא את האדם, אומרים מה היה עדיף, ועושים את זה מהר: PR שמחכה ימים מתיישן. כשסוקרים אותנו, הסוקר רואה את השינוי בפעם הראשונה, ולכן כל דבר שמבלבל אותו שווה תיקון ולא הגנה.

כדי לנסות PR של מישהו אחר מקומית:

```bash
gh pr checkout 42      # מביא את הענף ועובר אליו
```

### מיזוג: שלוש דרכים

כש-PR אושר, כפתור **Merge** מציע עד שלוש שיטות (בעל הריפוזיטורי יכול לכבות כל אחת מהן):

![אותו pull request עם ה-commits‏ C, D ו-E, מוצג שלוש פעמים. Merge commit שומר את C, D ו-E ומוסיף commit מיזוג M עם שני הורים. Squash and merge מחליף אותם ב-commit אחד S. Rebase and merge מעתיק אותם ל-main בתור C', D' ו-E' בלי commit מיזוג.](/images/github-zero-to-hero/merge-methods.svg)

- **Merge commit** שומר כל commit של הענף ומוסיף commit מיזוג. היסטוריה מלאה, אבל גרף מסועף.
- **Squash and merge** מכווץ את כל ה-PR ל-commit אחד, כך ש-`main` מקבל commit אחד לכל PR.
- **Rebase and merge** מריץ מחדש כל commit על גבי `main` בלי commit מיזוג. קו ישר, אבל ל-commits יש hash חדש (כמו [`git rebase`](he/posts/git-zero-to-hero-rebase/)).

צוותים רבים בוחרים squash: ‏PR אחד, commit אחד, הודעה אחת ברורה. משתמשים במה שהצוות הסכים עליו:

```bash
gh pr merge --squash --delete-branch
```

אחר כך מעדכנים את `main` המקומי:

```bash
git switch main
git pull
git branch -d add-soup-recipe
```

‏**Settings → General** יכול למחוק ענפים אוטומטית אחרי מיזוג.
