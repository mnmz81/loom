---
title: "Linux commands: files, viewing, searching and archives"
summary: "My Linux cheat sheet, part 1: help, moving around, copying and deleting, viewing files, grep and find, tar and zip."
date: 2026-10-10
updated: 2026-10-19
tags: [linux, cli, cheatsheet]
series: { key: linux-commands, order: 1 }
---

The commands I reach for on a Linux server, in a container or in a CI job. Examples assume **GNU/Linux** with a Bash-like shell; on a Mac the BSD versions differ in details, and I say so where it matters. Linux is case-sensitive: `File.txt` and `file.txt` are different files. Anything marked ⚠️ can destroy data: run the harmless version first (`ls` before `rm`, `find` without `-delete`) and look. A throwaway Linux to practice on is one command away: `docker run --rm -it ubuntu bash` (see [Docker from zero to hero](en/posts/docker-zero-to-hero/)).

## Getting help

- `man <command>` opens the manual page. Use `/word` to search inside it, `n` for the next match, and `q` to quit.
- `<command> --help` prints a short usage summary.
- `man -k <word>` (or `apropos <word>`) searches manual pages by keyword when you don't know the command's name.
- `type <command>` shows whether something is a program, a shell built-in or an alias, and `which <command>` shows the path of the program that would run.
- The [GNU Coreutils manual](https://www.gnu.org/software/coreutils/manual/) covers the core file and text tools in depth.

## Where am I, and moving around

- `pwd` prints the current directory, and `cd <dir>` changes it. `cd` alone goes home, `cd -` jumps back to the previous directory, and `cd ..` goes up one level.
- `ls` lists files. `ls -l` is the long format, `ls -a` includes hidden files (names starting with a dot), `ls -h` makes sizes human-readable, and they combine: `ls -lah`. Add `-t` to sort by modification time and `-S` by size.
- `~` means your home directory, `.` is the current directory and `..` is its parent.
- Press **Tab** to complete names and **Tab Tab** to list the options.

## Working with files and folders

- `touch <file>` creates an empty file, or updates the modification time of an existing one.
- `mkdir <dir>` creates a directory, and `mkdir -p a/b/c` creates the whole path (no error if it already exists).
- `cp <src> <dst>` copies a file, `cp -r <dir> <dst>` copies a directory, and `cp -a` copies and preserves permissions and times.
- `mv <src> <dst>` moves or renames. Like `cp`, it silently overwrites an existing destination: add `-i` to be asked first, or `-n` to never overwrite.
- `rm <file>` deletes a file. `rm -r <dir>` deletes a directory and everything in it, and `rm -rf <dir>` does it without asking ⚠️. There is no trash can. Read the path twice, and beware of variables (`rm -rf "$DIR/"` with an empty `$DIR` is the classic disaster).
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
- `find <where> <tests>` finds files by their properties:

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
- `locate <name>` searches a prebuilt index and is much faster than `find`, but needs `plocate` or `mlocate` and an updated index (`sudo updatedb`).

## Archives and compression

- `tar czf backup.tar.gz <dir>` creates a gzip-compressed archive: `c` create, `z` gzip, `f` the file name that follows. Use `J` instead of `z` for xz, and `j` for bzip2.
- `tar xzf backup.tar.gz` extracts it, `tar tzf backup.tar.gz` lists the contents, and `-C <dir>` extracts elsewhere: `tar xzf backup.tar.gz -C /tmp/restore`. Add `-v` to see each file. Modern `tar xf` usually detects the compression itself.
- `tar czf backup.tar.gz --exclude=node_modules <dir>` leaves things out.
- `gzip <file>` compresses a single file (and replaces it with `<file>.gz`), and `gunzip <file>.gz` reverses it.
- `zip -r archive.zip <dir>` and `unzip archive.zip` handle the Windows-friendly format, and may need installing.
