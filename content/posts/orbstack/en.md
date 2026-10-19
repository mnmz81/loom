---
title: "OrbStack: Docker and Linux on a Mac, without the heaviness"
summary: "Install OrbStack, use the normal docker command, open containers at name.orb.local, run Linux machines with orb, and check the setup with orbctl doctor."
date: 2026-10-19
tags: [docker, containers, macos, dev-tools]
series: { key: mac-dev-setup, order: 5 }
---

Docker needs Linux, and a Mac has none, so something has to run a small Linux VM for you. [OrbStack](https://orbstack.dev/) is an app that does that, as a replacement for Docker Desktop. Homebrew describes it the same way. Checked with OrbStack 2.2 against its [docs](https://docs.orbstack.dev/). Licensing differs between personal and commercial use, so check the site before using it at work.

## Install

```bash
brew install --cask orbstack
orbctl start
```

Open the app once so it finishes setup. `orbctl status` prints `Running` when the engine is up. In the settings you can start it at login (`app.start_at_login`, off by default).

## Your docker commands do not change

OrbStack installs the `docker` CLI and points a Docker context at its own engine:

```bash
docker context ls
```

```text
NAME         DESCRIPTION   DOCKER ENDPOINT
orbstack *   OrbStack      unix:///Users/<you>/.orbstack/run/docker.sock
```

Everything from [Docker from zero to hero](en/posts/docker-zero-to-hero/) works as is: `docker run`, `docker build`, `docker compose`. If you switch contexts, `docker context use orbstack` brings it back.

## Containers get a domain name

Every container is reachable at `<name>.orb.local`, with no port mapping:

```bash
docker run -d --rm --name web nginx:alpine
curl -s -o /dev/null -w "%{http_code}\n" http://web.orb.local
```

```text
200
```

You can still publish ports with `-p` as usual. By default published ports are reachable from your local network too (`docker.expose_ports_to_lan: true` in `orbctl config show`), so turn that off if you work on a shared network.

## Linux machines

For a full Linux, not just a container, create a machine:

```bash
orbctl create ubuntu dev
orb -m dev uname -a
orbctl list
```

`orb` with no arguments opens a shell in your default machine. Prefix any command with `orb` and it runs on Linux, with your macOS files available at the same paths.

## Check and stop

```bash
orbctl doctor
orbctl stop
```

`orbctl doctor` checks that `docker`, `docker-compose` and `kubectl` are found and that nothing else on your `PATH` takes over. `orbctl stop` with no arguments stops the whole service, Docker included.

Next: [pre-commit](en/posts/pre-commit/).
