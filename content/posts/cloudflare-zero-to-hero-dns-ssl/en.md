---
title: "Cloudflare from zero to hero: DNS, the orange cloud and HTTPS"
summary: "What DNS is and its record types, moving a domain to Cloudflare through nameservers, proxied versus DNS only, the SSL/TLS modes, and what gets cached."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 28 }
---

This post needs a domain of your own, bought from a registrar such as Namecheap or GoDaddy, or from Cloudflare Registrar itself. No domain? Skip to the next post: Workers run without one.

## What DNS is

DNS is the internet's phone book: it turns a name like `example.com` into an IP address. Every domain holds a list of **records**:

| Type | What it says | Example |
|---|---|---|
| `A` | The name points to an IPv4 address | `example.com → 203.0.113.10` |
| `AAAA` | The same for IPv6 | `example.com → 2001:db8::10` |
| `CNAME` | The name is an alias for another name | `www → example.com` |
| `MX` | Where mail for the domain goes | `example.com → mail.example.com` |
| `TXT` | Free text, mostly for ownership checks and email | `v=spf1 ...` |

The domain's **nameserver** holds those records. For Cloudflare to manage them, you move the nameservers to it.

## Moving a domain to Cloudflare

([full docs](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/))

1. In the dashboard: **Domains → Onboard a domain**, enter the domain (`example.com`, without `www`) and pick a plan. Free is enough.
2. Cloudflare scans the existing records. Go through them and check nothing is missing, especially the mail `MX` records. A record forgotten here is a site or mailbox that stops working.
3. If DNSSEC is on at your registrar, turn it off **before** changing nameservers. Otherwise the domain may stop resolving.
4. Cloudflare gives you two nameservers. At the registrar, remove the existing ones and paste these exactly.
5. The status is **Pending** until the change spreads, sometimes up to 24 hours. When it turns **Active** you get an email. Then you can turn DNSSEC back on, this time through Cloudflare.

Check from the terminal:

```bash
dig ns example.com +short
```

When the answer shows names ending in `ns.cloudflare.com`, the domain has moved.

## Orange cloud or gray

Every `A`, `AAAA` and `CNAME` record has a **Proxy status** switch:

- **Proxied (orange cloud):** DNS returns Cloudflare addresses, and HTTP and HTTPS traffic goes through Cloudflare. You get caching, protection and HTTPS, and the origin's address stays hidden.
- **DNS only (gray cloud):** DNS returns the real address, and Cloudflare doesn't touch the traffic.

`MX` and `TXT` records are always DNS only. A service that isn't a website, such as SSH to a server, also needs gray. But a gray record for a website exposes the origin's address to anyone who asks, and then attackers can skip Cloudflare and hit the server directly. For websites: orange.

## SSL/TLS modes

With an orange record there are two connections: visitor → Cloudflare, and Cloudflare → origin. The encryption mode, under **SSL/TLS** in the dashboard, decides what happens on each ([docs](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)):

| Mode | Visitor → Cloudflare | Cloudflare → origin |
|---|---|---|
| Off | HTTP | HTTP |
| Flexible | HTTPS | HTTP, unencrypted |
| Full | HTTPS | HTTPS, certificate not checked |
| Full (strict) | HTTPS | HTTPS with a valid certificate |

The visitor sees a padlock even with Flexible, but the path to the origin travels in the clear. Cloudflare recommends Full or Full (strict). Your server can get a free certificate from Let's Encrypt or from Cloudflare Origin CA. The default, Automatic SSL/TLS, checks the origin and picks the most secure mode it supports. Workers and sites served by Cloudflare itself have no origin, so this question doesn't apply to them.

## What gets cached

Cloudflare caches by file extension: images, CSS, JS, fonts, PDF and more. HTML and JSON are **not** cached by default, so dynamic content isn't served stale. The `cf-cache-status` header tells you what happened:

| Value | Meaning |
|---|---|
| `HIT` | Served from the cache |
| `MISS` | Cacheable but not there yet, came from the origin |
| `EXPIRED` | Was in the cache and had expired |
| `DYNAMIC` | Not cacheable, HTML for example |
| `BYPASS` | The origin asked not to store it (`no-store`, `private`) |

```bash
curl -sI https://example.com/style.css | grep -i cf-cache-status
```

Expect `MISS` on the first request for a file and `HIT` on the next one from the same area. To cache HTML too, add a Cache Rule ([docs](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)).
