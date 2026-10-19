---
title: "Homebrew: install anything on a Mac from the terminal"
summary: "Install Homebrew, then use brew install, upgrade and cleanup, tell formulae from casks, run background services, and save everything you installed in a Brewfile."
date: 2026-10-19
tags: [macos, dev-tools, cli]
series: { key: mac-dev-setup, order: 1 }
---

Homebrew is the package manager of macOS. One command installs a tool, upgrades it, and removes it. The other posts in this series install everything through it. Commands ran with Homebrew 7.0 and are checked against the [Homebrew docs](https://docs.brew.sh/).

## Install

Run the install script from [brew.sh](https://brew.sh) and follow what it prints at the end. On Apple Silicon Homebrew lives in `/opt/homebrew`, and the script tells you to add it to your `PATH`.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew --prefix
```

```text
/opt/homebrew
```

## Formulae and casks

- A **formula** is a command-line tool or library, built or downloaded for you: `gh`, `uv`, `gitleaks`.
- A **cask** is a macOS app with a GUI, such as OrbStack. Add `--cask` for those.

```bash
brew install gh
brew install --cask orbstack
brew search docker
brew info gh
```

`brew search` finds both kinds, and `brew info` shows the version, the description and the install path.

## Keep things current

```bash
brew update
brew outdated
brew upgrade
brew cleanup
brew autoremove
```

`brew update` refreshes Homebrew's list of packages. `brew upgrade` upgrades the packages themselves, or only the ones you name. `brew cleanup` deletes old versions, and `brew autoremove` removes dependencies that nothing uses any more. Add `--dry-run` to `brew autoremove` to see what it would remove. To keep a package at its current version, use `brew pin <name>`.

## Background services

Tools like a database can run in the background. `brew services` manages them through macOS's `launchctl`.

```bash
brew services list
brew services start postgresql@17
brew services stop postgresql@17
```

Without `sudo` a service starts when you log in. With `sudo` it starts at boot.

## Save your setup in a Brewfile

`brew leaves` lists the packages you installed on purpose, without their dependencies. `brew bundle dump` writes everything to a `Brewfile`, and `brew bundle` installs from it on a new Mac.

```bash
brew bundle dump
brew bundle
```

```ruby
brew "gh"
brew "gitleaks"
cask "orbstack"
```

Commit the `Brewfile` to a dotfiles repository and a new machine is one command away from your tools. If something misbehaves, run `brew doctor`.

Next in the series: [Oh My Zsh](en/posts/oh-my-zsh/).
