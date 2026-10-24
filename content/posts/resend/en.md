---
title: "Resend: send email from your code through an API"
summary: "A send-only API key, a first email with curl and with the Node SDK, error handling, verifying your own domain, and safe retries without duplicates using an idempotency key."
date: 2026-10-24
tags: [email, dev-tools]
---

[Resend](https://resend.com/docs) is a service for sending email from an app: sign-up confirmations, password resets, notifications. Instead of running an SMTP server you send one HTTP request. The SDK code was checked with `resend` 6.34. A real send needs an account, so the success response is taken from the docs, while the invalid-key error was actually run.

## API key

Create a key in the dashboard under API Keys. There are two permission levels:

- `full_access`: create, delete and update any resource in the account.
- `sending_access`: send emails only, optionally restricted to one domain.

An app needs only `sending_access`. The key starts with `re_` and is shown once, so store it right away in a `RESEND_API_KEY` environment variable, not in code.

## First email

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Acme <onboarding@resend.dev>",
    "to": ["delivered@resend.dev"],
    "subject": "hello world",
    "html": "<p>it works!</p>"
  }'
```

```json
{ "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }
```

`onboarding@resend.dev` is a sender for testing only, until you verify your own domain. `delivered@resend.dev` is a Resend test address that simulates a successful delivery without mailing a real person. `from`, `to` and `subject` are required, plus at least one of `html` or `text`. `to` takes up to 50 recipients.

## The Node SDK

```bash
npm install resend
```

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "Acme <onboarding@resend.dev>",
  to: ["delivered@resend.dev"],
  subject: "Hello",
  html: "<strong>It works!</strong>",
});

if (error) throw new Error(error.message);
console.log(data.id);
```

The SDK doesn't throw when the API returns an error. It returns `{ data, error }`, and every call must check `error`. Here is an invalid key:

```text
{
  data: null,
  error: {
    message: 'API key is invalid',
    name: 'validation_error',
    statusCode: 401
  }
}
```

The SDK also works in Cloudflare Workers ([Resend's guide](https://resend.com/docs/send-with-cloudflare-workers)); there you store the key as a secret with `wrangler secret put RESEND_API_KEY`, as covered in the [post on Wrangler](en/posts/cloudflare-wrangler/).

## Your own domain

To send from your own address, add a domain under Domains and verify it ([docs](https://resend.com/docs/add-a-domain)):

1. Use a subdomain such as `updates.example.com`, not the root domain. That keeps the reputation of automated mail separate from your regular mail.
2. Copy the records from the Records tab into your DNS provider exactly as shown: a DKIM record and SPF records of type `TXT` and `MX`, or `CNAME` on newer domains. On Cloudflare, turn off the proxy (the orange cloud) on `CNAME` records, or verification won't complete.
3. Verification usually finishes in about 15 minutes, and sometimes takes up to 72 hours.
4. After verification, add a DMARC record, which helps mailbox providers trust the domain and reject spoofed mail.

## No duplicates

A network failure mid-request leaves you not knowing whether the email went out. If you send again, the recipient may get it twice. `idempotencyKey` solves this:

```typescript
await resend.emails.send(
  { from, to, subject, html },
  { idempotencyKey: `welcome-email/${userId}` },
);
```

The SDK sends the key in an `Idempotency-Key` header. A repeat request with the same key within 24 hours sends no extra email. The key must be unique per operation and at most 256 characters, so build it from what identifies the operation (email type and user ID), not from a random value.

The default rate limit is 10 requests per second per team, and going over returns `429`. For several emails at once there is `resend.batch.send`, which takes an array of messages in one request (no attachments). Limits and prices vary by plan; check them in the [docs](https://resend.com/docs).
