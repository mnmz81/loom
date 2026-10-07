---
title: "Undo the last git commit"
date: 2026-09-28
updated: 2026-10-02
tags: [git]
---

Undoing the last commit when it has **not been pushed yet**. The options differ in what happens to your changes:

```bash
git reset --soft HEAD~1   # undo the commit, changes stay staged
git reset HEAD~1          # (--mixed, the default) changes stay in files, unstaged
git reset --hard HEAD~1   # drop the commit AND the changes — careful!
git revert HEAD           # already pushed? add an inverse commit instead of rewriting history
```

Only wanted to fix the message or add a forgotten file? `git commit --amend`.

Lost something with `--hard`? `git reflog` shows the previous hash, and `git reset --hard <hash>` brings it back.
