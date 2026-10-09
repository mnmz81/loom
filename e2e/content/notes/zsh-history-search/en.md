---
title: "Search zsh history with Ctrl+R"
date: 2026-10-03
tags: [shell, zsh]
---

Press `Ctrl+R` and start typing: zsh shows the most recent command containing that text. Press `Ctrl+R` again to jump to older matches, `Enter` to run the match, or `Ctrl+G` to cancel.

It is bound by default in the emacs keymap. If you use vi mode, or want wildcards like `git*main`, bind the pattern variant yourself and keep a bigger, shared history in `~/.zshrc`:

```bash
bindkey '^R' history-incremental-pattern-search-backward
HISTFILE=~/.zsh_history
HISTSIZE=50000
SAVEHIST=50000
setopt SHARE_HISTORY HIST_IGNORE_ALL_DUPS
```

`SHARE_HISTORY` makes commands from one terminal tab searchable in the others right away.
