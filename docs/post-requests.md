# Requesting a post from the site

Write posts from anywhere (phone included) without your computer: describe the post, Claude Code
writes it in GitHub Actions with the same `new-post` skill used locally, and you approve a PR.

```
/loom/admin/request.html ──► GitHub issue (label post-request) ──► .github/workflows/post-request.yml
       form                    you tap "Create"                    Claude Code: skill new-post, build, tests
                                                                          │
           merge = deploy ◄── PR (you open it from Claude's link) ◄──────┘  commits on claude/issue-<n>-…
```

Files: `public/admin/request.html` (form), `.github/ISSUE_TEMPLATE/post-request.yml` (issue form),
`.github/workflows/post-request.yml` (runs `anthropics/claude-code-action@v1`), `.claude/skills/new-post/SKILL.md`.

## One-time setup

1. **Install the Claude GitHub app** on `mnmz81/loom` only: https://github.com/apps/claude
   (it gives the action a short-lived token to commit, comment and read the issue).
2. **Create a Claude token** on your computer (Pro/Max subscription):
   ```bash
   claude setup-token
   ```
3. **Add it as a secret:** repo → Settings → Secrets and variables → Actions → New repository secret →
   name `CLAUDE_CODE_OAUTH_TOKEN`, value from step 2. (An API key works too: secret `ANTHROPIC_API_KEY`
   and replace `claude_code_oauth_token` with `anthropic_api_key` in the workflow.)
4. **Create the label** once: Issues → Labels → New label → `post-request`. (Or `gh label create post-request`.)

Setup reference: https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md

## Requesting a post

1. Open https://mnmz81.github.io/loom/admin/request.html (on a phone: Share → Add to Home Screen).
2. Fill the topic, and optionally series, tags and details → **המשך ל-GitHub** → **Create**.
3. The workflow starts (Actions tab). Claude comments on the issue with progress, then a link to open the PR.
4. Open the PR, read the preview. CI runs on it.
5. Changes: comment `@claude <what to change>` on the PR or the issue. Claude pushes to the same branch.
6. Merge → the deploy workflow publishes the post.
7. Later, on your computer: the Notion copy (manual, step 8 of the skill). Claude's reply on the issue reminds you.

To rerun a request that failed, remove the `post-request` label from the issue and add it again.

## Who can trigger it

- Only the repository owner: the workflow checks `github.actor == github.repository_owner`, and the
  action itself refuses users without write access. Issues or comments from anyone else do nothing.
- Claude never pushes to `main`; everything lands on a `claude/…` branch and reaches the site only when you merge.
- Allowed tools are limited in the workflow (`--allowedTools`): file edits, web fetch/search for the docs,
  `npm run new-post|content|build|test:scripts`, `npx tsx scripts/diagrams/*`, `python3` (to run examples).
- Remaining risk: `python3` runs any code, and Claude reads web pages while researching, so a hostile page
  could attempt a prompt injection. That is why nothing reaches the site without your merge. Turn on branch
  protection for `main` (Settings → Branches) so even the action's token cannot push there directly.
- The action is pinned to a commit SHA, not a moving tag; bump it deliberately (see the workflow comment).

## Cost and limits

Each request is one Claude Code session (up to `--max-turns 200`, 60-minute job timeout). With
`CLAUDE_CODE_OAUTH_TOKEN` it counts against your Claude subscription usage; with an API key it is billed
per token. Check current plans and pricing on anthropic.com.
