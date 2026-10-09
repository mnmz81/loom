---
title: "Git מאפס לגיבור"
summary: "מדריך מעשי ל-Git עם דוגמה אחת שממשיכה לאורך כל הדרך ועם תרשימים: commits, ענפים, מיזוג, rebase, ביטול טעויות ועבודה עם GitHub."
date: 2026-10-09
tags: [git, cli, tutorial]
---

Git נראה מפחיד עד שרואים מה הוא בעצם עושה. במדריך הזה נבנה פרויקט קטן מאפס, וכל רעיון חדש יופיע בדיוק ברגע שהפרויקט צריך אותו. בסוף המדריך אפשר יהיה לשמור עבודה, לבטל טעויות, לעבוד על כמה דברים במקביל ולשתף הכול דרך GitHub.

כדאי לפתוח טרמינל ולהקליד יחד. שום דבר כאן לא יכול לפגוע במשהו, כי נעבוד בתיקייה חדשה.

## מה זה Git (ומה זה לא)

Git הוא כלי ששומר **צילומים** של תיקיית הפרויקט. כל צילום נקרא *commit*. אפשר לחזור לכל אחד מהם, להשוות בין שניים, או להתפצל ולנסות משהו בלי לגעת בכל השאר.

שני דברים כדאי להבין מהר:

- **Git הוא לא GitHub.** Git רץ על המחשב ולא צריך אינטרנט. GitHub (וגם GitLab ו-Bitbucket) הוא אתר שמארח ריפואים של Git כדי שאפשר יהיה לשתף אותם.
- **commit הוא צילום, לא הפרש.** Git מראה הפרשים, אבל מה שהוא שומר הוא מצב כל הקבצים באותו רגע. בגלל זה קפיצה בין commits היא מיידית.

## התקנה והגדרה (פעם אחת)

קודם בודקים אם Git כבר מותקן:

```bash
git --version
```

