---
title: "gitleaks: catch secrets before they reach GitHub"
summary: "Scan a folder or the whole Git history for leaked keys and tokens with gitleaks, block them with a pre-commit hook, allow false positives, and what to do when a secret was already pushed."
date: 2026-10-19
tags: [security, git, dev-tools]
series: { key: mac-dev-setup, order: 7 }
---

An API key in a commit is public the moment you push to a public repository, and bots scrape new commits for them. [gitleaks](https://github.com/gitleaks/gitleaks) scans files and Git history for secrets using a built-in set of rules. Every command ran with gitleaks 8.30.

```bash
brew install gitleaks
```

## Scan

```bash
gitleaks dir .
gitleaks git .
```

`gitleaks dir` scans the files as they are now. `gitleaks git` scans the commit history, and that matters: a secret you deleted in a later commit is still in history. A finding looks like this (`--redact` hides the secret itself, and `--no-banner` removes the logo):

```text
Finding:     aws_key = "REDACTED
Secret:      REDACTED
RuleID:      aws-access-token
Entropy:     3.584184
File:        a.txt
Line:        1
Fingerprint: a.txt:aws-access-token:1
```

The exit code is 1 when something was found, so it works in scripts and CI.

## Block it at commit time

Scanning after the fact is late. Add gitleaks as a hook, with the setup from the [pre-commit post](en/posts/pre-commit/):

```yaml
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
```

After `pre-commit install`, a commit that stages a secret stops:

```text
Detect hardcoded secrets.................................................Failed
- hook id: gitleaks
- exit code: 1
```

The hook runs `gitleaks git --pre-commit --staged`, so it looks only at what you are about to commit. Replace `rev` with the latest release tag.

## False positives

A line that is not a real secret, such as a fake key in a test, can be allowed in three ways:

- A comment on the line: `# gitleaks:allow`.
- A `.gitleaksignore` file with the finding's `Fingerprint`, one per line.
- A `.gitleaks.toml` that keeps the default rules and skips paths:

```toml
[extend]
useDefault = true

[[allowlists]]
description = "docs examples"
paths = ['''docs/.*''']
```

Without `useDefault = true` your config replaces the built-in rules instead of adding to them.

## A secret already got out

Deleting the line is not enough. The secret is in history, and maybe already copied.

1. **Revoke it** at the provider and issue a new one. This is the only step that really fixes it.
2. Move the new one to an environment variable or a secrets manager.
3. Only then clean the history if you want to, for example with `git filter-repo`, and know that forks and clones keep the old commits.

Pair gitleaks with GitHub's own secret scanning and push protection, which you can switch on in a repository's security settings.
