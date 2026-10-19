---
title: "Git commands: history, undoing, stash and worktrees"
summary: "My Git cheat sheet, part 2: log and diff, reset and revert, stash, tags, reflog and bisect, worktrees, big repos."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli, cheatsheet]
series: { key: git-commands, order: 2 }
---

Anything marked ⚠️ can lose work.

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
- `git stash branch <name>` turns a stash into a new branch, for when it no longer applies cleanly.

## Tags

- `git tag` lists tags, `git tag <name>` makes a lightweight tag, and `git tag -a v1.0 -m "message"` makes an annotated one.
- `git push --tags` pushes tags, and `git push origin --delete <tag>` removes one from the remote. `git tag -d <tag>` removes it locally.
- `git describe` names the current commit relative to the latest tag, for example `v1.0-3-gabc123`.

## Recovery and investigation

- `git reflog` is the history of where HEAD has been: the lifesaver for commits lost after a bad reset or rebase.
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

Git won't check out the same branch in two worktrees at once; use `--detach` or another branch.

## Big repos and housekeeping

- `git sparse-checkout set <folder>` checks out only part of a large repo.
- `git maintenance start` schedules background upkeep (fetching, repacking) so the repo stays fast.
