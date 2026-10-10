---
title: "AWS from zero to hero"
summary: "A beginner's map of Amazon Web Services with diagrams: Regions and zones, a safe account setup, IAM, the CLI, S3, EC2, VPC, RDS, Lambda, monitoring and how to avoid surprise bills."
date: 2026-10-10
tags: [aws, cloud, tutorial]
---

AWS has well over a hundred services, and the console menu looks like a wall. The good news is that a small core does most of the work: somewhere to store files, somewhere to run code, a network around them, a database, and a way to control who can touch what. Learn those, and the rest is variations.

This guide is a map, not a manual. It walks through the core services in the order you meet them, shows the mistakes beginners make (mostly around security and cost), and links to the official docs for the details. Prices, free plans and console menus change often, so I describe ideas and link to the source instead of quoting numbers.

## What AWS is

AWS is a cloud platform: instead of buying servers, you rent computing, storage and networking over the internet and pay for what you use. You create resources with a few clicks or one command, and delete them when you're done.

Two ideas are worth having before anything else:

- **Everything is a service with an API.** The console, the command line and your own code all call the same APIs. Anything you can click, you can script.
- **Shared responsibility.** AWS secures the cloud itself: data centers, hardware, the virtualization layer. You secure what you put in it: who has access, how things are configured, your data, and the operating system of any server you run yourself. A public S3 bucket that leaks data is the customer's problem, not AWS's. The more managed the service (a database service rather than a server you maintain), the more AWS takes off your plate.

## The map: Regions and Availability Zones

AWS resources live in physical places. Three words cover it:

- A **Region** is a geographic area with its own set of data centers, named like `eu-central-1` (Frankfurt) or `us-east-1` (N. Virginia). Regions are isolated from each other, and your data stays in the Region you choose unless you move it.
- An **Availability Zone (AZ)** is one or more data centers inside a Region, with separate power, cooling and networking. Zones in a Region are connected by fast links, and are designed so that a failure in one doesn't take down the others.
- An **edge location** is a point of presence used by services such as CloudFront (a CDN) to serve content close to users.

![A Region contains three Availability Zones, each made of data centers with their own power, cooling and network, connected by low-latency links. A second Region sits apart and is isolated from the first.](/images/aws-zero-to-hero/regions-and-azs.svg)

Two consequences you'll feel immediately. First, **almost everything is per Region**: the console has a Region picker in the top bar, and a bucket or server you created "disappears" if you're looking at the wrong Region. Second, **high availability means using more than one AZ**, because a single AZ can fail. You choose a Region for distance to your users (latency), price, which services exist there, and legal rules about where data may live.

