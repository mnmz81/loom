---
title: "GitHub from zero to hero: account, SSH and a first push"
summary: "Part 1 of the GitHub guide: what GitHub adds to Git, creating a repository, signing in with gh, an SSH key or a token, and putting a project online."
date: 2026-10-09
updated: 2026-10-19
tags: [github, git]
series: { key: devops, order: 20 }
---

This guide takes the recipe book from [Git from zero to hero](en/posts/git-zero-to-hero/) online: we change it through a pull request, let a robot test it, and publish it as a website. It assumes you know `git add`, `git commit` and branches.

## What GitHub is (and what it adds to Git)

**Git** is the version control tool; it runs on your computer and needs no internet. **GitHub** hosts Git repositories in the cloud and adds tools for planning, reviewing, testing and deploying.

![On the left, your computer with a local repository holding commits A, B and C. On the right, GitHub with a remote repository holding the same commits. git push uploads from the computer to GitHub, and git fetch or git pull downloads. Below, GitHub adds issues, pull requests, Actions, Pages, projects and releases.](/images/github-zero-to-hero/git-vs-github.svg)

The repository itself (the commits) is plain Git. GitHub's layer on top:

- **Issues** to track tasks, bugs and ideas.
- **Pull requests** to propose a change and have it reviewed before it lands.
- **Actions** to run tests and deployments automatically.
- **Pages** to host a static website straight from a repository.
- **Projects**, **Releases**, **Discussions** and a security toolbox around all of that.

GitLab and Bitbucket do the same job with different names; the Git part works identically with all of them.

## Get started

### Create an account and a repository

Sign up at [github.com](https://github.com), then use **New repository** (the **+** menu at the top right):

- **Name:** `recipes`.
- **Visibility:** *public* (anyone can read it) or *private* (only people you invite). You can change it later.
- **Add a README:** yes. A **README** is a Markdown file shown on the repository's front page, the first thing anyone reads.
- **.gitignore and license:** optional templates. A `.gitignore` keeps junk out of the repo. Without a license, nobody else is formally allowed to reuse your code.

### Connect your computer: SSH or HTTPS

To push, GitHub has to know it's you, and it no longer accepts your account password for Git operations over HTTPS. Three good options:

1. **GitHub CLI (`gh`)** is the easiest. Install it from [cli.github.com](https://cli.github.com) (or `brew install gh`), then:

   ```bash
   gh auth login
   gh auth status
   ```

   It signs you in through the browser and stores the credentials for Git. `gh browse` opens the current repo in the browser, and `gh <command> --help` lists every flag.
2. **SSH key**, which I prefer: set it up once and forget it:

   ```bash
   ssh-keygen -t ed25519 -C "dana@example.com"
   ```

   Accept the default location and choose a passphrase. This makes a private key (`~/.ssh/id_ed25519`, never share it) and a public key (`~/.ssh/id_ed25519.pub`). Paste the public one into **Settings → SSH and GPG keys → New SSH key** on GitHub. Then test:

   ```bash
   ssh -T git@github.com
   ```

   ```plain text
   Hi dana! You've successfully authenticated, but GitHub does not provide shell access.
   ```

   That is the success message. Repository URLs then look like `git@github.com:dana/recipes.git`.
3. **HTTPS with a personal access token** works anywhere but means managing a token. A credential helper (which `gh auth login` configures) keeps it painless.

### Put your project on GitHub

**It exists on GitHub already.** Clone it:

```bash
git clone git@github.com:dana/recipes.git
cd recipes
```

**It exists only on your computer**, like our recipe book. Create an empty repository on GitHub without a README, then connect and push:

```bash
git remote add origin git@github.com:dana/recipes.git
git push -u origin main
```

Or let the CLI do both steps, from inside the project folder:

```bash
gh repo create recipes --public --source=. --push
```

Refresh the repository page and your files and full history are there.