אם לא, מתקינים מ-[git-scm.com](https://git-scm.com/downloads), או במק עם `brew install git`. אחר כך מספרים ל-Git מי אנחנו, כי כל commit נושא שם ואימייל:

```bash
git config --global user.name "Dana Levi"
git config --global user.email "dana@example.com"
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
```

שתי ההגדרות האחרונות גורמות לריפו חדש להתחיל על `main`, ול-`git push` הראשון של ענף להגדיר הכול לבד. את זה עושים פעם אחת לכל מחשב.

## הריפו הראשון

הדוגמה שלנו היא ספר מתכונים. ניצור תיקייה ונתחיל בה ריפו:

```bash
mkdir recipes
cd recipes
git init
```

```text
Initialized empty Git repository in /home/dana/recipes/.git/
```

זה יצר תיקייה נסתרת בשם `.git`, והיא כל ההיסטוריה. אם מוחקים אותה, הפרויקט שוכח הכול, אז משאירים אותה בשקט.

עכשיו ניצור קובץ ונשאל את Git מה הוא רואה:

```bash
echo "# Pasta" > pasta.md
echo "Boil water. Cook 9 minutes." >> pasta.md
git status
```

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	pasta.md

nothing added to commit but untracked files present (use "git add" to track)
```

`git status` היא הפקודה שמריצים הכי הרבה. כשלא בטוחים, מריצים אותה.

### שלושת האזורים

כדי לשמור צילום, קובץ עובר בשלושה מקומות:

![שלוש קופסאות משמאל לימין: תיקיית העבודה מחזיקה את הקבצים שלך, אזור ה-staging מחזיק מה שייכנס ל-commit הבא, והריפו מחזיק commits שמורים. git add מעביר קבצים ל-staging, ו-git commit מעביר אותם לריפו.](/images/git-zero-to-hero/areas.svg)

- **תיקיית העבודה** (working directory) היא הקבצים כפי שהם בדיסק כרגע.
- **אזור ה-staging** (נקרא גם index) הוא חדר המתנה: השינויים שבחרנו ל-commit *הבא*.
- **הריפו** (repository) הוא ההיסטוריה השמורה.

למה צריך את השלב האמצעי? כי הוא מאפשר לבחור. אם שינינו חמישה קבצים ורק שניים שייכים יחד, מכניסים ל-staging רק אותם ועושים להם commit לבד.

```bash
git add pasta.md
git status
```

```text
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   pasta.md
```

```bash
git commit -m "Add pasta recipe"
```

```text
[main (root-commit) 3f2a1b9] Add pasta recipe
 1 file changed, 2 insertions(+)
 create mode 100644 pasta.md
```

יש לנו commit ראשון. ניצור שני: נערוך את הקובץ, נסתכל על השינוי ונשמור אותו:

```bash
echo "Add salt to the water." >> pasta.md
git diff
```

```text
--- a/pasta.md
+++ b/pasta.md
@@ -1,2 +1,3 @@
 # Pasta
 Boil water. Cook 9 minutes.
+Add salt to the water.
```

```bash
git add pasta.md
git commit -m "Add salt to pasta"
```

טיפ: `git add .` מכניסה ל-staging הכול בתיקייה הנוכחית, ו-`git commit -am "הודעה"` מכניסה קבצים ש-Git כבר מכיר ועושה commit בבת אחת. כשרוצים לבחור חלקים בתוך קובץ, משתמשים ב-`git add -p`.

## להסתכל על ההיסטוריה

```bash
git log --oneline
```

```text
9c1d4e2 (HEAD -> main) Add salt to pasta
3f2a1b9 Add pasta recipe
```

כל שורה היא commit: מזהה קצר (hash) והודעה. כך זה נראה באמת:

![שלושה commits, A, B ו-C, משמאל לימין, עם חצים מכל commit להורה שלו. שם הענף main מצביע על ה-commit החדש ביותר, ו-HEAD מצביע על main.](/images/git-zero-to-hero/commit-chain.svg)

- כל commit מצביע על **ההורה** שלו, ה-commit שלפניו. ההיסטוריה היא שרשרת.
- **ענף** (כמו `main`) הוא סתם תווית שמצביעה על commit אחד. כשעושים commit, התווית זזה קדימה.
- **HEAD** הוא "איפה אנחנו עכשיו". בדרך כלל הוא מצביע על ענף.

זה כל המודל. כל השאר ב-Git הוא הזזה של התוויות האלה. כמה דרכים שימושיות להסתכל:

```bash
git log --oneline --graph --all   # תמונה של כל הענפים
git show 3f2a1b9                  # מה commit אחד שינה
git diff 3f2a1b9 9c1d4e2          # השוואה בין שני commits
```

## ביטול טעויות

כאן Git מוכיח את עצמו. הכלי הנכון תלוי ב*איפה* הטעות.

**ערכנו קובץ ורוצים את הגרסה הישנה** (עוד לא ב-commit):

```bash
git restore pasta.md      # ⚠️ זורקת את העריכות בקובץ הזה
```

**הכנסנו ל-staging קובץ לא נכון:**

```bash
git restore --staged todo.md
```

**טעות בהודעה של ה-commit האחרון, או ששכחנו קובץ:**

```bash
git add forgotten.md
git commit --amend        # משכתבת את ה-commit האחרון
```

**רוצים לבטל את ה-commit האחרון אבל לשמור את העבודה.** `git reset` מזיזה את תווית הענף אחורה. שלושה מצבים קובעים מה קורה לשינויים שהיו באותו commit:

![טבלה עם שלוש שורות: reset --soft מזיזה את main אחורה ומשאירה את השינויים ב-staging; reset --mixed מזיזה את main אחורה ומשאירה את השינויים בתיקיית העבודה מחוץ ל-staging; reset --hard מזיזה את main אחורה וזורקת את השינויים.](/images/git-zero-to-hero/reset.svg)

```bash
git reset --soft HEAD~1    # מבטלת את ה-commit, השינויים נשארים ב-staging
git reset HEAD~1           # אותו דבר, השינויים נשארים מחוץ ל-staging (--mixed היא ברירת המחדל)
git reset --hard HEAD~1    # ⚠️ מבטלת את ה-commit ומוחקת את השינויים
```

`HEAD~1` פירושו "commit אחד לפני HEAD".

**ה-commit כבר נדחף.** לא משכתבים היסטוריה משותפת. מוסיפים commit חדש שמבטל את הישן:

```bash
git revert 9c1d4e2
```

**נדמה לנו שאיבדנו משהו.** כמעט שום דבר לא הולך לאיבוד. `git reflog` מציגה כל מקום ש-HEAD היה בו, גם אחרי reset קשיח:

```bash
git reflog
git switch -c rescue 9c1d4e2    # שמים ענף על ה-commit שחשבנו שנעלם
```

## ענפים

נניח שרוצים לנסות מתכון לפיצה בלי לגעת ב-`main`. יוצרים ענף:

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

כך ההיסטוריה נראית:

![ל-main יש commits A, B ו-C. ענף שני בשם feature מתחיל ב-B ויש לו commits משלו, D ו-E. HEAD מצביע על feature, ולכן ה-commit הבא ילך לשם.](/images/git-zero-to-hero/branches.svg)

ענף כמעט לא עולה כלום: זו תווית אחת. אפשר ליצור כמה שרוצים, אחד לכל רעיון.

```bash
git branch            # רשימת ענפים, * מסמן את הנוכחי
git switch main       # חזרה; pizza.md נעלם מהתיקייה
git switch pizza      # והוא חוזר
```

התיקייה משתנה בהתאם לענף. אין בזה קסם: Git מחליף את הקבצים באלה שבאותו צילום.

## מיזוג

הפיצה גמורה. מביאים אותה ל-`main`:

```bash
git switch main
git merge pizza
```

מה שקורה אחר כך תלוי אם `main` זז בזמן שלא היינו שם.

![שני תרחישים. למעלה, fast-forward: ב-main לא היה שום דבר חדש, אז Git רק מזיז את התווית main קדימה ל-commit האחרון של feature. למטה, commit של מיזוג: בשני הענפים יש commits חדשים, אז Git יוצר commit מיזוג M עם שני הורים.](/images/git-zero-to-hero/merge.svg)

- אם `main` לא השתנה, Git עושה **fast-forward**: הוא רק מזיז את התווית `main` קדימה. אין commit חדש.
- אם בשני הענפים יש commits חדשים, Git יוצר **commit של מיזוג** עם שני הורים, שקושר את ההיסטוריות.

ואז מנקים:

```bash
git branch -d pizza    # בטוח: מסרב אם הענף לא מוזג
```

### קונפליקטים

אם שני ענפים שינו את *אותה שורה*, Git לא יכול להחליט ושואל אותנו:

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

כל מה שבין `<<<<<<<` ל-`=======` הוא שלנו (`main`), והשאר שלהם (`pizza`). מחליטים, מוחקים את הסימונים ומשאירים את מה שרוצים:

```text
Bake 25 minutes.
```

```bash
git add pizza.md
git commit            # משלימה את המיזוג
```

התחרטנו באמצע? `git merge --abort` מחזירה הכול למצב שהיה. קונפליקט הוא לא שגיאה, אלא Git ששואל שאלה שרק אנחנו יכולים לענות עליה.

## rebase: חלופה מסודרת יותר

מיזוג שומר את ההיסטוריה האמיתית, כולל ההתפצלות. **rebase** במקום זה *מריצה מחדש* את ה-commits של הענף על גבי ה-`main` העדכני, וההיסטוריה נראית כקו ישר אחד:

```bash
git switch pizza
git rebase main
```

![לפני: main התקדם ל-C בזמן ש-feature עם D ו-E מתפצל מ-B. אחרי git rebase main: D ו-E מועתקים כ-D' ו-E' על גבי C, וזה יוצר קו ישר. ה-D וה-E הישנים נשארים מאחור.](/images/git-zero-to-hero/rebase.svg)

שימו לב לגרשיים: D′ ו-E′ הם commits *חדשים* עם מזהים חדשים, עותקים של המקוריים. מכאן הכלל היחיד ששווה לשנן:

> **לעולם לא עושים rebase ל-commits שכבר יש לאחרים.** זה משכתב היסטוריה, וכל מי שמשך את ה-commits הישנים נשאר עם בלגן. על ענף פרטי משלך אפשר לעשות rebase חופשי. ברגע שהוא משותף, ממזגים.

שימוש נפוץ הוא סידור ה-commits שלך לפני pull request. `git rebase -i HEAD~4` פותחת רשימה של ארבעת ה-commits האחרונים, ושם אפשר לאחד אותם לאחד, לשנות הודעות או למחוק אחד.

## עבודה עם GitHub

עד עכשיו הכול על המחשב. כדי לשתף צריך **remote**: עותק של הריפו במקום אחר. GitHub הוא המקום הרגיל.

אם הפרויקט כבר קיים ב-GitHub, משכפלים אותו:

```bash
git clone https://github.com/dana/recipes.git
```

אם התחלנו מקומית כמו בדוגמה, יוצרים ריפו ריק ב-GitHub, מתחברים אליו ודוחפים:

```bash
git remote add origin https://github.com/dana/recipes.git
git push -u origin main
```

`origin` הוא רק הכינוי של אותו remote, ו-`-u` מקשרת את `main` המקומי אליו (עם ההגדרה מקודם, `git push` רגילה עושה את זה בענפים חדשים).

סנכרון הוא שלוש פקודות, וכדאי לדעת בדיוק מה כל אחת עושה:

![שני ריפואים. ה-remote origin מחזיק commits A, B ו-C. במחשב שלך יש A ו-B ותווית origin/main. git fetch מורידה את C אל origin/main בלי לגעת ב-main שלך. git push מעלה את ה-commits שלך אל origin. git pull היא fetch ואחריה merge.](/images/git-zero-to-hero/remote.svg)

- `git fetch` **מורידה** את מה שחדש אל `origin/main` אבל לא נוגעת בענף שלך. תמיד בטוחה.
- `git pull` היא fetch **ועוד** מיזוג שלו לענף הנוכחי. (`git pull --rebase` מורידה ואז עושה rebase.)
- `git push` **מעלה** את ה-commits שלך.

אם `git push` נדחית, מישהו דחף לפנינו. עושים pull, פותרים קונפליקטים אם יש, ודוחפים שוב.

### זרימת העבודה היומיומית ב-GitHub

1. `git switch -c fix-typo` יוצרת ענף לשינוי.
2. עורכים, `git add`, `git commit`. commits קטנים עם הודעות ברורות.
3. `git push` שולחת את הענף ל-GitHub.
4. פותחים **pull request** ב-GitHub, שם חברי הצוות סוקרים אותו.
5. אחרי המיזוג: `git switch main`, `git pull`, ו-`git branch -d fix-typo`.

## כלים שימושיים

**stash** מחנה עבודה לא גמורה כדי שאפשר יהיה לעבור ענף עם תיקייה נקייה:

```bash
git stash push -m "half-written pasta tips"
git switch other-branch
# ... עושים משהו ...
git switch -
git stash pop             # מחזירה אותה
```

**תגיות** נותנות ל-commit שם קבוע, בדרך כלל לגרסאות:

```bash
git tag -a v1.0 -m "First release"
git push --tags
```

**cherry-pick** מעתיקה commit בודד מענף אחר:

![ל-main יש A, B ו-C. ל-feature יש B, D ו-E. git cherry-pick E מעתיקה רק את commit E אל main בתור E'. D לא מועתק.](/images/git-zero-to-hero/cherry-pick.svg)

```bash
git cherry-pick 7c8d9e0
```

**bisect** מוצאת איזה commit הכניס באג, בחיפוש בינארי. אומרים ל-Git commit אחד שבור ואחד תקין, ואז עונים "good" או "bad" בזמן שהוא עובר על אלה שביניהם:

```bash
git bisect start
git bisect bad                 # ה-commit הנוכחי שבור
git bisect good v1.0           # זה עבד
# בודקים, ואז עונים: git bisect good / git bisect bad
git bisect reset               # בסיום
```

**.gitignore** מפרט קבצים ש-Git לא אמור לעקוב אחריהם לעולם (תלויות, פלט build, סודות). יוצרים קובץ בשם `.gitignore`:

```text
node_modules/
dist/
.env
```

## הרגלים שחוסכים צרות

- **commits קטנים ותכופים.** רעיון אחד בכל commit. "Fix login redirect" עדיף על "stuff".
- **הודעות לעצמנו העתידיים.** שורה ראשונה קצרה בלשון ציווי: "Add pasta recipe", "Fix crash on empty list".
- **`git status` לפני ואחרי.** זה לוקח שנייה וחוסך את רוב ההפתעות.
- **pull לפני שמתחילים, ולפני שדוחפים.**
- **לעולם לא מכניסים סודות ל-commit.** אם סיסמה או טוקן הגיעו ל-commit, מתייחסים אליהם כדלופים גם אחרי המחיקה: קודם מבטלים ומחליפים, ורק אחר כך מנקים את ההיסטוריה.
- **לא משכתבים היסטוריה משותפת.** בלי `--force` על ענפים שאחרים משתמשים בהם. אם חייבים, `git push --force-with-lease`.

## "עשיתי X, ועכשיו מה?"

| מצב | פתרון |
| --- | --- |
| טעות בהודעה של ה-commit האחרון | `git commit --amend` |
| הכנסתי ל-staging קובץ לא נכון | `git restore --staged <קובץ>` |
| רוצה לבטל את ה-commit האחרון ולשמור את העבודה | `git reset --soft HEAD~1` |
| commit גרוע כבר נדחף | `git revert <commit>` |
| המיזוג הפך לבלגן | `git merge --abort` |
| ה-rebase הפך לבלגן | `git rebase --abort` |
| התחלתי לעבוד על `main` בטעות | `git switch -c new-branch` (השינויים באים איתי) |
| צריך לעבור ענף באמצע עבודה | `git stash`, ואחר כך `git stash pop` |
| איבדתי commits אחרי reset או rebase | `git reflog`, ואז `git switch -c rescue <commit>` |
| מחקתי ענף בטעות | `git reflog`, ואז `git switch -c <שם> <commit>` |

## לאן ממשיכים

עכשיו אנחנו מכירים את כל המודל: צילומים בשרשרת, תוויות שזזות ושלושה אזורים שהקבצים עוברים בהם. לרשימת הפקודות המלאה, עם דגלים לכל מה שכאן ועוד, יש את [דף העזר שלי ל-Git](he/posts/git-commands/). וכשמשהו מרגיש לא בסדר, `git status` ו-`git log --oneline --graph --all` יגידו בדרך כלל בדיוק איפה אנחנו.
