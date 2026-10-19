---
title: "פקודות Linux: תהליכים, שירותים, דיסק, רשת ו-SSH"
summary: "דף העזר שלי ל-Linux, חלק 3: תהליכים, systemd ו-journalctl, דיסק וזיכרון, רשת, SSH ו-rsync, התקנת חבילות."
date: 2026-10-10
updated: 2026-10-19
tags: [linux, cli, cheatsheet]
series: { key: linux-commands, order: 3 }
---

פקודות לניהול שרת Linux. התחברות לשרת בענן מוסברת ב-[AWS מאפס לגיבור](he/posts/aws-zero-to-hero-ec2-vpc-rds/). הדוגמאות מניחות **GNU/Linux** עם shell בסגנון Bash, והבדלים ב-macOS מצוינים. סימן ⚠️ אומר שהפקודה יכולה להרוס נתונים: מריצים קודם את הגרסה הלא מזיקה (`rsync -n`) ומסתכלים.

## תהליכים

- `ps aux` רושמת כל תהליך עם הבעלים שלו ושימוש ב-CPU ובזיכרון, ו-`ps -ef` מוסיפה מזהי תהליכי אב. ‏`ps aux --sort=-%mem | head` מציגה את צורכי הזיכרון הגדולים ב-GNU/Linux.
- `pgrep -af <שם>` מוצאת תהליכים לפי שם ומדפיסה את שורות הפקודה שלהם.
- `top` היא התצוגה החיה של מה שעסוק: `q` יוצא, `M` ממיין לפי זיכרון ו-`P` לפי CPU. `htop` היא גרסה נעימה יותר שבדרך כלל מתקינים בעצמנו.
- `kill <pid>` מבקשת מתהליך להיעצר בנימוס (SIGTERM). `kill -9 <pid>` כופה זאת עם SIGKILL, בלי הזדמנות לנקות אחריו, ולכן רק כשהדרך הנימוסית נכשלה ⚠️. `pkill <שם>` ו-`killall <שם>` עושות אותו דבר לפי שם, אז בודקים שהתבנית לא תופסת יותר ממה שהתכוונו.
- `jobs`, `fg` ו-`bg` מנהלות משימות ב-shell: `Ctrl-Z` משעה את הפקודה שרצה, `bg` ממשיכה אותה ברקע, ו-`fg` מחזירה אותה לחזית. מסיימים פקודה ב-`&` כדי להפעיל אותה ברקע.
- `nohup <פקודה> &` משאירה פקודה רצה גם אחרי שמתנתקים. לכל דבר ארוך טווח עדיף שירות (בהמשך) או `tmux`/`screen`.
- `lsof -i :8080` מראה מה משתמש בפורט, ו-`lsof <קובץ>` מראה מי פתח קובץ.

## שירותים ולוגים (systemd)

