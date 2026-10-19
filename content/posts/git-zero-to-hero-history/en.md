---
title: "Git from zero to hero: reading diffs and history"
summary: "Part 2 of the Git guide: how to read git diff, what each diff command compares, good commit messages, git log, and what a commit really contains."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 11 }
---

The recipe book from [part 1](en/posts/git-zero-to-hero/) has two commits. This part reads what changed and what Git stored.

## Reading a diff

Change the cooking time in `pasta.md` and run `git diff`:

```text
diff --git a/pasta.md b/pasta.md
index 54af23a..e1f3b27 100644
--- a/pasta.md
+++ b/pasta.md
@@ -1,3 +1,3 @@
 # Pasta
-Boil water. Cook 9 minutes.
+Boil water. Cook 10 minutes.
 Add salt to the water.
```

- `diff --git a/... b/...` names the file. `index 54af23a..e1f3b27 100644` holds short hashes of the old and new content plus the file mode; you can ignore it.
- `--- a/...` and `+++ b/...` are the old and new version of the file.
- `@@ -1,3 +1,3 @@`: this chunk (a *hunk*) covers three lines from line 1 in the old file, and three lines from line 1 in the new one.
- Lines starting with `-` were removed, with `+` added, and with a space are unchanged context.

Which two things are compared depends on the flags:

| Command | Compares |
| --- | --- |
| `git diff` | working directory against the staging area (what you haven't staged yet) |
| `git diff --staged` | staging area against the last commit (what the next commit will contain) |
| `git diff HEAD` | working directory against the last commit (everything, staged or not) |

## Writing a good commit message

A commit message is a note for whoever reads the history later, usually you in six months:

```text
Fix crash when the recipe list is empty

The list view assumed at least one recipe and read the first item
without checking. Show the empty-state message instead.
```

- A **short first line** (about 50 characters) in the imperative mood: "Fix", "Add", "Remove". Read it as "this commit will... fix the crash".
- A **blank line**, then an optional body that explains *why*. The diff already shows what changed.
- One idea per commit, so the message can be short and true.

## Looking at history

```bash
git log --oneline
```

```text
9c1d4e2 (HEAD -> main) Add salt to pasta
3f2a1b9 Add pasta recipe
```

Each line is a commit: a short ID (a hash) and the message. Underneath:

![Three commits A, B and C drawn left to right with arrows pointing from each commit to its parent. The branch name main points at the newest commit, and HEAD points at main.](/images/git-zero-to-hero/commit-chain.svg)

- Every commit points to its **parent**, the commit before it. History is a chain.
- A **branch** (like `main`) is a label pointing at one commit. When you commit, the label moves forward.
- **HEAD** is "where you are now". Usually it points at a branch.

Everything else in Git is moving these labels around. Useful ways to look:

```bash
git log --oneline --graph --all   # a picture of all branches
git show 3f2a1b9                  # what one commit changed
git diff 3f2a1b9 9c1d4e2          # compare two commits
```

### What's inside a commit

`git cat-file -p HEAD` prints the real record:

```text
tree 9f1e0c8d2b7a4c3e5d6f708192a3b4c5d6e7f809
parent 3f2a1b94c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
author Dana Levi <dana@example.com> 1791540000 +0300
committer Dana Levi <dana@example.com> 1791540000 +0300

Add salt to pasta
```

- `tree` points at the snapshot of every file at that moment.
- `parent` is the commit before it, the arrow in the diagrams. A merge commit has two `parent` lines.
- `author` and `committer` are who wrote it and who recorded it, with a timestamp. Then the message.

The **hash** (like `9c1d4e2`) is a fingerprint of exactly this content. Change anything (files, message, parent, even the timestamp) and the hash changes. That's why `git commit --amend` and `git rebase` create *new* commits instead of editing old ones. Seven characters usually name a commit, as long as they're unique in the repo.
