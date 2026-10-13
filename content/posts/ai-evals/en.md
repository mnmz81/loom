---
title: "Evals: measuring an LLM system"
summary: "Why every LLM system needs an evaluation set, how to build one, code-based checks, LLM-as-judge with a rubric, and how to use evals to compare prompts, models and settings."
date: 2026-10-13
tags: [ai, llmops]
series: { key: ai-production, order: 1 }
---

Almost every post in this series ended with "measure it". This post explains how. An **eval** is a set of test cases with a way to grade the output, run every time you change the prompt, the model, the retrieval or a setting. Without one, every change is a guess, and you discover regressions from your users.

The small harness was run with Python 3.9 and its output is real; the model call in it is a stand-in, so the harness itself can be tested. The LLM-judge code follows the official guide to [developing tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) and was not run.

## What makes a good eval

The official guide gives four principles:

- **Specific, measurable criteria.** Not "safe outputs" but, in the guide's example, "less than 0.1% of outputs out of 10,000 trials flagged for toxicity".
- **Task-specific cases** that mirror real traffic, including edge cases: irrelevant input, very long input, ambiguous requests.
- **Automate when possible**, so you can run it on every change.
- **Volume over polish.** The guide says that "more questions with slightly lower signal automated grading is better than fewer questions with high-quality human hand-graded evals".

Start with real examples: questions users asked, tickets that came in, documents you process. Anthropic's multi-agent article started with about 20 realistic queries; a few dozen good cases already catch most regressions.

## Code-based grading

When the answer can be checked by code, check it by code. It is fast, cheap and exact. A classification eval with exact match:

```python
# A tiny eval: each case has an input and the expected label
cases = [
    {"input": "I was charged twice", "expected": "billing"},
    {"input": "App crashes on upload", "expected": "bug"},
    {"input": "How do I change my email?", "expected": "account"},
    {"input": "Refund for last month please", "expected": "billing"},
]

def classify(text):
    # Stand-in for the model call, so the harness itself can be tested
    fake_answers = {"I was charged twice": "Billing", "App crashes on upload": "bug",
                    "How do I change my email?": "billing", "Refund for last month please": "billing"}
    return fake_answers[text]

def exact_match(output, expected):
    return output.strip().lower() == expected.lower()

failures = []
for case in cases:
    output = classify(case["input"])
    if not exact_match(output, case["expected"]):
        failures.append((case["input"], case["expected"], output))

passed = len(cases) - len(failures)
print(f"passed {passed}/{len(cases)} ({passed / len(cases):.0%})")
for text, expected, got in failures:
    print(f"FAIL: {text!r}: expected {expected!r}, got {got!r}")
```

```text
passed 3/4 (75%)
FAIL: 'How do I change my email?': expected 'account', got 'billing'
```

Other code-based checks from the guide: string contains, valid JSON against a schema, embedding similarity between answers (for consistency), and ROUGE for summaries. For RAG, also check retrieval separately: was the right chunk in the top results?

## LLM-as-judge

Tone, helpfulness and faithfulness to a document cannot be checked with an exact match. For those, a second model grades the output against a **rubric**:

```python
import anthropic

client = anthropic.Anthropic()

def judge(question, answer, documents):
    prompt = f"""Grade the answer using only the documents.

<documents>{documents}</documents>
<question>{question}</question>
<answer>{answer}</answer>

Rubric:
- 1: every claim in the answer is supported by the documents
- 0: at least one claim is not supported, or the answer contradicts the documents

Think about each claim first, then end with a line "SCORE: 0" or "SCORE: 1"."""
    reply = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in reply.content if b.type == "text")
    return int(text.strip().splitlines()[-1].removeprefix("SCORE:").strip())
```

What makes a judge reliable:

- **A detailed rubric** with clear levels, not "is this good?". Binary or small scales (0/1, 1 to 5) are more consistent than open scores.
- **Reasoning before the score**, so the judge looks at each claim before deciding.
- **A different model from the one being graded**, which the guide calls "generally best practice".
- **Check the judge** against a few dozen cases you graded by hand. If it disagrees with you often, fix the rubric before trusting its numbers.

## Using evals

An eval is a tool for decisions:

- **Before a change**: run it, save the score. After: run again, compare. Look at the cases that flipped, not only the total.
- **Choosing a model or effort level**: the docs repeatedly recommend an effort sweep, running the same eval at several levels and taking the cheapest that keeps quality.
- **In CI**: a small, fast eval on every prompt change, like unit tests. A larger one before a release.
- **From production**: when a user reports a bad answer, add it as a case. The eval grows from real failures.

Remember that LLM outputs vary between runs. For important decisions, run each case more than once and compare averages, not single results.

The next post covers observability: seeing what your system actually does in production.
