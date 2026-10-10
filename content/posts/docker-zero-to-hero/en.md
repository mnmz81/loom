---
title: "Docker from zero to hero"
summary: "A hands-on guide to Docker with diagrams: images and containers, Dockerfiles, layers and caching, ports, volumes, networks, Docker Compose, cleanup and habits for small, safe images."
date: 2026-10-10
tags: [docker, containers, tutorial]
---

"It works on my machine" is the oldest sentence in software. Docker is the tool that mostly retires it: you package your app together with everything it needs, and then it runs the same way on your laptop, on a teammate's laptop and on a server.

This guide builds one small web app and containerizes it step by step. Every new idea shows up when the app needs it: images, a Dockerfile, ports, data, a database next to it, and finally Docker Compose to run all of it with one command.

## What Docker is

Docker is an open platform for developing, shipping and running applications. It packs an app into a **container**: an isolated environment that holds the app and what it needs to run, so it doesn't depend on whatever is installed on the host.

Three words carry most of the vocabulary:

- An **image** is a read-only template: your app plus its runtime, libraries and files. You *build* it once.
- A **container** is a running instance of an image. You can start, stop and delete containers as often as you like, and one image can start many of them.
- A **registry** stores images. **Docker Hub** is the public one Docker uses by default, and you can run a private one.

![A Dockerfile is built into an image with docker build. docker run starts one or more containers from the image. An image can be pushed to a registry such as Docker Hub with docker push and downloaded with docker pull.](/images/docker-zero-to-hero/image-to-container.svg)

Behind the scenes Docker has two parts: the **daemon** (`dockerd`), which does the work of managing images, containers, networks and volumes, and the **client** (`docker`), the command you type. The client sends your command to the daemon. Docker Compose is another client, for apps made of several containers.

### Containers are not virtual machines

A virtual machine carries a whole guest operating system with its own kernel. A container is an isolated process that shares the host's kernel, using Linux features such as namespaces for the isolation. That's why containers start in moments and take far less space, so you can run more of them on the same hardware.

![Left: a virtual machine stack with hardware, a host OS with a hypervisor, and two virtual machines, each with its own guest OS, libraries and app. Right: a container stack with hardware, a host OS, the Docker Engine, and three containers that hold only libraries and an app and share the host kernel.](/images/docker-zero-to-hero/containers-vs-vms.svg)

The flip side: a container is isolated by default, but it is not a separate machine, so isolation is weaker than a VM's. (On a Mac or Windows computer, Docker Desktop runs a small Linux virtual machine in the background, because containers need a Linux kernel. You rarely notice.)

## Install and check it works

