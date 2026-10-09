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

Git keeps settings on three levels: `--system` for the whole machine, `--global` for your user (the file `~/.gitconfig`), and `--local` for a single repository (`.git/config`). The most specific one wins, so you can use a work email in one project and a personal one everywhere else. `git config --list --show-origin` prints every setting and the file it came from.

A note on syntax: since Git 2.46 the manual prefers subcommands (`git config set --global user.name "Dana Levi"`, `git config get user.name`, `git config list`) and marks the older forms used above as deprecated. The older forms still work everywhere, and they're what most tutorials and older machines use.

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
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   pasta.md
```

Before the very first commit exists, Git suggests `git rm --cached` for unstaging. Once there is history, it suggests `git restore --staged`, which is the one you'll use from now on.

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

Tip: `git add .` stages everything in the current folder, and `git commit -am "message"` stages files Git already knows and commits in one go. Use `git add -p` when you want to pick chunks.

### The life of a file

Git sorts every file in your project into one of four states, and `git status` is how you see them:

![A cycle of four states. A new file is untracked. git add makes it staged. After git commit it is unmodified. Editing a file makes it modified, and git add stages it again.](/images/git-zero-to-hero/file-lifecycle.svg)

- **Untracked:** a new file Git has never seen. It won't be in any commit until you add it.
- **Unmodified:** identical to the last commit. `git status` doesn't mention these files at all.
- **Modified:** you edited it, but haven't staged the edit.
- **Staged:** the edit is queued for the next commit.

`git status` shows them under the headings *Untracked files*, *Changes not staged for commit* (modified) and *Changes to be committed* (staged). A file can appear under two headings at once. If you stage a file and then edit it again, the version you staged is what goes into the commit, and the newer edit is waiting separately. Staging captures the file *at the moment you ran `git add`*.

### Reading a diff

`git diff` output looks cryptic once, and then never again:

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

- `diff --git a/... b/...` names the file, and `index 54af23a..e1f3b27 100644` holds short hashes of its old and new content plus the file mode. You can ignore that line.
- `--- a/...` and `+++ b/...` are the old and new version of the file.
- `@@ -1,3 +1,3 @@` says: this chunk (a *hunk*) covers three lines starting at line 1 in the old file, and three lines starting at line 1 in the new one.
- Lines starting with `-` were removed, lines starting with `+` were added, and lines starting with a space are context that didn't change.

Which two things are being compared depends on the flags:

| Command | Compares |
| --- | --- |
| `git diff` | working directory against the staging area (what you haven't staged yet) |
| `git diff --staged` | staging area against the last commit (what the next commit will contain) |
| `git diff HEAD` | working directory against the last commit (everything, staged or not) |

### Writing a good commit message

Commit messages are the notes you leave for whoever reads the history later, and that is usually you in six months. A simple shape works well:

```text
Fix crash when the recipe list is empty

The list view assumed at least one recipe and read the first item
without checking. Show the empty-state message instead.
```

- A **short first line** (about 50 characters), in the imperative mood: "Fix", "Add", "Remove". Read it as "this commit will... fix the crash".
- A **blank line**, then an optional body that explains *why*, not what. The diff already shows what changed.
- One idea per commit, so the message can be short and true.

Compare "Fix crash when the recipe list is empty" with "fixes", "stuff" or "wip". Six months from now only one of them helps you.

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

### What's inside a commit

A commit is a small record. You can look at the real thing with `git cat-file -p HEAD`:

```text
tree 9f1e0c8d2b7a4c3e5d6f708192a3b4c5d6e7f809
parent 3f2a1b94c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
author Dana Levi <dana@example.com> 1791540000 +0300
committer Dana Levi <dana@example.com> 1791540000 +0300

