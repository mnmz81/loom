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

Git שומר הגדרות בשלוש רמות: `--system` לכל המחשב, `--global` למשתמש שלך (הקובץ `~/.gitconfig`), ו-`--local` לריפו אחד (`.git/config`). הרמה הספציפית ביותר מנצחת, ולכן אפשר להשתמש באימייל של העבודה בפרויקט אחד ובאימייל פרטי בכל השאר. `git config --list --show-origin` מדפיסה כל הגדרה ואת הקובץ שממנו היא באה.

הערה על התחביר: מאז Git 2.46 המדריך הרשמי מעדיף תתי-פקודות (`git config set --global user.name "Dana Levi"`, `git config get user.name`, `git config list`) ומסמן את הצורות הישנות שבהן השתמשנו כמיושנות (deprecated). הצורות הישנות עדיין עובדות בכל מקום, והן אלה שרוב המדריכים והמחשבים הישנים משתמשים בהן.

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
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   pasta.md
```

לפני שקיים ה-commit הראשון, Git מציעה `git rm --cached` להוצאה מה-staging. כשכבר יש היסטוריה היא מציעה `git restore --staged`, וזו הפקודה שנשתמש בה מעכשיו.

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
diff --git a/pasta.md b/pasta.md
index 9501cd5..54af23a 100644
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

### חיי קובץ

Git מסווג כל קובץ בפרויקט לאחד מארבעה מצבים, ו-`git status` היא הדרך לראות אותם:

![מחזור של ארבעה מצבים. קובץ חדש הוא untracked. git add הופכת אותו ל-staged. אחרי git commit הוא unmodified. עריכה הופכת אותו ל-modified, ו-git add מכניסה אותו שוב ל-staging.](/images/git-zero-to-hero/file-lifecycle.svg)

- **Untracked:** קובץ חדש ש-Git מעולם לא ראה. הוא לא ייכנס לשום commit עד שנוסיף אותו.
- **Unmodified:** זהה ל-commit האחרון. `git status` לא מזכירה קבצים כאלה בכלל.
- **Modified:** ערכנו אותו, אבל לא הכנסנו את העריכה ל-staging.
- **Staged:** העריכה ממתינה ל-commit הבא.

`git status` מציגה אותם תחת הכותרות *Untracked files*, *Changes not staged for commit* (modified) ו-*Changes to be committed* (staged). קובץ יכול להופיע תחת שתי כותרות בבת אחת. אם הכנסנו קובץ ל-staging ואז ערכנו אותו שוב, הגרסה שהוכנסה היא זו שתיכנס ל-commit, והעריכה החדשה יותר ממתינה בנפרד. ה-staging מצלם את הקובץ *ברגע שהרצנו `git add`*.

### לקרוא diff

פלט של `git diff` נראה מוזר פעם אחת, ואחר כך כבר לא:

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

- `diff --git a/... b/...` נותנת שם לקובץ, ו-`index 54af23a..e1f3b27 100644` מכילה hash קצר של התוכן הישן והחדש ואת מצב הקובץ. אפשר להתעלם משורה זו.
- `--- a/...` ו-`+++ b/...` הן הגרסה הישנה והחדשה של הקובץ.
- `@@ -1,3 +1,3 @@` אומרת: הקטע הזה (*hunk*) מכסה שלוש שורות החל משורה 1 בקובץ הישן, ושלוש שורות החל משורה 1 בחדש.
- שורות שמתחילות ב-`-` הוסרו, שורות שמתחילות ב-`+` נוספו, ושורות שמתחילות ברווח הן הקשר שלא השתנה.

מה בדיוק מושווה תלוי בדגלים:

| פקודה | משווה |
| --- | --- |
| `git diff` | את תיקיית העבודה מול ה-staging (מה שעוד לא הכנסנו) |
| `git diff --staged` | את ה-staging מול ה-commit האחרון (מה שה-commit הבא יכיל) |
| `git diff HEAD` | את תיקיית העבודה מול ה-commit האחרון (הכול, עם staging או בלי) |

### לכתוב הודעת commit טובה

הודעות commit הן הפתקים שאנחנו משאירים למי שיקרא את ההיסטוריה אחר כך, ובדרך כלל זה אנחנו בעוד חצי שנה. מבנה פשוט עובד טוב:

```text
Fix crash when the recipe list is empty

