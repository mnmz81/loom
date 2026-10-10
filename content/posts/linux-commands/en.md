---
title: "Linux commands: my cheat sheet"
summary: "The Linux commands worth knowing by heart, grouped by task: files, searching, text, permissions, processes, services and logs, disk, networking, archives, packages, SSH and shell tricks."
date: 2026-10-10
tags: [linux, cli, cheatsheet]
---

Sooner or later every developer ends up in a terminal on a Linux server: a cloud machine, a container, a CI job. This is the list of commands I reach for there, grouped by what you're trying to do, with the flags that matter and the traps around them. Anything marked ⚠️ can destroy data, so read it twice before running it.

A few notes first:

- Examples assume **GNU/Linux** with a Bash-like shell (Ubuntu, Debian, Fedora and so on). On a Mac the commands come from BSD and differ in details. Where it matters I say so (`sed -i`, `ps`, `ss`, `journalctl`, `systemctl` don't work the same way there, or don't exist).
- Linux is case-sensitive: `File.txt` and `file.txt` are different files.
- When unsure, ask the machine: `man <command>` opens the manual, and `<command> --help` prints a short summary.

For where this fits in a bigger picture, see [AWS from zero to hero](en/posts/aws-zero-to-hero/) (connecting to a cloud server) and [Docker from zero to hero](en/posts/docker-zero-to-hero/) (a throwaway Linux in one command: `docker run --rm -it ubuntu bash`).

## Getting help

- `man <command>` opens the manual page. Use `/word` to search inside it, `n` for the next match, and `q` to quit.
- `<command> --help` prints a short usage summary, and is often enough.
- `man -k <word>` (or `apropos <word>`) searches manual pages by keyword when you don't know the command's name.
- `type <command>` shows whether something is a program, a shell built-in or an alias, and `which <command>` shows the path of the program that would run.

## Where am I, and moving around

- `pwd` prints the current directory, and `cd <dir>` changes it. `cd` alone goes home, `cd -` jumps back to the previous directory, and `cd ..` goes up one level.
- `ls` lists files. `ls -l` is the long format, `ls -a` includes hidden files (names starting with a dot), `ls -h` makes sizes human-readable, and they combine: `ls -lah`. Add `-t` to sort by modification time and `-S` by size.
- `~` means your home directory, `.` is the current directory and `..` is its parent.
- Press **Tab** to complete names and **Tab Tab** to list the options. It saves more typos than any command here.

## Working with files and folders

- `touch <file>` creates an empty file, or updates the modification time of an existing one.
- `mkdir <dir>` creates a directory, and `mkdir -p a/b/c` creates the whole path (no error if it already exists).
- `cp <src> <dst>` copies a file, `cp -r <dir> <dst>` copies a directory, and `cp -a` copies and preserves permissions and times.
- `mv <src> <dst>` moves or renames. It silently overwrites an existing destination: add `-i` to be asked first, or `-n` to never overwrite.
- `rm <file>` deletes a file. `rm -r <dir>` deletes a directory and everything in it, and `rm -rf <dir>` does it without asking ⚠️. There is no trash can: deleted means gone. Read the path twice, and be extra careful with variables (`rm -rf "$DIR/"` when `$DIR` is empty is the classic disaster).
- `ln -s <target> <link>` creates a symbolic link (a pointer to a path). Without `-s` it makes a hard link.
- `file <name>` tells what kind of file it is, and `stat <file>` shows size, permissions, owner and timestamps.
- Quote names with spaces: `cp "My File.txt" backup/`.

## Looking at files

- `cat <file>` prints a file, and `cat a b > c` joins files.
- `less <file>` is the viewer for long files: arrows or `Space` to scroll, `/word` to search, `q` to quit. `less +F <file>` follows a file like `tail -f` (`Ctrl-C` to stop following).
- `head <file>` shows the first 10 lines and `tail <file>` the last 10. `-n 50` changes the count.
- `tail -f <file>` keeps the file open and prints new lines as they arrive, which is how you watch a log. `tail -F` also survives log rotation.
- `wc -l <file>` counts lines (`-w` words, `-c` bytes).
- `diff a b` shows the differences between two files, and `diff -u a b` prints them in the familiar unified format.

## Searching

