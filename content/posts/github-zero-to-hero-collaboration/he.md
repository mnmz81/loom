---
title: "GitHub מאפס לגיבור: issues, ‏forks ו-main מוגן"
summary: "חלק 3 במדריך ל-GitHub: ‏issues ותוויות, תרומה לפרויקט של מישהו אחר דרך fork, הגנה על ענף, CODEOWNERS ושמירה על ריפוזיטורי בטוח."
date: 2026-10-09
tags: [github, git]
series: { key: devops, order: 9 }
---

ב[חלק 2](he/posts/github-zero-to-hero-pull-requests/) שינינו את ספר המתכונים דרך pull request. החלק הזה מוסיף את מה שמאפשר לאנשים אחרים לעבוד עליו: ‏issues, ‏forks, כללים על `main` ואבטחה.

## Issues

**Issue** הוא פתק על משהו שצריך לעשות או שמקולקל: באג, רעיון לפיצ׳ר, שאלה. issue טוב אומר מה ציפינו שיקרה, מה קרה, ואיך משחזרים.

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

## מגינים על `main`

כשיש עוד אנשים, רוצים ש-`main` יהיה קשה לשבור, ושאף אחד, כולל אנחנו, לא יעבוד עליו ישירות. ב-**Settings → Branches** (או ב-**Rulesets** החדשים יותר) אפשר להגן על ענף. בין האפשרויות:

- **לדרוש pull request** עם מספר אישורים מוגדר לפני מיזוג.
- **לדרוש ש-status checks** ‏([workflow של Actions](he/posts/github-zero-to-hero-actions/)) יעברו.
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

## שומרים על ריפוזיטורי בטוח

- **לעולם לא עושים commit ל-secrets.** טוקן שהגיע ל-commit דלף גם אחרי שנמחק: קודם מבטלים ויוצרים חדש, ורק אחר כך מנקים את ההיסטוריה. ה-**secret scanning** יכול להזהיר, ובסוגי secrets נתמכים גם לחסום את ה-push.
- **‏Dependabot** פותח PRs שמעדכנים תלויות ישנות או פגיעות. מפעילים אותו בהגדרות האבטחה, או מוסיפים `.github/dependabot.yml`.
- **‏Code scanning** (CodeQL) מחפש פגיעויות נפוצות בכל PR.
- מפעילים **אימות דו-שלבי**: הדבר היעיל ביותר שאפשר לעשות.
- מוסיפים `SECURITY.md` שאומר איך לדווח על פגיעות באופן פרטי.