The list view assumed at least one recipe and read the first item
without checking. Show the empty-state message instead.
```

- **שורה ראשונה קצרה** (בערך 50 תווים), בלשון ציווי: "Fix", "Add", "Remove". לקרוא אותה כמו "ה-commit הזה ... יתקן את הקריסה".
- **שורה ריקה**, ואחריה גוף אופציונלי שמסביר *למה*, לא מה. ה-diff כבר מראה מה השתנה.
- רעיון אחד בכל commit, כדי שההודעה תהיה קצרה ונכונה.

להשוות בין "Fix crash when the recipe list is empty" לבין "fixes", "stuff" או "wip". בעוד חצי שנה רק אחת מהן עוזרת.

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

### מה יש בתוך commit

commit הוא רשומה קטנה. אפשר להסתכל על הדבר האמיתי עם `git cat-file -p HEAD`:

```text
tree 9f1e0c8d2b7a4c3e5d6f708192a3b4c5d6e7f809
parent 3f2a1b94c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
author Dana Levi <dana@example.com> 1791540000 +0300
committer Dana Levi <dana@example.com> 1791540000 +0300

Add salt to pasta
```

- `tree` מצביע על הצילום של כל הקבצים באותו רגע.
- `parent` הוא ה-commit שלפניו. זה החץ בתרשימים. ל-commit של מיזוג יש שתי שורות `parent`.
- `author` ו-`committer` הם מי כתב ומי רשם, עם חותמת זמן.
- ואז ההודעה.

ה-**hash** של ה-commit (כמו `9c1d4e2`) הוא טביעת אצבע שמחושבת בדיוק מהתוכן הזה. משנים משהו (הקבצים, ההודעה, ההורה, אפילו חותמת הזמן) ומקבלים hash אחר. בגלל זה `git commit --amend` ו-`git rebase` יוצרות commits *חדשים* במקום לערוך ישנים: מבחינת Git, commit ששונה הוא commit אחר. שבעה תווים כמעט תמיד מספיקים כדי לקרוא ל-commit בשם, כל עוד הם ייחודיים בריפו.

### איך מצביעים על commits

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

**Detached HEAD.** בדרך כלל HEAD מצביע על *ענף*, והענף מצביע על commit. אם עוברים ישירות ל-commit, למשל עם `git switch --detach 3f2a1b9`, HEAD מצביע ישר על ה-commit. Git עונה `HEAD is now at 3f2a1b9 ...`, ובפקודה הישנה `git checkout <commit>` הוא מוסיף הודעה ארוכה על מצב "detached HEAD". זה מקום מצוין להסתכל סביב, אבל commits שנעשים שם לא שייכים לאף ענף וקל לאבד אותם. כדי לשמור אותם, שמים עליהם ענף עם `git switch -c keep-this`. כדי לצאת, `git switch main`.

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

### מה זה ענף באמת

ענף הוא לא עותק של הפרויקט. זה קובץ זעיר עם hash אחד של commit. אפשר לקרוא אותו:

```bash
cat .git/refs/heads/main
cat .git/HEAD
```

```text
9c1d4e2a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4
ref: refs/heads/pizza
```

הקובץ הראשון הוא הענף `main`: hash, ושום דבר אחר. השני הוא HEAD, שאומר "אני על `pizza`". זה כל המנגנון, ובגללו ענפים חינמיים ומיידיים.

- **יצירת** ענף כותבת קובץ קטן אחד.
- **מעבר** ענף משנה מה HEAD אומר ומעדכן את קבצי העבודה בהתאם.
- **מחיקת** ענף מסירה את התווית. ה-commits נשארים בריפו, ו-`git reflog` עדיין יכולה למצוא אותם לזמן מה. Git מנקה commits שאי אפשר להגיע אליהם רק אחרי תקופת חסד.

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

### איך Git ממזג

איך `git merge` יודעת מה לשמור? היא מוצאת את **בסיס המיזוג** (merge base), ה-commit האחרון ששני הענפים חולקים, ומשווה כל ענף מולו:

![ל-A ול-B יש היסטוריה משותפת. main ממשיך עם C ו-feature ממשיך עם D. גם C וגם D מצביעים אחורה אל B, בסיס המיזוג. commit המיזוג M מצביע על C ועל D.](/images/git-zero-to-hero/three-way-merge.svg)

```bash
git merge-base main pizza    # מדפיסה את ה-hash של B
```

Git בודקת מה השתנה מ-B ל-C ומ-B ל-D, ומשלבת:

- שורה ששונתה ב**צד אחד בלבד** נלקחת כמו שהיא.
- שורה ששונתה ב**שני הצדדים לאותו דבר** נלקחת פעם אחת.
- שורה ששונתה ב**שני הצדדים באופן שונה** היא קונפליקט. Git לא יכולה לדעת למה התכוונו.

בגלל זה מיזוגים בדרך כלל פשוט עובדים: ברוב המקרים שני הענפים נוגעים במקומות שונים.

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

כמה הרגלים שומרים על קונפליקטים קטנים ורגועים:

- **למזג את `main` לענף שלנו לעתים קרובות** (או לעשות rebase עליו), כדי שההבדלים לא יצטברו.
- **לשמור ענפים קצרי חיים וממוקדים.** ככל ששני ענפים חיים יותר זמן, הם מתרחקים זה מזה.
- `git status` בזמן קונפליקט מציגה *Unmerged paths*, הקבצים שעדיין מחכים לנו. ברגע שמריצים `git add` על קובץ, הוא נחשב פתור.
- כדי לקחת צד אחד של קובץ בשלמותו, משתמשים ב-`git checkout --ours <קובץ>` או `git checkout --theirs <קובץ>`, ואז `git add`. זהירות: בזמן **rebase** המשמעות מתהפכת. "ours" הוא הענף ש-rebase נעשה *עליו*, ו-"theirs" הוא ה-commit שלנו שמורץ מחדש.
- עורכים רבים (VS Code, JetBrains) מציגים קונפליקטים עם כפתורי "קבל נוכחי / נכנס" בלחיצה, ו-`git mergetool` פותחת כלי חזותי.

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

### rebase אינטראקטיבי: לסדר את ה-commits

לפני ששיתפנו ענף, אפשר לסדר את ההיסטוריה הפרטית שלו עם `git rebase -i`. נניח שעשינו שלושה commits והאחרון הוא רק תיקון שגיאת כתיב:

```bash
git rebase -i HEAD~3
```

Git פותחת בעורך רשימה, מהישן לחדש. (בגרסאות ישנות ההודעה מופיעה בלי ה-`#`, ושתי הצורות עובדות.)

