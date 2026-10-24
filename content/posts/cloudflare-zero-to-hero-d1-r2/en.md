---
title: "Cloudflare from zero to hero: a D1 database and R2 files"
summary: "When to use KV, D1 or R2, a SQL table in D1 with a schema and safe queries, uploading and downloading files from R2, all locally before touching the cloud."
date: 2026-10-24
tags: [cloudflare, cloud]
series: { key: devops, order: 31 }
---

The API built here stores notes in a database and files in storage, and runs entirely locally. Every example ran with Wrangler 4.152.

## Which storage for what

| | KV | D1 | R2 |
|---|---|---|---|
| Stores | A key and a value | SQL tables | Files (objects) |
| Good for | Settings, sessions, cache | Users, orders, anything with relations and queries | Images, video, backups, large files |
| Consistency | Eventual: a write reaches the whole world after a while | One SQLite database, with optional read replicas | Strong, per file |
| Remember | One write per second to the same key | Up to 10GB per database | No egress fees |

The rule: need to search, filter or join tables? D1. A file? R2. A value read often and written rarely? KV ([comparison in the docs](https://developers.cloudflare.com/workers/platform/storage-options/)).

## Configuration

```jsonc
{
  "name": "notes-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-24",
  "d1_databases": [
    { "binding": "DB", "database_name": "notes-db", "database_id": "local-only" }
  ],
  "r2_buckets": [
    { "binding": "FILES", "bucket_name": "notes-files" }
  ]
}
```

As with KV in the previous post, locally the `database_id` can be any string.

## D1: a table and queries

The schema is plain SQL, in a `schema.sql` file:

```sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL
);
```

```bash
npx wrangler d1 execute notes-db --local --file=./schema.sql
```

`--local` runs against a local copy in `.wrangler/state`. The same command with `--remote` runs against the database in the cloud. The snippets below go inside the `fetch` from the [first Worker post](en/posts/cloudflare-zero-to-hero-first-worker/), which now also takes `env` as a second parameter. `env.DB.prepare` prepares a query and `bind` fills in the question marks:

```typescript
if (url.pathname === "/notes" && request.method === "POST") {
  const { text } = await request.json<{ text: string }>();
  await env.DB.prepare("INSERT INTO notes (text) VALUES (?)").bind(text).run();
  return new Response("saved", { status: 201 });
}
if (url.pathname === "/notes") {
  const { results } = await env.DB.prepare("SELECT id, text FROM notes").run();
  return Response.json(results);
}
```

Never paste user input into the SQL string. `bind` sends the value separately from the query, which blocks SQL injection.

## R2: files

```typescript
const key = url.pathname.slice(1);
if (url.pathname.startsWith("/files/") && request.method === "PUT") {
  await env.FILES.put(key, request.body);
  return new Response(`stored ${key}`, { status: 201 });
}
if (url.pathname.startsWith("/files/")) {
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body);
}
```

`put` takes the request body as a stream, so even a large file is never loaded fully into memory. `get` returns `null` when no file exists under that key.

## Running it

Start `npx wrangler dev`, and in a second terminal:

```bash
echo hello > hi.txt
curl -X POST localhost:8787/notes -d '{"text":"buy milk"}'
curl localhost:8787/notes
curl -X PUT --data-binary @hi.txt localhost:8787/files/hi.txt
curl localhost:8787/files/hi.txt
```

```text
saved
[{"id":1,"text":"buy milk"}]
stored files/hi.txt
hello
```

The data stays in `.wrangler/state` after you stop `wrangler dev`, and you can query it directly:

```bash
npx wrangler d1 execute notes-db --local --command="SELECT * FROM notes"
```

## To the cloud

```bash
npx wrangler d1 create notes-db
npx wrangler r2 bucket create notes-files
npx wrangler d1 execute notes-db --remote --file=./schema.sql
npx wrangler deploy
```

`d1 create` prints a real `database_id`. Replace `local-only` with it before the `deploy`. R2 has no such ID: the name in `bucket_name` is enough.
