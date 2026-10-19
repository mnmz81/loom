---
title: "Docker from zero to hero: images, containers and your first run"
summary: "What Docker is, images, containers and registries, how containers differ from VMs, installing it, running and managing your first container, and image tags."
date: 2026-10-10
updated: 2026-10-19
tags: [docker, containers]
series: { key: devops, order: 11 }
---

"It works on my machine" is the oldest sentence in software. Docker mostly retires it: you package your app together with everything it needs, and then it runs the same way on your laptop, on a teammate's laptop and on a server. Over four posts we containerize one small web app, adding each idea when the app needs it; this one covers the vocabulary and running other people's images.

## What Docker is

Docker is an open platform for developing, shipping and running applications. It packs an app into a **container**: an isolated environment that holds the app and what it needs to run, so it doesn't depend on whatever is installed on the host.

Three words carry most of the vocabulary:

- An **image** is a read-only template: your app plus its runtime, libraries and files. You *build* it once.
- A **container** is a running instance of an image. You can start, stop and delete containers as often as you like, and one image can start many of them.
- A **registry** stores images. **Docker Hub** is the public one Docker uses by default, and you can run a private one.

![A Dockerfile is built into an image with docker build. docker run starts one or more containers from the image. An image can be pushed to a registry such as Docker Hub with docker push and downloaded with docker pull.](/images/docker-zero-to-hero/image-to-container.svg)

Behind the scenes Docker has two parts: the **daemon** (`dockerd`), which manages images, containers, networks and volumes, and the **client** (`docker`), the command you type, which sends your command to the daemon. Docker Compose is another client, for apps made of several containers.

### Containers are not virtual machines

A virtual machine carries a whole guest operating system with its own kernel. A container is an isolated process that shares the host's kernel, using Linux features such as namespaces for the isolation. That's why containers start in moments and take far less space, so you can run more of them on the same hardware.

![Left: a virtual machine stack with hardware, a host OS with a hypervisor, and two virtual machines, each with its own guest OS, libraries and app. Right: a container stack with hardware, a host OS, the Docker Engine, and three containers that hold only libraries and an app and share the host kernel.](/images/docker-zero-to-hero/containers-vs-vms.svg)

The flip side: a container is not a separate machine, so its isolation is weaker than a VM's. (On Mac and Windows, Docker Desktop quietly runs a small Linux VM, because containers need a Linux kernel.)

## Install and check it works

The easiest route is **Docker Desktop** (Mac, Windows and Linux), from [docker.com](https://docs.docker.com/get-started/get-docker/). On a Linux server you can install **Docker Engine** alone. Docker Desktop needs a paid subscription in larger companies (over 250 employees or $10 million in revenue) and is free for personal use and small businesses.

```bash
docker --version
docker compose version
docker run hello-world
```

The last command downloads a tiny image, runs it, prints a welcome message and exits. If you see the message, Docker works.

## Your first container

A web server, without installing one:

```bash
docker run -d --name web -p 8080:80 nginx
```

Open `http://localhost:8080` and you'll see the nginx welcome page.

- `docker run` creates a container from an image and starts it. If the image isn't on your computer yet, Docker downloads it from Docker Hub first.
- `-d` (*detached*) runs it in the background.
- `--name web` gives it a name, so you don't have to use the random ID.
- `-p 8080:80` forwards port 8080 on your computer to port 80 inside the container.
- `nginx` is the image.

Managing it:

```bash
docker ps                 # running containers
docker ps -a              # all containers, including stopped ones
docker logs web           # what it printed (add -f to follow)
docker exec -it web sh    # open a shell inside it; type exit to leave
docker stop web           # stop it
docker start web          # start the same container again
docker rm web             # delete it (stop first, or use rm -f)
```

A container lives as long as its main process. `hello-world` prints its message and stops; `nginx` runs until you stop it. If a container "exits immediately", its process finished or crashed: check `docker logs`.

The `docker run` flags you'll use all the time:

| Flag | What it does |
|---|---|
| `-d` | run in the background |
| `-it` | interactive terminal, for shells |
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

- Tags can move. `latest` just means "whatever the publisher tagged last", not "the newest". Use a specific version for anything reproducible.
- To be exact, pin a **digest** (`image@sha256:...`). It never changes, but you update it by hand (or with a tool such as Dependabot).
- Prefer **Docker Official Images**, verified publishers, and small variants (`-slim`, `alpine`).