Add salt to pasta
```

- `tree` points at the snapshot of every file in that moment.
- `parent` is the commit before it. This is the arrow in the diagrams. A merge commit has two `parent` lines.
- `author` and `committer` are who wrote it and who recorded it, with a timestamp.
- Then the message.

The commit's **hash** (like `9c1d4e2`) is a fingerprint computed from exactly this content. Change anything (the files, the message, the parent, even the timestamp) and you get a different hash. That's why `git commit --amend` and `git rebase` create *new* commits instead of editing old ones: from Git's point of view, a changed commit is a different commit. Seven characters are almost always enough to name a commit, as long as they're unique in the repo.

### Pointing at commits

Anywhere Git wants a commit, you can give it any of these:

| You write | It means |
| --- | --- |
| `9c1d4e2` | a commit by its (short) hash |
| `main`, `pizza` | the commit a branch points at |
| `v1.0` | the commit a tag points at |
| `HEAD` | the commit you're on |
| `HEAD~1` (or `HEAD^`) | one commit before HEAD, its parent |
| `HEAD~3` | three commits back along the chain |
| `HEAD^2` | the second parent of a merge commit |
| `HEAD@{2}` | where HEAD was two moves ago (from the reflog) |

So `git diff HEAD~2 HEAD` compares now with two commits ago, and `git show main~1` shows the commit before the tip of `main`.

**Detached HEAD.** Normally HEAD points at a *branch*, and the branch points at a commit. If you check out a commit directly, say with `git switch --detach 3f2a1b9`, HEAD points straight at the commit. Git answers `HEAD is now at 3f2a1b9 ...`, and with the older `git checkout <commit>` it adds a long note about the "detached HEAD" state. It's a fine place to look around, but commits you make there belong to no branch and are easy to lose. To keep them, put a branch on them with `git switch -c keep-this`. To leave, `git switch main`.

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

### What a branch really is

A branch isn't a copy of your project. It's a tiny file with one commit hash in it. You can read it:

```bash
cat .git/refs/heads/main
cat .git/HEAD
```

```text
9c1d4e2a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4
ref: refs/heads/pizza
```

The first file is the `main` branch: a hash, and nothing else. The second is HEAD, saying "I'm on `pizza`". That's the whole mechanism, and it's why branches are free and instant.

- **Creating** a branch writes one small file.
- **Switching** changes what HEAD says and updates your working files to match.
- **Deleting** a branch removes the label. The commits stay in the repo, and `git reflog` can still find them for a while. Git cleans up unreachable commits only after a grace period.

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

### How Git merges

How does `git merge` know what to keep? It finds the **merge base**, the last commit both branches share, and compares each branch against it:

![Commits A and B are shared history. main continues with C and feature continues with D. Both C and D point back to B, the merge base. The merge commit M points to both C and D.](/images/git-zero-to-hero/three-way-merge.svg)

```bash
git merge-base main pizza    # prints the hash of B
```

Git looks at what changed from B to C and from B to D, and combines them:

- A line changed on **one side only** is taken as is.
- A line changed on **both sides, to the same thing**, is taken once.
- A line changed on **both sides, differently**, is a conflict. Git can't know which you meant.

That's why merges usually just work: most of the time the two branches touch different places.

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

A few habits keep conflicts small and calm:

- **Merge `main` into your branch often** (or rebase onto it), so the differences never pile up.
- **Keep branches short-lived and focused.** The longer two branches live, the more they drift apart.
- `git status` during a conflict lists *Unmerged paths*, which are the files still waiting for you. Once you `git add` a file, it's resolved.
- To take one side of a file wholesale, use `git checkout --ours <file>` or `git checkout --theirs <file>`, then `git add` it. Careful: during a **rebase** the meaning flips. "ours" is the branch you're rebasing *onto* and "theirs" is your own commit being replayed.
- Many editors (VS Code, JetBrains) show conflicts with one-click "accept current / incoming" buttons, and `git mergetool` opens a visual tool.

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

### Interactive rebase: cleaning up your commits

Before sharing a branch, you can tidy its private history with `git rebase -i`. Say you made three commits and the last one is just a typo fix:

```bash
git rebase -i HEAD~3
```

Git opens a list in your editor, oldest first. (Older versions print the message without the `#`, and both work.)

```text
pick 3f2a1b9 # Add pasta recipe
pick 9c1d4e2 # Add salt to pasta
pick b7e3f10 # Fix typo in salt step
```

Change the word at the start of a line to say what should happen to that commit, then save and close:

| Word | What it does |
| --- | --- |
| `pick` | keep the commit as it is |
| `reword` | keep it, but stop and let you edit the message |
| `squash` | fold it into the commit above it and combine the messages |
| `fixup` | fold it into the commit above it and drop its message |
| `drop` | delete the commit |
| `edit` | stop so you can change the commit's content |

Here, changing `pick` to `fixup` on the last line merges the typo fix into "Add salt to pasta", leaving two clean commits. You can also reorder commits by moving lines. If it goes wrong, `git rebase --abort` returns everything to how it was. And remember the rule: only do this to commits that nobody else has pulled yet.

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

### Remote-tracking branches, upstream and ahead/behind

After `git clone` or `git fetch`, you'll see branches like `origin/main` in `git branch -a`. These are **remote-tracking branches**: your computer's last-known copy of where the branch was on the remote. You can't commit onto them, and only `git fetch`, `pull` and `push` move them.

A local branch can be linked to one of them. That link is its **upstream**, and it's what lets `git status` and `git branch -vv` tell you where you stand:

```bash
git status
```

```text
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)
```

```bash
git branch -vv
```

```text
* main  9c1d4e2 [origin/main: ahead 1] Add salt to pasta
  pizza b7e3f10 [origin/pizza] Add baking time
```

