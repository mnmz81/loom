---
title: "Linux commands: processes, services, disk, network and SSH"
summary: "My Linux cheat sheet, part 3: processes, systemd and journalctl, disk and memory, networking, SSH and rsync, installing packages."
date: 2026-10-10
updated: 2026-10-19
tags: [linux, cli, cheatsheet]
series: { key: linux-commands, order: 3 }
---

Commands for running a Linux server; connecting to one in the cloud is covered in [AWS from zero to hero](en/posts/aws-zero-to-hero/). Examples assume **GNU/Linux** with a Bash-like shell; macOS differences are noted. Anything marked ⚠️ can destroy data: run the harmless version first (`rsync -n`) and look.

## Processes

- `ps aux` lists every process with its owner, CPU and memory use, and `ps -ef` adds parent process IDs. `ps aux --sort=-%mem | head` shows the biggest memory users on GNU/Linux.
- `pgrep -af <name>` finds processes by name and prints their command lines.
- `top` is the live view of what's busy: press `q` to quit, `M` to sort by memory and `P` by CPU. `htop` is a nicer version you usually install yourself.
- `kill <pid>` asks a process to stop politely (SIGTERM). `kill -9 <pid>` forces it with SIGKILL, with no chance to clean up, so use it only when the polite way failed ⚠️. `pkill <name>` and `killall <name>` do the same by name, so check that the pattern doesn't match more than you meant.
- `jobs`, `fg` and `bg` manage jobs in your shell: `Ctrl-Z` suspends the running command, `bg` continues it in the background, `fg` brings it back. End a command with `&` to start it in the background.
- `nohup <command> &` keeps a command running after you log out. For anything long-lived, a service (below) or `tmux`/`screen` is better.
- `lsof -i :8080` shows what is using a port, and `lsof <file>` shows who has a file open.

## Services and logs (systemd)

Most modern Linux distributions manage services with **systemd** ([docs](https://systemd.io/)). (Not on a Mac, and usually not inside a container.)

- `systemctl status <service>` shows whether a service is running and its latest log lines.
- `sudo systemctl start|stop|restart|reload <service>` controls it now; `reload` re-reads the configuration without a full restart, if supported.
- `sudo systemctl enable <service>` starts it at boot, `disable` turns that off, and `enable --now` also starts it immediately.
- `systemctl list-units --type=service` lists the services, and `systemctl --failed` lists the ones that failed.
- `sudo systemctl daemon-reload` makes systemd re-read unit files after you edit them.

`journalctl` reads the logs systemd collects:

```bash
journalctl -u nginx                   # logs of one service
journalctl -u nginx -f                # follow them live
journalctl -u nginx -n 100            # the last 100 lines
journalctl -b                         # everything since this boot (-b -1 = the previous boot)
journalctl --since "1 hour ago"       # a time window (also --until)
journalctl -p err                     # only errors and worse
journalctl -k                         # kernel messages, like dmesg
journalctl --disk-usage               # how much space the journal takes
```

Plain log files still live in `/var/log` for many programs: `tail -f /var/log/syslog` (Debian and Ubuntu) or `/var/log/messages` (Red Hat family).

## Disk and memory

- `df -h` shows free space per filesystem. A full disk is the cause of a surprising number of "it just stopped working" incidents.
- `du -sh <dir>` shows a directory's total size, and `du -h -d 1 . | sort -h` shows each folder one level down, smallest first, so the culprit is at the bottom. (`sort -h` is a GNU option.)
- `ncdu` is an interactive disk-usage browser, installed separately: the quickest way to find what filled the disk.
- `free -h` shows memory and swap. Read the "available" column, not "free": Linux uses spare memory as cache.
- `uptime` shows how long the machine has been up and the load averages, and `lsblk` lists disks and partitions.
- `mount | grep <path>` and `findmnt` show what's mounted where.
- `dd` writes raw bytes to a device ⚠️: point it at the wrong one and it overwrites a whole disk.

## Networking

- `ip addr` (short: `ip a`) shows the machine's addresses, and `ip route` shows the routing table. These replaced the older `ifconfig` and `route`.
- `ss -tulpn` lists listening sockets: `-t` TCP, `-u` UDP, `-l` listening only, `-p` the owning process, `-n` numbers instead of names (use `sudo` to see other users' processes). `ss -s` prints a summary, and `ss -tn 'sport = :80'` narrows it to one port. (`netstat` is the old tool.)
- `ping -c 4 <host>` checks that a host answers (`-c` limits the count, otherwise it runs forever).
- `curl <url>` fetches a URL. The flags worth knowing: `-I` headers only, `-s` silent, `-L` follow redirects, `-o <file>` save to a file, `-f` fail on HTTP errors, `-X POST -d '{"a":1}' -H 'Content-Type: application/json'` to send data. `curl -fsSL <url> -o file` is the reliable download. `wget <url>` also downloads.
- `dig <domain> +short` (or `nslookup`) looks up DNS records, and `dig <domain> MX` asks for a specific type.
- `nc -zv <host> <port>` tests whether a TCP port is reachable.
- `traceroute <host>` shows the hops along the way (it may need installing).
- `curl -fsSL <url> | sh` runs a script straight from the internet ⚠️. Download it, read it, and then run it.

## SSH and copying files

```bash
ssh user@host                          # log in
ssh -i ~/.ssh/key.pem user@host        # with a specific key
ssh -p 2222 user@host                  # a different port
ssh user@host 'df -h'                  # run one command and come back
ssh-keygen -t ed25519 -C "me@laptop"   # create a key pair
ssh-copy-id user@host                  # install your public key on the server
scp file.txt user@host:/tmp/           # copy a file to the server
scp user@host:/var/log/app.log .       # copy a file from the server
rsync -avzP ./site/ user@host:/var/www/site/   # sync a folder, resumable, with progress
rsync -avzn --delete ./site/ user@host:/var/www/site/   # dry run (-n) of a mirror
```

- Private keys must be private: `chmod 600 ~/.ssh/key.pem`, or SSH refuses to use them.
- `~/.ssh/config` lets you give a server a short name, so `ssh myserver` replaces the long line.
- `rsync` is the better copy tool: it transfers only what changed. The **trailing slash** matters: `site/` copies the folder's *contents*, `site` copies the folder itself. `--delete` removes destination files missing from the source ⚠️, so dry-run (`-n`) first.

## Installing software

The command depends on the distribution:

```bash
sudo apt update && sudo apt install -y curl   # Debian, Ubuntu
sudo dnf install curl                         # Fedora, RHEL and relatives
sudo apk add curl                             # Alpine (common in containers)
sudo pacman -S curl                           # Arch
```

- On Debian and Ubuntu, `apt update` refreshes the package list and `apt upgrade` installs available updates. `apt search <word>` finds packages, `apt remove <pkg>` uninstalls, and `dpkg -l | grep <word>` shows what's installed.
- `cat /etc/os-release` tells you which distribution and version you're on, so you pick the right line above.
