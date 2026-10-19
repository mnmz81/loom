---
title: "GitHub Actions מאפס לגיבור: סודות, הרשאות ופריסות"
summary: "סודות ומשתנים, ה-GITHUB_TOKEN וההרשאות שלו, סביבות עם מאשרים נדרשים, פריסה לענן עם OIDC במקום מפתחות שמורים, ו-pipeline שדוחף אימג' Docker."
date: 2026-10-13
tags: [github, ci-cd]
series: { key: devops, order: 17 }
---

[בחלק על jobs](he/posts/github-actions-zero-to-hero-jobs/) בנינו ובדקנו את הקוד. כדי לפרסם ולפרוס אותו צריך הרשאות, והחלק הזה שומר אותן מחוץ לקובץ ה-workflow.

## סודות ומשתנים

אף פעם לא כותבים סיסמה, טוקן או מפתח בקובץ workflow. שומרים אותם ב-**Settings → Secrets and variables → Actions**, או מהטרמינל:

```bash
gh secret set NPM_TOKEN              # prompts for the value
gh variable set APP_URL --body "https://staging.example.com"
```

משתמשים בהם דרך הקשרים:

```yaml
steps:
  - run: npm publish
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  - run: curl --fail "${{ vars.APP_URL }}/health"
```

**סודות** (secrets) מוצפנים ומוסתרים בלוגים. ‏**משתנים** (variables) נועדו להגדרות לא רגישות כמו כתובות ודגלי פיצ'רים, ומוצגים כטקסט גלוי. את שניהם אפשר להגדיר לריפוזיטורי, לסביבה, או לארגון שלם.

שני כללים. סודות לא מועברים ל-runner כשה-workflow מופעל מ-fork, ולכן PR של אדם זר לא יכול לקרוא אותם. ואם צעד מחשב משהו רגיש, מסתירים אותו עם `echo "::add-mask::$VALUE"` לפני שהוא מגיע ללוג.

## הרשאות ו-GITHUB_TOKEN

בתחילת כל job, GitHub יוצרת `GITHUB_TOKEN`, תקף רק לריפוזיטורי הזה עד שה-job מסתיים. ‏actions כמו `actions/checkout` משתמשים בו אוטומטית; אפשר להעביר אותו במפורש כ-`${{ secrets.GITHUB_TOKEN }}`, למשל ל-`gh`:

```yaml
permissions:
  contents: read

jobs:
  label:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - run: gh pr edit "$PR" --add-label "needs-review" --repo "$GITHUB_REPOSITORY"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR: ${{ github.event.pull_request.number }}
```

המפתח `permissions` קובע מה הטוקן רשאי לעשות. ‏[מדריך האבטחה](https://docs.github.com/en/actions/reference/security/secure-use) אומר לתת את המינימום: קריאה בלבד בראש ה-workflow, וכתיבה רק ב-jobs שצריכים. הנפוצות: `contents` ‏(קוד ו-releases), ‏`pull-requests`, ‏`issues`, ‏`packages` ‏(אימג'ים), ‏`pages`, ‏`id-token` ‏(OIDC, בהמשך). ב-PRs מ-forks הטוקן הוא קריאה בלבד, לא משנה מה מבקשים.

## סביבות ופריסות

**סביבה** (environment, ב-Settings → Environments) מייצגת יעד פריסה כמו `staging` או `production`. יכולים להיות לה סודות ומשתנים משלה, וחוקי הגנה כמו **מאשרים נדרשים** (required reviewers): ה-job מחכה עד שמישהו מאשר.

```yaml
jobs:
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
        env:
          API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
```

כשההרצה מגיעה ל-job הזה, היא נעצרת עם כפתור **Review deployments**. הסוד `PRODUCTION_API_KEY` קיים רק בסביבת `production`, ולכן אף job אחר לא יכול לקרוא אותו, וה-`url` מופיע בהרצה וברשימת הפריסות. חוקי הגנה בריפוזיטוריז פרטיים תלויים בתוכנית ([תיעוד של סביבות](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)).

## פריסה בלי מפתחות שמורים: OIDC

הדרך הישנה לפרוס לענן היא מפתח גישה ששמור כסוד. הוא חי לנצח, עובד מכל מקום, ודליפה אחת שלו היא אסון. ‏**OIDC** ‏(OpenID Connect) מחליף אותו בהרשאות שנוצרות לכל הרצה ופגות מעצמן.

![job ב-workflow, עם permissions id-token: write, מבקש טוקן מספק ה-OIDC של GitHub ומקבל טוקן חתום שמציין את הריפוזיטורי, הענף וה-workflow. הוא מחליף את הטוקן אצל הענן, שחוק האמון שלו מתיר רק את הריפוזיטורי והענף האלה, ומקבל הרשאות זמניות שפגות בערך אחרי שעה. שום מפתח קבוע לא שמור בשום מקום.](/images/github-actions-zero-to-hero/oidc.svg)

מגדירים פעם אחת חוק אמון בענן ("טוקנים מהריפוזיטורי `me/app`, ענף `main`, רשאים לקבל את התפקיד הזה"). אחר כך ה-workflow מבקש טוקן:

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-central-1
      - run: aws s3 sync dist/ s3://my-bucket/
```

‏AWS, ‏Azure, Google Cloud והרבה שירותים אחרים תומכים בזה; מעדיפים אותו על פני מפתחות שמורים ([התיעוד של OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect)).

## Pipeline אמיתי: בנייה ודחיפה של אימג' Docker

בכל push ל-`main`, בונים את האימג' [מסדרת Docker](he/posts/docker-zero-to-hero-dockerfile/) ודוחפים אותו ל-GitHub Container Registry ‏(`ghcr.io`), מוכן ל-[Kubernetes](he/posts/kubernetes-zero-to-hero/) או לכל שרת אחר:

```yaml
name: Docker image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  packages: write

jobs:
  image:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7

      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v6
        with:
          images: ghcr.io/${{ github.repository }}

      - uses: docker/setup-buildx-action@v4

      - uses: docker/build-push-action@v7
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- ‏`packages: write` מאפשר ל-`GITHUB_TOKEN` לדחוף ל-`ghcr.io`. לא צריך סוד נוסף.
- ‏`docker/metadata-action` הופך את אירוע ה-Git לתגיות אימג': שם הענף ב-push ל-`main`, הגרסה בתגית כמו `v1.2.0`.
- ‏`cache-from` ו-`cache-to` עם `type=gha` שומרים את מטמון השכבות של Docker במטמון של Actions, כך ששכבות שלא השתנו לא נבנות מחדש.
