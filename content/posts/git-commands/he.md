---
title: "פקודות Git: הגדרות, עבודה יומית, ענפים ושרתים מרוחקים"
summary: "דף העזר שלי ל-Git, חלק 1: הגדרות, שכפול, staging ו-commit, ענפים, merge ו-rebase, שרתים מרוחקים."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli, cheatsheet]
series: { key: git-commands, order: 1 }
---

סימן ⚠️ אומר שהפקודה יכולה לאבד עבודה. חדשים ב-Git? כדאי להתחיל ב[Git מאפס לגיבור](he/posts/git-zero-to-hero/).

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
- `git rm <קובץ>` מוחקת קובץ ומכניסה את המחיקה ל-staging. `git rm --cached <קובץ>` מפסיקה לעקוב אחריו אבל משאירה אותו בדיסק, למשל קובץ שנוסף ל-`.gitignore` מאוחר מדי.
- `git mv <ישן> <חדש>` משנה שם או מזיזה קובץ.

## ענפים

- `git branch` מציגה ענפים מקומיים, `git branch -a` כוללת גם מרוחקים, ו-`git branch -vv` מראה לכל ענף את ה-upstream שלו ואם הוא לפני או אחרי.
- `git switch <ענף>` עוברת לענף, ו-`git switch -c <ענף>` יוצרת ענף ועוברת אליו. `git switch -` קופצת בחזרה לענף הקודם.
- `git checkout <ענף>` ו-`git checkout -b <ענף>` עושות אותו דבר בסגנון הישן.
- `git branch -d <ענף>` מוחקת ענף שמוזג, ו-`git branch -D <ענף>` מוחקת בכוח ⚠️.
- `git branch -m <שם-חדש>` משנה את שם הענף הנוכחי.
- `git branch --merged` מציגה ענפים שכבר מוזגו לענף הנוכחי, הדרך המהירה למצוא מה אפשר למחוק.
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