*Ahead* means you have commits the remote doesn't, so push. *Behind* means the remote has commits you don't, so pull. *Diverged* means both, and you'll need to merge or rebase. Run `git fetch` first so the numbers are fresh.

### When a push is rejected

```text
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:dana/recipes.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

This isn't an error to fear. It means someone pushed to `main` since you last synced, and Git won't let you overwrite their commits. The fix is the normal one: `git pull` (or `git pull --rebase`), resolve any conflict, then `git push` again.

The tempting shortcut is `git push --force`, which overwrites the remote with your version and **deletes** their commits. Don't, on shared branches. If you rewrote your own branch with a rebase and genuinely need to force, use `git push --force-with-lease`: it refuses when the remote has commits you haven't seen.

**Clone or fork?** To work on a repository you own or can write to, clone it. For one you can't push to (someone else's open-source project), *fork* it on GitHub first. That makes your own copy on your account. You clone the fork, push to it, and open a pull request back to the original. People usually add the original as a second remote named `upstream` to keep their fork up to date: `git remote add upstream <url>`.

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

A few pattern rules cover almost everything:

```text
*.log          # any file ending in .log
build/         # a folder, anywhere
/todo.md       # only in the project root
**/temp        # a "temp" at any depth
!keep.log      # exception: track this one even though *.log is ignored
```

One catch: `.gitignore` only affects files Git isn't tracking yet. If a file was committed before you ignored it, run `git rm --cached <file>` once to stop tracking it (the file stays on disk), then commit.

## Habits that save you later

- **Commit small and often.** One idea per commit. "Fix login redirect" beats "stuff".
- **Write messages for the future you.** A short first line in the imperative: "Add pasta recipe", "Fix crash on empty list".
- **Run `git status` before and after.** It takes a second and prevents most surprises.
- **Pull before you start, and before you push.**
- **Never commit secrets.** If a password or token reaches a commit, treat it as leaked even after you delete it: revoke and replace it first, clean the history second.
- **Don't rewrite shared history.** No `--force` on branches others use. If you must, use `git push --force-with-lease`.

## Which undo command?

The same job can have several commands, and the old `git checkout` did most of them, which is why it confused everyone. Since Git 2.23, `git switch` handles moving between branches and `git restore` handles files. Here's how to pick:

| I want to... | Use | What it changes |
| --- | --- | --- |
| Throw away my edits to a file | `git restore <file>` | the file in the working directory |
| Take a file out of staging | `git restore --staged <file>` | the staging area only |
| Get a file the way it was in an older commit | `git restore --source=<commit> <file>` | the file in the working directory |
| Fix the last commit (message or content) | `git commit --amend` | replaces the last commit |
| Move my branch back and forget some commits (not pushed yet) | `git reset` | the branch label, and maybe staging and files |
| Cancel a commit that's already shared | `git revert <commit>` | adds a new commit, rewrites nothing |
| Look at old code without changing anything | `git switch --detach <commit>` | HEAD only |

A rule of thumb: if the commits exist only on your computer, you may rewrite them (`reset`, `amend`, `rebase`). If anyone else might have them, add to history (`revert`) instead of rewriting it.

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

## Glossary

- **Repository (repo):** a project plus its full history, stored in the `.git` folder.
- **Commit:** a saved snapshot, with a message, an author and a parent.
- **Hash:** the fingerprint that names a commit, like `9c1d4e2`.
- **Branch:** a movable label pointing at a commit.
- **HEAD:** a pointer to where you are now, usually a branch.
- **Working directory:** your files as they are on disk.
- **Staging area (index):** the changes picked for the next commit.
- **Merge:** combining two branches. A *fast-forward* just moves a label; a *merge commit* has two parents.
- **Rebase:** replaying commits on top of another commit, creating new copies.
- **Conflict:** both sides changed the same lines and Git needs you to choose.
- **Remote:** a copy of the repository elsewhere, usually called `origin`.
- **Upstream:** the remote branch your local branch is linked to.
- **Fetch / pull / push:** download, download-and-merge, and upload.
- **Pull request (PR):** a request on GitHub to merge your branch, with review.
- **Fork:** your own GitHub copy of someone else's repository.
- **Stash:** a shelf for unfinished changes.
- **Tag:** a permanent name for a commit, like a release.
- **Detached HEAD:** HEAD pointing at a commit instead of a branch.

## Where to go next

You now know the whole model: snapshots in a chain, labels that move, and three areas files pass through. For the full command list, with flags for everything above and more, see my [Git cheat sheet](en/posts/git-commands/). And when something feels wrong, `git status` and `git log --oneline --graph --all` will usually tell you exactly where you are.
