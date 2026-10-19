---
title: "AWS: EC2 servers, VPC networks and RDS databases"
summary: "Launching and connecting to an EC2 instance and what it costs, a VPC with public and private subnets across two zones, and a managed RDS database the internet can't reach."
date: 2026-10-10
tags: [aws, cloud]
series: { key: devops, order: 62 }
---

This part uses the AWS CLI and the IAM ideas from [IAM, the CLI and S3](en/posts/aws-zero-to-hero-iam-cli-s3/).

## EC2: virtual servers

**Amazon EC2 (Elastic Compute Cloud)** rents you virtual servers, called **instances**: the closest thing to "a computer in the cloud", and you're responsible for what runs on it. The vocabulary:

- An **AMI (Amazon Machine Image)** is a template for the instance: the operating system and any preinstalled software. You pick one at launch (Amazon Linux, Ubuntu, Windows...).
- An **instance type** is the hardware size: a family and a size, such as `t3.micro`. Each type is a different balance of CPU, memory, network and storage.
- A **key pair** is how you log in over SSH: AWS keeps the public key, you keep the private key. Lose the private key and you can't get in that way.
- A **security group** is a virtual firewall around the instance: it lists which protocols, ports and source IP ranges may reach it. Everything not allowed is blocked.
- **EBS (Elastic Block Store)** volumes are the instance's persistent disks. **Instance store** disks are temporary and are wiped when the instance stops or is terminated.

Launch one from the console (**EC2 → Launch instance**) or the CLI. This is the shape of a launch command; fill in a real AMI, key pair and security group of your own:

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

Then connect with `ssh -i my-key.pem ec2-user@<public-ip>` (Amazon Linux uses `ec2-user`, Ubuntu `ubuntu`). The commands you'll reach for on that server are in my [Linux commands cheat sheet](en/posts/linux-commands/). EC2 Instance Connect and Session Manager open a shell without SSH keys.

Three EC2 facts that save money and pain:

- **Stop is not terminate.** A *stopped* instance isn't billed for compute, but its EBS volumes still are. *Terminating* deletes the instance (and, by default, its root volume). If you're done, terminate.
- **Billing is per second** (one-minute minimum) for On-Demand instances. Savings Plans and Reserved Instances commit you for 1 or 3 years at a lower price; Spot Instances use spare capacity at a discount but can be reclaimed.
- **Public IPv4 addresses are charged,** even on a server you're not using. Ask whether the instance needs one at all.

If your app is in a container, Amazon ECS and EKS run it for you; start with [Docker from zero to hero](en/posts/docker-zero-to-hero/) if that's new.

## VPC: your private network

Every server and database sits inside a **VPC (Virtual Private Cloud)**: a virtual network logically isolated from everyone else's. Each Region has a **default VPC** so you can launch an instance and reach it right away. For anything real, design your own.

- A **subnet** is a slice of the VPC's IP range, and it lives in **one Availability Zone**.
- A **route table** says where traffic from a subnet goes.
- An **internet gateway** connects the VPC to the internet. A **public subnet** is one whose route table sends internet traffic to that gateway. A **private subnet** has no such route.
- A **NAT gateway** lets resources in a private subnet make outbound requests (for updates, say) without being reachable from the internet. It's a paid component, so it's a common line on a surprise bill.
- A **security group** is a stateful firewall attached to a resource, and the one you'll use most. A **network ACL** is a second, stateless filter at the subnet level.

The classic layout puts what faces the internet in public subnets and everything else in private ones, in at least two zones:

![A VPC with an internet gateway and two Availability Zones. Each zone has a public subnet with a web server and a private subnet with a database. The web servers reach the databases, and the private subnets have no route from the internet.](/images/aws-zero-to-hero/vpc-layout.svg)

The key trick: let the database accept connections *only from the web servers' security group*, not from "anywhere". Then even if someone finds its address, they can't reach it.

## RDS: databases without the babysitting

On an EC2 instance, patching, backups and failover are your job. **Amazon RDS (Relational Database Service)** is the managed alternative: you choose an engine (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle or Db2; Aurora is a related AWS-built service) and AWS handles installation, patching, automated backups and failure recovery.

- A **DB instance** is a managed database server, with an **instance class** (its CPU and memory) and **storage**.
- **Multi-AZ** keeps a standby copy in another zone and fails over to it if the primary has problems. This is about availability, not about scaling reads.
- **Read replicas** copy the data to other instances to spread read traffic.
- RDS runs inside your VPC. Put it in **private subnets** and let only your application's security group connect.

You're still responsible for your schema, queries, access control and data. Database free options have rules of their own, so check the RDS free-tier page first: a forgotten database is a classic surprise bill.