```text
pick 3f2a1b9 # Add pasta recipe
pick 9c1d4e2 # Add salt to pasta
pick b7e3f10 # Fix typo in salt step
```

משנים את המילה בתחילת שורה כדי להגיד מה לעשות עם אותו commit, ואז שומרים וסוגרים:

| מילה | מה היא עושה |
| --- | --- |
| `pick` | משאירה את ה-commit כמו שהוא |
| `reword` | משאירה אותו, אבל עוצרת כדי שנערוך את ההודעה |
| `squash` | מאחדת אותו ל-commit שמעליו ומשלבת את ההודעות |
| `fixup` | מאחדת אותו ל-commit שמעליו וזורקת את ההודעה שלו |
| `drop` | מוחקת את ה-commit |
| `edit` | עוצרת כדי שנוכל לשנות את תוכן ה-commit |

כאן, שינוי `pick` ל-`fixup` בשורה האחרונה ממזג את תיקון הכתיב לתוך "Add salt to pasta", ונשארים שני commits נקיים. אפשר גם לסדר מחדש commits על ידי הזזת שורות. אם משהו משתבש, `git rebase --abort` מחזירה הכול למצב שהיה. ונזכור את הכלל: עושים את זה רק ל-commits שאף אחד אחר עוד לא משך.

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

