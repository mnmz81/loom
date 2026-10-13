---
title: "Temperature, top-p and hallucinations"
summary: "How the next token is picked, what temperature and top-p do, why current Claude models no longer accept them, and why models hallucinate."
date: 2026-10-13
tags: [ai, llm, tutorial]
series: { key: ai-basics, order: 4 }
---

The first post said that the model produces a probability for every possible next token and then "one token is picked". This post is about that pick: the knobs that control it, why they matter less than they used to, and how the same mechanism leads to hallucinations.

The two small Python simulations were run with Python 3.9 and their output is real. The API facts follow the [Claude Opus 5.5 migration guide](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide) and the guide to [reducing hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations).

## Temperature

The model first produces a raw score (a **logit**) for every token. A function called softmax turns the scores into probabilities. **Temperature** divides the scores before softmax:

- Low temperature (below 1) sharpens the distribution: the likely token becomes even more likely.
- High temperature (above 1) flattens it: unlikely tokens get a real chance.

A simulation with four candidate tokens:

```python
import math

logits = {"Paris": 5.0, "Lyon": 2.0, "Nice": 1.5, "banana": -1.0}

def softmax(scores, temperature):
    scaled = {tok: s / temperature for tok, s in scores.items()}
    top = max(scaled.values())
    exps = {tok: math.exp(s - top) for tok, s in scaled.items()}
    total = sum(exps.values())
    return {tok: e / total for tok, e in exps.items()}

for t in (0.5, 1.0, 2.0):
    probs = softmax(logits, t)
    row = "  ".join(f"{tok}={p:.3f}" for tok, p in probs.items())
    print(f"T={t}: {row}")
```

```text
T=0.5: Paris=0.997  Lyon=0.002  Nice=0.001  banana=0.000
T=1.0: Paris=0.924  Lyon=0.046  Nice=0.028  banana=0.002
T=2.0: Paris=0.691  Lyon=0.154  Nice=0.120  banana=0.034
```

At `T=2.0`, "banana" gets about a 3 percent chance. That is where "creative" answers come from, and also nonsense.

## Top-p and top-k

Two more knobs cut the list of candidates before the pick:

- **top-k** keeps only the k most likely tokens.
- **top-p** (nucleus sampling) keeps the smallest set of tokens whose probabilities add up to at least p.

```python
probs = {"Paris": 0.70, "Lyon": 0.15, "Nice": 0.10, "banana": 0.05}

def top_p(probs, p):
    kept, total = {}, 0.0
    for tok, prob in sorted(probs.items(), key=lambda kv: kv[1], reverse=True):
        kept[tok] = prob
        total += prob
        if total >= p:
            break
    return list(kept)

print(top_p(probs, 0.8))
print(top_p(probs, 0.95))
```

```text
['Paris', 'Lyon']
['Paris', 'Lyon', 'Nice']
```

With `p=0.8`, "Nice" and "banana" can never be picked, no matter how high the temperature.

## Current Claude models: steer with the prompt

On many other models and APIs, and on older Claude models, you still set these parameters per request. On current Claude models you mostly do not. The migration guide says that setting `temperature`, `top_p` or `top_k` to any non-default value on Claude Opus 4.7 and later models returns a 400 error, and that the Python SDK v1.0 and later does not even accept them. The guide also notes that `temperature = 0` "never guaranteed identical outputs" on earlier models.

What replaces them:

- **The prompt.** Ask for the style you want: "answer in one short sentence", "give three different ideas".
- **Effort.** `output_config={"effort": "low"}` makes the model spend fewer tokens; higher levels make it more thorough. The post on reasoning models covers it.
- **Structured outputs**, when you need an exact format. Covered two posts from now.

The concepts still matter: they explain why the same prompt gives different answers, and you will meet them on local models later in the series.

## Why models hallucinate

A **hallucination** is a confident answer that is wrong: an invented fact, a quote that does not exist, a function that is not in the library. It follows from the loop itself. The model picks tokens that are likely given the text so far. Nothing in that loop checks the text against the world. A fake citation in the right format is a very likely sequence of tokens.

Hallucinations are more common when the answer is not in the training data (a recent event, a private document, an obscure detail) and when the prompt pushes the model to answer anyway.

## Reducing hallucinations

The official guide lists techniques that work today:

- **Allow "I don't know".** Say explicitly that it is fine to answer that the information is missing.
- **Ground the answer in quotes.** For long documents, ask the model to first extract word-for-word quotes, and then answer only from them.
- **Ask for citations**, and have the model remove any claim it cannot back with a quote.
- **Restrict to the given documents**: tell the model to use only the provided text, not its general knowledge.
- **Compare several runs.** If the same question gives inconsistent answers, treat the answer as suspect.

The guide is clear that these techniques reduce hallucinations but do not eliminate them. For anything important, check the answer. Giving the model the right documents is the strongest fix, and that is what RAG is about.

The next post is about prompting: how to write the instructions that do the steering.
