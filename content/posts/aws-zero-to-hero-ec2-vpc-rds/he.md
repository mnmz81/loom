---
title: "AWS: שרתי EC2, רשתות VPC ומסדי נתונים ב-RDS"
summary: "מפעילים instance של EC2, מתחברים אליו ומבינים כמה הוא עולה, ‏VPC עם subnets ציבוריים ופרטיים בשני אזורים, ומסד נתונים מנוהל ב-RDS שאי אפשר להגיע אליו מהאינטרנט."
date: 2026-10-10
tags: [aws, cloud]
series: { key: devops, order: 25 }
---

החלק הזה משתמש ב-AWS CLI וברעיונות של IAM מ[IAM, ה-CLI ו-S3](he/posts/aws-zero-to-hero-iam-cli-s3/).

## EC2: שרתים וירטואליים

**Amazon EC2 (Elastic Compute Cloud)** משכירה שרתים וירטואליים, שנקראים **instances**: הדבר הקרוב ביותר ל"מחשב בענן", ואנחנו אחראים למה שרץ עליו. אוצר המילים:

- **AMI (Amazon Machine Image)** היא התבנית של ה-instance: מערכת ההפעלה וכל תוכנה שהותקנה מראש. בוחרים אחת בהפעלה (Amazon Linux, ‏Ubuntu, ‏Windows...).
- **Instance type** הוא גודל החומרה: משפחה וגודל, כמו `t3.micro`. כל type הוא איזון אחר בין CPU, זיכרון, רשת ואחסון.
- **Key pair** היא הדרך להיכנס דרך SSH: ‏AWS שומרת את המפתח הציבורי, ואנחנו שומרים את הפרטי. מי שמאבד את המפתח הפרטי לא יכול להיכנס בדרך הזו.
- **Security group** היא חומת אש וירטואלית סביב ה-instance: היא מפרטת אילו פרוטוקולים, פורטים וטווחי כתובות IP מקור מורשים להגיע אליו. כל מה שלא הותר נחסם.
- כוננים של **EBS (Elastic Block Store)** הם הדיסקים הקבועים של ה-instance. דיסקים של **instance store** הם זמניים ונמחקים כשה-instance נעצר או מסתיים.

מפעילים אחד מהקונסולה (**EC2 ← Launch instance**) או מה-CLI. זו הצורה של פקודת הפעלה; משלימים AMI, ‏key pair ו-security group אמיתיים משלנו:

```bash
aws ec2 run-instances \
  --image-id ami-0123456789abcdef0 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-0123456789abcdef0 \
  --count 1
aws ec2 describe-instances \
  --query "Reservations[].Instances[].{Id:InstanceId,State:State.Name,Type:InstanceType}" \
  --output table
aws ec2 stop-instances --instance-ids <id>        # start-instances brings it back
aws ec2 terminate-instances --instance-ids <id>   # deletes it
```

ואז מתחברים עם `ssh -i my-key.pem ec2-user@<public-ip>` (ב-Amazon Linux המשתמש הוא `ec2-user`, ב-Ubuntu ‏`ubuntu`). את הפקודות שתצטרכו על השרת תמצאו ב[דף העזר לפקודות Linux](he/posts/linux-commands/). גם EC2 Instance Connect ו-Session Manager פותחים shell בלי מפתחות SSH.

שלוש עובדות על EC2 שחוסכות כסף וכאב ראש:

- **Stop הוא לא terminate.** ‏instance *שנעצר* לא מחויב על חישוב, אבל הכוננים שלו ב-EBS עדיין מחויבים. ‏*Terminate* מוחק את ה-instance (וכברירת מחדל גם את כונן ה-root שלו). אם סיימנו, עושים terminate.
- **החיוב הוא לפי שנייה** (מינימום דקה) ב-instances מסוג On-Demand. ‏Savings Plans ו-Reserved Instances מחייבים לשנה או לשלוש במחיר נמוך יותר, ו-Spot Instances משתמשים בקיבולת פנויה בהנחה, אבל AWS יכולה לקחת אותם בחזרה.
- **כתובות IPv4 ציבוריות עולות כסף,** גם על שרת שלא משתמשים בו. שואלים אם ה-instance בכלל צריך כתובת כזו.

