---
title: "Git from zero to hero: first commits"
summary: "Part 1 of the Git guide: what Git is, a one-time setup, a first repository, the three areas a change passes through and the four states of a file."
date: 2026-10-09
updated: 2026-10-19
tags: [git, cli]
series: { key: devops, order: 1 }
---

This guide builds a tiny project in Git, a recipe book, and each idea shows up when the project needs it. Keep a terminal open and type along: we work in a fresh folder, so nothing can break.

## What Git is (and what it isn't)

Git saves **snapshots** of your project folder. Each snapshot is a *commit*. You can go back to any of them, compare two, or branch off and try something without touching the rest.

- **Git is not GitHub.** Git runs on your computer and needs no internet. GitHub (and GitLab, Bitbucket) is a website that hosts Git repositories so you can share them.
- **A commit is a snapshot, not a diff.** Git shows you differences, but it stores the state of every file at that moment. That's why jumping between commits is instant.

## Install and set up (once)

```bash
git --version
```

If that fails, install Git from [git-scm.com](https://git-scm.com/downloads), or with `brew install git` on a Mac. Then tell Git who you are, because every commit carries a name and email:

```bash
git config --global user.name "Dana Levi"
git config --global user.email "dana@example.com"
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
```

The last two make new repos start on `main` and make the first `git push` of a branch set things up for you. You do this once per computer.

Settings live on three levels: `--system` (the machine), `--global` (your user, `~/.gitconfig`) and `--local` (one repository, `.git/config`). The most specific wins, so one project can use a work email. `git config --list --show-origin` prints every setting and its file.

Since Git 2.46 the manual prefers subcommands (`git config set --global user.name "Dana Levi"`, `git config get user.name`, `git config list`). The older forms above still work everywhere.

## Your first repository

```bash
mkdir recipes
cd recipes
git init
```

```text
Initialized empty Git repository in /home/dana/recipes/.git/
```

The hidden `.git` folder is the entire history. Delete it and the project forgets everything.

Create a file and ask Git what it sees:

```bash
echo "# Pasta" > pasta.md
echo "Boil water. Cook 9 minutes." >> pasta.md
git status
```

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	pasta.md

nothing added to commit but untracked files present (use "git add" to track)
```

`git status` is the command you'll run most. Run it whenever you're unsure.

### The three areas

To save a snapshot, a file travels through three places:

![Three boxes from left to right: the working directory holds your files, the staging area holds what will go into the next commit, and the repository holds saved commits. git add moves files to staging, git commit moves them to the repository.](/images/git-zero-to-hero/areas.svg)

- The **working directory** is your files as they are on disk right now.
- The **staging area** (also called the index) holds the changes you've picked for the *next* commit.
- The **repository** is the saved history.

The middle step lets you choose: if you changed five files but only two belong together, stage those two and commit them alone.

```bash
git add pasta.md
git status
```

```text
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   pasta.md
```

Before the first commit Git suggests `git rm --cached` for unstaging. Once there is history, use `git restore --staged`.

```bash
git commit -m "Add pasta recipe"
```

```text
[main (root-commit) 3f2a1b9] Add pasta recipe
 1 file changed, 2 insertions(+)
 create mode 100644 pasta.md
```

A second commit: edit the file, look at the change, save it.

```bash
echo "Add salt to the water." >> pasta.md
git diff
```

```text
diff --git a/pasta.md b/pasta.md
index 9501cd5..54af23a 100644
--- a/pasta.md
+++ b/pasta.md
@@ -1,2 +1,3 @@
 # Pasta
 Boil water. Cook 9 minutes.
+Add salt to the water.
```

```bash
git add pasta.md
git commit -m "Add salt to pasta"
```

`git add .` stages everything in the current folder, and `git commit -am "message"` stages files Git already knows and commits in one go. `git add -p` lets you pick chunks.

### The life of a file

Git sorts every file into one of four states:

![A cycle of four states. A new file is untracked. git add makes it staged. After git commit it is unmodified. Editing a file makes it modified, and git add stages it again.](/images/git-zero-to-hero/file-lifecycle.svg)

- **Untracked:** a new file Git has never seen. It won't be in any commit until you add it.
- **Unmodified:** identical to the last commit. `git status` doesn't mention it.
- **Modified:** edited, but the edit isn't staged.
- **Staged:** the edit is queued for the next commit.

`git status` lists them under *Untracked files*, *Changes not staged for commit* (modified) and *Changes to be committed* (staged). A file can appear under two headings at once: stage it and edit it again, and the commit gets the version from the moment you ran `git add`, while the newer edit waits separately.
