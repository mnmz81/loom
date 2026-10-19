---
title: "AWS from zero to hero: the map and a safe account"
summary: "What AWS is and the shared responsibility model, Regions and Availability Zones, protecting the root user, the free plan, and a budget before you create anything."
date: 2026-10-10
updated: 2026-10-19
tags: [aws, cloud]
series: { key: devops, order: 23 }
---

AWS has well over a hundred services, and the console menu looks like a wall. A small core does most of the work: somewhere to store files, somewhere to run code, a network around them, a database, and a way to control who can touch what. Learn those, and the rest is variations.

This series is a map, not a manual: the core services in the order you meet them, the mistakes beginners make (mostly security and cost), and links to the official docs. Prices, free plans and console menus change often, so I describe ideas and link to the source instead of quoting numbers.

## What AWS is

AWS is a cloud platform: instead of buying servers, you rent computing, storage and networking over the internet and pay for what you use. You create resources with a few clicks or one command, and delete them when you're done.

Two ideas to have before anything else:

- **Everything is a service with an API.** The console, the command line and your own code all call the same APIs. Anything you can click, you can script.
- **Shared responsibility.** AWS secures the cloud itself: data centers, hardware, virtualization. You secure what you put in it: access, configuration, your data, and the operating system of any server you run. A public S3 bucket that leaks data is the customer's problem. The more managed the service, the more AWS takes off your plate.

## The map: Regions and Availability Zones

AWS resources live in physical places:

- A **Region** is a geographic area with its own data centers, named like `eu-central-1` (Frankfurt) or `us-east-1` (N. Virginia). Regions are isolated, and your data stays in the Region you choose unless you move it.
- An **Availability Zone (AZ)** is one or more data centers inside a Region, with separate power, cooling and networking, connected by fast links so a failure in one doesn't take down the others.
- An **edge location** is a point of presence used by services such as CloudFront (a CDN) to serve content close to users.

![A Region contains three Availability Zones, each made of data centers with their own power, cooling and network, connected by low-latency links. A second Region sits apart and is isolated from the first.](/images/aws-zero-to-hero/regions-and-azs.svg)

Two consequences you'll feel immediately. **Almost everything is per Region**: the console has a Region picker in the top bar, and a bucket or server "disappears" if you're looking at the wrong Region. And **high availability means more than one AZ**, because a single AZ can fail. Choose a Region for distance to users (latency), price, available services, and legal rules about where data may live.

You can list the zones of a Region from the CLI ([installed in the next part](en/posts/aws-zero-to-hero-iam-cli-s3/)):

```bash
aws ec2 describe-availability-zones --region eu-central-1 \
  --query "AvailabilityZones[].{Zone:ZoneName,State:State}" --output table
```

## Your account, safely

Sign up at [aws.amazon.com](https://aws.amazon.com/) with an email, a password and a payment method. That first identity is the **root user**, and it can do anything, including closing the account. Treat it like the master key:

1. **Turn on MFA for the root user right away**, ideally with a passkey or a security key. This is the single most useful thing you can do.
2. **Don't use root for daily work.** Create a normal identity for yourself ([with IAM](en/posts/aws-zero-to-hero-iam-cli-s3/)) and keep the root user for the few tasks that need it.
3. **Never create access keys for root.**

### Free plan, credits and bills

AWS's free offer changes, so check the [AWS Free Tier page](https://aws.amazon.com/free/) rather than an old blog post (including this one). At the time of writing, a new account can start on a **Free plan** with credits; the account closes after a set period or when the credits run out, unless you upgrade to a **Paid plan** (every service, pay-as-you-go). A few services are "always free" within monthly limits. Either way, **the free allowance is a limit, not a guarantee that nothing can cost you.**

Before you create anything, set a budget:

- Open **Billing and Cost Management → Budgets** and create a **cost budget** with a small monthly amount, such as 10 dollars, with email alerts at a percentage of it and on a forecast.
- Budget data lags (refreshed up to three times a day), so charges can pass your threshold before the alert arrives. A budget is a smoke detector, not a spending cap.

Also check **Billing → Bills** and **Cost Explorer** now and then. Most surprise bills come from something you forgot to turn off ([the usual suspects](en/posts/aws-zero-to-hero-lambda-costs/)).