אם האפליקציה ב-container, ‏Amazon ECS ו-EKS מריצים אותה במקומנו; אם זה חדש, מתחילים ב[Docker מאפס לגיבור](he/posts/docker-zero-to-hero/).

## VPC: הרשת הפרטית שלנו

כל שרת ומסד נתונים יושבים בתוך **VPC (Virtual Private Cloud)**: רשת וירטואלית מבודדת לוגית מכל השאר. בכל Region יש **default VPC** כדי שאפשר יהיה להפעיל instance ולהגיע אליו מיד. לכל דבר רציני מתכננים VPC משלנו.

- **Subnet** הוא פרוסה מטווח ה-IP של ה-VPC, והוא חי ב**אזור זמינות אחד**.
- **Route table** אומרת לאן הולכת התעבורה מ-subnet.
- **Internet gateway** מחבר את ה-VPC לאינטרנט. ‏**Public subnet** הוא subnet שה-route table שלו שולחת תעבורת אינטרנט ל-gateway הזה. ל-**private subnet** אין נתיב כזה.
- **NAT gateway** מאפשר למשאבים ב-private subnet לשלוח בקשות החוצה (לעדכונים, למשל) בלי שאפשר להגיע אליהם מהאינטרנט. זה רכיב בתשלום, ולכן הוא שורה נפוצה בחשבונית מפתיעה.
- **Security group** היא חומת אש stateful שמחוברת למשאב, והיא זו שנשתמש בה הכי הרבה. ‏**Network ACL** היא מסנן שני, stateless, ברמת ה-subnet.

הפריסה הקלאסית שמה את מה שפונה לאינטרנט ב-public subnets ואת כל השאר ב-private, בשני אזורים לפחות:

![VPC עם internet gateway ושני אזורי זמינות. בכל אזור יש public subnet עם שרת web ו-private subnet עם מסד נתונים. שרתי ה-web מגיעים למסדי הנתונים, ול-private subnets אין נתיב מהאינטרנט.](/images/aws-zero-to-hero/vpc-layout.svg)

הטריק המרכזי: מאפשרים למסד הנתונים לקבל חיבורים *רק מה-security group של שרתי ה-web*, לא מ"כל מקום". כך גם מי שמצא את הכתובת שלו לא יכול להגיע אליו.

## RDS: מסדי נתונים בלי לשמור עליהם

על instance של EC2 העדכונים, הגיבויים וה-failover הם העבודה שלנו. ‏**Amazon RDS (Relational Database Service)** הוא האלטרנטיבה המנוהלת: בוחרים מנוע (PostgreSQL, ‏MySQL, ‏MariaDB, ‏SQL Server, ‏Oracle או Db2; ‏Aurora הוא שירות קרוב שנבנה ב-AWS) ו-AWS מטפלת בהתקנה, בעדכונים, בגיבויים אוטומטיים ובהתאוששות מתקלות.

- **DB instance** הוא שרת מסד נתונים מנוהל, עם **instance class** (ה-CPU והזיכרון שלו) ו**אחסון**.
- **Multi-AZ** שומר עותק המתנה (standby) באזור אחר ועובר אליו אם יש בעיה במסד הראשי. זה עניין של זמינות, לא של הרחבת קריאות.
- **Read replicas** מעתיקים את הנתונים ל-instances אחרים כדי לפזר תעבורת קריאה.
- RDS רץ בתוך ה-VPC שלנו. שמים אותו ב-**private subnets** ומאפשרים רק ל-security group של האפליקציה להתחבר.

אנחנו עדיין אחראים לסכמה, לשאילתות, לבקרת הגישה ולנתונים. לאפשרויות החינמיות למסדי נתונים יש כללים משלהן, אז בודקים קודם את דף ה-free tier של RDS: מסד נתונים שנשכח הוא חשבונית מפתיעה קלאסית.
