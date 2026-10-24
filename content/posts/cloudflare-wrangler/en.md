---
title: "Wrangler: build and deploy Cloudflare Workers from the command line"
summary: "A new Worker project, wrangler.jsonc, local dev with KV and secrets in .dev.vars, types with wrangler types, then deploys, live logs and rollback with Wrangler 4."
date: 2026-10-24
tags: [cloudflare, cloud, cli]
---

[Wrangler](https://developers.cloudflare.com/workers/wrangler/) is Cloudflare's CLI for Workers: code that runs on Cloudflare's edge servers with no server to manage. It runs the Worker locally, creates resources such as KV, manages secrets and deploys. Every local example ran with Wrangler 4.152.

## A new project

```bash
npm create cloudflare@latest -- my-worker
cd my-worker
```

The wizard (C3) creates `wrangler.jsonc`, an entry file in `src/`, and a `package.json` with Wrangler as a project dependency. Cloudflare recommends a local install per project rather than a global one, so you run `npx wrangler`.

## wrangler.jsonc

```jsonc
{
  "name": "hello-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-24",
  "vars": { "GREETING": "Hello" },
  "kv_namespaces": [{ "binding": "VISITS", "id": "local-only" }]
}
```

`compatibility_date` pins runtime behavior to a date, so Cloudflare's changes don't break an existing Worker. Every binding, like `VISITS` here, reaches the code through `env`. In local dev the KV `id` can be any string; you create the real one before deploying:

```typescript
export default {
  async fetch(request, env): Promise<Response> {
    const count = Number((await env.VISITS.get("count")) ?? 0) + 1;
    await env.VISITS.put("count", String(count));
    return new Response(`${env.GREETING}! visit #${count}, token set: ${Boolean(env.API_TOKEN)}`);
  },
} satisfies ExportedHandler<Env>;
```

Cloudflare recommends `wrangler.jsonc` for new projects. `wrangler.toml` is still supported, with the same structure ([configuration docs](https://developers.cloudflare.com/workers/wrangler/configuration/)).

## Local development

Development secrets go in `.dev.vars` next to the config file, in dotenv format:

```bash
echo 'API_TOKEN="dev-only-value"' > .dev.vars
npx wrangler dev
```

```text
Using secrets defined in .dev.vars
Your Worker has access to the following bindings:
Binding                         Resource                  Mode
env.VISITS (local-only)         KV Namespace              local
env.GREETING ("Hello")          Environment Variable      local
env.API_TOKEN ("(hidden)")      Environment Variable      local
[wrangler:info] Ready on http://localhost:8787
```

Two requests to `localhost:8787` return `visit #1` and then `visit #2`: the local KV keeps state between requests and never touches cloud data. `--remote` runs the Worker on Cloudflare with the real resources.

Add `.dev.vars*` and `.env*` to `.gitignore`, and keep secrets out of `vars`: those live in the config file, which is in Git.

## Types

```bash
npx wrangler types
```

It reads the config and `.dev.vars` and writes `worker-configuration.d.ts` with an `Env` interface:

```typescript
interface __BaseEnv_Env {
	VISITS: KVNamespace;
	GREETING: "Hello";
	API_TOKEN: string;
}
```

Rerun it after every change to `wrangler.jsonc`. In CI, `wrangler types --check` fails when the file is out of date.

## Resources, secrets and deploys

```bash
npx wrangler login
npx wrangler kv namespace create VISITS
npx wrangler secret put API_TOKEN
npx wrangler deploy
```

- `login` opens a browser to authorize your account; `wrangler whoami` shows which account you're signed in to.
- `kv namespace create` creates a namespace in the cloud and prints its `id`. Replace `local-only` with it in `wrangler.jsonc`.
- `secret put` prompts for the value without echoing it, and creates a new Worker version that deploys right away.
- `deploy` uploads the Worker to `<name>.<subdomain>.workers.dev`. `deploy --dry-run` builds and shows the size and bindings without uploading.

For staging, define an `env.staging` block in the config and deploy with `--env staging`. Bindings are not inherited between environments, so define them again in each one.

## Logs, versions and rollback

```bash
npx wrangler tail --status error
npx wrangler versions list
npx wrangler rollback
```

`tail` streams the Worker's logs live, here only failed requests. `versions list` shows the ten most recent versions. `rollback` with no ID goes back to the version before the latest one, and takes effect immediately on every route and domain. For gradual rollouts, use `wrangler versions upload` and then `wrangler versions deploy` with a traffic percentage per version ([command reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/)).
