---
title: "AWS: Lambda, monitoring and avoiding surprise bills"
summary: "Running code on events with Lambda, watching it with CloudWatch and CloudTrail, which service to reach for, and the five causes of nearly every surprise AWS bill."
date: 2026-10-10
tags: [aws, cloud]
series: { key: devops, order: 26 }
---

The last part of the AWS series. It builds on IAM roles from [IAM, the CLI and S3](en/posts/aws-zero-to-hero-iam-cli-s3/) and the servers and databases from [EC2, VPC and RDS](en/posts/aws-zero-to-hero-ec2-vpc-rds/).

## Lambda: code without servers

**AWS Lambda** runs your code in response to events without you managing any server. You write a function, connect a **trigger**, and Lambda runs it, scaling up automatically with demand. Typical triggers are an HTTP request through API Gateway, a file landing in S3, a message in a queue, or a schedule.

A function is just a handler. This Python one returns a greeting:

```python
import json

def lambda_handler(event, context):
    name = event.get("name", "world")
    return {"statusCode": 200, "body": json.dumps({"message": f"Hello, {name}!"})}
```

It's plain Python: try it locally with `lambda_handler({"name": "Dana"}, None)`.

What to know:

- **Pay per use:** billed for requests and run time (against the memory you configure), nothing while idle.
- **Limits:** one invocation runs up to **15 minutes**, so Lambda suits short tasks.
- **Stateless:** nothing survives between invocations. Keep state in S3 or a database.
- **Cold starts:** a function idle for a while may start slower on the first request.
- The **execution role** decides what the function can touch in AWS. Give it only what it needs.

Lambda fits glue code and event-driven work: resize an image when it lands in S3, run a nightly cleanup, answer a webhook.

## Watching what happens

- **Amazon CloudWatch** collects **metrics** (CPU, request counts...) and **logs** (Lambda output, server logs through an agent), and sets **alarms** that notify you when a metric crosses a threshold. **Dashboards** put them on one screen.
- **AWS CloudTrail** records the API calls in your account: who did what, when, from where. When something unexpectedly changes, this is where you find out who.

A sensible first alarm is the [budget alert](en/posts/aws-zero-to-hero/), and a sensible first habit is checking CloudWatch Logs when a Lambda fails: the error is almost always printed there.

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

- **A forgotten running resource**: an EC2 instance, RDS database, NAT gateway or load balancer nobody turned off. They bill by the hour.
- **Leaked access keys** used to launch crypto miners. Don't create long-term keys, never commit them, and delete any you have.
- **Orphans after "deleting" something**: EBS volumes, snapshots and Elastic IPs left behind when you terminate a server.
- **The wrong Region**: resources in a Region you aren't looking at. Check the picker, or use **Tag Editor** and the billing breakdown by Region.
- **Data transfer**: moving data out of AWS or between Regions costs money.

The habits that prevent them: set a **budget** on day one, **tag** everything with a project name, **clean up the same day** you finish an experiment, and check the **Bills** page weekly while you're learning.

## Where to go next

Build something small that touches several pieces: a private S3 bucket you upload to with the CLI, a Lambda that runs when a file arrives, and a CloudWatch log to watch it work. Then delete everything and check the bill.

Next: put the app from [Docker from zero to hero](en/posts/docker-zero-to-hero/) on ECS, and automate deployments with the Actions basics in [GitHub from zero to hero](en/posts/github-zero-to-hero-actions/). The official docs are excellent: start with the [AWS Free Tier](https://aws.amazon.com/free/) page, the [IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) and the [AWS CLI user guide](https://docs.aws.amazon.com/cli/latest/userguide/).