- `grep "text" <file>` prints the matching lines. The flags you'll use: `-i` ignore case, `-n` show line numbers, `-v` invert (lines that *don't* match), `-c` count matches, `-w` whole words, `-E` extended regular expressions, and `-A 2` / `-B 2` / `-C 2` for lines after, before and around each match.
- `grep -rn "text" .` searches every file under the current folder. Add `--include='*.py'` to limit it by name, and `-l` to list only the files that match.
- `find <where> <tests>` finds files by their properties. A few you'll use constantly:

```bash
find . -name "*.log"                  # by name (quote the pattern, or the shell expands it)
find . -iname "readme*"               # same, ignoring case
find . -type d -name node_modules     # only directories (f = files)
find . -type f -size +100M            # bigger than 100 MiB
find . -mtime -1                      # modified in the last 24 hours
find . -mtime +30                     # modified more than 30 days ago
find . -mmin -10                      # modified in the last 10 minutes
find . -name "*.tmp" -delete          # delete matches ⚠️ (put -delete last, and run without it first)
find . -name "*.sh" -exec chmod +x {} +   # run a command on the matches
find / -name "nginx.conf" 2>/dev/null     # search everywhere, hide "permission denied" noise
```

- `find ... -print0 | xargs -0 <command>` is the safe way to feed filenames to another command, because it copes with spaces and newlines in names.
- `locate <name>` searches a prebuilt index of file names and is much faster than `find`, but it needs `plocate` or `mlocate` installed and an updated index (`sudo updatedb`).

## Pipes, redirection and chaining

Small commands that each do one thing, joined together, are the heart of the shell.

- `a | b` sends the output of `a` into `b`.
- `cmd > file` writes the output to a file, replacing it ⚠️. `cmd >> file` appends. `cmd < file` reads input from a file.
- Every program has two output streams: standard output (1) and standard error (2). `cmd 2> errors.txt` redirects only the errors, `cmd > out.txt 2>&1` sends both to the same file, and `cmd > /dev/null 2>&1` throws everything away (`/dev/null` is the bin).
- `cmd | tee file` shows the output and also saves it. `tee -a` appends.
- `$(cmd)` substitutes a command's output into another command: `echo "Today is $(date +%F)"`.
- `a && b` runs `b` only if `a` succeeded, `a || b` runs `b` only if `a` failed, and `a; b` runs both regardless. `$?` holds the exit code of the last command: `0` means success.

## Processing text

```bash
cut -d: -f1,3 /etc/passwd                         # fields 1 and 3, split on ":"
awk -F: '{print $1}' /etc/passwd                   # the first field, with awk
sort file.txt | uniq -c | sort -rn | head          # the most frequent lines, ranked
tr 'a-z' 'A-Z' < file.txt                          # translate characters (here: upper-case)
sed 's/old/new/g' file.txt                         # replace in the output (file unchanged)
sed -n '10,20p' file.txt                           # print only lines 10 to 20
```

- `sort` sorts lines. `-n` sorts numerically, `-r` reverses, `-u` removes duplicates, and `-k2` sorts by the second column.
- `uniq` collapses *adjacent* identical lines, so sort first. `uniq -c` prefixes each line with how many times it occurred.
- `sed -i 's/old/new/g' file` edits the file in place ⚠️. On GNU/Linux the syntax is `sed -i`. On macOS it needs a suffix argument: `sed -i '' ...`. Run it without `-i` first to check the result.
- `awk` is a tiny language for columns: `awk '{sum += $3} END {print sum}' file` adds up the third column.
- `xargs` turns input lines into arguments: `cat urls.txt | xargs -n 1 curl -sI`.
- `jq` (usually installed separately) is `grep` and `sed` for JSON: `curl -s <url> | jq '.items[0].name'`.

## Permissions and ownership

`ls -l` shows who can do what. The string `-rwxr-xr--` is a file type, followed by three triplets for the owner, the group and everyone else. Each triplet is read (r, 4), write (w, 2) and execute (x, 1), and adding the numbers gives the octal form `chmod` uses.

![The ls -l permission string -rwxr-xr-- split into a type character and three triplets: owner rwx = 7, group r-x = 5, others r-- = 4, which is the chmod number 754.](/images/linux-commands/permissions.svg)

