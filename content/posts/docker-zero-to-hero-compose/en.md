---
title: "Docker from zero to hero: Compose, debugging and cleanup"
summary: "Running the app and its database from one compose.yaml with health checks, the Compose commands, a debugging toolbox, freeing disk space, and habits for production images."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 14 }
---

[The previous part](en/posts/docker-zero-to-hero-ports-volumes-networks/) wired `hello-app` to Postgres with a network, a volume and three long `docker run` lines. Compose replaces those lines with one file.

## Docker Compose: the whole app in one file

**Docker Compose** describes a multi-container app in one file and runs it with one command. Its building blocks are **services** (the containers), **networks** and **volumes**. Create `compose.yaml` (Compose looks for that name first):

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

Compose puts both services on a shared network, so `web` reaches the database as `db`. (Our tiny server doesn't read `DATABASE_URL`; it just shows the wiring.)

People miss `healthcheck` plus `condition: service_healthy`. A plain `depends_on` only controls start order: a dependency counts as ready once its container is *running*, not when the software inside accepts connections. A database can take seconds to initialize, so the health check makes `web` really wait.

The commands you need:

```bash
docker compose up -d            # build if needed, create networks and volumes, start everything
docker compose ps               # services and their ports
docker compose logs -f web      # follow one service's logs
docker compose up -d --build    # rebuild images after changing code
docker compose down             # stop and remove the containers and the network
docker compose down -v          # ...and also the named volumes (this deletes your data)
```

Note the space: `docker compose` is the current command; the standalone `docker-compose` is the previous generation.

To keep configuration out of the file, use `env_file`:

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

Old images, stopped containers and build cache pile up:

```bash
docker system df              # what is using space
docker system prune           # remove stopped containers, unused networks, dangling images, unused build cache
docker system prune -a        # ...and every image no container uses
docker builder prune          # only the build cache
```

`docker system prune` asks for confirmation and does **not** touch volumes by default. `--volumes` also removes unused anonymous volumes, so read the warning first.

## Habits for production images

On top of a slim base, a multi-stage build, `USER`, a cache-friendly order, a `.dockerignore` and no secrets in the image:

- **One concern per container.** A web app and its database are two containers.
- **Pin base image versions and rebuild regularly** for security fixes.
- **Scan your images** for known vulnerabilities in CI.
- **One process, in the foreground,** logging to standard output for `docker logs`.

## Where to go next

To make it stick, containerize something you already have, with a Dockerfile, a `.dockerignore`, and Compose next to its database.

Next, build and push your image automatically on every merge: [GitHub Actions from zero to hero](en/posts/github-actions-zero-to-hero/) builds that pipeline, [GitHub from zero to hero](en/posts/github-zero-to-hero/) covers the repository side, and [Git from zero to hero](en/posts/git-zero-to-hero/) is there if version control is new. Docker's [Get started guide](https://docs.docker.com/get-started/) and [Dockerfile best practices](https://docs.docker.com/build/building/best-practices/) are the best further reading.

To run many containers across several machines, with self-healing and zero-downtime updates, continue with [Kubernetes from zero to hero](en/posts/kubernetes-zero-to-hero/). To run containers in the cloud, start with the map in [AWS from zero to hero](en/posts/aws-zero-to-hero/). And if the commands you type inside a container are the unfamiliar part, the [Linux commands cheat sheet](en/posts/linux-commands/) has them.
