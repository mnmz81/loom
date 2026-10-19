---
title: "Linux commands: pipes, text, permissions and the shell"
summary: "My Linux cheat sheet, part 2: pipes and redirection, sort, sed and awk, chmod and sudo, environment, cron and shell shortcuts."
date: 2026-10-10
updated: 2026-10-19
tags: [linux, cli, cheatsheet]
series: { key: linux-commands, order: 2 }
---

Examples assume **GNU/Linux** with a Bash-like shell; macOS differences are noted. Anything marked ⚠️ can destroy data: run the harmless version first (`sed` without `-i`) and look.

## Pipes, redirection and chaining

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
- `sed -i 's/old/new/g' file` edits the file in place ⚠️. On macOS it needs a suffix argument: `sed -i '' ...`. Run it without `-i` first.
- `awk` is a tiny language for columns: `awk '{sum += $3} END {print sum}' file` adds up the third column.
- `xargs` turns input lines into arguments: `cat urls.txt | xargs -n 1 curl -sI`.
- `jq` (usually installed separately) is `grep` and `sed` for JSON: `curl -s <url> | jq '.items[0].name'`.

## Permissions and ownership

`ls -l` shows who can do what. The string `-rwxr-xr--` is a file type, followed by three triplets for the owner, the group and everyone else. Each triplet is read (r, 4), write (w, 2) and execute (x, 1), and adding the numbers gives the octal form `chmod` uses.

![The ls -l permission string -rwxr-xr-- split into a type character and three triplets: owner rwx = 7, group r-x = 5, others r-- = 4, which is the chmod number 754.](/images/linux-commands/permissions.svg)

- `chmod 755 <file>` sets the permissions numerically. Common values: `644` for files (owner writes, everyone reads), `755` for scripts and directories, `600` for secrets such as SSH keys.
- `chmod +x <file>` makes a file executable, `chmod u+w <file>` adds write for the owner, and `chmod go-rwx <file>` removes everything for group and others.
- `chmod -R u+rwX,go-w <dir>` changes a whole tree. The capital `X` adds execute only to directories and files that already have it.
- On a directory, `x` means "may enter it and reach the files inside".
- `chown <user>:<group> <file>` changes the owner and group (it needs `sudo` unless you already own the file). `-R` applies it recursively ⚠️, so check the path first.
- `sudo <command>` runs one command as root. `sudo -i` opens a root shell, and `sudo -u <user> <command>` runs as someone else. Prefer a single `sudo` command to staying in a root shell.
- `whoami` prints your user name, `id` your user and group IDs, `groups` your groups.
- `chmod -R 777` is almost never the answer ⚠️: it lets anyone write to everything. Grant exactly the access a user needs.

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
