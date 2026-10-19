---
title: "Oh My Zsh: טרמינל נוח יותר עם plugins ו-themes"
summary: "להתקין את Oh My Zsh, להפעיל plugins כמו git, להחליף theme ב-~/.zshrc, לעדכן עם omz update, ולדעת איך מוסיפים plugin משלכם או מסירים אותו."
date: 2026-10-19
tags: [macos, dev-tools, cli]
series: { key: mac-dev-setup, order: 2 }
---

Zsh הוא ה-shell שמגיע כברירת מחדל ב-macOS. [Oh My Zsh](https://ohmyz.sh/) הוא framework שמנהל את ההגדרות שלו: אוסף של plugins, themes ועזרים, שנטענים מ-`~/.zshrc`. נבדק מול ה-README של הפרויקט.

## התקנה

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

הסקריפט משכפל את Oh My Zsh ל-`~/.oh-my-zsh` וכותב `~/.zshrc` חדש (אם יש קיים, נשמר לו גיבוי). פותחים לשונית טרמינל חדשה כדי לראות. אם אתם רוצים לקרוא סקריפט לפני שמריצים אותו, מורידים אותו קודם ופותחים.

## Plugins

ה-plugins רשומים ב-`~/.zshrc`, מופרדים ברווחים ולא בפסיקים:

```bash
plugins=(git)
```

ה-plugin `git` מוסיף aliases. אחרי `source ~/.zshrc` אלה עובדים:

```bash
gst     # git status
ga      # git add
gcmsg   # git commit --message
gco     # git checkout
gl      # git pull
gp      # git push
```

`alias | grep git` מציג את כולם. מאות plugins מגיעים עם ה-framework, ולכל אחד README ב-`~/.oh-my-zsh/plugins/<name>/`. קראו אותו לפני שמפעילים, כי הרבה plugins הם בסך הכול aliases.

## Themes

ה-theme הוא שורה אחת ב-`~/.zshrc`:

```bash
ZSH_THEME="robbyrussell"
```

לפי ה-README מצורפים יותר מ-150 themes. מחליפים שם, מריצים `source ~/.zshrc` ורואים את ה-prompt. חלק מה-themes דורשים פונט עם סמלים מיוחדים, כמו Nerd Font, אחרת רואים תווים שבורים.

## עדכון

```bash
omz update
```

## Plugin משלכם

יוצרים תיקייה בתוך `custom/plugins/` עם קובץ `<name>.plugin.zsh`, ומוסיפים את השם ל-`plugins=(...)`. קבצים שמסתיימים ב-`.zsh` ושמים ב-`custom/` נטענים מעצמם.

## הסרה

```bash
uninstall_oh_my_zsh
```

הבא בתור: [GitHub CLI](he/posts/github-cli/).