You can list the zones of a Region from the CLI (we'll install it soon):

```bash
aws ec2 describe-availability-zones --region eu-central-1 \
  --query "AvailabilityZones[].{Zone:ZoneName,State:State}" --output table
```

## Your account, safely

Sign up at [aws.amazon.com](https://aws.amazon.com/). You'll create an account with an email, a password and a payment method. That first identity is the **root user**, and it can do anything, including closing the account. Treat it like the master key:

1. **Turn on MFA for the root user right away**, ideally with a passkey or a security key. This is the single most useful thing you can do.
2. **Don't use root for daily work.** Create a normal identity for yourself (next section) and keep the root user for the few tasks that need it.
3. **Never create access keys for root.**

### Free plan, credits and bills

AWS's free offer has changed over time, so check the [AWS Free Tier page](https://aws.amazon.com/free/) rather than an old blog post (including this one). At the time of writing, a new account can start on a **Free plan**: it comes with credits, and the account closes after a set period or when the credits run out, unless you upgrade to a **Paid plan**. A Paid plan gives access to every service and bills you pay-as-you-go. A few services are "always free" within monthly limits. Whatever the plan, the principle is the same: **the free allowance is a limit, not a guarantee that nothing can cost you.**

Before you create anything, set a budget:

- Open **Billing and Cost Management → Budgets** and create a **cost budget** with a small monthly amount, such as 10 dollars, with email alerts at a percentage of it and on a forecast.
- Know that budget data lags: AWS says it's refreshed up to three times a day, and the docs warn that charges can pass your threshold before the alert arrives. A budget is a smoke detector, not a spending cap.

Also check **Billing → Bills** and **Cost Explorer** once in a while. Most surprise bills come from something you forgot to turn off (we'll list the usual suspects at the end).

## IAM: who can do what

**IAM (Identity and Access Management)** is the service that decides who is allowed to do what, and it's free. The pieces:

- A **principal** is whoever makes a request: a person, an application or an AWS service.
- A **user** is a long-lived identity with a password and/or access keys. A **group** is a set of users that share permissions.
- A **role** is an identity with permissions that *anyone or anything can assume temporarily*, receiving short-lived credentials. EC2 instances and Lambda functions use roles, so your code never needs a stored password.
- A **policy** is a JSON document that says what's allowed or denied.

A policy looks like this: it allows reading objects from one bucket, and nothing else.

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

The evaluation rules are short: **everything is denied by default**, an `Allow` opens something up, and an explicit `Deny` always wins over any `Allow`.

![A principal makes a request. The IAM policy check looks for a matching Allow; an explicit Deny always wins. If allowed, the request reaches the resource, such as an S3 bucket. With no matching Allow the request is denied with AccessDenied.](/images/aws-zero-to-hero/iam-permissions.svg)

The official best practices boil down to a few habits:

- **Prefer temporary credentials over long-lived ones.** For people, AWS recommends federation, with **IAM Identity Center** as the centralized option for managing access to your accounts. For applications, use **roles**.
- **Require MFA** wherever you do have users.
- **Apply least privilege.** Start from AWS managed policies if that's convenient, then narrow them down. Tools like IAM Access Analyzer can generate a tighter policy from the activity it saw.
- **Review and remove** unused users, roles and keys regularly.

For a personal account, the practical recipe is: enable IAM Identity Center, create yourself a user with a permission set that is *not* full administrator unless you need it, and sign in through its access portal. Avoid creating IAM users with access keys and pasting those keys into files and repos: leaked keys are how accounts get hijacked to mine crypto at your expense.

## The AWS CLI

Everything above can be done in the console, but the **AWS CLI** is how you'll script and repeat it. Install version 2 from the [official guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), then sign in with short-term credentials:

```bash
aws --version
aws login                    # sign in with your console credentials (short-term credentials)
# or, with IAM Identity Center:
aws configure sso            # a wizard: SSO start URL, region, account, role, profile name
aws sts get-caller-identity  # who am I, and which account?
```

`aws sts get-caller-identity` is the first command to run in any new terminal: it answers "which account and which identity am I using right now?", which is the question behind a lot of expensive mistakes. The CLI keeps its settings in profiles, in `~/.aws/config` and `~/.aws/credentials`. Pick one per call with `--profile`, or per terminal with an environment variable:

```bash
aws s3 ls --profile dev
export AWS_PROFILE=dev
aws configure list           # shows which profile, region and credentials are in effect
```

The docs list long-term access keys (`aws configure` with a key and secret) as the option they don't recommend. Use them only if something genuinely can't use anything else, and never commit them.

## S3: files in the cloud

**Amazon S3 (Simple Storage Service)** stores objects: a file plus metadata. It's the most-used AWS service, and the glue for many others (backups, website assets, data lakes, logs).

- A **bucket** is a container for objects. Its name must be globally unique (across all AWS accounts), and you choose a Region when you create it. You can't rename a bucket or move it to another Region afterwards.
- An **object** has a **key**, its unique name inside the bucket. There are no real folders: `photos/2026/cat.jpg` is just a long key, and the console shows slashes as folders for convenience (a "prefix").
- Objects can be as large as you need, and S3 charges for what you store, requests, and data transferred out.

Some things worth knowing from the start:

- **Buckets are private by default**, and **Block Public Access** is on by default. Keep it that way unless you truly need public files. Most S3 data leaks are a bucket someone made public by mistake.
- **Versioning** keeps every version of an object, so you can undo an accidental overwrite or delete.
- **Storage classes** trade price against access speed: S3 Standard for frequent access, cheaper Infrequent Access classes, and Glacier classes for archives. **Lifecycle rules** move or delete objects automatically as they age.
- S3 gives **strong read-after-write consistency**: after a successful upload, the next read or list sees it.

The high-level CLI commands (`aws s3`) feel like a file manager:

```bash
aws s3 mb s3://my-unique-bucket-name          # create a bucket (make-bucket)
aws s3 ls                                     # list your buckets
aws s3 cp notes.txt s3://my-unique-bucket-name/   # upload
aws s3 ls s3://my-unique-bucket-name/         # list the contents
aws s3 cp s3://my-unique-bucket-name/notes.txt ./ # download
aws s3 sync ./site s3://my-unique-bucket-name/site # upload only what changed
aws s3 presign s3://my-unique-bucket-name/notes.txt --expires-in 3600   # temporary download link
```

A **presigned URL** gives someone time-limited access to one private object without making the bucket public, which is usually the right answer to "how do I share this file?".

Two commands deserve a warning. `aws s3 sync ... --delete` also deletes objects in the destination that aren't in the source, and `aws s3 rm ... --recursive` deletes everything under a prefix. Add `--dryrun` first to see what would happen. When you're done experimenting, empty the bucket and remove it: `aws s3 rb s3://my-unique-bucket-name --force`.

## EC2: virtual servers

**Amazon EC2 (Elastic Compute Cloud)** rents you virtual servers, called **instances**. It's the closest thing to "a computer in the cloud" and the most flexible service, which also means you're responsible for what runs on it. The vocabulary:

- An **AMI (Amazon Machine Image)** is a template for the instance: the operating system and any preinstalled software. You pick one at launch (Amazon Linux, Ubuntu, Windows...).
- An **instance type** is the hardware size: a family and a size, such as `t3.micro`. Each type is a different balance of CPU, memory, network and storage.
- A **key pair** is how you log in over SSH: AWS keeps the public key, you keep the private key. Lose the private key and you can't get in that way.
- A **security group** is a virtual firewall around the instance: it lists which protocols, ports and source IP ranges may reach it. Everything not allowed is blocked.
- **EBS (Elastic Block Store)** volumes are the instance's persistent disks. **Instance store** disks are temporary and are wiped when the instance stops or is terminated.

You can launch one from the console (**EC2 → Launch instance**), or from the CLI. Here is the shape of a launch command; you need to fill in a real AMI, key pair and security group of your own:

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
```

Then connect with `ssh -i my-key.pem ec2-user@<public-ip>` (the user name depends on the AMI: Amazon Linux uses `ec2-user`, Ubuntu uses `ubuntu`). Linux commands you'll reach for on that server are in my [Linux commands cheat sheet](en/posts/linux-commands/). EC2 Instance Connect and Session Manager can also open a shell without you managing SSH keys.

Three EC2 facts that save money and pain:

- **Stop is not terminate.** A *stopped* instance isn't billed for compute, but its EBS volumes still are. *Terminating* deletes the instance (and, by default, its root volume). If you're done, terminate.
- **Billing is per second** (with a one-minute minimum) for On-Demand instances. Other options trade flexibility for price: Savings Plans and Reserved Instances commit you to usage for 1 or 3 years, and Spot Instances use spare capacity at a discount but can be reclaimed.
- **Public IPv4 addresses are charged.** AWS bills for them, including ones attached to a server you're not using. Ask whether the instance needs a public address at all.

If your app is already in a container, you may not need to manage servers yourself: Amazon ECS and EKS run containers for you. Start with [Docker from zero to hero](en/posts/docker-zero-to-hero/) if that's new.

## VPC: your private network

Every server and database sits inside a **VPC (Virtual Private Cloud)**: a virtual network that's logically isolated from everyone else's. Your account comes with a **default VPC** in each Region, set up so you can launch an instance and reach it right away. For anything real, you'll design your own.

- A **subnet** is a slice of the VPC's IP range, and it lives in **one Availability Zone**.
- A **route table** says where traffic from a subnet goes.
- An **internet gateway** connects the VPC to the internet. A **public subnet** is one whose route table sends internet traffic to that gateway. A **private subnet** has no such route.
- A **NAT gateway** lets resources in a private subnet make outbound requests (for updates, say) without being reachable from the internet. It's a paid component, so it's a common line on a surprise bill.
- A **security group** is a stateful firewall attached to a resource, and the one you'll use most. A **network ACL** is a second, stateless filter at the subnet level.

The classic layout puts what faces the internet in public subnets and everything else in private ones, in at least two zones:

![A VPC with an internet gateway and two Availability Zones. Each zone has a public subnet with a web server and a private subnet with a database. The web servers reach the databases, and the private subnets have no route from the internet.](/images/aws-zero-to-hero/vpc-layout.svg)

The key trick is in the security groups: let the database accept connections *only from the web servers' security group*, not from "anywhere". Then even if someone finds the database's address, they can't reach it.

## RDS: databases without the babysitting

You can install a database on an EC2 instance, but then patching, backups and failover are your job. **Amazon RDS (Relational Database Service)** is the managed alternative: you choose an engine (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle or Db2; Aurora is a related AWS-built service) and AWS handles installation, software patching, automated backups and failure detection and recovery.

- A **DB instance** is a managed database server, with an **instance class** (its CPU and memory) and **storage**.
- **Multi-AZ** keeps a standby copy in another zone and fails over to it if the primary has problems. This is about availability, not about scaling reads.
- **Read replicas** copy the data to other instances to spread read traffic.
- RDS runs inside your VPC. Put it in **private subnets** and let only your application's security group connect.

You are still responsible for your schema, queries, access control and what's in the data. The free options for databases have rules of their own, so check the RDS free-tier page before creating one: a database left running is one of the classic surprise bills.

## Lambda: code without servers

**AWS Lambda** runs your code in response to events without you managing any server. You write a function, connect a **trigger**, and Lambda runs it, scaling up automatically with demand. Typical triggers are an HTTP request through API Gateway, a file landing in S3, a message in a queue, or a schedule.

A function is just a handler. This Python one returns a greeting:

```python
import json

def lambda_handler(event, context):
    name = event.get("name", "world")
    return {"statusCode": 200, "body": json.dumps({"message": f"Hello, {name}!"})}
```

The event goes in, a result comes out. (This is plain Python, so you can try it locally by calling `lambda_handler({"name": "Dana"}, None)`.)

What to know:

- **Pay per use:** you're billed for requests and for the time your code runs (measured against the memory you configure), and nothing while it's idle.
- **Limits:** one invocation can run for up to **15 minutes**, so Lambda suits short tasks, not long jobs.
- **Stateless:** don't count on anything surviving between invocations. Keep state in S3, a database or elsewhere.
- **Cold starts:** a function that hasn't run for a while may start slower on the first request.
- The function's **execution role** decides what it can touch in AWS. Give it only what it needs.

Lambda fits glue code and event-driven work well: resize an image when it lands in S3, run a nightly cleanup, answer a webhook.

## Watching what happens

- **Amazon CloudWatch** collects **metrics** (CPU, request counts...), **logs** (your Lambda output, your servers' logs through an agent) and lets you set **alarms** that notify you or trigger an action when a metric crosses a threshold. Many services send basic metrics automatically; **dashboards** put them on one screen.
- **AWS CloudTrail** records the API calls made in your account: who did what, when, from where. When something unexpected changes, CloudTrail is where you find out who changed it.

A sensible first alarm for a personal account is the budget alert from earlier. A sensible first habit is checking CloudWatch Logs when a Lambda function fails: the error is almost always printed there.

## Choosing: what do I use for...

| I need to... | Reach for |
|---|---|
| Store files, backups, website assets | **S3** |
| Run a server I control | **EC2** |
| Run a short function on an event | **Lambda** |
| Run containers without managing servers | **ECS** or **EKS** (with Fargate) |
| A relational database, managed | **RDS** (or Aurora) |
| Control who can do what | **IAM** and **IAM Identity Center** |
| Isolate and connect my resources | **VPC** and security groups |
| Serve content fast worldwide | **CloudFront** |
| See metrics, logs and alarms | **CloudWatch** |
| Audit who changed what | **CloudTrail** |
| Track and limit spend | **Budgets** and **Cost Explorer** |

## Avoiding the surprise bill

Nearly every horror story is one of these:

- **A forgotten running resource**: an EC2 instance, an RDS database, a NAT gateway or a load balancer that nobody turned off. They bill by the hour.
- **Leaked access keys** used to launch crypto miners. Don't create long-term keys, never commit them, and rotate or delete any you do have.
- **Orphans after "deleting" something**: EBS volumes, snapshots and Elastic IPs left behind when you terminate a server.
- **The wrong Region**: resources in a Region you aren't looking at. Check the picker, or use **Tag Editor** and the billing breakdown by Region to find stragglers.
- **Data transfer**: moving data out of AWS or between Regions costs money.

The habits that prevent them: set a **budget** on day one, **tag** everything you create with a project name so you can find and delete it, **clean up the same day** you finish an experiment, and look at the **Bills** page once a week while you're learning.

## The cheat sheet

| I want to... | Command |
|---|---|
| Know who and where I am | `aws sts get-caller-identity` |
| Sign in (SSO) | `aws configure sso` then `aws sso login --profile <name>` |
| See the active settings | `aws configure list` |
| List my buckets | `aws s3 ls` |
| Upload / download a file | `aws s3 cp <file> s3://<bucket>/` / `aws s3 cp s3://<bucket>/<key> ./` |
| Mirror a folder to S3 (dry run first) | `aws s3 sync ./dir s3://<bucket>/dir --dryrun` |
| Temporary link to a private object | `aws s3 presign s3://<bucket>/<key> --expires-in 3600` |
| List instances | `aws ec2 describe-instances --output table` |
| Stop / start an instance | `aws ec2 stop-instances --instance-ids <id>` / `aws ec2 start-instances --instance-ids <id>` |
| Terminate an instance ⚠️ | `aws ec2 terminate-instances --instance-ids <id>` |
| Delete a bucket and its contents ⚠️ | `aws s3 rb s3://<bucket> --force` |
| Add a region for one command | `aws <command> --region eu-central-1` |

## Glossary

- **Region / Availability Zone:** a geographic area / an isolated data center group inside it.
- **IAM:** the service that controls identities and permissions.
- **Root user:** the all-powerful first identity of an account. Protect it with MFA and don't use it daily.
- **Role:** an identity that's assumed temporarily, with short-lived credentials.
- **Policy:** a JSON document of allowed and denied actions.
- **S3 / bucket / object / key:** object storage / its container / a stored file / the object's name.
- **EC2 / instance / AMI:** virtual servers / one server / its template.
- **EBS:** persistent block storage for instances.
- **VPC / subnet:** your virtual network / a slice of it in one AZ.
- **Security group:** a virtual firewall attached to a resource.
- **Internet gateway / NAT gateway:** connects a VPC to the internet / lets private resources reach out only.
- **RDS:** managed relational databases.
- **Lambda:** run code on events with no servers to manage.
- **CloudWatch / CloudTrail:** metrics, logs and alarms / a record of API calls.
- **Free plan / credits:** the starting offer for a new account. Read its current terms on the AWS site.

## Where to go next

You now have the whole map. To make it stick, build something small that touches several pieces: a private S3 bucket you upload to with the CLI, a Lambda function that runs when a file arrives, and a CloudWatch log to watch it work. Then delete everything and check the bill.

Next steps: put the app from [Docker from zero to hero](en/posts/docker-zero-to-hero/) on ECS, and automate deployments with the Actions basics in [GitHub from zero to hero](en/posts/github-zero-to-hero/). For the details of any service, the official documentation is excellent: start with the [AWS Free Tier](https://aws.amazon.com/free/) page, the [IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) and the [AWS CLI user guide](https://docs.aws.amazon.com/cli/latest/userguide/).
