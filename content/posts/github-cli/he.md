---
title: "GitHub CLI: pull requests, issues ו-CI מהטרמינל"
summary: "להתקין gh ולהתחבר, ואז לשכפל, ליצור pull request, לבדוק CI, לנהל issues ולקרוא ל-API בלי לפתוח דפדפן. ועוד aliases ו-extensions."
date: 2026-10-19
tags: [github, dev-tools, cli]
series: { key: mac-dev-setup, order: 3 }
---

`gh` הוא כלי שורת הפקודה הרשמי של GitHub. הוא עושה מהטרמינל את מה שאתם לוחצים עליו בדפדפן: מאגרים, pull requests, issues והרצות של Actions. נבדק עם gh 2.93 מול [המדריך של gh](https://cli.github.com/manual/).

## התקנה והתחברות

```bash
brew install gh
gh auth login
gh auth status
```

`gh auth login` שואל על ה-host, על פרוטוקול Git (HTTPS או SSH) ועל שיטת ההזדהות, ושומר את ה-token ב-keychain של המערכת. `gh auth status` מציג את החשבון ואת הפרוטוקול. להסבר מפורט על הזדהות ראו [GitHub from zero to hero](he/posts/github-zero-to-hero/).

## מאגרים

```bash
gh repo clone OWNER/REPO
gh repo create my-app --private --clone
gh browse
```

`gh repo create` בלי ארגומנטים הוא אינטראקטיבי. עם שם ועם `--public`, `--private` או `--internal` הוא רץ בלי שאלות, ו-`--clone` משכפל אותו גם כן. `gh browse` פותח את דף המאגר בדפדפן.

## Pull requests

```bash
gh pr create --fill
gh pr list
gh pr checks
gh pr checkout 42
gh pr merge --squash
```

`gh pr create --fill` לוקח כותרת וגוף מה-commits שלכם. `gh pr checks` מציג את מצב ה-CI של pull request אחד, ו-`gh pr checkout` מביא pull request לענף מקומי כדי לנסות אותו. סקירות נמצאות תחת `gh pr review`, `gh pr comment` ו-`gh pr diff`.

## Issues והרצות Actions

```bash
gh issue create --title "Login fails on Safari"
gh issue list --label bug
gh run list
gh run watch
```

`gh run watch` עוקב אחרי הרצה של workflow עד שהיא מסתיימת. ככה מחכים ל-CI בלי לרענן דף.

## כל נקודת קצה ב-API

`gh api` שולח בקשה מאומתת ל-API של GitHub, כך שאין טיפול ב-token בסקריפטים שלכם:

```bash
gh api repos/cli/cli --jq .stargazers_count
```

`--jq` מסנן את תשובת ה-JSON. כל מה שהממשק באתר יודע לעשות ואין לו פקודה ב-`gh`, אפשר דרך `gh api`.

## Aliases ו-extensions

```bash
gh alias set prs 'pr list --author @me'
gh prs
gh extension install OWNER/gh-NAME
```

Alias מתרחב לפקודת `gh` מלאה. Extension הוא מאגר בשם `gh-<name>` שמוסיף פקודה חדשה `gh <name>`. קראו את הקוד של extension לפני שמתקינים: הוא רץ עם ההרשאות שלכם.

הבא בתור: [uv](he/posts/uv-tools/).
