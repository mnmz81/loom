---
title: "GitHub מאפס לגיבור"
summary: "מדריך מעשי ל-GitHub עם תרשימים: ריפוזיטורי, SSH וה-CLI בשם gh, pull requests וביקורת קוד, issues, forks, Actions, Pages, הגנה על main והרגלים ששומרים על צוות רגוע."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 2 }
---

Git שומר את ההיסטוריה של הפרויקט על המחשב שלנו. GitHub הוא המקום שבו ההיסטוריה הזאת משותפת, נבדקת, נבחנת ומתפרסמת. המדריך ממשיך את ספר המתכונים מהמדריך [Git מאפס לגיבור](he/posts/git-zero-to-hero/): נעלה אותו לרשת, נשנה אותו דרך pull request, נתן לרובוט לבדוק אותו, ובסוף נפרסם אותו כאתר.

כדאי להרגיש בנוח עם `git add`, `git commit` וענפים; אם זה עדיין חדש, קוראים קודם את המדריך ההוא.

## מה זה GitHub (ומה הוא מוסיף ל-Git)

**Git** הוא כלי בקרת הגרסאות. הוא רץ על המחשב שלנו ולא צריך אינטרנט. **GitHub** מארח ריפוזיטורי של Git בענן, ומוסיף סביבו כלים לתכנון, ביקורת, בדיקות ופריסה.

![מימין, המחשב שלנו עם ריפוזיטורי מקומי שמחזיק את ה-commits‏ A, B ו-C. משמאל, GitHub עם ריפוזיטורי מרוחק שמחזיק את אותם commits. הפקודה git push מעלה מהמחשב ל-GitHub, והפקודות git fetch ו-git pull מורידות. מתחת, GitHub מוסיף issues, pull requests, Actions, Pages, פרויקטים ו-releases.](/images/github-zero-to-hero/git-vs-github.svg)

הריפוזיטורי עצמו (ה-commits) הוא Git רגיל. כל השאר הוא השכבה של GitHub מעליו:

- **Issues** למעקב אחרי משימות, באגים ורעיונות.
- **Pull requests** כדי להציע שינוי ולבדוק אותו לפני שהוא נכנס.
- **Actions** להרצה אוטומטית של בדיקות ופריסות.
- **Pages** לאירוח אתר סטטי ישירות מריפוזיטורי.
- **Projects**, **Releases**, **Discussions** וארגז כלי אבטחה סביב כל זה.

GitLab ו-Bitbucket עושים אותה עבודה בשמות אחרים; החלק של Git עובד אותו דבר בכולם.

## מתחילים

### פותחים חשבון וריפוזיטורי

