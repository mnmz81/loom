---
title: "AWS: ‏IAM, ה-CLI ו-S3"
summary: "users, ‏roles ו-policies ב-IAM והשיטות המומלצות שחשובות, כניסה ל-AWS CLI עם credentials קצרי טווח ו-profiles, ושמירת קבצים ב-buckets של S3 בצורה בטוחה."
date: 2026-10-10
tags: [aws, cloud]
series: { key: devops, order: 61 }
---

החלק הזה מניח חשבון שהוקם כמו ב-[AWS מאפס לגיבור](he/posts/aws-zero-to-hero/): ‏MFA על משתמש ה-root ותקציב מוגדר.

## IAM: מי יכול לעשות מה

**IAM (Identity and Access Management)** הוא השירות שמחליט מי מורשה לעשות מה, והוא חינמי. החלקים:

- **Principal** הוא מי שמבצע בקשה: אדם, אפליקציה או שירות של AWS.
- **User** הוא זהות ארוכת טווח עם סיסמה ו/או access keys. ‏**Group** היא קבוצת משתמשים שחולקים הרשאות.
- **Role** היא זהות עם הרשאות ש*כל אדם או דבר יכול לקחת על עצמו לזמן קצר*, ולקבל בעזרתה credentials קצרי טווח. מופעי EC2 ופונקציות Lambda משתמשים ב-roles, כך שהקוד שלנו לא צריך סיסמה שמורה.
- **Policy** היא מסמך JSON שאומר מה מותר ומה אסור.