The easiest route is **Docker Desktop** (Mac, Windows and Linux), from [docker.com](https://docs.docker.com/get-started/get-docker/). On a Linux server you can install **Docker Engine** on its own instead. Note that Docker Desktop requires a paid subscription for commercial use in larger companies (the docs set the line at more than 250 employees or more than $10 million in annual revenue), and it's free for personal use and small businesses.

Then check:

```bash
docker --version
docker compose version
docker run hello-world
```

The last command downloads a tiny image, runs it, prints a welcome message and exits. If you see the message, Docker works.

## Your first container

Let's run a web server without installing one:

```bash
docker run -d --name web -p 8080:80 nginx
```

Open `http://localhost:8080` and you'll see the nginx welcome page. What the command said:

- `docker run` creates a container from an image and starts it. If the image isn't on your computer yet, Docker downloads it from Docker Hub first.
- `-d` (*detached*) runs it in the background.
- `--name web` gives it a name, so you don't have to use the random ID.
- `-p 8080:80` forwards port 8080 on your computer to port 80 inside the container.
- `nginx` is the image.

Now look at it:

```bash
docker ps                 # running containers
docker ps -a              # all containers, including stopped ones
docker logs web           # what it printed (add -f to follow)
docker exec -it web sh    # open a shell inside it; type exit to leave
docker stop web           # stop it
docker start web          # start the same container again
docker rm web             # delete it (stop first, or use rm -f)
```

A container lives as long as its main process. `hello-world` prints its message and the process ends, so the container stops. `nginx` keeps running until you stop it. If a container you start "exits immediately", the process inside finished or crashed: check `docker logs`.

Some `docker run` flags you'll use all the time:

| Flag | What it does |
|---|---|
| `-d` | run in the background |
| `-it` | interactive terminal, for shells (`docker run -it ubuntu bash`) |
| `--rm` | delete the container automatically when it exits |
| `--name <name>` | choose the container's name |
| `-p host:container` | publish a port |
| `-e KEY=value` | set an environment variable |
| `-v name:/path` | mount a volume |

`docker run --rm -it ubuntu bash` is a nice throwaway Linux: you get a shell, and the container disappears when you exit.

## Images and tags

```bash
docker pull node:24-slim     # download an image
docker images                # list local images
docker rmi node:24-slim      # remove one
```

An image name looks like `node:24-slim`: the name, a colon, and a **tag** that usually encodes a version and a flavor. A few habits:

- Tags can move. `latest` is just a tag and means "whatever the publisher tagged last", not "the newest" or "the best". Use a specific version in anything you want to reproduce.
- For full reproducibility you can pin a **digest** (`image@sha256:...`), which names exact content. It never changes, but you update it by hand (or let a tool such as Dependabot do it).
- Prefer **Docker Official Images** and verified publishers on Docker Hub, and small variants (`-slim`, `alpine`) when they work for you.

## Our app, in a container

We need something to containerize. Create a folder `hello-app` with a tiny Node server:

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

Run `npm install` once so a `package-lock.json` exists (we'll need it). Now the **Dockerfile**: a text file of instructions, each of which becomes a layer of the image. Save it as `Dockerfile` (no extension):

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

Line by line:

- `FROM node:24-slim` starts from a base image that already has Node. Every Dockerfile starts with `FROM`.
- `WORKDIR /app` sets the working directory for the following instructions, and creates it.
- `COPY package*.json ./` copies only the package files first. Hold that thought, it matters in a minute.
- `RUN npm ci --omit=dev` runs a command at *build time* and saves the result as a layer. Here it installs dependencies.
- `COPY . .` copies the rest of your project into the image.
- `USER node` runs the app as the unprivileged `node` user that the Node images include, not as root.
- `EXPOSE 3000` *documents* that the app listens on 3000. It does not publish anything (more on that below).
- `CMD ["node", "server.js"]` is the default command when a container starts.

Add a `.dockerignore` next to it, so junk never enters the build:

```plain text
node_modules
.git
.env
*.md
```

The patterns work like a `.gitignore`. Keeping `node_modules` out matters because the image installs its own, and `.env` out because secrets don't belong in images.

Build and run:

```bash
docker build -t hello-app .
docker run -d --name hello -p 3000:3000 hello-app
curl localhost:3000
```

```plain text
Hello from a container
```

`-t hello-app` names (tags) the image, and the `.` is the **build context**: the folder whose files the build may copy from. You just packaged an app. Anyone with Docker can run the same two commands and get the same result, without installing Node.

### Layers and the build cache

Each Dockerfile instruction creates a **layer**, and an image is a stack of them. Docker caches layers: if an instruction and everything it depends on is unchanged, it reuses the layer instead of running it again. But once one layer changes, every layer after it is rebuilt.

![A stack of layers for the Dockerfile: FROM node:24-slim, WORKDIR /app, COPY package files, RUN npm ci, COPY of the source, and a thin read-write container layer on top. The four lowest layers are marked cached and the COPY of the source is marked rebuilt.](/images/docker-zero-to-hero/image-layers.svg)

That explains the order in our Dockerfile. You edit source files all day, but dependencies change rarely. By copying `package*.json` and installing *before* copying the source, an edit to `server.js` rebuilds only the last `COPY`, and the slow `npm ci` comes from cache. Reverse the order and every tiny edit reinstalls everything.

The rule: **put what changes rarely at the top and what changes often at the bottom.**

Containers add one more thing: a thin read-write layer on top of the image. Whatever a container writes goes there, and it's deleted with the container. That is why data needs volumes (below).

Another cache trap on Debian-based images: do `apt-get update` and `apt-get install` in the same `RUN`, so a stale package list isn't reused from the cache, and clean up in the same line to keep the layer small:

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

The first stage has Node and every dev dependency. The final image is just nginx plus the built files, and the build stage is thrown away. (The output folder, `dist` here, depends on your project.) This is the standard way to ship a front-end app like the one this blog is built with.

### Two ways to write the start command

`CMD` sets the default command, and `ENTRYPOINT` sets the executable that always runs, with `CMD` supplying default arguments:

```dockerfile
ENTRYPOINT ["s3cmd"]
CMD ["--help"]
```

Then `docker run image` runs `s3cmd --help`, and `docker run image ls s3://bucket` runs `s3cmd ls s3://bucket`. Always use the **exec form**, the JSON array (`["node", "server.js"]`), rather than a plain string: it runs your program directly as the container's main process, so it receives signals like the stop request. With the shell form, a shell sits in between and may swallow them.

## Ports

A container has its own network. By default nothing from outside can reach it, so you **publish** a port with `-p HOST:CONTAINER`:

```bash
docker run -d -p 8080:80 nginx                 # host 8080 -> container 80
docker run -d -p 127.0.0.1:8080:80 nginx       # reachable from this computer only
docker run -d -p 80 nginx                      # Docker picks a free host port (see docker ps)
docker run -d -P nginx                         # publish every EXPOSEd port to random host ports
```

![Your browser reaches the web container through port 8080 on the host mapped to 3000 in the container. The web and db containers share a user-defined network, so web reaches the database by name on port 5432. The database port is not published, so nothing outside can reach it.](/images/docker-zero-to-hero/ports-and-networks.svg)

Two things to remember. By default a published port listens on *all* of your computer's network interfaces, so anyone who can reach your machine can reach the app. For databases and other sensitive services, either don't publish at all or bind to `127.0.0.1` as above. And `EXPOSE` in a Dockerfile is only documentation: it publishes nothing. Only `-p` or `-P` open a port to the outside.

## Data: volumes and bind mounts

A container's own filesystem disappears with the container. For data that must survive (a database, uploads), mount something from outside. There are three kinds:

![Three sources feeding a container: a volume managed by Docker that survives removing the container, a bind mount that is a folder on your computer you can edit live, and a tmpfs mount kept in memory and gone when the container stops.](/images/docker-zero-to-hero/storage-options.svg)

- A **volume** is storage managed by Docker. It's the preferred way to persist data: easy to back up or move, and safe to share between containers.
- A **bind mount** maps a folder from your computer into the container. Use it when you need to reach the same files from both sides, for example to edit code live during development.
- A **tmpfs** mount lives in memory and is never written to disk. Good for temporary, sensitive state.

```bash
docker volume create pgdata
docker run -d --name db -e POSTGRES_PASSWORD=dev-only -v pgdata:/var/lib/postgresql/data postgres:17
docker run --rm -it -v "$(pwd)":/app -w /app node:24-slim sh    # bind mount: your folder, live
docker run -d -v pgdata:/data:ro nginx                         # read-only volume
```

Remove the `db` container and start a new one with the same `-v pgdata:...`, and the data is still there. (The data path inside an image is image-specific, and it has changed between some major versions of the Postgres image, so check the image's page on Docker Hub for the right one.)

`-v` is the short form. `--mount` is more explicit, and is the one you need for advanced options:

```bash
docker run -d --name devtest --mount source=myvol,target=/app nginx
```

Volumes are not deleted automatically when a container is removed. Clean up yourself:

```bash
docker volume ls
docker volume rm pgdata
docker volume prune       # removes unused volumes
```

## Networks: containers talking to each other

Containers on the same **user-defined network** find each other *by name*. Docker runs a small DNS server for that. On the built-in default bridge network, containers can reach each other only by IP address, so for anything real you create your own network:

```bash
docker network create app-net
docker run -d --name db --network app-net -e POSTGRES_PASSWORD=dev-only postgres:17
docker run -d --name web --network app-net -p 8080:3000 -e DATABASE_URL=postgres://postgres:dev-only@db:5432/postgres hello-app
```

Inside `web`, the host name `db` now resolves to the database container. Note that the database never got a `-p`: it doesn't need to be reachable from your computer, only from `web`. Ports on a network are open between its containers, and become reachable from outside only when published.

Other drivers exist for special cases: `--network host` removes the isolation and shares the host's network, and `--network none` cuts the container off completely.

## Configuration and secrets

Pass settings as environment variables, not by baking them into the image:

```bash
docker run -e LOG_LEVEL=debug hello-app
docker run --env-file .env hello-app
```

One warning from Docker's own docs: don't use environment variables for sensitive data such as passwords in anything real. They show up in `docker inspect` and can leak. Use secrets (Compose and Swarm both support them) or your platform's secret store. For local development, `dev-only` style passwords like the ones above are fine. And never `COPY` a `.env` file or a key into an image: anyone who can pull the image can read it, and a layer you "deleted" later is still in the image's history.

## Docker Compose: the whole app in one file

Typing those `docker run` lines gets old. **Docker Compose** describes a multi-container app in one file and runs it with one command. Its building blocks are **services** (the containers), **networks** and **volumes**. Create `compose.yaml` (Compose looks for that name first):

```yaml
services:
  web:
    build: .
    ports:
      - "8080:3000"
    environment:
      DATABASE_URL: postgres://postgres:dev-only@db:5432/postgres
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: dev-only
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

Read it like a sentence: *a `web` service built from this folder, published on 8080, which waits for a `db` service made from the Postgres image, whose data lives in a volume called `pgdata`.* Compose also puts both services on a shared network automatically, so `web` reaches the database as `db`. (Our tiny server doesn't read `DATABASE_URL` yet; it's there to show the wiring.)

The `healthcheck` plus `condition: service_healthy` is the part people miss. A plain `depends_on` only controls start order: Compose considers a dependency ready as soon as its container is *running*, not when the software inside accepts connections. A database can take seconds to initialize, so the health check is what makes `web` wait for real.

The commands you need:

```bash
docker compose up -d            # build if needed, create networks and volumes, start everything
docker compose ps               # services and their ports
docker compose logs -f web      # follow one service's logs
docker compose up -d --build    # rebuild images after changing code
docker compose down             # stop and remove the containers and the network
docker compose down -v          # ...and also the named volumes (this deletes your data)
```

Note the space: `docker compose` is the current command, built into Docker. The older standalone `docker-compose` is the previous generation.

To keep configuration out of the file, use `environment` (as above) or `env_file`:

```yaml
services:
  web:
    env_file:
      - path: ./defaults.env
      - path: ./overrides.env
        required: false
```

Later files override earlier ones, and `required: false` skips a missing file. For a one-off value, `docker compose run -e LOG_LEVEL=debug web` overrides it just for that run.

## Debugging toolbox

When something misbehaves, go from outside in:

```bash
docker ps -a                       # is it running? did it exit?
docker logs --tail 50 <name>       # what did it say before it died?
docker exec -it <name> sh          # look around inside
docker inspect <name>              # full details: IP, mounts, env, exit code
docker stats                       # live CPU and memory per container
docker cp <name>:/app/file.txt .   # copy a file out of a container
```

The usual suspects: the app listens on `127.0.0.1` inside the container instead of `0.0.0.0` (so the published port can't reach it), a port already used on the host, a missing environment variable, a file missing because `.dockerignore` excluded it, or a path that differs between your computer and the container.

## Cleaning up

Docker is generous with disk space. Old images, stopped containers and build cache pile up:

```bash
docker system df              # what is using space
docker system prune           # remove stopped containers, unused networks, dangling images, unused build cache
docker system prune -a        # ...and every image no container uses
docker builder prune          # only the build cache
```

`docker system prune` asks for confirmation, and by default does **not** touch volumes, so your data is safe. Adding `--volumes` also removes unused anonymous volumes, so read the warning before you say yes.

## Making images small and safe

- **Small base images.** Start from a trusted, minimal image (`-slim`, `alpine`) and use multi-stage builds so build tools never reach production.
- **One concern per container.** A web app and its database are two containers, not one.
- **Don't run as root.** Add `USER` (the Node images ship a `node` user). If an attacker gets into the container, they get fewer rights.
- **Order for the cache.** Dependencies first, source last.
- **Keep a `.dockerignore`.** Faster builds, smaller context, no accidental secrets.
- **Pin versions** of base images (and digests when you need exactness), and rebuild regularly to pick up security fixes.
- **No secrets in images or Dockerfiles.** Not as `ENV`, not as a copied file.
- **Scan your images** for known vulnerabilities with a scanner in CI, and update the base image when it reports a fix.
- **One process, in the foreground.** The container's main process is the container. Log to the standard output and read it with `docker logs`.

## The cheat sheet

| I want to... | Command |
|---|---|
| Run something and remove it afterward | `docker run --rm -it <image> sh` |
| Start a container in the background with a port | `docker run -d --name <n> -p 8080:80 <image>` |
| List containers | `docker ps` (`-a` for all) |
| See logs / follow them | `docker logs <n>` / `docker logs -f <n>` |
| Open a shell inside | `docker exec -it <n> sh` |
| Stop / start / delete | `docker stop <n>` / `docker start <n>` / `docker rm <n>` |
| Build an image | `docker build -t <name> .` |
| List / delete images | `docker images` / `docker rmi <image>` |
| Create a volume | `docker volume create <name>` |
| Create a network | `docker network create <name>` |
| Start a Compose app | `docker compose up -d` |
| Stop it (keep data) | `docker compose down` |
| Free disk space | `docker system prune` |

## Glossary

- **Image:** a read-only template (app + dependencies) that containers are started from.
- **Container:** a running, isolated instance of an image.
- **Dockerfile:** the text file of instructions that builds an image.
- **Layer:** one step of an image, cached and reused.
- **Build context:** the folder whose files `docker build` may copy from.
- **Registry / Docker Hub:** where images are stored and shared.
- **Tag / digest:** a human-friendly version label / an exact content fingerprint.
- **Volume:** Docker-managed storage that outlives containers.
- **Bind mount:** a host folder mounted into a container.
- **Network:** a virtual LAN between containers; user-defined ones give name lookup.
- **Publish a port (`-p`):** forward a host port to a container port.
- **Compose:** a tool that runs a multi-container app from `compose.yaml`.
- **Service:** one container definition in a Compose file.
- **Multi-stage build:** building in one stage and shipping only the result.
- **Daemon:** the background process (`dockerd`) that does the work.

## Where to go next

You now know the whole picture: an image is built from a Dockerfile, a container is a running image, ports, volumes and networks connect it to the world, and Compose describes a whole app in one file. To make it stick, containerize something you already have: write a Dockerfile, add a `.dockerignore`, and run it with Compose next to its database.

A natural next step is to let robots do it: build and push your image automatically on every merge with a GitHub Actions workflow. See [GitHub from zero to hero](en/posts/github-zero-to-hero/) for the Actions basics, and [Git from zero to hero](en/posts/git-zero-to-hero/) if version control is still new. Docker's own [Get started guide](https://docs.docker.com/get-started/) and the [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/) are the best next reading.

To run containers in the cloud, start with the map in [AWS from zero to hero](en/posts/aws-zero-to-hero/). And if the commands you type inside a container are the unfamiliar part, the [Linux commands cheat sheet](en/posts/linux-commands/) has them.
