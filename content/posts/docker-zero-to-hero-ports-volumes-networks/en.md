---
title: "Docker from zero to hero: ports, volumes and networks"
summary: "Connecting containers to the world: publishing ports safely, volumes, bind mounts and tmpfs, user-defined networks for containers that talk by name, and passing configuration and secrets."
date: 2026-10-10
tags: [docker, containers]
series: { key: devops, order: 13 }
---

The `hello-app` image from [the Dockerfile part](en/posts/docker-zero-to-hero-dockerfile/) runs on its own. Here it gets a reachable port, data that outlives the container, and a Postgres database next to it.

## Ports

A container has its own network. By default nothing from outside can reach it, so you **publish** a port with `-p HOST:CONTAINER`:

```bash
docker run -d -p 8080:80 nginx                 # host 8080 -> container 80
docker run -d -p 127.0.0.1:8080:80 nginx       # reachable from this computer only
docker run -d -p 80 nginx                      # Docker picks a free host port (see docker ps)
docker run -d -P nginx                         # publish every EXPOSEd port to random host ports
```

![Your browser reaches the web container through port 8080 on the host mapped to 3000 in the container. The web and db containers share a user-defined network, so web reaches the database by name on port 5432. The database port is not published, so nothing outside can reach it.](/images/docker-zero-to-hero/ports-and-networks.svg)

A published port listens on *all* network interfaces by default, so anyone who can reach your machine can reach the app. For databases and other sensitive services, don't publish, or bind to `127.0.0.1` as above. And `EXPOSE` is only documentation: only `-p` or `-P` open a port.

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

Remove the `db` container and start a new one with the same `-v pgdata:...`, and the data is still there. (The data path is image-specific and has changed between Postgres image versions, so check the image's Docker Hub page.)

`-v` is the short form; `--mount` is more explicit and needed for advanced options:

```bash
docker run -d --name devtest --mount source=myvol,target=/app nginx
```

Removing a container doesn't delete its volumes:

```bash
docker volume ls
docker volume rm pgdata
docker volume prune       # removes unused volumes
```

## Networks: containers talking to each other

Containers on the same **user-defined network** find each other *by name*: Docker runs a small DNS server for that. On the built-in default bridge network, containers can reach each other only by IP address, so for anything real you create your own network:

```bash
docker network create app-net
docker run -d --name db --network app-net -e POSTGRES_PASSWORD=dev-only postgres:17
docker run -d --name web --network app-net -p 8080:3000 -e DATABASE_URL=postgres://postgres:dev-only@db:5432/postgres hello-app
```

Inside `web`, the name `db` now resolves to the database container. The database never got a `-p`: only `web` needs to reach it. Ports are open between a network's containers, and reachable from outside only when published.

Special cases: `--network host` shares the host's network, and `--network none` cuts the container off completely.

## Configuration and secrets

Pass settings as environment variables, not by baking them into the image:

```bash
docker run -e LOG_LEVEL=debug hello-app
docker run --env-file .env hello-app
```

Docker's own docs warn against environment variables for real passwords: they show up in `docker inspect` and can leak. Use secrets (Compose and Swarm support them) or your platform's secret store. `dev-only` passwords like the ones above are fine locally. Never `COPY` a `.env` file or key into an image: anyone who can pull it can read it, and a layer you "deleted" later is still in the history.
