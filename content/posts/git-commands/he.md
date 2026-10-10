---
title: "פקודות Git: דף העזר שלי"
summary: "פקודות ה-Git שחוזרים אליהן כל הזמן, מקובצות לפי מה שעושים: עבודה יומית, ענפים, ביטול, שרתים מרוחקים, היסטוריה, worktrees ועוד."
date: 2026-10-09
tags: [git, cli, cheatsheet]
---

יש לי ב-Notion רשימה של פקודות Git, כדי שלא אצטרך לזכור כל דגל. זו הרשימה הזו, מסודרת ומורחבת בפקודות שכל הזמן חסרו לי. סימן ⚠️ אומר שהפקודה יכולה לאבד עבודה, כדאי לקרוא אותה פעמיים לפני שמריצים.

מי שרק מתחיל עם Git: כדאי להתחיל ב[Git מאפס לגיבור](he/posts/git-zero-to-hero/) ולחזור לכאן כשצריך תזכורת.

## הגדרות

- `git config --global user.name "Name"` קובעת שם, ו-`git config --global user.email "you@example.com"` קובעת אימייל.
- `git config --global init.defaultBranch main` גורמת לריפו חדש להתחיל על `main`.
- `git config --global push.autoSetupRemote true` גורמת ל-`git push` הראשון של ענף חדש להגדיר את ה-upstream לבד.
- `git config --global pull.rebase true` גורמת ל-`git pull` לעשות rebase במקום ליצור commit של מיזוג. המדריך הרשמי עצמו מכנה את זה פעולה שעלולה להיות מסוכנת, כי rebase משכתב את ה-commits המקומיים. `git config --global pull.ff only` מחמירה יותר: היא מסרבת לכל מה שאינו fast-forward.
- `git config --global core.editor "code --wait"` בוחרת את העורך להודעות commit.
- `git config --list` מציגה את כל ההגדרות, ו-`git config --global alias.co checkout` יוצרת קיצור (`git co`). מאז Git 2.46 המדריך הרשמי מעדיף את הצורות `git config list`, `git config get <שם>` ו-`git config set <שם> <ערך>`; הצורות הישנות שלמעלה עדיין עובדות.
- `git help <פקודה>` פותחת את המדריך של הפקודה.

## התחלה ושכפול

- `git init` מתחילה ריפו בתיקייה הנוכחית.
- `git clone <url>` משכפלת ריפו, ו-`git clone <url> <תיקייה>` משכפלת לתיקייה לבחירתך.
- `git clone --depth 1 <url>` מורידה רק את הצילום האחרון, וזה מהיר בהרבה בהיסטוריה גדולה.
- `git clone --filter=blob:none <url>` היא שכפול חלקי: כל ההיסטוריה, ותוכן הקבצים יורד לפי דרישה.

## עבודה יומית

- `git status` מראה מה השתנה, ו-`git status -s` מראה בקיצור.
- `git add <קובץ>` מכניסה קובץ אחד ל-staging, `git add .` מכניסה הכול בתיקייה, ו-`git add -u` מכניסה רק קבצים ש-Git כבר עוקב אחריהם (כולל מחיקות).
- `git add -p` מכניסה חלק אחרי חלק, כך שקובץ אחד מבולגן הופך לשני commits נקיים.
- `git commit -m "הודעה"` עושה commit למה שב-staging, ו-`git commit -am "הודעה"` מכניסה קבצים במעקב ועושה commit בצעד אחד.
- `git commit --amend` משכתבת את ה-commit האחרון (הודעה או תוכן). עם `--no-edit` ההודעה נשארת.
- `git commit --fixup <commit>` רושמת תיקון ל-commit ישן יותר. אחר כך `git rebase -i --autosquash <בסיס>` משלבת אותו במקום הנכון לבד.
- `git rm <קובץ>` מוחקת קובץ ומכניסה את המחיקה ל-staging. `git rm --cached <קובץ>` מפסיקה לעקוב אחריו אבל משאירה אותו בדיסק, וזה מה שעושים כשמוסיפים משהו ל-`.gitignore` מאוחר מדי.
- `git mv <ישן> <חדש>` משנה שם או מזיזה קובץ.

## ענפים

