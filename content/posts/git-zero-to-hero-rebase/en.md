---
title: "Git from zero to hero: rebase and handy tools"
summary: "Part 5 of the Git guide: rebase and the one rule that comes with it, interactive rebase to tidy commits, then stash, cherry-pick, bisect and .gitignore."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 5 }
---

[Part 4](en/posts/git-zero-to-hero-branches/) joined the pizza branch to `main` with a merge. Rebase is the other way to bring a branch up to date.

## Rebase: a tidier alternative

Merging keeps the true history, including the branching. **Rebase** *replays* your branch's commits on top of the latest `main`, so history becomes one straight line:

```bash
git switch pizza
git rebase main
```

![Before: main has moved on to C while feature has D and E branching off B. After git rebase main: D and E are copied as D prime and E prime on top of C, giving a straight line. The old D and E are left behind.](/images/git-zero-to-hero/rebase.svg)

D′ and E′ are *new* commits with new IDs, copies of the originals. Hence the one rule worth memorizing:

> **Never rebase commits that other people already have.** It rewrites history, and everyone who pulled the old commits ends up with a mess. Rebase your own private branch freely; once it's shared, merge.

### Interactive rebase: cleaning up your commits

Before sharing a branch, tidy its private history with `git rebase -i`. Say the last of three commits is just a typo fix:

```bash
git rebase -i HEAD~3
```

Git opens a list in your editor, oldest first. (Older versions print the message without the `#`; both work.)

```text
pick 3f2a1b9 # Add pasta recipe
pick 9c1d4e2 # Add salt to pasta
pick b7e3f10 # Fix typo in salt step
```

Change the word at the start of a line to say what happens to that commit, then save and close:

| Word | What it does |
| --- | --- |
| `pick` | keep the commit as it is |
| `reword` | keep it, but stop and let you edit the message |
| `squash` | fold it into the commit above it and combine the messages |
| `fixup` | fold it into the commit above it and drop its message |
| `drop` | delete the commit |
| `edit` | stop so you can change the commit's content |

Changing `pick` to `fixup` on the last line folds the typo fix into "Add salt to pasta", leaving two clean commits. You can also reorder commits by moving lines, and `git rebase --abort` undoes everything.

## Handy tools

**Stash** parks unfinished work so you can switch branches with a clean folder:

```bash
git stash push -m "half-written pasta tips"
git switch other-branch
# ... do something ...
git switch -
git stash pop             # brings it back
```

**Cherry-pick** copies a single commit from another branch:

![main has A, B, C. feature has B, D, E. git cherry-pick E copies only commit E onto main as E prime. D is not copied.](/images/git-zero-to-hero/cherry-pick.svg)

```bash
git cherry-pick 7c8d9e0
```

**Bisect** finds which commit introduced a bug, by binary search. Give Git one bad and one good commit, then answer "good" or "bad" as it checks out the ones in between:

```bash
git bisect start
git bisect bad                 # the current commit is broken
git bisect good v1.0           # this one worked
# test, then answer: git bisect good / git bisect bad
git bisect reset               # when done
```

**.gitignore** lists files Git must never track (dependencies, build output, secrets):

```text
node_modules/
dist/
.env
```

A few pattern rules cover almost everything:

```text
*.log          # any file ending in .log
build/         # a folder, anywhere
/todo.md       # only in the project root
**/temp        # a "temp" at any depth
!keep.log      # exception: track this one even though *.log is ignored
```

`.gitignore` only affects files Git isn't tracking yet. If a file was committed before you ignored it, run `git rm --cached <file>` once to stop tracking it (the file stays on disk), then commit. A password or token that reached a commit is leaked even after you delete it: revoke and replace it first, clean the history second.