ה-policy הזו מתירה לקרוא אובייקטים מ-bucket אחד, ושום דבר אחר:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-example-bucket/*"
    }
  ]
}
```

**הכול אסור כברירת מחדל**, ‏`Allow` פותח משהו, ו-`Deny` מפורש תמיד גובר על כל `Allow`.

![Principal שולח בקשה. בדיקת ה-IAM policy מחפשת Allow מתאים, ו-Deny מפורש תמיד גובר. אם מותר, הבקשה מגיעה למשאב, למשל bucket ב-S3. בלי Allow מתאים הבקשה נדחית עם AccessDenied.](/images/aws-zero-to-hero/iam-permissions.svg)

השיטות המומלצות הרשמיות מסתכמות בכמה הרגלים:

- **מעדיפים credentials זמניים.** לבני אדם AWS ממליצה על federation, ו-**IAM Identity Center** הוא האפשרות המרכזית. לאפליקציות משתמשים ב-**roles**.
- **דורשים MFA** בכל מקום שיש בו משתמשים.
- **מיישמים least privilege.** אפשר להתחיל מ-policies מנוהלות של AWS ואז לצמצם; ‏IAM Access Analyzer יכול לייצר policy הדוקה יותר לפי הפעילות שראה.
- **סוקרים ומסירים** באופן קבוע משתמשים, roles ומפתחות שלא בשימוש.

בחשבון אישי: מפעילים את IAM Identity Center, יוצרים לעצמנו משתמש עם permission set שהוא *לא* מנהל מלא אלא אם צריך, ונכנסים דרך הפורטל שלו. לא מדביקים access keys של IAM בקבצים וב-repos: מפתחות שדלפו הם הדרך שבה חשבונות נחטפים כדי לכרות קריפטו על חשבוננו.

## ה-AWS CLI

את כל זה אפשר לעשות בקונסולה, אבל עם ה-**AWS CLI** כותבים סקריפטים וחוזרים על פעולות. מתקינים את גרסה 2 לפי [המדריך הרשמי](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), ואז נכנסים עם credentials קצרי טווח:

```bash
aws --version
aws login                    # sign in with your console credentials (short-term credentials)
# or, with IAM Identity Center:
aws configure sso            # a wizard: SSO start URL, region, account, role, profile name
aws sso login --profile <name>   # later sign-ins with that profile
aws sts get-caller-identity  # who am I, and which account?
```

בכל טרמינל חדש מריצים קודם `aws sts get-caller-identity`: "באיזה חשבון ובאיזו זהות אני עובד?" היא השאלה שמאחורי הרבה טעויות יקרות. ה-CLI שומר הגדרות ב-profiles (‏`~/.aws/config`, ‏`~/.aws/credentials`). בוחרים אחד לכל קריאה עם `--profile`, או לכל טרמינל עם משתנה סביבה; ‏`--region` עובד באותה צורה בשביל ה-Region:

```bash
aws s3 ls --profile dev
export AWS_PROFILE=dev
aws configure list           # shows which profile, region and credentials are in effect
```

התיעוד לא ממליץ על access keys ארוכי טווח (`aws configure` עם מפתח וסוד). משתמשים בהם רק אם שום דבר אחר לא עובד, ואף פעם לא עושים להם commit.

## S3: קבצים בענן

**Amazon S3 (Simple Storage Service)** שומר אובייקטים: קובץ יחד עם metadata. זה השירות הנפוץ ביותר ב-AWS, והדבק של הרבה שירותים אחרים (גיבויים, נכסים של אתרים, data lakes, לוגים).

- **Bucket** הוא מכל לאובייקטים. השם שלו חייב להיות ייחודי גלובלית, ובוחרים Region כשיוצרים אותו. אי אפשר לשנות את שמו או להעביר אותו ל-Region אחר.
- ל**אובייקט** יש **key**, השם הייחודי שלו ב-bucket. אין תיקיות אמיתיות: `photos/2026/cat.jpg` הוא פשוט key ארוך, והקונסולה מציגה את הלוכסנים כתיקיות (זה "prefix").
- S3 גובה על מה ששומרים, על בקשות ועל נתונים שיוצאים החוצה.

מההתחלה:

- **Buckets פרטיים כברירת מחדל**, עם **Block Public Access** פעיל. משאירים כך אלא אם באמת צריך קבצים ציבוריים: רוב הדליפות מ-S3 הן bucket שמישהו הפך לציבורי בטעות.
- **Versioning** שומר כל גרסה של אובייקט, כך שאפשר לבטל דריסה או מחיקה בטעות.
- **Storage classes** מחליפים מחיר במהירות גישה: S3 Standard לגישה תכופה, classes זולים יותר לגישה נדירה (Infrequent Access), ו-classes של Glacier לארכיון. ‏**Lifecycle rules** מעבירים או מוחקים אובייקטים אוטומטית ככל שהם מתיישנים.
- S3 מספק **strong read-after-write consistency**: אחרי העלאה מוצלחת, הקריאה או הרשימה הבאה כבר רואות אותה.

פקודות ה-CLI ברמה הגבוהה (`aws s3`) מרגישות כמו מנהל קבצים:

```bash
aws s3 mb s3://my-unique-bucket-name          # create a bucket (make-bucket)
aws s3 ls                                     # list your buckets
aws s3 cp notes.txt s3://my-unique-bucket-name/   # upload
aws s3 ls s3://my-unique-bucket-name/         # list the contents
aws s3 cp s3://my-unique-bucket-name/notes.txt ./ # download
aws s3 sync ./site s3://my-unique-bucket-name/site # upload only what changed
aws s3 presign s3://my-unique-bucket-name/notes.txt --expires-in 3600   # temporary download link
```

**Presigned URL** נותן למישהו גישה מוגבלת בזמן לאובייקט פרטי אחד בלי להפוך את ה-bucket לציבורי, ובדרך כלל זו התשובה הנכונה ל"איך משתפים את הקובץ הזה?".

לשתי פקודות מגיעה אזהרה: `aws s3 sync ... --delete` מוחקת גם אובייקטים ביעד שאינם במקור, ו-`aws s3 rm ... --recursive` מוחקת הכול מתחת ל-prefix. מוסיפים קודם `--dryrun`. כשמסיימים להתנסות, מרוקנים את ה-bucket ומסירים אותו: `aws s3 rb s3://my-unique-bucket-name --force`.
