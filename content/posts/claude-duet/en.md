---
title: "Claude Duet: an agent that reaches out first"
summary: "Claude Duet is an Anthropic agent that works in the cloud on your connected apps, sends a morning brief, and asks for approval before sending, paying, signing or deleting anything."
date: 2026-10-23
tags: [ai, agents]
---

A chat waits for you to write. [Claude Duet](https://claude.com/product/claude-duet), which Anthropic announced on October 21, 2026 as a research preview, works the other way: it goes through the apps you connected, decides what needs your attention and reaches out to you. The stated audience is professionals and small business owners.

The facts here follow the [official announcement](https://claude.com/resources/articles/claude-duet) and the [Help Center guide](https://support.claude.com/en/articles/17631495-getting-started-with-claude-duet). I had no access to the product itself, and in a preview the details will change.

## What it does

- **Morning brief.** Every morning Duet goes through your email, calendar and other connected apps, flags what is urgent, and can already start the first step, such as drafting replies for you to approve.
- **Check-ins during the day.** Every few hours it checks the accounts again and messages you only when something needs you. You can set what to hear about and how often.
- **One thread.** You type or talk to it in one ongoing thread, whether the request takes a minute or is a weeklong project. You can open channels by topic, and they share the same memory.
- **Bigger jobs.** It picks which apps to use and how much effort to spend. Results come back as editable files: research briefs, financial models, slide decks and dashboards, in the **Make** tab. The **Tasks** tab shows what is in progress and what waits for you. Duet can suggest that a task is done, but only you mark it complete.

It runs on **its own virtual machine in the cloud**, with a browser, so your phone or laptop does not need to stay on. For sites without a connector it uses that browser. Memory, skills and connected apps carry over from your Claude account, so there is no setup from scratch. According to Anthropic it can use more than 6,000 connectors and plugins, among them Gmail, Google Calendar, Slack, QuickBooks, HubSpot and Docusign. Duet runs on Claude Opus 5.5.

## Approvals and what is always off-limits

Duet reads and drafts on its own. Before it **sends a message, pays, signs a document or deletes anything**, it shows exactly what it is about to do and waits for approval. If you do not approve right away, it finishes the rest of the task and asks later.

Some actions it will not take even with approval: trading securities, moving money between accounts and accessing someone else's account. Purchases go through Stripe's Link, with a one-time card per purchase, or Shopify's Shop Pay, and both are connected only inside Duet.

The other safeguards, per the announcement:

- **Passwords.** Duet does not see passwords or sign-in tokens. When its browser needs a password, you type it into a separate form on your device, outside the chat.
- **Sensitive data.** A dedicated classifier and system prompt check every message. Credit card numbers and government IDs are blocked, and personal health or financial information is shared only when you explicitly ask.
- **Prompt injection.** Content from emails and web pages counts as information, not instructions. The Help Center admits such attacks are still possible, which is why approvals matter: read every draft and approval request before you confirm.

You can disconnect any app at any time. Disconnecting stops future access, but the memory of what it already saw stays.

## Limits in the preview

- No model choice: Opus 5.5, and Duet sets the effort level itself.
- You cannot watch its browser or take it over.
- Check-ins run at intervals, so something urgent that arrives between them may wait.
- It does not make calls or send texts. Email from your connected accounts it does, with approval.
- It reads your Claude work but does not edit it, and does not see every file on your computer.
- According to the Help Center, Microsoft 365 is not supported yet.
- According to the announcement, it may misread a thread or misjudge urgency, and personal tasks such as booking tickets are weaker than work tasks.

## How to join

At the time of writing you need:

- A Pro or Max plan and a US-based Claude account. Not Team or Enterprise yet, and Anthropic says that is planned.
- A spot on the waitlist from the product page. Invitations go out in waves with no guaranteed date, and access is tied to the email you signed up with, so sign up with your Claude account's email.
- The iPhone or Android app, or claude.ai in a browser.

There is no extra charge during the preview, but Duet draws on your plan's limits at the same rate as chat, including the five-hour and weekly limits. Background work counts too, such as the morning brief and periodic check-ins, and big jobs such as a financial model use more, so limits may run out sooner. Everyone admitted gets one full limit reset, usable until November 30, 2026. These terms will change, so check the Help Center guide before relying on them.