- `chmod 755 <file>` sets the permissions numerically. Common values: `644` for files (owner writes, everyone reads), `755` for scripts and directories, `600` for secrets such as SSH keys.
- `chmod +x <file>` makes a file executable, `chmod u+w <file>` adds write for the owner, and `chmod go-rwx <file>` removes everything for group and others.
- `chmod -R u+rwX,go-w <dir>` changes a whole tree. The capital `X` adds execute only to directories and to files that already have it, so you don't make every file executable.
- On a directory, `x` means "may enter it and reach the files inside", so a directory without it is closed even if you can read its name.
- `chown <user>:<group> <file>` changes the owner and group (it needs `sudo` unless you already own the file). `-R` applies it recursively.
- `sudo <command>` runs one command as the administrator (root). `sudo -i` opens a root shell, and `sudo -u <user> <command>` runs as someone else. Prefer a single `sudo` command to staying in a root shell.
- `whoami` prints your user name, `id` shows your user and group IDs, and `groups` lists your groups.
- `chmod -R 777` is almost never the right answer ⚠️. It lets anyone write to everything. Find out which user needs access and grant exactly that.

## Processes

- `ps aux` lists every process with its owner, CPU and memory use, and `ps -ef` shows the same with parent process IDs. (They use two different option styles, which is why you'll see both.) `ps aux --sort=-%mem | head` shows the biggest memory users on GNU/Linux.
- `pgrep -af <name>` finds processes by name and prints their command lines.
- `top` is the live view of what's busy: press `q` to quit, `M` to sort by memory and `P` by CPU. `htop` is a nicer version you usually install yourself.
- `kill <pid>` asks a process to stop politely (the SIGTERM signal). `kill -9 <pid>` forces it with SIGKILL, with no chance to clean up, so use it only when the polite way failed ⚠️. `pkill <name>` does the same by name.
- `jobs`, `fg` and `bg` manage jobs in your current shell. `Ctrl-Z` suspends the running command, `bg` continues it in the background, and `fg` brings it back. End a command with `&` to start it in the background.
- `nohup <command> &` keeps a command running after you log out, writing its output to `nohup.out`. For anything long-lived, a service (below) or `tmux`/`screen` is better.
- `lsof -i :8080` shows what is using a port, and `lsof <file>` shows who has a file open.

## Services and logs (systemd)

Most modern Linux distributions manage services with **systemd**. (Not on a Mac, and usually not inside a container.)

- `systemctl status <service>` shows whether a service is running and its latest log lines.
- `sudo systemctl start|stop|restart|reload <service>` controls it right now. `reload` re-reads the configuration without a full restart, if the service supports it.
- `sudo systemctl enable <service>` starts it at boot, `disable` turns that off, and `enable --now` does it and starts it immediately.
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
- `du -sh <dir>` shows the total size of a directory, and `du -h -d 1 . | sort -h` shows the size of each folder one level down, smallest first, so the culprit is at the bottom. (`-d 1` is `--max-depth=1`; `sort -h` sorts human-readable sizes and is a GNU option.)
- `ncdu` is an interactive disk-usage browser that you install separately. It's the quickest way to find what filled the disk.
- `free -h` shows memory and swap. The "available" column is the one that matters, not "free": Linux uses spare memory as cache.
- `uptime` shows how long the machine has been up and the load averages, and `lsblk` lists disks and partitions.
- `mount | grep <path>` and `findmnt` show what's mounted where.

## Networking

- `ip addr` (short: `ip a`) shows the machine's addresses, and `ip route` shows the routing table. These replaced the older `ifconfig` and `route`.
- `ss -tulpn` lists listening sockets: `-t` TCP, `-u` UDP, `-l` listening only, `-p` the owning process, `-n` numbers instead of names (run it with `sudo` to see processes of other users). `ss -s` prints a summary, and a filter such as `ss -tn 'sport = :80'` narrows it to one port. (`netstat` is the old tool for the same job.)
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
- `rsync` is the better copy tool: it transfers only what changed. The **trailing slash** on the source matters: `site/` copies the *contents* of the folder, `site` copies the folder itself into the destination. `--delete` removes files from the destination that aren't in the source ⚠️, so always dry-run (`-n`) first.

## Archives and compression

- `tar czf backup.tar.gz <dir>` creates a gzip-compressed archive: `c` create, `z` gzip, `f` the file name that follows. Use `J` instead of `z` for xz, and `j` for bzip2.
- `tar xzf backup.tar.gz` extracts it, `tar tzf backup.tar.gz` lists the contents without extracting, and `-C <dir>` extracts into a different folder: `tar xzf backup.tar.gz -C /tmp/restore`. Add `-v` to see each file as it goes. Modern `tar` can usually detect the compression itself when you extract with plain `tar xf`.
- `tar czf backup.tar.gz --exclude=node_modules <dir>` leaves things out.
- `gzip <file>` compresses a single file (and replaces it with `<file>.gz`), and `gunzip <file>.gz` reverses it.
- `zip -r archive.zip <dir>` and `unzip archive.zip` handle the Windows-friendly format, and may need installing.

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

## About the system and your session

- `uname -a` shows the kernel and architecture, `hostnamectl` shows the host name and OS, and `date` shows the time. `date +%F` prints it as `2026-10-10`, which is handy in file names.
- `env` (or `printenv`) lists environment variables, `echo "$PATH"` shows where the shell looks for programs, and `export NAME=value` sets a variable for the programs you start from this shell.
- `history` lists past commands. `Ctrl-R` searches them as you type, which is faster than the arrow keys.
- `alias ll='ls -lah'` creates a shortcut for this session. To keep it, add the line to `~/.bashrc`.
- `crontab -e` edits your scheduled jobs and `crontab -l` lists them. A line has five time fields and then the command: `30 2 * * * /home/me/backup.sh` runs at 02:30 every day (minute, hour, day of month, month, day of week).
- `sudo shutdown -h now` and `sudo reboot` do what they say ⚠️. On a remote machine, make sure you really mean it.

## Shell shortcuts worth learning

- `Ctrl-C` stops the running command, `Ctrl-D` ends input (and logs out of an empty prompt), `Ctrl-L` clears the screen, `Ctrl-Z` suspends the command.
- `Ctrl-A` and `Ctrl-E` jump to the start and the end of the line, `Ctrl-W` deletes the previous word and `Ctrl-U` deletes up to the start.
- `!!` repeats the previous command, so `sudo !!` is "I forgot sudo". `!$` is the last argument of the previous command.
- `cd -` goes back, and `command1 && command2` chains steps that depend on each other.

## Commands that bite

The ones to treat with respect, all in one place:

- `rm -rf` with a wrong or empty path, or `sudo rm -rf /` ⚠️.
- `chmod -R 777` or `chown -R` on the wrong directory.
- `>` onto a file you meant to append to: it truncates the file instantly.
- `mv` and `cp` over an existing file, with no warning unless you use `-i`.
- `dd` writing to the wrong device ⚠️: it will happily overwrite a whole disk.
- `kill -9`, `pkill` and `killall` with a pattern that matches more than you intended.
- `find ... -delete`, `sed -i` and `rsync --delete` without the dry run first.
- Piping a download straight into a shell.

The habit that covers most of these: run the harmless version first (`ls` instead of `rm`, `find` without `-delete`, `rsync -n`, `sed` without `-i`) and look at the result.

## The cheat sheet

| I want to... | Command |
|---|---|
| See what's in a folder, with sizes | `ls -lah` |
| Find files by name | `find . -name "*.log"` |
| Find text inside files | `grep -rn "text" .` |
| Follow a log live | `tail -f <file>` |
| Count lines | `wc -l <file>` |
| Rank the most common lines | `sort <f> \| uniq -c \| sort -rn \| head` |
| Make a script executable | `chmod +x <file>` |
| Who is using port 8080? | `sudo ss -ltnp 'sport = :8080'` |
| Is the disk full? What filled it? | `df -h` then `du -h -d 1 . \| sort -h` |
| Memory use | `free -h` |
| Biggest memory users | `ps aux --sort=-%mem \| head` |
| Stop a stuck process | `kill <pid>` (then `kill -9 <pid>` if it must) |
| Restart a service and read its logs | `sudo systemctl restart <s>` then `journalctl -u <s> -f` |
| Download a file | `curl -fsSL <url> -o <file>` |
| Copy a folder to a server | `rsync -avzP <dir>/ user@host:<dir>/` |
| Make / unpack an archive | `tar czf a.tar.gz <dir>` / `tar xzf a.tar.gz` |
| Which Linux is this? | `cat /etc/os-release` |

## Where to go next

Pick two or three of these and use them on a real machine until your fingers know them: `grep`, `find`, `tail -f`, `ss`, `journalctl` and `rsync` cover most of what a server asks of you. For the full picture of any command, `man` is the source: the manual pages ship with the tools themselves. The [GNU Coreutils manual](https://www.gnu.org/software/coreutils/manual/) and the [systemd documentation](https://systemd.io/) are the best places for the details behind the commands above, and a free Linux shell is one `docker run --rm -it ubuntu bash` away (see [Docker from zero to hero](en/posts/docker-zero-to-hero/)).
