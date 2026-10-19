---
title: "GitHub מאפס לגיבור: חשבון, SSH ו-push ראשון"
summary: "חלק 1 במדריך ל-GitHub: מה GitHub מוסיף ל-Git, יצירת ריפוזיטורי, התחברות עם gh, מפתח SSH או טוקן, והעלאת פרויקט לרשת."
date: 2026-10-09
updated: 2026-10-19
tags: [github, git]
series: { key: devops, order: 20 }
---

המדריך הזה מעלה לרשת את ספר המתכונים מ-[Git מאפס לגיבור](he/posts/git-zero-to-hero/): נשנה אותו דרך pull request, ניתן לרובוט לבדוק אותו, ונפרסם אותו כאתר. הוא מניח היכרות עם `git add`, `git commit` וענפים.

## מה זה GitHub (ומה הוא מוסיף ל-Git)

**Git** הוא כלי בקרת הגרסאות; הוא רץ על המחשב שלנו ולא צריך אינטרנט. **GitHub** מארח ריפוזיטורי של Git בענן, ומוסיף כלים לתכנון, ביקורת, בדיקות ופריסה.

![מימין, המחשב שלנו עם ריפוזיטורי מקומי שמחזיק את ה-commits‏ A, B ו-C. משמאל, GitHub עם ריפוזיטורי מרוחק שמחזיק את אותם commits. הפקודה git push מעלה מהמחשב ל-GitHub, והפקודות git fetch ו-git pull מורידות. מתחת, GitHub מוסיף issues, pull requests, Actions, Pages, פרויקטים ו-releases.](/images/github-zero-to-hero/git-vs-github.svg)

הריפוזיטורי עצמו (ה-commits) הוא Git רגיל. השכבה של GitHub מעליו:

- **Issues** למעקב אחרי משימות, באגים ורעיונות.
- **Pull requests** כדי להציע שינוי ולבדוק אותו לפני שהוא נכנס.
- **Actions** להרצה אוטומטית של בדיקות ופריסות.
- **Pages** לאירוח אתר סטטי ישירות מריפוזיטורי.
- **Projects**, **Releases**, **Discussions** וארגז כלי אבטחה סביב כל זה.

GitLab ו-Bitbucket עושים אותה עבודה בשמות אחרים; החלק של Git עובד אותו דבר בכולם.

## מתחילים

### פותחים חשבון וריפוזיטורי

נרשמים ב-[github.com](https://github.com) ולוחצים על **New repository** (תפריט **+** בפינה העליונה):

- **שם:** `recipes`.
- **נראות:** *public* (כל אחד יכול לקרוא) או *private* (רק מי שהוזמן). אפשר לשנות אחר כך.
- **Add a README:** כן. **README** הוא קובץ Markdown שמוצג בדף הראשי של הריפוזיטורי, הדבר הראשון שכל אחד קורא.
- **‏.gitignore ורישיון:** תבניות לא חובה. `.gitignore` שומר זבל מחוץ לריפו. בלי רישיון, אף אחד אחר לא רשאי רשמית להשתמש בקוד שלנו.

### מחברים את המחשב: SSH או HTTPS

כדי לעשות push, GitHub צריך לדעת שזה אנחנו, והוא כבר לא מקבל את סיסמת החשבון עבור פעולות Git דרך HTTPS. יש שלוש דרכים טובות:

1. **‏GitHub CLI (`gh`)** הכי קל. מתקינים מ-[cli.github.com](https://cli.github.com) (או `brew install gh`), ואז:

   ```bash
   gh auth login
   gh auth status
   ```

   הוא מחבר אותנו דרך הדפדפן ושומר את הפרטים עבור Git. `gh browse` פותחת את הריפו הנוכחי בדפדפן, ו-`gh <command> --help` מציגה כל דגל.
2. **מפתח SSH**, שאני מעדיף: מגדירים פעם אחת ושוכחים:

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

   זו הודעת ההצלחה. כתובות הריפוזיטורי נראות אז כך: `git@github.com:dana/recipes.git`.
3. **‏HTTPS עם personal access token** עובד בכל מקום, אבל מחייב לנהל טוקן. עוזר אישורים (credential helper, ש-`gh auth login` מגדיר) הופך את זה לפשוט.

### מעלים את הפרויקט ל-GitHub

**הוא כבר קיים ב-GitHub.** משכפלים אותו:

```bash
git clone git@github.com:dana/recipes.git
cd recipes
```

**הוא קיים רק על המחשב שלנו**, כמו ספר המתכונים. יוצרים ב-GitHub ריפוזיטורי ריק בלי README, ואז מחברים ועושים push:

```bash
git remote add origin git@github.com:dana/recipes.git
git push -u origin main
```

או שה-CLI עושה את שני השלבים, מתוך תיקיית הפרויקט:

```bash
gh repo create recipes --public --source=. --push
```

מרעננים את דף הריפוזיטורי, והקבצים וההיסטוריה המלאה כבר שם.
