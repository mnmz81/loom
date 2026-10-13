---
title: "How a language model is built"
summary: "Transformers, attention, pretraining, fine-tuning and preference training (RLHF, DPO): the stages that turn a pile of text into a chat assistant."
date: 2026-10-13
tags: [ai, llm]
series: { key: ai-basics, order: 2 }
---

The previous post described an LLM as a function that predicts the next token. This post opens the box one level: what the function is made of, and the training stages that take it from "continues any text" to "answers like an assistant".

No API is needed here. The small Python example was run with Python 3.9 and its output is real. The claims about training follow the original papers, linked inline.

## The transformer and attention

Almost every modern LLM is a **transformer**, an architecture introduced in the 2017 paper [Attention Is All You Need](https://arxiv.org/abs/1706.03762). Its central idea is **attention**: when the model processes a token, it looks at every earlier token and decides how much each one matters.

Take the sentence "The cat sat because it". To continue it, the model has to know what "it" refers to. Attention gives every earlier word a score, turns the scores into weights that add up to 1, and mixes in information mostly from the high-weight words. A toy version of that last step:

```python
import math

# How much should "it" attend to each earlier word? (toy scores)
words = ["The", "cat", "sat", "because", "it"]
scores = [0.1, 2.5, 0.3, 0.2, 0.5]

exps = [math.exp(s) for s in scores]
weights = [e / sum(exps) for e in exps]
for word, w in zip(words, weights):
    print(f"{word:8} {w:.2f}")
```

```text
The      0.06
cat      0.70
sat      0.08
because  0.07
it       0.09
```

In a real model the scores are not written by hand. They come from learned weights, and the model runs many attention "heads" in parallel across dozens of layers. The principle is the same: every token can draw on every earlier token, which is why the model can keep track of long text.

## Stage 1: pretraining

The model starts with random weights. In **pretraining** it reads a huge amount of text, and at every position it predicts the next token, compares the prediction with the real token, and adjusts its weights a little. This repeats trillions of times.

The result is a **base model**. It knows a lot about language and the world, but it only continues text. Ask it a question and it may answer, or it may continue with three more questions, because that also looks like plausible text.

Most of what a model "knows" comes from this stage. It is also where the **knowledge cutoff** comes from: the model knows nothing that happened after its training data was collected.

## Stage 2: supervised fine-tuning

To turn the base model into an assistant, it is trained further on example conversations: a question, and a good answer written or checked by people. This is **supervised fine-tuning** (SFT). The model learns the format of a conversation and the habit of answering what was asked.

The amount of data is tiny compared with pretraining. Fine-tuning changes how the model behaves much more than what it knows, a point that comes back in the post on fine-tuning later in the series.

## Stage 3: preference training

An answer can be correct and still unhelpful, too long, or unsafe. The last stage teaches the model which of two answers is **better**:

- **RLHF** (reinforcement learning from human feedback): people rank several answers, a reward model learns their preferences, and the LLM is trained to get a high reward. Described in [InstructGPT](https://arxiv.org/abs/2203.02155).
- **DPO** (direct preference optimization): trains directly on pairs of "preferred" and "rejected" answers, without a separate reward model. Described in [the DPO paper](https://arxiv.org/abs/2305.18290).
- **Constitutional AI**: Anthropic's approach, where a written set of principles guides AI feedback on the answers. Described in [Constitutional AI](https://arxiv.org/abs/2212.08073).

![Three stages: pretraining produces a base model, supervised fine-tuning teaches it to follow instructions, preference training produces an assistant](/images/ai-how-models-are-built/training-stages.svg)

## What this explains

The training stages explain several behaviors you will meet in this series:

- The model knows facts up to its cutoff and nothing after. For newer or private information you have to give it the text, which is what RAG does.
- It was trained to produce answers people prefer, so it can sound confident even when it is wrong.
- Its style and format can be changed with relatively little data, which is why fine-tuning works for behavior and not for adding knowledge.

The next post covers tokens and the context window: the units the model reads and writes, and how much it can see at once.