### ענפי מעקב, upstream ו-ahead/behind

אחרי `git clone` או `git fetch`, נראה ענפים כמו `origin/main` ב-`git branch -a`. אלה **ענפי מעקב מרוחקים** (remote-tracking branches): העותק האחרון שהמחשב שלנו מכיר של המקום שבו הענף היה בשרת. אי אפשר לעשות עליהם commit, ורק `git fetch`, `pull` ו-`push` מזיזות אותם.

אפשר לקשר ענף מקומי לאחד מהם. הקישור הזה הוא ה-**upstream** שלו, והוא מה ש-`git status` ו-`git branch -vv` משתמשות בו כדי להגיד איפה אנחנו עומדים:

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

זו לא שגיאה שצריך לפחד ממנה. זה אומר שמישהו דחף ל-`main` מאז הסנכרון האחרון שלנו, ו-Git לא נותנת לדרוס את ה-commits שלו. התיקון הוא הרגיל: `git pull` (או `git pull --rebase`), לפתור קונפליקט אם יש, ואז `git push` שוב.

הקיצור המפתה הוא `git push --force`, שדורס את השרת בגרסה שלנו ו**מוחק** את ה-commits שלהם. לא עושים את זה בענפים משותפים. אם שכתבנו ענף משלנו עם rebase וממש צריך כוח, משתמשים ב-`git push --force-with-lease`: היא מסרבת כשיש בשרת commits שעוד לא ראינו.

**לשכפל או ליצור fork?** כדי לעבוד על ריפו שלנו או כזה שמותר לנו לכתוב אליו, משכפלים (clone). בריפו שאי אפשר לדחוף אליו (פרויקט קוד פתוח של מישהו אחר), קודם יוצרים *fork* ב-GitHub. זה יוצר עותק משלנו בחשבון. משכפלים את ה-fork, דוחפים אליו, ופותחים pull request בחזרה למקור. בדרך כלל מוסיפים את המקור בתור remote שני בשם `upstream` כדי לשמור על ה-fork מעודכן: `git remote add upstream <url>`.

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

כמה כללי תבנית מכסים כמעט הכול:

```text
*.log          # כל קובץ שמסתיים ב-.log
build/         # תיקייה, בכל מקום
/todo.md       # רק בשורש הפרויקט
**/temp        # "temp" בכל עומק
!keep.log      # חריג: לעקוב אחרי זה למרות ש-*.log מוסתר
```

תפיסה אחת: `.gitignore` משפיע רק על קבצים ש-Git עדיין לא עוקבת אחריהם. אם קובץ נכנס ל-commit לפני שהסתרנו אותו, מריצים פעם אחת `git rm --cached <קובץ>` כדי להפסיק לעקוב אחריו (הקובץ נשאר בדיסק), ואז עושים commit.

## הרגלים שחוסכים צרות

- **commits קטנים ותכופים.** רעיון אחד בכל commit. "Fix login redirect" עדיף על "stuff".
- **הודעות לעצמנו העתידיים.** שורה ראשונה קצרה בלשון ציווי: "Add pasta recipe", "Fix crash on empty list".
- **`git status` לפני ואחרי.** זה לוקח שנייה וחוסך את רוב ההפתעות.
- **pull לפני שמתחילים, ולפני שדוחפים.**
- **לעולם לא מכניסים סודות ל-commit.** אם סיסמה או טוקן הגיעו ל-commit, מתייחסים אליהם כדלופים גם אחרי המחיקה: קודם מבטלים ומחליפים, ורק אחר כך מנקים את ההיסטוריה.
- **לא משכתבים היסטוריה משותפת.** בלי `--force` על ענפים שאחרים משתמשים בהם. אם חייבים, `git push --force-with-lease`.

