---
title: "Git מאפס לגיבור: ה-commits הראשונים"
summary: "חלק 1 במדריך ל-Git: מה זה Git, הגדרה חד-פעמית, ריפו ראשון, שלושת האזורים ששינוי עובר בהם וארבעת המצבים של קובץ."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli]
series: { key: devops, order: 1 }
---

במדריך הזה בונים ב-Git פרויקט קטן, ספר מתכונים, וכל רעיון מופיע כשהפרויקט צריך אותו. כדאי לפתוח טרמינל ולהקליד יחד: עובדים בתיקייה חדשה, אז שום דבר לא יישבר.

## מה זה Git (ומה זה לא)

Git שומר **צילומים** של תיקיית הפרויקט. כל צילום נקרא *commit*. אפשר לחזור לכל אחד מהם, להשוות בין שניים, או להתפצל ולנסות משהו בלי לגעת בכל השאר.

- **Git הוא לא GitHub.** Git רץ על המחשב ולא צריך אינטרנט. GitHub (וגם GitLab ו-Bitbucket) הוא אתר שמארח ריפואים של Git כדי שאפשר יהיה לשתף אותם.
- **commit הוא צילום, לא הפרש.** Git מראה הפרשים, אבל שומר את מצב כל הקבצים באותו רגע. בגלל זה קפיצה בין commits היא מיידית.

## התקנה והגדרה (פעם אחת)

```bash
git --version
```

אם הפקודה נכשלת, מתקינים את Git מ-[git-scm.com](https://git-scm.com/downloads), או במק עם `brew install git`. אחר כך מספרים ל-Git מי אנחנו, כי כל commit נושא שם ואימייל:

```bash
git config --global user.name "Dana Levi"
git config --global user.email "dana@example.com"
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
```

שתי האחרונות גורמות לריפו חדש להתחיל על `main`, ול-`git push` הראשון של ענף להגדיר הכול לבד. עושים את זה פעם אחת לכל מחשב.

ההגדרות שמורות בשלוש רמות: `--system` (המחשב), `--global` (המשתמש, `~/.gitconfig`) ו-`--local` (ריפו אחד, `.git/config`). הספציפית ביותר מנצחת, ולכן פרויקט אחד יכול להשתמש באימייל של העבודה. `git config --list --show-origin` מדפיסה כל הגדרה ואת הקובץ שלה.

מאז Git 2.46 המדריך הרשמי מעדיף תתי-פקודות (`git config set --global user.name "Dana Levi"`, `git config get user.name`, `git config list`). הצורות הישנות שלמעלה עדיין עובדות בכל מקום.

## הריפו הראשון

```bash
mkdir recipes
cd recipes
git init
```

```text
Initialized empty Git repository in /home/dana/recipes/.git/
```

התיקייה הנסתרת `.git` היא כל ההיסטוריה. מוחקים אותה, והפרויקט שוכח הכול.

ניצור קובץ ונשאל את Git מה הוא רואה:

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

![שלוש קופסאות משמאל לימין: תיקיית העבודה מחזיקה את הקבצים, אזור ה-staging מחזיק מה שייכנס ל-commit הבא, והריפו מחזיק commits שמורים. git add מעביר קבצים ל-staging, ו-git commit מעביר אותם לריפו.](/images/git-zero-to-hero/areas.svg)

- **תיקיית העבודה** (working directory) היא הקבצים כפי שהם בדיסק כרגע.
- **אזור ה-staging** (נקרא גם index) מחזיק את השינויים שבחרנו ל-commit *הבא*.
- **הריפו** (repository) הוא ההיסטוריה השמורה.

השלב האמצעי מאפשר לבחור: שינינו חמישה קבצים ורק שניים שייכים יחד? מכניסים ל-staging רק אותם ועושים להם commit לבד.

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

לפני ה-commit הראשון Git מציע `git rm --cached` להוצאה מה-staging. כשיש היסטוריה, משתמשים ב-`git restore --staged`.

```bash
git commit -m "Add pasta recipe"
```

```text
[main (root-commit) 3f2a1b9] Add pasta recipe
 1 file changed, 2 insertions(+)
 create mode 100644 pasta.md
```

commit שני: עורכים את הקובץ, מסתכלים על השינוי ושומרים.

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

`git add .` מכניסה ל-staging את כל מה שבתיקייה הנוכחית, ו-`git commit -am "הודעה"` מכניסה קבצים ש-Git כבר מכיר ועושה commit בבת אחת. עם `git add -p` בוחרים חלקים בתוך קובץ.

### חיי קובץ

Git מסווג כל קובץ לאחד מארבעה מצבים:

![מחזור של ארבעה מצבים. קובץ חדש הוא untracked. git add הופכת אותו ל-staged. אחרי git commit הוא unmodified. עריכה הופכת אותו ל-modified, ו-git add מכניסה אותו שוב ל-staging.](/images/git-zero-to-hero/file-lifecycle.svg)

- **Untracked:** קובץ חדש ש-Git מעולם לא ראה. הוא לא ייכנס לשום commit עד שנוסיף אותו.
- **Unmodified:** זהה ל-commit האחרון. `git status` לא מזכירה אותו.
- **Modified:** ערכנו אותו, אבל העריכה לא ב-staging.
- **Staged:** העריכה ממתינה ל-commit הבא.

`git status` מציגה אותם תחת *Untracked files*, *Changes not staged for commit* (modified) ו-*Changes to be committed* (staged). קובץ יכול להופיע תחת שתי כותרות בבת אחת: מכניסים אותו ל-staging ועורכים שוב, וה-commit יקבל את הגרסה מרגע ה-`git add`, בזמן שהעריכה החדשה ממתינה בנפרד.
