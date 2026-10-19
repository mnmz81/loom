---
title: "פקודות Git: היסטוריה, ביטול, stash ו-worktrees"
summary: "דף העזר שלי ל-Git, חלק 2: log ו-diff, reset ו-revert, stash, תגיות, reflog ו-bisect, worktrees, ריפו גדול."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli, cheatsheet]
series: { key: git-commands, order: 2 }
---

סימן ⚠️ אומר שהפקודה יכולה לאבד עבודה.

## בדיקת היסטוריה

- `git log` מציגה היסטוריה, ו-`git log --oneline --graph --all` מציגה תמונה קומפקטית של כל הענפים.
- `git log -p <קובץ>` מראה איך קובץ השתנה לאורך זמן, ו-`git log --stat` מציגה את הקבצים שכל commit נגע בהם.
- `git log -S"טקסט"` מוצאת commits שהוסיפו או הסירו את הטקסט הזה. `git log --author="שם"` ו-`git log --since="2 weeks ago"` מסננות לפי מי ומתי.
- `git log main..feature` מציגה את ה-commits שיש ב-`feature` ואין ב-`main`.
- `git show <commit>` מציגה commit אחד, ו-`git show <commit>:<נתיב>` מציגה קובץ כפי שהיה אז.
- `git diff` משווה שינויים שלא ב-staging, `git diff --staged` משווה את אלה שב-staging, `git diff <a> <b>` משווה שני ענפים או commits, ו-`--stat` או `--name-only` מקצרות את הפלט.
- `git blame <קובץ>` מראה מי שינה כל שורה, ו-`-L 10,20` מגביל לטווח שורות.
- `git grep "טקסט"` מחפשת בקבצים במעקב, מהר יותר מ-`grep` בריפו גדול.
- `git shortlog -sn` מדרגת תורמים לפי מספר ה-commits.

## ביטול

- `git restore <קובץ>` זורקת שינויים שלא ב-staging ⚠️, ו-`git restore --staged <קובץ>` מוציאה קובץ מה-staging.
- `git restore --source=<commit> <קובץ>` מחזירה קובץ כפי שהיה ב-commit אחר. `git restore -p` עושה את זה חלק אחרי חלק.
- `git checkout -- <קובץ>` היא הדרך הקלאסית לזרוק שינויים ⚠️.
- `git reset --soft HEAD~1` מבטלת את ה-commit האחרון ומשאירה את השינויים ב-staging.
- `git reset --mixed HEAD~1` מבטלת אותו ומשאירה את השינויים מחוץ ל-staging. זו ברירת המחדל.
- `git reset --hard HEAD~1` מבטלת אותו וזורקת את השינויים ⚠️.
- `git revert <commit>` מוסיפה commit חדש שמבטל commit ישן יותר, והיא הבחירה הבטוחה להיסטוריה משותפת. ב-commit של מיזוג מוסיפים `-m 1` כדי לבחור איזה צד לשמור.
- `git clean -n` מראה מה יוסר, ו-`git clean -fd` מסירה קבצים ותיקיות שלא במעקב ⚠️. תמיד להריץ קודם `-n`.

## stash

- `git stash` שומרת שינויים בצד, ו-`git stash -u` כוללת גם קבצים שלא במעקב.
- `git stash push -m "הודעה"` נותנת ל-stash שם, ו-`git stash push -- <נתיב>` שומרת רק את הנתיב הזה.
- `git stash list` מציגה אותם, ו-`git stash show -p` מראה מה יש באחד.
- `git stash pop` מחילה את האחרון ומסירה אותו, `git stash apply` מחילה בלי להסיר, ו-`git stash drop` מוחקת אחד ⚠️.
- `git stash branch <שם>` הופכת stash לענף חדש, כשהוא כבר לא מתיישם נקי.

## תגיות

- `git tag` מציגה תגיות, `git tag <שם>` יוצרת תגית קלה, ו-`git tag -a v1.0 -m "הודעה"` יוצרת תגית מוערת.
- `git push --tags` דוחפת תגיות, ו-`git push origin --delete <תגית>` מסירה אחת מהשרת. `git tag -d <תגית>` מסירה אותה מקומית.
- `git describe` נותנת ל-commit הנוכחי שם ביחס לתגית האחרונה, למשל `v1.0-3-gabc123`.

## שחזור וחקירה

- `git reflog` היא ההיסטוריה של המקומות ש-HEAD היה בהם, וממנה מצילים commits שאבדו אחרי reset או rebase לא מוצלחים.
- `git cherry-pick <commit>` מעתיקה commit אחד לענף הנוכחי, ו-`-x` רושמת מאיפה הוא בא.
- `git bisect start`, ואז `git bisect bad` ו-`git bisect good <commit>`, מוצאת את ה-commit שהכניס באג בחיפוש בינארי. `git bisect run <סקריפט>` מריצה את זה אוטומטית, ו-`git bisect reset` מסיימת.

## Worktrees

Worktree הוא תיקייה שנייה שנשלפה מאותו ריפו, כך שאפשר לפתוח שני ענפים במקביל בלי לשכפל שוב. כולם חולקים את אותם נתוני `.git`, אז `git fetch` באחד מעדכנת את כולם. בכל תיקייה עדיין צריך `node_modules` משלה.

- `git worktree add <נתיב> <ענף>` שולפת ענף קיים לתיקייה חדשה.
- `git worktree add -b <ענף-חדש> <נתיב>` יוצרת ענף ושולפת אותו שם. אפשר להוסיף נקודת התחלה בסוף כדי להתפצל ממקום מסוים.
- `git worktree add --detach <נתיב> <commit>` פותחת commit ב-detached HEAD, נוח לבדיקה או לבנייה.
- `git worktree list` מציגה את כל ה-worktrees, ו-`--porcelain` נותנת פלט לקריאת מכונה.
- `git worktree remove <נתיב>` מסירה אחד (חייב להיות נקי), ו-`--force` מסירה גם עם שינויים ⚠️.
- `git worktree move <נתיב> <נתיב-חדש>` מעבירה אחד למקום אחר.
- `git worktree lock <נתיב>` ו-`unlock` מגינות עליו מניקוי, למשל על כונן נשלף.
- `git worktree prune` מנקה הפניות לתיקיות שנמחקו ידנית, ו-`-n` היא הרצה יבשה.
- `git worktree repair` מתקנת את הקישורים אם תיקייה הוזזה ידנית.

מקרה אופייני: באמצע פיצ׳ר מגיעה בקשת תיקון דחוף. במקום stash, פותחים תיקייה שנייה:

```bash
git worktree add ../hotfix-login main     # main בתיקייה סמוכה
cd ../hotfix-login
git switch -c hotfix/login-bug            # מתקנים כאן
# ... תיקון, commit, push ...
cd ../my-project                          # העבודה על הפיצ׳ר לא נגעה
git worktree remove ../hotfix-login       # ניקוי
```

Git לא ישלוף את אותו ענף בשני worktrees בבת אחת, אז משתמשים ב-`--detach` או בענף אחר.

## ריפו גדול ותחזוקה

- `git sparse-checkout set <תיקייה>` שולפת רק חלק מריפו גדול.
- `git maintenance start` מתזמנת תחזוקה ברקע (משיכה, דחיסה), כדי שהריפו יישאר מהיר.
