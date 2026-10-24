---
title: "Cloudflare from zero to hero: what it is and a secure account"
summary: "What Cloudflare does between the visitor and your server, the map of services this series covers, an account with two-factor auth, scoped API tokens, and what the free plan gives."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 27 }
---

This series starts from zero: no prior knowledge of Cloudflare, DNS or servers. By the end you'll have a domain managed in Cloudflare, an API running on Workers with a database and file storage, and a site that updates itself on every push to GitHub. All you need is Node.js and a terminal.

## What Cloudflare does

When someone visits a site, the browser first asks DNS for the address (IP) behind the name, then sends a request to that address. The server where the site really lives is called the **origin**.

Cloudflare sits in the middle as a **reverse proxy**: DNS returns a Cloudflare address instead of the origin's, the request reaches the Cloudflare data center closest to the visitor, and only from there, if needed, goes on to the origin. What that gives you:

- **Speed:** files such as images and CSS are cached close to the visitor.
- **Protection:** the origin's address stays hidden, and DDoS attacks are absorbed by Cloudflare's network.
- **HTTPS:** Cloudflare issues a certificate and handles encryption toward the visitor.

You can see it on any site behind Cloudflare:

```bash
curl -sI https://www.cloudflare.com/favicon.ico | grep -iE "server|cf-cache-status|cf-ray"
```

```text
cf-cache-status: HIT
server: cloudflare
cf-ray: a4f767146dd93d7c-TLV
```

`HIT` means the file came from the cache, and `TLV` at the end of `cf-ray` is the code of the data center that answered, here Tel Aviv.

## The map

| Service | What it does | Post |
|---|---|---|
| DNS, proxy and SSL | Manage the domain, hide the origin, HTTPS | 2 |
| Workers | Code that runs on Cloudflare's network, no server to manage | 3–4 |
| KV | Key-value storage, fast to read | 4 |
| D1 | SQL database (built on SQLite) | 5 |
| R2 | File storage, S3-compatible | 5 |
| Static assets | A static site served from a Worker | 6 |

Every service has its own docs at [developers.cloudflare.com](https://developers.cloudflare.com/).

## A secure account

Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) and verify your email. Without a verified email you can't turn on two-factor authentication, which is the next step.

**Two-factor authentication (2FA):** in the dashboard open **My Profile → Authentication** ([docs](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/)). There are three options:

- An authenticator app (TOTP), such as Google Authenticator.
- A security key: Touch ID, Windows Hello or a YubiKey. Registering more than one key is recommended.
- A code by email.

Setup gives you **backup codes**. Keep them in a password manager: each code works once, and they're how you get in if you lose your phone.

### API tokens

Tools such as Wrangler and GitHub Actions need access to your account. Give them an **API token**, not your password or the Global API Key, which has full access to the whole account. A token is limited to the permissions and resources you pick, can also be limited to IP addresses and a lifetime, and can be revoked without touching anything else.

Create one under **My Profile → API Tokens → Create Token**, usually from a ready template ([docs](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)). The value is shown once, so copy it right away somewhere safe. Post 6 uses one.

## The free plan

You can follow the whole series without paying. At the time of writing, free Workers get 100,000 requests a day and 10 milliseconds of CPU per request, and KV, D1 and R2 have their own free quotas. R2 charges nothing for outbound traffic (egress). The numbers change, so check the [pricing page](https://developers.cloudflare.com/workers/platform/pricing/) before relying on them.