נרשמים ב-[github.com](https://github.com) ולוחצים על **New repository** (תפריט **+** בפינה העליונה). בוחרים:

- **שם:** `recipes`.
- **נראות:** *public* (כל אחד יכול לקרוא) או *private* (רק מי שהוזמן). אפשר לשנות אחר כך.
- **Add a README:** כן. **README** הוא קובץ Markdown שמוצג בדף הראשי של הריפוזיטורי, והוא הדבר הראשון שכל אחד קורא.
- **‏.gitignore ורישיון:** תבניות לא חובה. `.gitignore` שומר זבל מחוץ לריפו. בלי רישיון, אף אחד אחר לא רשאי רשמית להשתמש בקוד שלנו.

### מחברים את המחשב: SSH או HTTPS

כדי לעשות push, GitHub צריך לוודא שמדובר בבעל החשבון. GitHub כבר לא מקבל את סיסמת החשבון עבור פעולות Git דרך HTTPS. יש שלוש דרכים טובות:

1. **‏GitHub CLI (`gh`)** הכי קל. מתקינים מ-[cli.github.com](https://cli.github.com) (או `brew install gh`), ואז:

   ```bash
   gh auth login
   gh auth status
   ```

   הוא מנחה את ההתחברות דרך הדפדפן ושומר את הפרטים עבור Git.
2. **מפתח SSH**, שנוח: מגדירים פעם אחת ושוכחים:

   ```bash
   ssh-keygen -t ed25519 -C "dana@example.com"
   ```

   מקבלים את המיקום הרגיל ובוחרים סיסמה (passphrase). נוצרים מפתח פרטי (`~/.ssh/id_ed25519`, לעולם לא משתפים) ומפתח ציבורי (`~/.ssh/id_ed25519.pub`). מדביקים את הציבורי ב-**Settings → SSH and GPG keys → New SSH key** באתר. ואז בודקים:

   ```bash
   ssh -T git@github.com
   ```

   ```plain text
   Hi dana! You've successfully authenticated, but GitHub does not provide shell access.
   ```

   ההודעה הזאת היא הודעת ההצלחה. כתובות הריפוזיטורי נראות אז כך: `git@github.com:dana/recipes.git`.
3. **‏HTTPS עם personal access token**, שעובד בכל מקום אבל מחייב לנהל טוקן. עוזר אישורים (credential helper, ש-`gh auth login` מגדיר) הופך את זה לפשוט.

### מעלים את הפרויקט ל-GitHub

שתי דרכים, לפי איפה הפרויקט מתחיל.

**הוא כבר קיים ב-GitHub.** משכפלים אותו:

```bash
git clone git@github.com:dana/recipes.git
cd recipes
```

**הוא קיים רק על המחשב שלנו** (כמו ספר המתכונים שלנו). יוצרים ב-GitHub ריפוזיטורי ריק בלי README, ואז מחברים ועושים push:

```bash
git remote add origin git@github.com:dana/recipes.git
git push -u origin main
```

ה-CLI עושה את שני השלבים בבת אחת, מתוך תיקיית הפרויקט:

```bash
gh repo create recipes --public --source=. --push
```

מרעננים את דף הריפוזיטורי, והקבצים וההיסטוריה המלאה כבר שם.

## ה-GitHub flow

צוותים צריכים שגרה ששומרת על `main` תקין בזמן שהרבה אנשים משנים דברים. GitHub ממליץ על לולאה קצרה, **GitHub flow**:

![שש קופסאות בשורה: יוצרים ענף, commit ו-push, פותחים pull request, ביקורת ודיון, ממזגים את ה-pull request, מוחקים את הענף. חץ מקווקו מהביקורת חזרה ל-commit ו-push אומר: ביקשו שינויים, דוחפים עוד commits.](/images/github-zero-to-hero/github-flow.svg)

1. **יוצרים ענף** מתוך `main` עם שם קצר ותיאורי (`add-soup-recipe`). `main` נשאר בשקט.
2. **‏Commit ו-push.** commits קטנים, כל אחד שינוי שלם ומבודד שאפשר לבטל לבדו. עושים push באופן קבוע: זה גם גיבוי.
3. **פותחים pull request** כדי לבקש משוב. לא בטוחים שזה מוכן? פותחים pull request במצב *draft*.
4. **ביקורת ודיון.** עונים להערות בדחיפת commits נוספים לאותו ענף. ה-pull request מתעדכן מעצמו.
5. **ממזגים** כשהוא אושר והבדיקות ירוקות.
6. **מוחקים את הענף.** ה-pull request וההיסטוריה נשארים, רק התווית נעלמת.

בואו נעבור על זה באמת.

```bash
git switch -c add-soup-recipe
echo "# Soup" > soup.md
echo "Simmer for 30 minutes." >> soup.md
git add soup.md
git commit -m "Add soup recipe"
git push -u origin add-soup-recipe
```

(עם `push.autoSetupRemote true` מהמדריך על Git, ה-`-u` מיותר.) הפלט של ה-push מדפיס קישור לפתיחת pull request, ובדף הריפוזיטורי מופיע כפתור צהוב **Compare & pull request**.

## Pull requests

Pull request (PR) הוא שיחה על ענף. הוא מראה את ההבדל בין הענף שלנו ליעד, מאפשר להגיב על שורות מסוימות, ואוסף את התוצאות של בדיקות אוטומטיות.

PR טוב כולל:

- **כותרת ברורה** שנקראת כמו הודעת commit: "Add soup recipe".
- **תיאור** שאומר *מה* השתנה ו*למה*, ואיך בודקים.
- **קישור ל-issue שהוא פותר.** כותבים `Closes #12` (או `Fixes`, `Resolves`) בתיאור, והמיזוג סוגר את issue 12 אוטומטית. זה עובד רק כש-PR מכוון לענף ברירת המחדל של הריפוזיטורי.
- **גודל קטן.** PR של 30 שורות מקבל ביקורת קפדנית. PR של 3,000 שורות מקבל "נראה בסדר".

מהטרמינל:

```bash
gh pr create --fill              # כותרת וגוף מתוך ה-commits שלנו
gh pr create --draft             # פותח כ-draft, עוד לא מוכן לביקורת
gh pr view --web                 # פותח אותו בדפדפן
gh pr status                     # PRs שקשורים לחשבון
```

### ביקורת קוד

הסוקרים פותחים את הלשונית **Files changed** ויכולים:

- ללחוץ על ה-`+` ליד שורה כדי **להגיב** בדיוק עליה.
- לכתוב **suggestion**: הערה שמכילה תחליף מוצע, שהכותב מחיל בלחיצה אחת.
- לסיים באחד משלושה פסקי דין: **Comment**, **Approve** או **Request changes**.

ככותב, עונים בדחיפת commits נוספים ואז מסמנים שיחות כנפתרו (resolved). כשסוקרים, מבקרים את הקוד ולא את האדם, ואומרים מה היה עדיף. כשסוקרים אותנו, הסוקר רואה את השינוי בפעם הראשונה, ולכן כל דבר שמבלבל אותו שווה תיקון ולא הגנה.

כדי לנסות PR של מישהו אחר מקומית:

```bash
gh pr checkout 42      # מביא את הענף ועובר אליו
```

### מיזוג: שלוש דרכים

כש-PR אושר, כפתור **Merge** מציע עד שלוש שיטות (בעל הריפוזיטורי יכול לכבות כל אחת מהן):

![אותו pull request עם ה-commits‏ C, D ו-E, מוצג שלוש פעמים. Merge commit שומר את C, D ו-E ומוסיף commit מיזוג M עם שני הורים. Squash and merge מחליף אותם ב-commit אחד S. Rebase and merge מעתיק אותם ל-main בתור C', D' ו-E' בלי commit מיזוג.](/images/github-zero-to-hero/merge-methods.svg)

- **Merge commit** שומר כל commit של הענף ומוסיף commit מיזוג. היסטוריה מלאה, אבל גרף מסועף.
- **Squash and merge** מכווץ את כל ה-PR ל-commit אחד, כך ש-`main` נשאר קצר, commit אחד לכל PR.
- **Rebase and merge** מריץ מחדש כל commit על גבי `main` בלי commit מיזוג. קו ישר, אבל ל-commits יש hash חדש (כמו `git rebase` במדריך על Git).

צוותים רבים בוחרים squash: PR אחד, commit אחד, הודעה אחת ברורה. משתמשים במה שהצוות הסכים עליו. מה-CLI:

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

## Issues

**Issue** הוא פתק על משהו שצריך לעשות או שמקולקל: באג, רעיון לפיצ׳ר, שאלה. issue טוב אומר מה ציפינו שיקרה, מה קרה, ואיך משחזרים.

חלקים שימושיים:

- **Labels** (`bug`, `good first issue`) למיון וסינון.
- **Assignees** לציון מי עובד על זה, ו-**milestones** לקיבוץ issues לקראת יעד.
- **אזכורים:** כותבים `@dana` כדי להתריע לאדם, ו-`#42` כדי לקשר ל-issue או PR מספר 42.
- **תבניות:** קבצי Markdown או טפסים ב-`.github/ISSUE_TEMPLATE/` מוצעים כשפותחים issue, וקובץ `pull_request_template.md` ב-`.github/` ממלא מראש תיאורים של PR.

```bash
gh issue create --title "Soup recipe is missing salt" --body "Step 2 never mentions salt."
gh issue list
```

**Projects** הופכים issues ו-PRs ללוח או לטבלה (To do, In progress, Done), ו-**Discussions** נותנים לריפוזיטורי מקום לשאלות פתוחות שהן לא משימות.

## Forks: תרומה לפרויקט של מישהו אחר

בקוד פתוח בדרך כלל אי אפשר לעשות push לריפוזיטורי. הפתרון הוא **fork**: עותק משלנו שלו, בחשבון שלנו.

![שלוש קופסאות. upstream הוא הפרויקט המקורי ב-GitHub. ה-fork שלנו הוא העותק שלנו ב-GitHub, שנוצר בכפתור Fork מתוך upstream. המחשב שלנו מחזיק את ה-clone המקומי, ששוכפל מה-fork עם git clone ונדחף חזרה אליו עם git push. pull request עובר מה-fork שלנו אל upstream, והפקודה git fetch upstream מביאה אל המחשב שלנו את ה-commits החדשים של upstream.](/images/github-zero-to-hero/fork-workflow.svg)

השגרה:

1. לוחצים **Fork** בדף הפרויקט (או `gh repo fork --clone`).
2. משכפלים את ה-fork שלנו, ומוסיפים את המקור כ-remote שני בשם `upstream`.
3. פותחים ענף, עושים commit, ו-push ל-fork שלנו (`origin`).
4. פותחים PR מהענף שב-fork אל הריפוזיטורי המקורי.

```bash
gh repo fork someone/their-project --clone
cd their-project
git remote -v            # origin = ה-fork שלנו, upstream = המקור
git switch -c fix-typo
# עורכים, commit
git push -u origin fix-typo
gh pr create --fill
```

כדי לעדכן את ה-fork, משתמשים בכפתור **Sync fork** בדף ה-fork שלנו, או מהטרמינל:

```bash
git fetch upstream
git switch main
git merge upstream/main
git push
```

קוראים קודם את `CONTRIBUTING.md` של הפרויקט ומחפשים את התווית `good first issue`. מתחזקים אוהבים PRs קטנים וממוקדים.

## Actions: מניחים ל-GitHub להריץ את הבדיקות

**‏GitHub Actions** מריץ אוטומציה בתגובה למה שקורה בריפוזיטורי. אבני הבניין:

![אירוע push או pull_request מפעיל workflow, קובץ YAML ב-.github/workflows. ה-workflow מכיל jobs. ל-job בשם test יש צעדים של checkout, npm ci ו-npm test. ל-job בשם deploy, שזקוק ל-test, יש צעדים של checkout, build ו-deploy-pages. כל job רץ על runner.](/images/github-zero-to-hero/actions-anatomy.svg)

- **Workflow** הוא קובץ YAML ב-`.github/workflows/`. בריפוזיטורי יכולים להיות הרבה.
- **Event** מפעיל אותו: push, pull request, לוח זמנים, או כפתור ידני.
- ב-workflow יש **jobs**. הם רצים במקביל, אלא אם אחד מצהיר `needs: other-job`.
- כל job רץ על **runner**, מכונה חדשה (GitHub מארח כאלה ל-Linux, ל-macOS ול-Windows).
- job הוא רשימת **steps**: פקודת shell (`run:`) או **action** לשימוש חוזר (`uses:`) מה-[Marketplace](https://github.com/marketplace?type=actions).

workflow ראשון לפרויקט שלנו, שמור בתור `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

קוראים מלמעלה למטה: *בכל pull request ו-push ל-`main`, מרימים מכונת Ubuntu חדשה, מורידים את הקוד, מתקינים Node 24 ותלויות, ומריצים את הבדיקות.* פותחים PR, ונקודה צהובה הופכת לוי ירוק או ל-X אדום. הלשונית **Actions** מראה את הלוגים של כל הרצה.

```bash
gh run list --limit 5     # הרצות אחרונות
gh run watch              # לעקוב אחרי הרצה בזמן אמת
```

דברים ששווה לדעת:

- **Secrets:** שומרים סיסמאות וטוקנים ב-**Settings → Secrets and variables → Actions** ומשתמשים בהם בתור `${{ secrets.MY_TOKEN }}`. לעולם לא כותבים אותם ב-YAML.
- **הרשאות:** המפתח `permissions:` מגביל מה הטוקן האוטומטי רשאי לעשות. מתחילים מ-`contents: read` ומוסיפים רק מה ש-job צריך.
- **‏PRs מ-forks** לא מקבלים את ה-secrets שלנו.
- **מקבעים גרסאות** של actions (`@v5`), כדי ש-workflow לא ישתנה מתחת לרגליים.
- לשימוש החינמי יש מגבלות שתלויות בתוכנית ובשאלה אם הריפוזיטורי ציבורי; בודקים את דף התמחור לפני בניות כבדות.

לכל מה שמעבר ליסודות (matrix, מטמון, סביבות, פריסה עם OIDC ואבטחת workflows), ראו [GitHub Actions מאפס לגיבור](he/posts/github-actions-zero-to-hero/).

## Pages: מפרסמים אתר מריפוזיטורי

**‏GitHub Pages** מגיש קבצים סטטיים (HTML, CSS, JS) בחינם בכתובת `https://<user>.github.io/<repo>/`. הבלוג הזה מתפרסם כך.

יש שני מקורות פרסום, שבוחרים ב-**Settings → Pages**:

- **מענף:** Pages מגיש תיקייה (השורש או `/docs`) של ענף שנבחר. הכי פשוט ל-HTML שכתוב ביד או לאתרי Jekyll.
- **מ-GitHub Actions:** workflow בונה את האתר כפי שנגדיר ומעלה את התוצאה. הכי מתאים כשיש שלב build (הבלוג הזה הוא אפליקציית Angular שנבנית, נבדקת ונעשית לה prerender קודם).

דרך ה-Actions דורשת workflow שבונה, מעלה את הפלט בתור Pages artifact ופורס אותו. הליבה של ה-workflow של הבלוג הזה:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

steps:
  - uses: actions/checkout@v5
  # ... התקנה ובנייה ...
  - uses: actions/configure-pages@v5
  - uses: actions/upload-pages-artifact@v4
    with:
      path: dist
  - uses: actions/deploy-pages@v4
```

כל מיזוג ל-`main` מפרסם מחדש את האתר, כך שפרסום הופך ל"למזג PR". שתי מלכודות: אתר שמוגש מ-`/<repo>/` צריך נתיב בסיס נכון בקישורים, ו-pushes שנעשים על ידי workflow עם `GITHUB_TOKEN` ברירת המחדל לא מפעילים בניית Pages נוספת.

## מגינים על `main`

כשיש עוד אנשים, רוצים ש-`main` יהיה קשה לשבור. ב-**Settings → Branches** (או ב-**Rulesets** החדשים יותר) אפשר להגן על ענף. בין האפשרויות:

- **לדרוש pull request** עם מספר אישורים מוגדר לפני מיזוג.
- **לדרוש ש-status checks** (ה-workflow שלנו) יעברו.
- **לדרוש שכל השיחות ייפתרו** לפני מיזוג.
- **לדרוש היסטוריה ליניארית**, כלומר רק מיזוגי squash או rebase.
- **לחסום force push ומחיקה** של הענף.
- **להגביל מי רשאי לעשות push** אליו.

קובץ `CODEOWNERS` (ב-`.github/`, בשורש או ב-`docs/`) ממפה נתיבים לאנשים או לצוותים, ו-GitHub מבקש מהם ביקורת אוטומטית כש-PR נוגע בקבצים שלהם:

```plain text
*            @dana
/docs/       @sam
*.yml        @dana @devops-team
```

השורה האחרונה שמתאימה מנצחת. עם "require review from code owners", האדם הנכון תמיד רואה קבצים רגישים.

## Releases ו-tags

**Tag** נותן שם ל-commit אחד, ו-**release** הוא tag עם הערות וקבצים להורדה, שמוצג בדף הראשי של הריפוזיטורי.

```bash
git tag -a v1.0 -m "First release"
git push --tags
gh release create v1.0 --generate-notes
```

הדגל `--generate-notes` בונה את ה-changelog מה-PRs שמוזגו מאז ה-release הקודם, עוד סיבה לכותרות טובות ל-PRs. גרסאות כמו `v1.4.2` בדרך כלל עוקבות אחרי [semantic versioning](https://semver.org): מעלים את המספר הראשון לשינויים שוברים, את השני לפיצ׳רים, ואת השלישי לתיקונים.

## שומרים על ריפוזיטורי בטוח

- **לעולם לא עושים commit ל-secrets.** טוקן שהגיע ל-commit דלף גם אחרי שנמחק: קודם מבטלים ויוצרים חדש, ורק אחר כך מנקים את ההיסטוריה. ה-**secret scanning** יכול להזהיר, ובסוגי secrets נתמכים גם לחסום את ה-push.
- **‏Dependabot** פותח PRs שמעדכנים תלויות ישנות או פגיעות. מפעילים אותו בהגדרות האבטחה, או מוסיפים `.github/dependabot.yml`.
- **‏Code scanning** (CodeQL) מחפש פגיעויות נפוצות בכל PR.
- מפעילים **אימות דו-שלבי**: הדבר היעיל ביותר שאפשר לעשות.
- מוסיפים `SECURITY.md` שאומר איך לדווח על פגיעות באופן פרטי.

## Codespaces ו-Copilot

שני תוספים לא חובה שתשמעו עליהם:

- **‏Codespaces** נותן סביבת פיתוח בענן, בדפדפן או ב-VS Code, עם הריפוזיטורי והכלים שלו מוכנים. נוח להתחלה בצוות או לתיקון מהיר ממחשב שאול. לוחצים `.` בכל דף ריפוזיטורי לעורך אינטרנט קל, לעריכה בלבד.
- **‏GitHub Copilot** הוא עוזר ה-AI של GitHub. הוא משלים קוד, עונה על שאלות על ריפוזיטורי, ויכול לקחת issue ולפתוח PR לביקורת. תוכניות ומגבלות משתנות, אז בודקים את דף התמחור של GitHub. בכל מקרה, ממזגים רק מה שהבנו.

## דף העזר של `gh`

הדפדפן בסדר, אבל אלה מכסים יום עבודה מהטרמינל:

| אני רוצה... | פקודה |
|---|---|
| להתחבר | `gh auth login` |
| ליצור ריפו מהתיקייה הזאת ולעשות push | `gh repo create <name> --public --source=. --push` |
| לעשות fork לריפו ולשכפל אותו | `gh repo fork <owner>/<repo> --clone` |
| לפתוח PR | `gh pr create --fill` (מוסיפים `--draft` אם לא מוכן) |
| לראות PRs שקשורים אליי | `gh pr status` |
| לנסות PR מקומית | `gh pr checkout <number>` |
| למזג PR ולמחוק את הענף שלו | `gh pr merge --squash --delete-branch` |
| לפתוח issue | `gh issue create --title "..." --body "..."` |
| לעקוב אחרי הרצת ה-CI האחרונה | `gh run watch` |
| לפתוח את הריפו בדפדפן | `gh browse` |

הפקודה `gh <command> --help` מציגה כל דגל.

## הרגלים ששומרים על צוות רגוע

- **ענף אחד, מטרה אחת, PR אחד.** שינויים מעורבבים קשים לביקורת ולביטול.
- **אף פעם לא עובדים ישר על `main`.** מגינים עליו, כדי שאי אפשר.
- **כותבים את תיאור ה-PR לקורא בלי הקשר.** בעוד שלושה חודשים זה אנחנו.
- **סוקרים מהר.** PR שמחכה ימים מתיישן. עושים pull מ-`main` לעתים קרובות.
- **נותנים לרובוט להיות קפדן** (בדיקות, lint, טיפוסים) כדי שבני אדם ידברו על עיצוב.
- **קטן ותכוף עדיף על גדול ונדיר,** ב-commits, ב-PRs וב-releases.
- **לא עושים force push לענפים משותפים;** אחרי rebase לענף ה-PR שלנו, משתמשים ב-`--force-with-lease`.

## מילון מונחים

- **ריפוזיטורי (repo):** פרויקט והיסטוריה שלו, מתארח ב-GitHub.
- **‏Remote / origin:** העותק המתארח; `origin` הוא הכינוי הרגיל.
- **‏Clone / Fork:** הורדת ריפוזיטורי עם ההיסטוריה / עותק משלנו ב-GitHub של ריפוזיטורי של מישהו אחר.
- **‏Upstream:** הריפוזיטורי המקורי שממנו עשינו fork.
- **‏Pull request (PR):** הצעה למזג ענף אחד לאחר, עם דיון ובדיקות.
- **‏Review:** הערות ופסק דין (approve, request changes) על PR.
- **‏Issue / Draft PR:** משימה, באג או רעיון / PR שמסמן "עוד לא מוכן למיזוג".
- **שיטות מיזוג:** merge commit, squash and merge, rebase and merge.
- **‏Branch protection / ruleset:** כללים שענף חייב לקיים לפני שהשינויים נכנסים.
- **‏CODEOWNERS:** קובץ שממפה נתיבים לאנשים שחייבים לסקור אותם.
- **‏Workflow / Runner:** קובץ YAML של Actions מ-jobs ו-steps / המכונה שמריצה job.
- **‏Secret:** ערך מוצפן (טוקן, סיסמה) שזמין ל-workflows.
- **‏Pages:** אירוח אתרים סטטיים בחינם מריפוזיטורי.
- **‏Release:** tag בתוספת הערות וקבצים.

## לאן ממשיכים

עכשיו אנחנו מכירים את הלולאה: ענף, commit, push, pull request, ביקורת, מיזוג, עם רובוט שבודק את העבודה ואתר שנבנה מחדש מעצמו. כדי לקבע את זה, עושים את זה פעם אחת באמת: fork לפרויקט קוד פתוח קטן, תיקון שגיאת כתיב בתיעוד שלו, ופתיחת PR. לצד של Git, ראו [Git מאפס לגיבור](he/posts/git-zero-to-hero/) ואת [דף העזר שלי ל-Git](he/posts/git-commands/). כדי לארוז אפליקציה כך שתרוץ אותו דבר בכל מקום (וגם על ה-runners של Actions), ראו [Docker מאפס לגיבור](he/posts/docker-zero-to-hero/). ה-[Docs](https://docs.github.com) של GitHub והקורסים החינמיים ב-[skills.github.com](https://skills.github.com) הם המשך טוב.
