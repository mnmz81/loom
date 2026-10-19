---
title: "AWS: IAM, the CLI and S3"
summary: "Users, roles and policies in IAM and the best practices that matter, signing in to the AWS CLI with short-term credentials and profiles, and storing files in S3 buckets safely."
date: 2026-10-10
tags: [aws, cloud]
series: { key: devops, order: 61 }
---

This part assumes an account set up as in [AWS from zero to hero](en/posts/aws-zero-to-hero/): MFA on the root user and a budget in place.

## IAM: who can do what

**IAM (Identity and Access Management)** is the service that decides who is allowed to do what, and it's free. The pieces:

- A **principal** is whoever makes a request: a person, an application or an AWS service.
- A **user** is a long-lived identity with a password and/or access keys. A **group** is a set of users that share permissions.
- A **role** is an identity with permissions that *anyone or anything can assume temporarily*, receiving short-lived credentials. EC2 instances and Lambda functions use roles, so your code never needs a stored password.
- A **policy** is a JSON document that says what's allowed or denied.

This policy allows reading objects from one bucket, and nothing else:

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

**Everything is denied by default**, an `Allow` opens something up, and an explicit `Deny` always wins over any `Allow`.

![A principal makes a request. The IAM policy check looks for a matching Allow; an explicit Deny always wins. If allowed, the request reaches the resource, such as an S3 bucket. With no matching Allow the request is denied with AccessDenied.](/images/aws-zero-to-hero/iam-permissions.svg)

The official best practices boil down to a few habits:

- **Prefer temporary credentials.** For people, AWS recommends federation, with **IAM Identity Center** as the central option. For applications, use **roles**.
- **Require MFA** wherever you have users.
- **Apply least privilege.** Start from AWS managed policies if convenient, then narrow them; IAM Access Analyzer can generate a tighter policy from observed activity.
- **Review and remove** unused users, roles and keys regularly.

For a personal account: enable IAM Identity Center, create yourself a user with a permission set that is *not* full administrator unless you need it, and sign in through its access portal. Don't paste IAM access keys into files and repos: leaked keys are how accounts get hijacked to mine crypto at your expense.

## The AWS CLI

The console can do all of this, but the **AWS CLI** is how you script and repeat it. Install version 2 from the [official guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html), then sign in with short-term credentials:

```bash
aws --version
aws login                    # sign in with your console credentials (short-term credentials)
# or, with IAM Identity Center:
aws configure sso            # a wizard: SSO start URL, region, account, role, profile name
aws sso login --profile <name>   # later sign-ins with that profile
aws sts get-caller-identity  # who am I, and which account?
```

Run `aws sts get-caller-identity` first in any new terminal: "which account and identity am I using?" is the question behind many expensive mistakes. The CLI keeps settings in profiles (`~/.aws/config`, `~/.aws/credentials`). Pick one per call with `--profile`, or per terminal with an environment variable; `--region` works the same way for the Region:

```bash
aws s3 ls --profile dev
export AWS_PROFILE=dev
aws configure list           # shows which profile, region and credentials are in effect
```

The docs don't recommend long-term access keys (`aws configure` with a key and secret). Use them only if nothing else works, and never commit them.

## S3: files in the cloud

**Amazon S3 (Simple Storage Service)** stores objects: a file plus metadata. It's the most-used AWS service, and the glue for many others (backups, website assets, data lakes, logs).

- A **bucket** is a container for objects. Its name must be globally unique, and you choose a Region when you create it. You can't rename it or move it to another Region.
- An **object** has a **key**, its unique name in the bucket. There are no real folders: `photos/2026/cat.jpg` is just a long key, and the console shows slashes as folders (a "prefix").
- S3 charges for what you store, requests, and data transferred out.

From the start:

- **Buckets are private by default**, with **Block Public Access** on. Keep it that way unless you truly need public files: most S3 leaks are a bucket someone made public by mistake.
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

A **presigned URL** gives someone time-limited access to one private object without making the bucket public, usually the right answer to "how do I share this file?".

Two commands deserve a warning: `aws s3 sync ... --delete` also deletes destination objects missing from the source, and `aws s3 rm ... --recursive` deletes everything under a prefix. Add `--dryrun` first. When you're done experimenting, empty and remove the bucket: `aws s3 rb s3://my-unique-bucket-name --force`.
