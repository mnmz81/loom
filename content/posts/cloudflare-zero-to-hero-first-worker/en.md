---
title: "Cloudflare from zero to hero: your first Worker"
summary: "What a Worker is, creating a project with C3, a fetch function that returns text and JSON per path, running it locally with wrangler dev, and deploying to workers.dev."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 29 }
---

A **Worker** is a function that runs on Cloudflare's network every time a request arrives. There's no server to install, patch or scale: Cloudflare runs the code in the data center closest to the visitor, and bills (if at all) per request. Every example ran with Wrangler 4.152 and Node.js 24.

## Creating a project

```bash
npm create cloudflare@latest -- first-worker
```

C3, Cloudflare's wizard, asks a few questions. For this post pick **Hello World example**, then **Worker only** and **TypeScript**. It creates:

| File | Role |
|---|---|
| `src/index.ts` | The Worker's code |
| `wrangler.jsonc` | The Worker's name, entry file and compatibility date |
| `package.json` | Wrangler as a dependency, plus `dev` and `deploy` scripts |
| `test/` | Tests with Vitest |

## The code

Every Worker exports an object with a `fetch` function. It receives a `Request` and returns a `Response`, the same Fetch API objects you know from the browser. Replace the contents of `src/index.ts`:

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Hello from the edge!");
    }
    if (url.pathname === "/api/time") {
      return Response.json({ now: new Date().toISOString(), method: request.method });
    }
    return new Response("Not found", { status: 404 });
  },
};
```

`new URL(request.url)` parses the address, and `pathname` is the part after the domain. `Response.json` turns an object into JSON and adds the `Content-Type: application/json` header. Without `status`, the response is a 200.

## Running it locally

```bash
cd first-worker
npx wrangler dev
```

Wrangler runs the Worker on your machine, in the same runtime (workerd) Cloudflare uses, listening on `http://localhost:8787`. Every save reloads it. In another terminal:

```bash
curl localhost:8787/
curl localhost:8787/api/time
curl -i localhost:8787/nope
```

```text
Hello from the edge!
{"now":"2026-10-24T07:50:52.916Z","method":"GET"}
HTTP/1.1 404 Not Found
```

`wrangler dev` needs no account. Stop it with `x` or `Ctrl+C`.

## Going live

```bash
npx wrangler deploy
```

The first time, Wrangler opens a browser to sign in to your Cloudflare account and grant it access. If you don't have a `workers.dev` subdomain yet, it offers to create one. At the end it prints the public address:

```text
https://first-worker.<subdomain>.workers.dev
```

The address works right away, over HTTPS, from anywhere. The Worker also shows up in the dashboard under **Workers & Pages**, with logs and request graphs. Each further `deploy` replaces the previous version within seconds.

Next post: how Wrangler holds configuration, variables, secrets and KV storage, and how to roll back when something breaks.