- `git branch` מציגה ענפים מקומיים, `git branch -a` כוללת גם מרוחקים, ו-`git branch -vv` מראה לכל ענף את ה-upstream שלו ואם הוא לפני או אחרי.
- `git switch <ענף>` עוברת לענף, ו-`git switch -c <ענף>` יוצרת ענף ועוברת אליו. `git switch -` קופצת בחזרה לענף הקודם.
- `git checkout <ענף>` ו-`git checkout -b <ענף>` עושות אותו דבר בסגנון הישן.
- `git branch -d <ענף>` מוחקת ענף שמוזג, ו-`git branch -D <ענף>` מוחקת בכוח ⚠️.
- `git branch -m <שם-חדש>` משנה את שם הענף הנוכחי.
- `git branch --merged` מציגה ענפים שכבר מוזגו לענף הנוכחי. הדרך המהירה למצוא מה אפשר למחוק.
- `git branch --set-upstream-to=origin/<ענף>` מקשרת ענף מקומי לענף מרוחק.
- `git push origin --delete <ענף>` מוחקת ענף בשרת.

## מיזוג ו-rebase

- `git merge <ענף>` ממזגת ענף לענף הנוכחי. `--no-ff` יוצרת תמיד commit של מיזוג, ו-`--squash` מכווצת את הענף לשינוי אחד ב-staging.
- `git rebase <ענף>` מריצה מחדש את ה-commits שלך על גבי ענף אחר.
- `git rebase -i HEAD~3` היא rebase אינטראקטיבי על שלושת ה-commits האחרונים: לאחד, לסדר מחדש, לשנות הודעה, למחוק.
- `git rebase --onto <בסיס-חדש> <בסיס-ישן> <ענף>` מעבירה ענף לנקודת התחלה חדשה.
- `git rebase --continue`, `git rebase --skip` ו-`git rebase --abort` מנהלות rebase שנעצר על קונפליקט. `git merge --abort` עושה אותו דבר למיזוג.

## שרתים מרוחקים וסנכרון

- `git remote -v` מציגה את השרתים, `git remote add origin <url>` מוסיפה אחד, ו-`git remote set-url origin <url>` משנה את הכתובת שלו.
- `git fetch` מורידה שינויים מהשרת בלי למזג. `git fetch --prune` מסירה גם ענפים מרוחקים שכבר לא קיימים.
- `git pull` היא fetch ועוד merge, ו-`git pull --rebase` היא fetch ועוד rebase להיסטוריה נקייה יותר. `git pull --ff-only` מסרבת ליצור commit של מיזוג.
- `git push` שולחת את ה-commits שלך, ו-`git push -u origin <ענף>` מגדירה גם upstream.
- `git push --force-with-lease` היא דחיפה בכוח בצורה בטוחה יותר: היא מסרבת אם מישהו אחר דחף בינתיים ⚠️.

## בדיקת היסטוריה

- `git log` מציגה היסטוריה, ו-`git log --oneline --graph --all` מציגה תמונה קומפקטית של כל הענפים.
- `git log -p <קובץ>` מראה איך קובץ השתנה לאורך זמן, ו-`git log --stat` מציגה את הקבצים שנגעו בכל commit.
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
- `git stash branch <שם>` הופכת stash לענף חדש. שימושי כשה-stash כבר לא מתיישם נקי.

## תגיות

- `git tag` מציגה תגיות, `git tag <שם>` יוצרת תגית קלה, ו-`git tag -a v1.0 -m "הודעה"` יוצרת תגית מוערת.
- `git push --tags` דוחפת תגיות, ו-`git push origin --delete <תגית>` מסירה אחת מהשרת. `git tag -d <תגית>` מסירה אותה מקומית.
- `git describe` נותנת ל-commit הנוכחי שם ביחס לתגית האחרונה, למשל `v1.0-3-gabc123`.

## שחזור וחקירה

- `git reflog` היא ההיסטוריה של המקומות ש-HEAD היה בהם. מציל החיים כשהלכו commits אחרי reset או rebase לא מוצלחים.
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

אי אפשר לשלוף את אותו ענף בשני worktrees בבת אחת. Git חוסם את זה כדי למנוע כתיבות מתנגשות, אז משתמשים ב-`--detach` או בענף אחר.

## ריפו גדול ותחזוקה

- `git sparse-checkout set <תיקייה>` שולפת רק חלק מריפו גדול.
- `git maintenance start` מתזמנת תחזוקה ברקע (משיכה, דחיסה), כדי שהריפו יישאר מהיר.
- `.gitignore` מפרט קבצים ש-Git לא יעקוב אחריהם לעולם. אם קובץ כבר במעקב, הוספה לשם לא מספיקה: צריך גם `git rm --cached <קובץ>`.

לכל מה שלא כתוב כאן, `git help <פקודה>` הוא מקור האמת.
