---
title: "Homebrew: להתקין הכול ב-Mac מהטרמינל"
summary: "להתקין את Homebrew, ולהשתמש ב-brew install, upgrade ו-cleanup, להבדיל בין formula ל-cask, להריץ שירותי רקע ולשמור את כל מה שהתקנתם ב-Brewfile."
date: 2026-10-19
tags: [macos, dev-tools, cli]
series: { key: mac-dev-setup, order: 1 }
---

Homebrew הוא מנהל החבילות של macOS. פקודה אחת מתקינה כלי, מעדכנת אותו ומסירה אותו. שאר הפוסטים בסדרה מתקינים הכול דרכו. הפקודות הורצו עם Homebrew 7.0 ונבדקו מול [התיעוד של Homebrew](https://docs.brew.sh/).

## התקנה

מריצים את סקריפט ההתקנה מ-[brew.sh](https://brew.sh) ופועלים לפי מה שהוא מדפיס בסוף. ב-Apple Silicon Homebrew יושב ב-`/opt/homebrew`, והסקריפט מורה להוסיף אותו ל-`PATH`.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew --prefix
```

```text
/opt/homebrew
```

## Formula ו-cask

- **Formula** הוא כלי שורת פקודה או ספרייה, שנבנים או יורדים בשבילכם: `gh`, `uv`, `gitleaks`.
- **Cask** הוא אפליקציה עם ממשק גרפי ל-macOS, כמו OrbStack. בשבילם מוסיפים `--cask`.

```bash
brew install gh
brew install --cask orbstack
brew search docker
brew info gh
```

`brew search` מוצא את שני הסוגים, ו-`brew info` מציג גרסה, תיאור ונתיב התקנה.

## לשמור על עדכניות

```bash
brew update
brew outdated
brew upgrade
brew cleanup
brew autoremove
```

`brew update` מרענן את רשימת החבילות של Homebrew. `brew upgrade` משדרג את החבילות עצמן, או רק את אלה שציינתם. `brew cleanup` מוחק גרסאות ישנות, ו-`brew autoremove` מסיר תלויות שאף אחד כבר לא משתמש בהן. עם `--dry-run` על `brew autoremove` רואים מה יוסר. כדי להקפיא חבילה בגרסה הנוכחית, משתמשים ב-`brew pin <name>`.

## שירותי רקע

כלים כמו מסד נתונים יכולים לרוץ ברקע. `brew services` מנהל אותם דרך `launchctl` של macOS.

```bash
brew services list
brew services start postgresql@17
brew services stop postgresql@17
```

בלי `sudo` השירות עולה בכניסה למערכת. עם `sudo` הוא עולה בעליית המחשב.

## שומרים את הסביבה ב-Brewfile

`brew leaves` מציג את החבילות שהתקנתם בכוונה, בלי התלויות שלהן. `brew bundle dump` כותב הכול לקובץ `Brewfile`, ו-`brew bundle` מתקין ממנו על מחשב חדש.

```bash
brew bundle dump
brew bundle
```

```ruby
brew "gh"
brew "gitleaks"
cask "orbstack"
```

שמים את ה-`Brewfile` במאגר dotfiles, ומחשב חדש מרוחק פקודה אחת מהכלים שלכם. אם משהו מתנהג לא טוב, מריצים `brew doctor`.

הפוסט הבא בסדרה: [Oh My Zsh](he/posts/oh-my-zsh/).
