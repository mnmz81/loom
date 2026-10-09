---
title: "Git from zero to hero"
summary: "A hands-on guide to Git with one running example and diagrams: commits, branches, merging, rebasing, undoing mistakes and working with GitHub."
date: 2026-10-09
tags: [git, cli, tutorial]
---

Git looks scary until you see what it's actually doing. This guide builds a tiny project from nothing, and each new idea shows up exactly when the project needs it. By the end you'll know how to save work, undo mistakes, work on several things at once and share it all through GitHub.

Keep a terminal open and type along. Nothing here can hurt anything, because we'll work in a fresh folder.

## What Git is (and what it isn't)

Git is a tool that saves **snapshots** of your project folder. Each snapshot is called a *commit*. You can go back to any of them, compare two of them, or branch off and try something without touching the rest.

Two things worth getting straight early:

- **Git is not GitHub.** Git runs on your computer and needs no internet. GitHub (and GitLab, Bitbucket) is a website that hosts Git repositories so you can share them.
- **A commit is a snapshot, not a diff.** Git shows you differences, but what it stores is the state of every file at that moment. That's why jumping between commits is instant.

## Install and set up (once)

Check whether you already have it:

```bash
git --version
```

If not, install it from [git-scm.com](https://git-scm.com/downloads), or with `brew install git` on a Mac. Then tell Git who you are, because every commit carries a name and email:

```bash
git config --global user.name "Dana Levi"
git config --global user.email "dana@example.com"
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
```

The last two make new repos start on `main` and make your first `git push` of a branch set things up for you. You only do this once per computer.

## Your first repository

Our running example is a recipe book. Create a folder and start a repository in it:

```bash
mkdir recipes
cd recipes
git init
```

```text
Initialized empty Git repository in /home/dana/recipes/.git/
```

That created a hidden `.git` folder. It's the entire history. Delete it and the project forgets everything, so leave it alone.

Now create a file, and ask Git what it sees:

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
- The **staging area** (also called the index) is a waiting room: the changes you've picked for the *next* commit.
- The **repository** is the saved history.

Why the middle step? It lets you choose. If you changed five files but only two belong together, stage those two and commit them alone.

```bash
git add pasta.md
git status
```

```text
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   pasta.md
```

```bash
git commit -m "Add pasta recipe"
```

```text
[main (root-commit) 3f2a1b9] Add pasta recipe
 1 file changed, 2 insertions(+)
 create mode 100644 pasta.md
```

You have your first commit. Let's make a second one. Edit the file, look at the change, then save it:

```bash
echo "Add salt to the water." >> pasta.md
git diff
```

```text
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

Tip: `git add .` stages everything in the current folder, and `git commit -am "message"` stages files Git already knows and commits in one go. Use `git add -p` when you want to pick chunks.

## Looking at history

```bash
git log --oneline
```

```text
9c1d4e2 (HEAD -> main) Add salt to pasta
3f2a1b9 Add pasta recipe
```

Each line is a commit: a short ID (a hash), and the message. Here's what's really there:

![Three commits A, B and C drawn left to right with arrows pointing from each commit to its parent. The branch name main points at the newest commit, and HEAD points at main.](/images/git-zero-to-hero/commit-chain.svg)

- Every commit points to its **parent**, the commit before it. History is a chain.
- A **branch** (like `main`) is just a label pointing at one commit. When you commit, the label moves forward.
- **HEAD** is "where you are now". Usually it points at a branch.

That's the whole model. Everything else in Git is moving these labels around. Useful ways to look:

```bash
git log --oneline --graph --all   # a picture of all branches
git show 3f2a1b9                  # what one commit changed
git diff 3f2a1b9 9c1d4e2          # compare two commits
```

## Undoing mistakes

This is where Git earns its keep. The right tool depends on *where* the mistake is.

**You edited a file and want the old version back** (not committed yet):

```bash
git restore pasta.md      # ⚠️ throws away your edits to this file
```

**You staged the wrong file:**

```bash
git restore --staged todo.md
```

**You made a typo in the last commit message, or forgot a file:**

```bash
git add forgotten.md
git commit --amend        # rewrites the last commit
```

**You want to undo the last commit but keep the work.** `git reset` moves the branch label back. Three modes decide what happens to the changes that were in that commit:

![A table with three rows: reset --soft moves main back and keeps the changes staged; reset --mixed moves main back and keeps the changes in the working directory unstaged; reset --hard moves main back and discards the changes.](/images/git-zero-to-hero/reset.svg)

```bash
git reset --soft HEAD~1    # undo the commit, changes stay staged
git reset HEAD~1           # same, changes stay unstaged (--mixed is the default)
git reset --hard HEAD~1    # ⚠️ undo the commit and delete the changes
```

`HEAD~1` means "one commit before HEAD".

**The commit is already pushed.** Don't rewrite shared history. Add a new commit that cancels the old one:

```bash
git revert 9c1d4e2
```

**You think you lost something.** Almost nothing is lost. `git reflog` lists every place HEAD has been, even after a hard reset:

```bash
git reflog
git switch -c rescue 9c1d4e2    # put a branch on the commit you thought was gone
```

## Branches

Say you want to try a pizza recipe without touching `main`. Make a branch:

```bash
git switch -c pizza
```

You're now on `pizza`. Commits go there, and `main` stays put:

```bash
echo "# Pizza" > pizza.md
git add pizza.md
git commit -m "Add pizza recipe"
echo "Bake 20 minutes." >> pizza.md
git commit -am "Add baking time"
```

Here's what the history looks like:

![main has commits A, B and C. A second branch called feature starts at B and has its own commits D and E. HEAD points at feature, so the next commit goes there.](/images/git-zero-to-hero/branches.svg)

A branch costs almost nothing: it's one label. Make as many as you like, one per idea.

```bash
git branch            # list branches, * marks the current one
git switch main       # go back; pizza.md disappears from the folder
git switch pizza      # and it's back
```

Your folder changes to match the branch. That's not magic: Git swaps the files for the ones in that snapshot.

## Merging

The pizza is done. Bring it into `main`:

```bash
git switch main
git merge pizza
```

What happens next depends on whether `main` moved while you were away.

![Two scenarios. Top, fast-forward: main had nothing new, so Git just moves the main label forward to the last commit of feature. Bottom, merge commit: both branches have new commits, so Git creates a merge commit M with two parents.](/images/git-zero-to-hero/merge.svg)

- If `main` hasn't changed, Git does a **fast-forward**: it just moves the `main` label ahead. No new commit.
- If both branches have new commits, Git makes a **merge commit** with two parents, tying the histories together.

Then clean up:

```bash
git branch -d pizza    # safe: refuses if it wasn't merged
```

### Conflicts

If both branches changed the *same line*, Git can't decide and asks you:

```text
Auto-merging pizza.md
CONFLICT (content): Merge conflict in pizza.md
Automatic merge failed; fix conflicts and then commit the result.
```

Open the file. Git marked both versions:

```text
<<<<<<< HEAD
Bake 20 minutes.
=======
Bake 25 minutes.
>>>>>>> pizza
```

Everything between `<<<<<<<` and `=======` is yours (`main`), and the rest is theirs (`pizza`). Decide, delete the markers, and keep what you want:

```text
Bake 25 minutes.
```

```bash
git add pizza.md
git commit            # finishes the merge
```

Changed your mind halfway? `git merge --abort` puts everything back as it was. A conflict is not an error, it's Git asking a question only you can answer.

## Rebase: a tidier alternative

Merging keeps the true history, including the branching. **Rebase** instead *replays* your branch's commits on top of the latest `main`, so history looks like one straight line:

```bash
git switch pizza
git rebase main
```

![Before: main has moved on to C while feature has D and E branching off B. After git rebase main: D and E are copied as D prime and E prime on top of C, giving a straight line. The old D and E are left behind.](/images/git-zero-to-hero/rebase.svg)

Note the apostrophes: D′ and E′ are *new* commits with new IDs, copies of the originals. This leads to the one rule worth memorizing:

> **Never rebase commits that other people already have.** It rewrites history, and everyone who pulled the old commits ends up with a mess. Rebase your own private branch freely; once it's shared, merge.

A popular use is tidying your own commits before a pull request. `git rebase -i HEAD~4` opens a list of your last four commits where you can squash them into one, reword messages, or drop one.

## Working with GitHub

So far everything is on your computer. To share, you need a **remote**: a copy of the repository somewhere else. GitHub is the usual place.

If the project already exists on GitHub, clone it:

```bash
git clone https://github.com/dana/recipes.git
```

If you started locally like we did, create an empty repository on GitHub, then connect to it and push:

```bash
git remote add origin https://github.com/dana/recipes.git
git push -u origin main
```

`origin` is just the nickname of that remote, and `-u` links your local `main` to it (with the config from earlier, plain `git push` does this for new branches).

Syncing is three commands, and it helps to know exactly what each does:

![Two repositories. The remote origin holds commits A, B, C. Your computer holds A and B and a remote-tracking label origin/main. git fetch downloads C into origin/main without touching your own main. git push uploads your commits to origin. git pull is fetch followed by merge.](/images/git-zero-to-hero/remote.svg)

- `git fetch` **downloads** what's new into `origin/main` but doesn't touch your own branch. It's always safe.
- `git pull` is fetch **plus** merging it into your current branch. (`git pull --rebase` fetches, then rebases.)
- `git push` **uploads** your commits.

If `git push` is rejected, someone pushed before you. Pull, resolve any conflicts, push again.

### The everyday GitHub flow

1. `git switch -c fix-typo` makes a branch for the change.
2. Edit, `git add`, `git commit`. Small commits with clear messages.
3. `git push` sends the branch to GitHub.
4. Open a **pull request** on GitHub, where teammates review it.
5. After it's merged, `git switch main`, `git pull`, and `git branch -d fix-typo`.

## Handy tools

**Stash** parks unfinished work so you can switch branches with a clean folder:

```bash
git stash push -m "half-written pasta tips"
git switch other-branch
# ... do something ...
git switch -
git stash pop             # brings it back
```

**Tags** name a commit permanently, usually for releases:

```bash
git tag -a v1.0 -m "First release"
git push --tags
```

**Cherry-pick** copies a single commit from another branch:

![main has A, B, C. feature has B, D, E. git cherry-pick E copies only commit E onto main as E prime. D is not copied.](/images/git-zero-to-hero/cherry-pick.svg)

```bash
git cherry-pick 7c8d9e0
```

**Bisect** finds which commit introduced a bug, by binary search. You tell Git one bad and one good commit, then say "good" or "bad" as it checks out the ones in between:

```bash
git bisect start
git bisect bad                 # the current commit is broken
git bisect good v1.0           # this one worked
# test, then answer: git bisect good / git bisect bad
git bisect reset               # when done
```

**.gitignore** lists files Git must never track (dependencies, build output, secrets). Create a file named `.gitignore`:

```text
node_modules/
dist/
.env
```

## Habits that save you later

- **Commit small and often.** One idea per commit. "Fix login redirect" beats "stuff".
- **Write messages for the future you.** A short first line in the imperative: "Add pasta recipe", "Fix crash on empty list".
- **Run `git status` before and after.** It takes a second and prevents most surprises.
- **Pull before you start, and before you push.**
- **Never commit secrets.** If a password or token reaches a commit, treat it as leaked even after you delete it: revoke and replace it first, clean the history second.
- **Don't rewrite shared history.** No `--force` on branches others use. If you must, use `git push --force-with-lease`.

## "I did X, now what?"

| Situation | Fix |
| --- | --- |
| Typo in the last commit message | `git commit --amend` |
| Staged the wrong file | `git restore --staged <file>` |
| Want to undo the last commit but keep my work | `git reset --soft HEAD~1` |
| Bad commit already pushed | `git revert <commit>` |
| Merge turned into a mess | `git merge --abort` |
| Rebase turned into a mess | `git rebase --abort` |
| Started working on `main` by mistake | `git switch -c new-branch` (your changes come with you) |
| Need to switch branches with unfinished work | `git stash`, then `git stash pop` |
| Lost commits after a reset or rebase | `git reflog`, then `git switch -c rescue <commit>` |
| Deleted a branch by accident | `git reflog`, then `git switch -c <name> <commit>` |

## Where to go next

You now know the whole model: snapshots in a chain, labels that move, and three areas files pass through. For the full command list, with flags for everything above and more, see my [Git cheat sheet](en/posts/git-commands/). And when something feels wrong, `git status` and `git log --oneline --graph --all` will usually tell you exactly where you are.
