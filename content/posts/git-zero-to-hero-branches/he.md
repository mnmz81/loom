---
title: "Git מאפס לגיבור: ענפים, מיזוג וקונפליקטים"
summary: "חלק 4 במדריך ל-Git: מה זה ענף באמת, fast-forward ו-commit מיזוג, איך מיזוג תלת-כיווני מחליט, ואיך פותרים קונפליקט בלי לחץ."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 4 }
---

ענף הוא התווית מ[חלק 2](he/posts/git-zero-to-hero-history/) שזזה קדימה עם כל commit. בחלק הזה משתמשים בענף כדי לנסות מתכון לפיצה בספר המתכונים בלי לגעת ב-`main`.

## ענפים

```bash
git switch -c pizza
```

עכשיו אנחנו על `pizza`. ה-commits הולכים לשם, ו-`main` נשאר במקום:

```bash
echo "# Pizza" > pizza.md
git add pizza.md
git commit -m "Add pizza recipe"
echo "Bake 20 minutes." >> pizza.md
git commit -am "Add baking time"
```

![ל-main יש commits A, B ו-C. ענף שני בשם feature מתחיל ב-B ויש לו commits משלו, D ו-E. HEAD מצביע על feature, ולכן ה-commit הבא ילך לשם.](/images/git-zero-to-hero/branches.svg)

ענף כמעט לא עולה כלום, אז פותחים אחד לכל רעיון.

```bash
git branch            # רשימת ענפים, * מסמן את הנוכחי
git switch main       # חזרה; pizza.md נעלם מהתיקייה
git switch pizza      # והוא חוזר
```

### מה זה ענף באמת

ענף הוא לא עותק של הפרויקט. זה קובץ זעיר עם hash אחד של commit:

```bash
cat .git/refs/heads/main
cat .git/HEAD
```

```text
9c1d4e2a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4
ref: refs/heads/pizza
```

הקובץ הראשון הוא הענף `main`: hash ותו לא. השני הוא HEAD, שאומר "אני על `pizza`".

- **יצירת** ענף כותבת קובץ קטן אחד.
- **מעבר** לענף משנה מה HEAD אומר ומחליף את קבצי העבודה באלה של אותו צילום.
- **מחיקת** ענף מסירה את התווית. ה-commits נשארים, ו-`git reflog` יכולה למצוא אותם עד ש-Git מנקה commits שאי אפשר להגיע אליהם, אחרי תקופת חסד.

## מיזוג

הפיצה גמורה. מביאים אותה ל-`main`:

```bash
git switch main
git merge pizza
```

מה שקורה תלוי אם `main` זז בזמן שלא היינו שם:

![שני תרחישים. למעלה, fast-forward: ב-main לא היה שום דבר חדש, אז Git רק מזיז את התווית main קדימה ל-commit האחרון של feature. למטה, commit של מיזוג: בשני הענפים יש commits חדשים, אז Git יוצר commit מיזוג M עם שני הורים.](/images/git-zero-to-hero/merge.svg)

- אם `main` לא השתנה, Git עושה **fast-forward**: מזיז את התווית `main` קדימה. אין commit חדש.
- אם בשני הענפים יש commits חדשים, Git יוצר **commit של מיזוג** עם שני הורים, שקושר את ההיסטוריות.

ואז מנקים:

```bash
git branch -d pizza    # בטוח: מסרב אם הענף לא מוזג
```

### איך Git ממזג

Git מוצא את **בסיס המיזוג** (merge base), ה-commit האחרון ששני הענפים חולקים, ומשווה כל ענף מולו:

![ל-A ול-B יש היסטוריה משותפת. main ממשיך עם C ו-feature ממשיך עם D. גם C וגם D מצביעים אחורה אל B, בסיס המיזוג. commit המיזוג M מצביע על C ועל D.](/images/git-zero-to-hero/three-way-merge.svg)

```bash
git merge-base main pizza    # מדפיסה את ה-hash של B
```

Git משלב את מה שהשתנה מ-B ל-C ומ-B ל-D:

- שורה ששונתה ב**צד אחד בלבד** נלקחת כמו שהיא.
- שורה ששונתה ב**שני הצדדים לאותו דבר** נלקחת פעם אחת.
- שורה ששונתה ב**שני הצדדים באופן שונה** היא קונפליקט. Git לא יכול לדעת למה התכוונו.

ברוב המקרים שני הענפים נוגעים במקומות שונים, ולכן מיזוגים בדרך כלל פשוט עובדים.

### קונפליקטים

```text
Auto-merging pizza.md
CONFLICT (content): Merge conflict in pizza.md
Automatic merge failed; fix conflicts and then commit the result.
```

פותחים את הקובץ. Git סימן את שתי הגרסאות:

```text
<<<<<<< HEAD
Bake 20 minutes.
=======
Bake 25 minutes.
>>>>>>> pizza
```

מה שבין `<<<<<<<` ל-`=======` הוא שלנו (`main`), והשאר שלהם (`pizza`). מחליטים, מוחקים את הסימונים ומשאירים את מה שרוצים:

```text
Bake 25 minutes.
```

```bash
git add pizza.md
git commit            # משלימה את המיזוג
```

התחרטנו באמצע? `git merge --abort` מחזירה הכול למה שהיה. קונפליקט הוא לא שגיאה, אלא Git ששואל שאלה שרק אנחנו יכולים לענות עליה.

- **ממזגים את `main` לענף שלנו לעתים קרובות** (או עושים rebase עליו), כדי שההבדלים לא יצטברו, ושומרים על ענפים קצרי חיים וממוקדים.
- `git status` בזמן קונפליקט מציגה *Unmerged paths*, הקבצים שעדיין מחכים לנו. `git add` מסמנת קובץ כפתור.
- כדי לקחת צד אחד בשלמותו: `git checkout --ours <קובץ>` או `--theirs`, ואז `git add`. בזמן **rebase** המשמעות מתהפכת: "ours" הוא הענף ש-rebase נעשה *עליו*, ו-"theirs" הוא ה-commit שלנו שמורץ מחדש.
- עורכים (VS Code, JetBrains) מציעים "קבל נוכחי / נכנס" בלחיצה, ו-`git mergetool` פותחת כלי חזותי.