ברוב ההפצות המודרניות של Linux מנהלים שירותים עם **systemd** ([תיעוד](https://systemd.io/)). (לא ב-Mac, ובדרך כלל לא בתוך container.)

- `systemctl status <שירות>` מראה אם שירות רץ ואת שורות הלוג האחרונות שלו.
- `sudo systemctl start|stop|restart|reload <שירות>` שולטת בו מיד; ‏`reload` קוראת מחדש את ההגדרות בלי הפעלה מחדש מלאה, אם נתמך.
- `sudo systemctl enable <שירות>` מפעילה אותו באתחול, `disable` מבטלת זאת, ו-`enable --now` מפעילה גם מיד.
- `systemctl list-units --type=service` רושמת את השירותים, ו-`systemctl --failed` רושמת את אלה שנכשלו.
- `sudo systemctl daemon-reload` גורמת ל-systemd לקרוא מחדש קובצי unit אחרי שערכנו אותם.

`journalctl` קוראת את הלוגים ש-systemd אוספת:

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

קובצי לוג רגילים עדיין חיים ב-`/var/log` בהרבה תוכנות: `tail -f /var/log/syslog` (ב-Debian וב-Ubuntu) או `/var/log/messages` (במשפחת Red Hat).

## דיסק וזיכרון

- `df -h` מראה מקום פנוי לכל מערכת קבצים. דיסק מלא הוא הסיבה למספר מפתיע של תקריות "פתאום זה הפסיק לעבוד".
- `du -sh <תיקייה>` מראה את הגודל הכולל של תיקייה, ו-`du -h -d 1 . | sort -h` מראה כל תיקייה ברמה אחת מתחת, מהקטנה לגדולה, כך שהאשם בתחתית. (‏`sort -h` היא אפשרות של GNU.)
- `ncdu` הוא דפדפן אינטראקטיבי לשימוש בדיסק שמתקינים בנפרד: הדרך המהירה ביותר למצוא מה מילא את הדיסק.
- `free -h` מציגה זיכרון ו-swap. קוראים את העמודה "available", לא "free": Linux משתמשת בזיכרון פנוי כ-cache.
- `uptime` מראה כמה זמן המכונה פועלת ואת עומסי הממוצע, ו-`lsblk` רושמת דיסקים וחלוקות.
- `mount | grep <נתיב>` ו-`findmnt` מראות מה מחובר לאן.
- `dd` כותבת בתים גולמיים להתקן ⚠️: אם מכוונים אותה להתקן הלא נכון, היא דורסת דיסק שלם.

## רשת

- `ip addr` (בקיצור: `ip a`) מציגה את הכתובות של המכונה, ו-`ip route` מציגה את טבלת הניתוב. הן החליפו את `ifconfig` ו-`route` הישנות.
- `ss -tulpn` רושמת sockets שמאזינים: `-t` ל-TCP, `-u` ל-UDP, `-l` רק מאזינים, `-p` התהליך שמחזיק, `-n` מספרים במקום שמות (עם `sudo` רואים תהליכים של משתמשים אחרים). ‏`ss -s` מדפיסה סיכום, ו-`ss -tn 'sport = :80'` מצמצמת לפורט אחד. (‏`netstat` היא הכלי הישן.)
- `ping -c 4 <host>` בודקת שמארח עונה (`-c` מגביל את המספר, אחרת היא רצה לנצח).
- `curl <url>` מושכת כתובת. הדגלים שכדאי להכיר: `-I` רק כותרות, `-s` שקט, `-L` עוקב אחרי הפניות, `-o <file>` שומר לקובץ, `-f` נכשל על שגיאות HTTP, ו-`-X POST -d '{"a":1}' -H 'Content-Type: application/json'` לשליחת נתונים. `curl -fsSL <url> -o file` היא ההורדה האמינה. גם `wget <url>` מורידה.
- `dig <domain> +short` (או `nslookup`) מחפשת רשומות DNS, ו-`dig <domain> MX` מבקשת סוג מסוים.
- `nc -zv <host> <port>` בודקת אם פורט TCP נגיש.
- `traceroute <host>` מראה את הקפיצות בדרך (ייתכן שצריך להתקין).
- `curl -fsSL <url> | sh` מריצה סקריפט ישר מהאינטרנט ⚠️. מורידים אותו, קוראים אותו, ורק אז מריצים.

## SSH והעתקת קבצים

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

- מפתחות פרטיים חייבים להיות פרטיים: `chmod 600 ~/.ssh/key.pem`, אחרת SSH מסרבת להשתמש בהם.
- `~/.ssh/config` מאפשר לתת לשרת שם קצר, כך ש-`ssh myserver` מחליף את השורה הארוכה.
- `rsync` היא כלי ההעתקה הטוב יותר: היא מעבירה רק את מה שהשתנה. **לוכסן הסיום** חשוב: `site/` מעתיקה את *התוכן* של התיקייה, ו-`site` את התיקייה עצמה. ‏`--delete` מסירה מהיעד קבצים שאינם במקור ⚠️, ולכן קודם dry run (`-n`).

## התקנת תוכנה

הפקודה תלויה בהפצה:

```bash
sudo apt update && sudo apt install -y curl   # Debian, Ubuntu
sudo dnf install curl                         # Fedora, RHEL and relatives
sudo apk add curl                             # Alpine (common in containers)
sudo pacman -S curl                           # Arch
```

- ב-Debian וב-Ubuntu, `apt update` מרעננת את רשימת החבילות ו-`apt upgrade` מתקינה עדכונים זמינים. `apt search <מילה>` מוצאת חבילות, `apt remove <pkg>` מסירה, ו-`dpkg -l | grep <מילה>` מראה מה מותקן.
- `cat /etc/os-release` אומרת באיזו הפצה וגרסה אנחנו, כדי לבחור את השורה הנכונה למעלה.
