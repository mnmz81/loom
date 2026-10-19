---
title: "Git from zero to hero: branches, merging and conflicts"
summary: "Part 4 of the Git guide: what a branch really is, fast-forward and merge commits, how a three-way merge decides, and how to resolve a conflict calmly."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 4 }
---

A branch is the label from [part 2](en/posts/git-zero-to-hero-history/) that moves forward with each commit. This part uses one to try a pizza recipe in the recipe book without touching `main`.

## Branches

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

![main has commits A, B and C. A second branch called feature starts at B and has its own commits D and E. HEAD points at feature, so the next commit goes there.](/images/git-zero-to-hero/branches.svg)

A branch costs almost nothing, so make one per idea.

```bash
git branch            # list branches, * marks the current one
git switch main       # go back; pizza.md disappears from the folder
git switch pizza      # and it's back
```

### What a branch really is

A branch isn't a copy of your project. It's a tiny file with one commit hash in it:

```bash
cat .git/refs/heads/main
cat .git/HEAD
```

```text
9c1d4e2a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4
ref: refs/heads/pizza
```

The first file is the `main` branch: a hash, nothing else. The second is HEAD, saying "I'm on `pizza`".

- **Creating** a branch writes one small file.
- **Switching** changes what HEAD says and swaps your working files for that snapshot.
- **Deleting** a branch removes the label. The commits stay, and `git reflog` can find them until Git cleans up unreachable commits after a grace period.

## Merging

The pizza is done. Bring it into `main`:

```bash
git switch main
git merge pizza
```

What happens depends on whether `main` moved while you were away:

![Two scenarios. Top, fast-forward: main had nothing new, so Git just moves the main label forward to the last commit of feature. Bottom, merge commit: both branches have new commits, so Git creates a merge commit M with two parents.](/images/git-zero-to-hero/merge.svg)

- If `main` hasn't changed, Git does a **fast-forward**: it moves the `main` label ahead. No new commit.
- If both branches have new commits, Git makes a **merge commit** with two parents, tying the histories together.

Then clean up:

```bash
git branch -d pizza    # safe: refuses if it wasn't merged
```

### How Git merges

Git finds the **merge base**, the last commit both branches share, and compares each branch against it:

![Commits A and B are shared history. main continues with C and feature continues with D. Both C and D point back to B, the merge base. The merge commit M points to both C and D.](/images/git-zero-to-hero/three-way-merge.svg)

```bash
git merge-base main pizza    # prints the hash of B
```

Git combines what changed from B to C and from B to D:

- A line changed on **one side only** is taken as is.
- A line changed on **both sides, to the same thing**, is taken once.
- A line changed on **both sides, differently**, is a conflict. Git can't know which you meant.

Most of the time the two branches touch different places, so merges usually just work.

### Conflicts

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

Between `<<<<<<<` and `=======` is yours (`main`), and the rest is theirs (`pizza`). Decide, delete the markers, and keep what you want:

```text
Bake 25 minutes.
```

```bash
git add pizza.md
git commit            # finishes the merge
```

Changed your mind halfway? `git merge --abort` puts everything back. A conflict is not an error, it's Git asking a question only you can answer.

- **Merge `main` into your branch often** (or rebase onto it), so differences never pile up. Keep branches short-lived and focused.
- `git status` during a conflict lists *Unmerged paths*, the files still waiting for you. `git add` marks one resolved.
- To take one side wholesale, use `git checkout --ours <file>` or `--theirs`, then `git add` it. During a **rebase** the meaning flips: "ours" is the branch you're rebasing *onto*, "theirs" is your own commit being replayed.
- Editors (VS Code, JetBrains) offer one-click "accept current / incoming", and `git mergetool` opens a visual tool.
