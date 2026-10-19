---
title: "Git from zero to hero: remotes and GitHub"
summary: "Part 6 of the Git guide: clone, push, fetch and pull, remote-tracking branches and ahead/behind, what to do when a push is rejected, force-with-lease and tags."
date: 2026-10-09
tags: [git, cli]
series: { key: devops, order: 15 }
---

Everything in parts 1 to 5 lives on your computer. To share the recipe book you need a **remote**: a copy of the repository somewhere else, usually GitHub.

## Working with GitHub

If the project already exists on GitHub, clone it:

```bash
git clone https://github.com/dana/recipes.git
```

If you started locally, create an empty repository on GitHub, then connect to it and push:

```bash
git remote add origin https://github.com/dana/recipes.git
git push -u origin main
```

`origin` is the nickname of that remote, and `-u` links your local `main` to it (with `push.autoSetupRemote` from [part 1](en/posts/git-zero-to-hero/), plain `git push` does this for new branches).

![Two repositories. The remote origin holds commits A, B, C. Your computer holds A and B and a remote-tracking label origin/main. git fetch downloads C into origin/main without touching your own main. git push uploads your commits to origin. git pull is fetch followed by merge.](/images/git-zero-to-hero/remote.svg)

- `git fetch` **downloads** what's new into `origin/main` but doesn't touch your own branch. It's always safe.
- `git pull` is fetch **plus** merging it into your current branch. (`git pull --rebase` fetches, then rebases.)
- `git push` **uploads** your commits.

### Remote-tracking branches, upstream and ahead/behind

After `git clone` or `git fetch`, `git branch -a` shows branches like `origin/main`. These are **remote-tracking branches**: your computer's last-known copy of the remote. You can't commit onto them; only `fetch`, `pull` and `push` move them.

A local branch can be linked to one of them. That link is its **upstream**, and it's how `git status` and `git branch -vv` tell you where you stand:

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

Someone pushed to `main` since you last synced, and Git won't let you overwrite their commits. Run `git pull` (or `git pull --rebase`), resolve any conflict, then `git push` again. Pulling before you start and before you push keeps this rare.

The tempting shortcut, `git push --force`, overwrites the remote and **deletes** their commits. Don't, on shared branches. If you rewrote your own branch with a [rebase](en/posts/git-zero-to-hero-rebase/), use `git push --force-with-lease`: it refuses when the remote has commits you haven't seen.

You can only push to a repository you can write to. For someone else's project, [fork it](en/posts/github-zero-to-hero-collaboration/) first. The day-to-day loop on GitHub, branch, push, pull request, merge, is in [GitHub: pull requests](en/posts/github-zero-to-hero-pull-requests/).

## Tags

A tag names a commit permanently, usually for releases:

```bash
git tag -a v1.0 -m "First release"
git push --tags
```

For the full command list, with flags for everything in this guide, see my [Git cheat sheet](en/posts/git-commands/). When something feels wrong, `git status` and `git log --oneline --graph --all` usually tell you exactly where you are.