## איזו פקודת ביטול?

אותה משימה יכולה להיעשות בכמה פקודות, ו-`git checkout` הישנה עשתה את רובן, ובגלל זה היא בלבלה את כולם. מאז Git 2.23, `git switch` מטפלת במעבר בין ענפים ו-`git restore` מטפלת בקבצים. כך בוחרים:

| רוצים... | משתמשים ב- | מה משתנה |
| --- | --- | --- |
| לזרוק את העריכות בקובץ | `git restore <קובץ>` | הקובץ בתיקיית העבודה |
| להוציא קובץ מה-staging | `git restore --staged <קובץ>` | רק ה-staging |
| להחזיר קובץ כפי שהיה ב-commit ישן | `git restore --source=<commit> <קובץ>` | הקובץ בתיקיית העבודה |
| לתקן את ה-commit האחרון (הודעה או תוכן) | `git commit --amend` | מחליפה את ה-commit האחרון |
| להזיז את הענף אחורה ולשכוח commits (עוד לא נדחפו) | `git reset` | תווית הענף, ואולי גם ה-staging והקבצים |
| לבטל commit שכבר משותף | `git revert <commit>` | מוסיפה commit חדש, לא משכתבת כלום |
| להסתכל על קוד ישן בלי לשנות כלום | `git switch --detach <commit>` | רק HEAD |

כלל אצבע: אם ה-commits קיימים רק במחשב שלנו, מותר לשכתב אותם (`reset`, `amend`, `rebase`). אם יש סיכוי שלמישהו אחר יש אותם, מוסיפים להיסטוריה (`revert`) במקום לשכתב אותה.

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

## מילון מונחים

- **ריפו (repository):** פרויקט וההיסטוריה המלאה שלו, שנשמרת בתיקיית `.git`.
- **commit:** צילום שמור, עם הודעה, יוצר והורה.
- **hash:** טביעת האצבע שנותנת שם ל-commit, כמו `9c1d4e2`.
- **ענף (branch):** תווית זזה שמצביעה על commit.
- **HEAD:** מצביע לאן אנחנו עכשיו, בדרך כלל ענף.
- **תיקיית עבודה:** הקבצים כפי שהם בדיסק.
- **staging (index):** השינויים שנבחרו ל-commit הבא.
- **merge:** שילוב של שני ענפים. *fast-forward* רק מזיז תווית, ו-*commit מיזוג* יש לו שני הורים.
- **rebase:** הרצה מחדש של commits על גבי commit אחר, שיוצרת עותקים חדשים.
- **קונפליקט:** שני הצדדים שינו את אותן שורות ו-Git צריכה שנבחר.
- **remote:** עותק של הריפו במקום אחר, בדרך כלל בשם `origin`.
- **upstream:** הענף המרוחק שהענף המקומי מקושר אליו.
- **fetch / pull / push:** הורדה, הורדה עם מיזוג, והעלאה.
- **pull request (PR):** בקשה ב-GitHub למזג את הענף שלנו, עם סקירה.
- **fork:** עותק משלנו ב-GitHub של ריפו של מישהו אחר.
- **stash:** מדף לשינויים לא גמורים.
- **תגית (tag):** שם קבוע ל-commit, כמו גרסה.
- **Detached HEAD:** HEAD שמצביע על commit במקום על ענף.

## לאן ממשיכים

עכשיו אנחנו מכירים את כל המודל: צילומים בשרשרת, תוויות שזזות ושלושה אזורים שהקבצים עוברים בהם. לרשימת הפקודות המלאה, עם דגלים לכל מה שכאן ועוד, יש את [דף העזר שלי ל-Git](he/posts/git-commands/). וכשמשהו מרגיש לא בסדר, `git status` ו-`git log --oneline --graph --all` יגידו בדרך כלל בדיוק איפה אנחנו.
