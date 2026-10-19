---
title: "Git מאפס לגיבור: לבטל טעויות"
summary: "חלק 3 במדריך ל-Git: איך מצביעים על commit ‏(HEAD~1, HEAD^2, HEAD@{2}), מה זה detached HEAD, והביטול הנכון לכל טעות: restore, amend, reset, revert ו-reflog."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 3 }
---

כל ביטול ב-Git מצביע על commit כלשהו, ולכן החלק הזה מתחיל באיך מצביעים על commit, עם ההיסטוריה של ספר המתכונים מ[חלק 2](he/posts/git-zero-to-hero-history/).

## איך מצביעים על commits

בכל מקום ש-Git מבקש commit, אפשר לתת לו כל אחד מאלה:

| כותבים | המשמעות |
| --- | --- |
| `9c1d4e2` | commit לפי ה-hash (הקצר) שלו |
| `main`, `pizza` | ה-commit שענף מצביע עליו |
| `v1.0` | ה-commit שתגית מצביעה עליו |
| `HEAD` | ה-commit שאנחנו עליו |
| `HEAD~1` (או `HEAD^`) | commit אחד לפני HEAD, ההורה שלו |
| `HEAD~3` | שלושה commits אחורה לאורך השרשרת |
| `HEAD^2` | ההורה השני של commit מיזוג |
| `HEAD@{2}` | איפה HEAD היה לפני שתי תזוזות (מה-reflog) |

כך ש-`git diff HEAD~2 HEAD` משווה בין עכשיו לבין לפני שני commits, ו-`git show main~1` מציגה את ה-commit שלפני הקצה של `main`.

**Detached HEAD.** בדרך כלל HEAD מצביע על *ענף*. עוברים ישירות ל-commit, למשל עם `git switch --detach 3f2a1b9`, ו-HEAD מצביע ישר עליו. זה מקום טוב להסתכל על קוד ישן, אבל commits שנעשים שם לא שייכים לאף ענף וקל לאבד אותם. כדי לשמור אותם: `git switch -c keep-this`. כדי לצאת: `git switch main`.

## ביטול טעויות

`git checkout` הישנה עשתה את רוב המשימות האלה ובלבלה את כולם. מאז Git 2.23, `git switch` עוברת בין ענפים ו-`git restore` מטפלת בקבצים. הכלי הנכון תלוי ב*איפה* הטעות.

**ערכנו קובץ ורוצים בחזרה את הגרסה מה-commit האחרון:**

```bash
git restore pasta.md      # ⚠️ זורקת את העריכות בקובץ הזה
```

עם `--source=<commit>` מקבלים את הקובץ כפי שהיה ב-commit ישן יותר.

**הכנסנו ל-staging קובץ לא נכון:**

```bash
git restore --staged todo.md
```

**טעות בהודעה של ה-commit האחרון, או ששכחנו קובץ:**

```bash
git add forgotten.md
git commit --amend        # מחליפה את ה-commit האחרון
```

**רוצים לבטל את ה-commit האחרון אבל לשמור את העבודה.** `git reset` מזיזה את תווית הענף אחורה. שלושה מצבים קובעים מה קורה לשינויים שהיו באותו commit:

![טבלה עם שלוש שורות: reset --soft מזיזה את main אחורה ומשאירה את השינויים ב-staging; reset --mixed מזיזה את main אחורה ומשאירה את השינויים בתיקיית העבודה מחוץ ל-staging; reset --hard מזיזה את main אחורה וזורקת את השינויים.](/images/git-zero-to-hero/reset.svg)

```bash
git reset --soft HEAD~1    # מבטלת את ה-commit, השינויים נשארים ב-staging
git reset HEAD~1           # אותו דבר, השינויים נשארים מחוץ ל-staging (--mixed היא ברירת המחדל)
git reset --hard HEAD~1    # ⚠️ מבטלת את ה-commit ומוחקת את השינויים
```

**ה-commit כבר נדחף.** לא משכתבים היסטוריה משותפת. מוסיפים commit חדש שמבטל את הישן:

```bash
git revert 9c1d4e2
```

כלל אצבע: commits שקיימים רק במחשב שלנו מותר לשכתב (`reset`, `amend`, `rebase`); אם ייתכן שלמישהו אחר יש אותם, משתמשים ב-`revert`.

**התחלנו לעבוד על `main` בטעות.** `git switch -c new-branch` יוצרת ענף במקום שבו אנחנו, והשינויים שעוד לא נכנסו ל-commit באים איתנו.

**נדמה לנו שאיבדנו משהו.** כמעט שום דבר לא הולך לאיבוד. `git reflog` מציגה כל מקום ש-HEAD היה בו, גם אחרי reset קשיח, rebase או מחיקת ענף:

```bash
git reflog
git switch -c rescue 9c1d4e2    # שמים ענף על ה-commit שחשבנו שנעלם
```
