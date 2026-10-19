---
title: "Git מאפס לגיבור: rebase וכלים שימושיים"
summary: "חלק 5 במדריך ל-Git: ‏rebase והכלל היחיד שבא איתו, rebase אינטראקטיבי לסידור commits, ואחר כך stash, ‏cherry-pick, ‏bisect ו-.gitignore."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 5 }
---

ב[חלק 4](he/posts/git-zero-to-hero-branches/) חיברנו את ענף הפיצה ל-`main` במיזוג. ‏rebase היא הדרך השנייה לעדכן ענף.

## rebase: חלופה מסודרת יותר

מיזוג שומר את ההיסטוריה האמיתית, כולל ההתפצלות. **rebase** *מריצה מחדש* את ה-commits של הענף על גבי ה-`main` העדכני, וההיסטוריה הופכת לקו ישר אחד:

```bash
git switch pizza
git rebase main
```

![לפני: main התקדם ל-C בזמן ש-feature עם D ו-E מתפצל מ-B. אחרי git rebase main: D ו-E מועתקים כ-D' ו-E' על גבי C, וזה יוצר קו ישר. ה-D וה-E הישנים נשארים מאחור.](/images/git-zero-to-hero/rebase.svg)

‏D′ ו-E′ הם commits *חדשים* עם מזהים חדשים, עותקים של המקוריים. מכאן הכלל היחיד ששווה לשנן:

> **לעולם לא עושים rebase ל-commits שכבר יש לאחרים.** זה משכתב היסטוריה, וכל מי שמשך את ה-commits הישנים נשאר עם בלגן. על ענף פרטי אפשר לעשות rebase חופשי. ברגע שהוא משותף, ממזגים.

### rebase אינטראקטיבי: לסדר את ה-commits

לפני ששיתפנו ענף, מסדרים את ההיסטוריה הפרטית שלו עם `git rebase -i`. נניח שהאחרון משלושה commits הוא רק תיקון שגיאת כתיב:

```bash
git rebase -i HEAD~3
```

Git פותח בעורך רשימה, מהישן לחדש. (בגרסאות ישנות ההודעה מופיעה בלי ה-`#`, ושתי הצורות עובדות.)

```text
pick 3f2a1b9 # Add pasta recipe
pick 9c1d4e2 # Add salt to pasta
pick b7e3f10 # Fix typo in salt step
```

משנים את המילה בתחילת שורה כדי להגיד מה יקרה לאותו commit, ואז שומרים וסוגרים:

| מילה | מה היא עושה |
| --- | --- |
| `pick` | משאירה את ה-commit כמו שהוא |
| `reword` | משאירה אותו, אבל עוצרת כדי שנערוך את ההודעה |
| `squash` | מאחדת אותו ל-commit שמעליו ומשלבת את ההודעות |
| `fixup` | מאחדת אותו ל-commit שמעליו וזורקת את ההודעה שלו |
| `drop` | מוחקת את ה-commit |
| `edit` | עוצרת כדי שנוכל לשנות את תוכן ה-commit |

שינוי `pick` ל-`fixup` בשורה האחרונה מאחד את תיקון הכתיב לתוך "Add salt to pasta", ונשארים שני commits נקיים. אפשר גם לסדר commits מחדש בהזזת שורות, ו-`git rebase --abort` מבטלת הכול.

## כלים שימושיים

**stash** מניח בצד עבודה לא גמורה כדי לעבור לענף אחר עם תיקייה נקייה:

```bash
git stash push -m "half-written pasta tips"
git switch other-branch
# ... עושים משהו ...
git switch -
git stash pop             # מחזירה אותה
```

**cherry-pick** מעתיקה commit בודד מענף אחר:

![ל-main יש A, B ו-C. ל-feature יש B, D ו-E. git cherry-pick E מעתיקה רק את commit E אל main בתור E'. D לא מועתק.](/images/git-zero-to-hero/cherry-pick.svg)

```bash
git cherry-pick 7c8d9e0
```

**bisect** מוצאת איזה commit הכניס באג, בחיפוש בינארי. נותנים ל-Git commit אחד שבור ואחד תקין, ואז עונים "good" או "bad" בזמן שהוא עובר על אלה שביניהם:

```bash
git bisect start
git bisect bad                 # ה-commit הנוכחי שבור
git bisect good v1.0           # זה עבד
# בודקים, ואז עונים: git bisect good / git bisect bad
git bisect reset               # בסיום
```

**.gitignore** מפרט קבצים ש-Git לא אמור לעקוב אחריהם לעולם (תלויות, פלט build, סודות):

```text
node_modules/
dist/
.env
```

כמה כללי תבנית מכסים כמעט הכול:

```text
*.log          # כל קובץ שמסתיים ב-.log
build/         # תיקייה, בכל מקום
/todo.md       # רק בשורש הפרויקט
**/temp        # "temp" בכל עומק
!keep.log      # חריג: לעקוב אחרי זה למרות ש-*.log מוסתר
```

`.gitignore` משפיע רק על קבצים ש-Git עדיין לא עוקב אחריהם. אם קובץ נכנס ל-commit לפני שהסתרנו אותו, מריצים פעם אחת `git rm --cached <קובץ>` כדי להפסיק לעקוב אחריו (הקובץ נשאר בדיסק), ואז עושים commit. סיסמה או טוקן שהגיעו ל-commit דלפו גם אחרי המחיקה: קודם מבטלים ומחליפים, ורק אחר כך מנקים את ההיסטוריה.
