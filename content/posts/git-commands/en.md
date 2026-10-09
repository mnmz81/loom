---
title: "Git commands: my cheat sheet"
summary: "The Git commands I keep coming back to, grouped by what you're doing: daily work, branches, undoing, remotes, history, worktrees and more."
date: 2026-10-09
tags: [git, cli, cheatsheet]
---

I keep a list of Git commands in Notion so I don't have to remember every flag. This is that list, cleaned up and extended with the commands I kept missing. Anything marked ⚠️ can lose work, so read it twice before running it.

If you're new to Git, start with [Git from zero to hero](en/posts/git-zero-to-hero/) and come back here when you need a reminder.

## Setup and config

- `git config --global user.name "Name"` sets your name, and `git config --global user.email "you@example.com"` sets your email.
- `git config --global init.defaultBranch main` makes new repos start on `main`.
- `git config --global push.autoSetupRemote true` makes the first `git push` of a new branch set the upstream for you.
- `git config --global pull.rebase true` makes `git pull` rebase instead of creating merge commits. `pull.ff = only` is the stricter choice: it refuses anything that isn't a fast-forward.
- `git config --global core.editor "code --wait"` picks the editor for commit messages.
- `git config --list` shows everything, and `git config --global alias.co checkout` makes a shortcut (`git co`).
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
- `git rm <file>` deletes a file and stages the deletion. `git rm --cached <file>` stops tracking it but keeps it on disk. Use that after adding something to `.gitignore` too late.
- `git mv <old> <new>` renames or moves a file.

## Branches

- `git branch` lists local branches, `git branch -a` includes remote ones, and `git branch -vv` shows each branch's upstream and whether it's ahead or behind.
- `git switch <branch>` changes branch, and `git switch -c <branch>` creates one and switches to it. `git switch -` jumps back to the previous branch.
- `git checkout <branch>` and `git checkout -b <branch>` do the same thing in the older style.
- `git branch -d <branch>` deletes a merged branch, and `git branch -D <branch>` force-deletes it ⚠️.
- `git branch -m <new-name>` renames the current branch.
- `git branch --merged` lists branches already merged into the current one. It's the quickest way to find what you can delete.
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

## Inspecting history

- `git log` shows history, and `git log --oneline --graph --all` shows a compact picture of every branch.
- `git log -p <file>` shows how a file changed over time, and `git log --stat` lists the files touched by each commit.
- `git log -S"text"` finds commits where that text was added or removed. `git log --author="name"` and `git log --since="2 weeks ago"` filter by who and when.
- `git log main..feature` lists the commits that are on `feature` but not on `main`.
- `git show <commit>` shows one commit, and `git show <commit>:<path>` shows a file as it was then.
- `git diff` compares unstaged changes, `git diff --staged` compares staged ones, `git diff <a> <b>` compares two branches or commits, and `git diff --stat` or `--name-only` keep the output short.
- `git blame <file>` shows who last changed each line, and `-L 10,20` limits it to a line range.
- `git grep "text"` searches tracked files, which is faster than `grep` in a big repo.
- `git shortlog -sn` ranks contributors by number of commits.

## Undoing things

- `git restore <file>` discards unstaged changes ⚠️, and `git restore --staged <file>` unstages a file.
- `git restore --source=<commit> <file>` brings back a file as it was in another commit. `git restore -p` does it chunk by chunk.
- `git checkout -- <file>` is the classic way to discard changes ⚠️.
- `git reset --soft HEAD~1` undoes the last commit and keeps the changes staged.
- `git reset --mixed HEAD~1` undoes it and keeps the changes unstaged. This is the default.
- `git reset --hard HEAD~1` undoes it and throws the changes away ⚠️.
- `git revert <commit>` adds a new commit that undoes an older one, which is the safe choice for shared history. For a merge commit, add `-m 1` to say which side to keep.
- `git clean -n` shows what would be removed, and `git clean -fd` removes untracked files and folders ⚠️. Always run `-n` first.

## Stashing

- `git stash` saves your changes aside, and `git stash -u` includes untracked files.
- `git stash push -m "message"` gives the stash a name, and `git stash push -- <path>` stashes only that path.
- `git stash list` lists them, and `git stash show -p` shows what's inside one.
- `git stash pop` applies the latest and removes it, `git stash apply` applies without removing, and `git stash drop` deletes one ⚠️.
- `git stash branch <name>` turns a stash into a new branch. Handy when the stash no longer applies cleanly.

## Tags

- `git tag` lists tags, `git tag <name>` makes a lightweight tag, and `git tag -a v1.0 -m "message"` makes an annotated one.
- `git push --tags` pushes tags, and `git push origin --delete <tag>` removes one from the remote. `git tag -d <tag>` removes it locally.
- `git describe` names the current commit relative to the latest tag, for example `v1.0-3-gabc123`.

## Recovery and investigation

- `git reflog` is the history of where HEAD has been. It's the lifesaver for lost commits after a bad reset or rebase.
- `git cherry-pick <commit>` copies one commit onto the current branch, and `-x` records where it came from.
- `git bisect start`, then `git bisect bad` and `git bisect good <commit>`, finds the commit that introduced a bug by binary search. `git bisect run <script>` automates it, and `git bisect reset` ends it.

## Worktrees

A worktree is a second folder checked out from the same repo, so you can have two branches open at once without cloning again. They share the same `.git` data, so a `git fetch` in one updates all of them. Each folder still needs its own `node_modules`.

- `git worktree add <path> <branch>` checks out an existing branch in a new folder.
- `git worktree add -b <new-branch> <path>` creates a branch and checks it out there. Add a start point at the end to branch off somewhere specific.
- `git worktree add --detach <path> <commit>` opens a commit in detached HEAD, handy for inspecting or building.
- `git worktree list` lists all worktrees, and `--porcelain` gives machine-readable output.
- `git worktree remove <path>` removes one (it must be clean), and `--force` removes it even with changes ⚠️.
- `git worktree move <path> <new-path>` relocates one.
- `git worktree lock <path>` and `unlock` protect one from pruning, for example on removable media.
- `git worktree prune` cleans up references to folders you deleted by hand, and `-n` is the dry run.
- `git worktree repair` fixes the links if you moved a folder yourself.

A typical case: you're mid-feature and a hotfix lands. Instead of stashing, open a second folder:

```bash
git worktree add ../hotfix-login main     # main checked out in a sibling folder
cd ../hotfix-login
git switch -c hotfix/login-bug            # fix it here
# ... fix, commit, push ...
cd ../my-project                          # your feature work is untouched
git worktree remove ../hotfix-login       # clean up
```

You can't check out the same branch in two worktrees at once. Git blocks it to prevent conflicting writes, so use `--detach` or another branch.

## Big repos and housekeeping

- `git sparse-checkout set <folder>` checks out only part of a large repo.
- `git maintenance start` schedules background upkeep (fetching, repacking) so the repo stays fast.
- `.gitignore` lists files Git should never track. If a file is already tracked, adding it there isn't enough: also run `git rm --cached <file>`.

For anything not listed here, `git help <command>` is the source of truth.
