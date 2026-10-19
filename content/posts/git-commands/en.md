---
title: "Git commands: setup, daily work, branches and remotes"
summary: "My Git cheat sheet, part 1: config, cloning, staging and committing, branches, merge and rebase, remotes."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli, cheatsheet]
series: { key: git-commands, order: 1 }
---

Anything marked ⚠️ can lose work. New to Git? Start with [Git from zero to hero](en/posts/git-zero-to-hero/).

## Setup and config

- `git config --global user.name "Name"` sets your name, and `git config --global user.email "you@example.com"` sets your email.
- `git config --global init.defaultBranch main` makes new repos start on `main`.
- `git config --global push.autoSetupRemote true` makes the first `git push` of a new branch set the upstream for you.
- `git config --global pull.rebase true` makes `git pull` rebase instead of creating merge commits. The manual itself calls this possibly dangerous, since rebasing rewrites your local commits. `git config --global pull.ff only` is the stricter choice: it refuses anything that isn't a fast-forward.
- `git config --global core.editor "code --wait"` picks the editor for commit messages.
- `git config --list` shows everything, and `git config --global alias.co checkout` makes a shortcut (`git co`). Since Git 2.46 the manual prefers the subcommand forms `git config list`, `git config get <name>` and `git config set <name> <value>`; the older forms above still work.
- `git help <command>` opens the manual for a command.

## Starting and cloning

- `git init` starts a repo in the current folder.
- `git clone <url>` clones a repo, and `git clone <url> <dir>` clones it into a folder of your choice.
- `git clone --depth 1 <url>` takes only the latest snapshot, which is much faster for big histories.
- `git clone --filter=blob:none <url>` is a partial clone: full history, file contents downloaded on demand.

## Daily workflow

- `git status` shows what changed, and `git status -s` shows it in a short form.
- `git add <file>` stages one file, `git add .` stages everything here, and `git add -u` stages only files Git already tracks (including deletions).
- `git add -p` stages chunk by chunk, so one messy file can become two clean commits.
- `git commit -m "message"` commits what's staged, and `git commit -am "message"` stages tracked files and commits in one step.
- `git commit --amend` rewrites the last commit (message or content). Add `--no-edit` to keep the message.
- `git commit --fixup <commit>` records a fix for an older commit. Later, `git rebase -i --autosquash <base>` folds it in automatically.
- `git rm <file>` deletes a file and stages the deletion. `git rm --cached <file>` stops tracking it but keeps it on disk, for a file you added to `.gitignore` too late.
- `git mv <old> <new>` renames or moves a file.

## Branches

- `git branch` lists local branches, `git branch -a` includes remote ones, and `git branch -vv` shows each branch's upstream and whether it's ahead or behind.
- `git switch <branch>` changes branch, and `git switch -c <branch>` creates one and switches to it. `git switch -` jumps back to the previous branch.
- `git checkout <branch>` and `git checkout -b <branch>` do the same thing in the older style.
- `git branch -d <branch>` deletes a merged branch, and `git branch -D <branch>` force-deletes it ⚠️.
- `git branch -m <new-name>` renames the current branch.
- `git branch --merged` lists branches already merged into the current one, the quickest way to find what you can delete.
- `git branch --set-upstream-to=origin/<branch>` links a local branch to a remote one.
- `git push origin --delete <branch>` deletes a branch on the remote.

## Merging and rebasing

- `git merge <branch>` merges a branch into the current one. `--no-ff` always creates a merge commit, and `--squash` collapses the branch into one staged change.
- `git rebase <branch>` replays your commits on top of another branch.
- `git rebase -i HEAD~3` is the interactive rebase of the last three commits: squash, reorder, reword, drop.
- `git rebase --onto <new-base> <old-base> <branch>` moves a branch to a new starting point.
- `git rebase --continue`, `git rebase --skip` and `git rebase --abort` steer a rebase that stopped on a conflict. `git merge --abort` does the same for a merge.

## Remotes and syncing

- `git remote -v` lists remotes, `git remote add origin <url>` adds one, and `git remote set-url origin <url>` changes its address.
- `git fetch` downloads remote changes without merging them. `git fetch --prune` also removes remote branches that no longer exist.
- `git pull` is fetch plus merge, and `git pull --rebase` is fetch plus rebase for a cleaner history. `git pull --ff-only` refuses to create a merge commit.
- `git push` sends your commits, and `git push -u origin <branch>` also sets the upstream.
- `git push --force-with-lease` is the safer force push: it refuses if someone else pushed in the meantime ⚠️.
