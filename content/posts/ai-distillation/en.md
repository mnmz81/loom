---
title: "Distillation: a small model that learns from a large one"
summary: "What knowledge distillation is, why a teacher's soft probabilities teach more than the right answer, and how distillation of LLMs works in practice: teacher data, filtering, fine-tuning a student."
date: 2026-10-13
tags: [ai, fine-tuning, tutorial]
series: { key: ai-tuning, order: 2 }
---

Large models are smart and expensive. Small models are cheap and fast, but less capable. **Distillation** tries to get some of both: a large **teacher** model teaches a small **student** model to imitate it on a specific job. Many of the small, fast models you can use today were trained partly this way.

The soft-target example was run with Python 3.9 and its output is real. The teacher-data code follows the official API docs and was not run. The theory comes from [Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531) (Hinton, Vinyals and Dean, 2015).

## The idea

Normal training teaches a model from "hard" labels: this image is a cat, full stop. A trained teacher knows more than that. Its probabilities say that the image is very likely a cat, somewhat like a dog, and nothing like a car. Hinton and his co-authors call that extra information "dark knowledge", and showed that training a student on the teacher's full probability distribution (**soft targets**) transfers it.

## Soft targets and temperature

The teacher's probabilities are usually very sharp, so the paper softens them with a temperature, the same knob as in the temperature post:

```python
import math

def softmax(scores, t):
    exps = [math.exp(s / t) for s in scores]
    return [e / sum(exps) for e in exps]

# The teacher's scores for: cat, dog, fox, car
teacher_logits = [6.0, 4.0, 3.0, -2.0]

for t in (1, 4):
    print(f"T={t}:", [round(p, 3) for p in softmax(teacher_logits, t)])
```

```text
T=1: [0.844, 0.114, 0.042, 0.0]
T=4: [0.452, 0.274, 0.213, 0.061]
```

At `T=1` the answer is nearly just "cat". At `T=4` the student also sees that dog and fox are much closer to cat than car is. The student is trained to match these softened probabilities, usually together with the correct labels.

## Distilling LLMs in practice

Classic distillation needs the teacher's raw scores (logits). With a hosted LLM you usually only get its text, so in practice LLM distillation is often **sequence-level**: the teacher writes answers, and the student is fine-tuned on them. The steps:

1. **Collect real inputs** for the job: the questions, documents or tickets the small model will handle.
2. **Have the teacher answer them**, with the best prompt you have, possibly with high effort and thinking.
3. **Filter**: drop wrong or low-quality answers, with checks in code or an evaluator model. Bad teacher answers become bad student habits.
4. **Fine-tune the student** on the remaining pairs, using the method from the previous post (LoRA works well here).
5. **Evaluate** the student against the teacher on a held-out test set.

Generating teacher data is a plain loop that writes JSONL in the fine-tuning format:

```python
import json
import anthropic

client = anthropic.Anthropic()
SYSTEM = "Classify the ticket. Answer with one label: billing, bug, account or other."

with open("tickets.txt") as f, open("train.jsonl", "w") as out:
    for ticket in f:
        ticket = ticket.strip()
        reply = client.messages.create(
            model="claude-opus-5-5",
            max_tokens=200,
            system=SYSTEM,
            messages=[{"role": "user", "content": ticket}],
        )
        label = reply.content[-1].text.strip().lower()
        if label in {"billing", "bug", "account", "other"}:      # simple quality filter
            example = {"messages": [{"role": "system", "content": SYSTEM},
                                    {"role": "user", "content": ticket},
                                    {"role": "assistant", "content": label}]}
            out.write(json.dumps(example) + "\n")
```

For thousands of inputs, send them as a batch: the models overview lists Message Batches at 50% off the normal price, with results delivered later instead of immediately.

## Before you distill

- **Check the terms of use.** Model providers' terms often restrict using a model's outputs to train other models, especially competing ones. Read the terms of the teacher you plan to use.
- **Distill a narrow job.** A small student can match a large teacher on one task with a clear format. It will not match it on everything.
- **Count the cost.** Teacher calls, filtering and training cost money and time. It pays off when the student will handle a large volume of requests, or must run where the large model cannot (on a device, offline, on your own servers).
- **Compare with a plain small model first.** A current small model with a good prompt is sometimes already good enough.

The next post covers running models on your own machine, which is where most distilled students end up.
