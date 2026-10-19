---
title: "Docker from zero to hero: a Dockerfile for your own app"
summary: "Containerizing a small Node app: writing a Dockerfile and .dockerignore, building and running it, layers and the build cache, multi-stage builds, and CMD versus ENTRYPOINT."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 31 }
---

[The first part](en/posts/docker-zero-to-hero/) ran images someone else built. Here we build one for our own app, the `hello-app` the rest of the series keeps using.

## Our app, in a container

Create a folder `hello-app` with a tiny Node server:

```js
// server.js
const http = require('node:http');

const port = process.env.PORT || 3000;
http
  .createServer((req, res) => res.end('Hello from a container\n'))
  .listen(port, () => console.log(`listening on ${port}`));
```

```json
{
  "name": "hello-app",
  "version": "1.0.0",
  "scripts": { "start": "node server.js" }
}
```

Run `npm install` once so a `package-lock.json` exists. Now the **Dockerfile**: a text file of instructions, each of which becomes a layer of the image. Save it as `Dockerfile` (no extension):

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

- `FROM node:24-slim` starts from a base image that already has Node. Every Dockerfile starts with `FROM`.
- `WORKDIR /app` sets the working directory for the following instructions, and creates it.
- `COPY package*.json ./` copies only the package files first (the next section explains why).
- `RUN npm ci --omit=dev` runs a command at *build time* and saves the result as a layer. Here it installs dependencies.
- `COPY . .` copies the rest of your project into the image.
- `USER node` runs the app as the unprivileged `node` user that the Node images include, not as root.
- `EXPOSE 3000` *documents* that the app listens on 3000. It does not publish anything ([ports](en/posts/docker-zero-to-hero-ports-volumes-networks/) do that).
- `CMD ["node", "server.js"]` is the default command when a container starts.

Add a `.dockerignore` next to it, so junk never enters the build:

```plain text
node_modules
.git
.env
*.md
```

The patterns work like a `.gitignore`. `node_modules` stays out because the image installs its own, and `.env` because secrets don't belong in images.

Build and run:

```bash
docker build -t hello-app .
docker run -d --name hello -p 3000:3000 hello-app
curl localhost:3000
```

```plain text
Hello from a container
```

`-t hello-app` tags the image, and the `.` is the **build context**: the folder the build may copy from. Anyone with Docker can now run the same commands and get the same result, without installing Node.

### Layers and the build cache

An image is a stack of layers, one per instruction. Docker caches layers: if an instruction and everything it depends on is unchanged, it reuses the layer instead of running it again. But once one layer changes, every layer after it is rebuilt.

![A stack of layers for the Dockerfile: FROM node:24-slim, WORKDIR /app, COPY package files, RUN npm ci, COPY of the source, and a thin read-write container layer on top. The four lowest layers are marked cached and the COPY of the source is marked rebuilt.](/images/docker-zero-to-hero/image-layers.svg)

Source changes all day, dependencies rarely. Because `package*.json` is copied and installed *before* the source, an edit to `server.js` rebuilds only the last `COPY`, and the slow `npm ci` comes from cache. Reverse the order and every edit reinstalls everything. The rule: **put what changes rarely at the top and what changes often at the bottom.**

A container adds a thin read-write layer on top of the image. What it writes goes there and is deleted with the container, which is why data needs [volumes](en/posts/docker-zero-to-hero-ports-volumes-networks/).

A cache trap on Debian-based images: run `apt-get update` and `apt-get install` in the same `RUN` so a stale package list isn't reused, and clean up in the same line to keep the layer small:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
    && rm -rf /var/lib/apt/lists/*
```

### Multi-stage builds: build big, ship small

Build tools (compilers, dev dependencies) are needed to build the app but not to run it. A **multi-stage build** uses one stage to build and copies only the result into a small final image:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

The first stage has Node and every dev dependency; the final image is just nginx plus the built files. (The output folder, `dist` here, depends on your project.) This is the standard way to ship a front-end app.

### Two ways to write the start command

`CMD` sets the default command, and `ENTRYPOINT` sets the executable that always runs, with `CMD` supplying default arguments:

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

Then `docker run image` runs `s3cmd --help`, and `docker run image ls s3://bucket` runs `s3cmd ls s3://bucket`. Use the **exec form**, the JSON array (`["node", "server.js"]`), not a plain string: your program becomes the main process and receives signals like the stop request, while the shell form puts a shell in between that may swallow them.
