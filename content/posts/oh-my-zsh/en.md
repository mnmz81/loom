---
title: "Oh My Zsh: a friendlier terminal with plugins and themes"
summary: "Install Oh My Zsh, turn on plugins like git, change the theme in ~/.zshrc, keep it updated with omz update, and know how to add your own plugin or remove it."
date: 2026-10-19
tags: [macos, dev-tools, cli]
series: { key: mac-dev-setup, order: 2 }
---

Zsh is the default shell on macOS. [Oh My Zsh](https://ohmyz.sh/) is a framework that manages its configuration: a set of plugins, themes and helpers, loaded from `~/.zshrc`. Checked against the project's README.

## Install

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

The script clones Oh My Zsh into `~/.oh-my-zsh` and writes a new `~/.zshrc` (an existing one is backed up). Open a new terminal tab to see it. If you must read a script before running it, download it first and open it.

## Plugins

Plugins are listed in `~/.zshrc`, separated by spaces, not commas:

```bash
plugins=(git)
```

The `git` plugin adds aliases. After `source ~/.zshrc` these work:

```bash
gst     # git status
ga      # git add
gcmsg   # git commit --message
gco     # git checkout
gl      # git pull
gp      # git push
```

Run `alias | grep git` to list them all. Hundreds of plugins ship with the framework, each with a README in `~/.oh-my-zsh/plugins/<name>/`. Read it before you enable one, because many plugins are just aliases.

## Themes

The theme is one line in `~/.zshrc`:

```bash
ZSH_THEME="robbyrussell"
```

The README says more than 150 themes come bundled. Change the name, run `source ~/.zshrc`, and look at the prompt. Some themes need a font with special symbols, such as a Nerd Font, otherwise you see broken characters.

## Update

```bash
omz update
```

## Your own plugins

Create a folder in the `custom/plugins/` directory with a `<name>.plugin.zsh` file, then add its name to `plugins=(...)`. Files ending in `.zsh` placed in `custom/` load on their own.

## Remove

```bash
uninstall_oh_my_zsh
```

Next: [GitHub CLI](en/posts/github-cli/).
