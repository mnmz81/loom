---
title: "Fine-tuning: when it helps and how LoRA works"
summary: "When fine-tuning beats prompting and RAG, and when it does not, what training data looks like, how LoRA and QLoRA train a model cheaply, and how to check the result."
date: 2026-10-13
tags: [ai, fine-tuning, tutorial]
series: { key: ai-tuning, order: 1 }
---

**Fine-tuning** means continuing to train a model on your own examples, so that its weights change. It is the most powerful way to adapt a model, and the most expensive one to do right. This post covers when it is worth it, and how LoRA makes it cheap enough to try.

The LoRA arithmetic was run with Python 3.9 and its output is real. The PEFT code follows the [Hugging Face PEFT quicktour](https://huggingface.co/docs/peft/quicktour), and its output line is quoted from there. Fine-tuning requires a model whose weights you can train: an open-weight model, or a hosted model whose provider offers fine-tuning.

## Try the cheaper options first

Practitioner guides agree on an order: **prompting first, RAG second, fine-tuning last**. The reason is what each method changes:

- **Prompting** changes the instructions. Instant to try, easy to change.
- **RAG** changes what the model can read. Use it when the model is missing **knowledge**, especially knowledge that changes. Fine-tuning facts into weights means retraining every time they change, and the model can still mix them up.
- **Fine-tuning** changes the model's **behavior**: a strict output format, a domain's style and vocabulary, a narrow task done the same way every time.

Fine-tuning tends to pay off when the model understands the task but does not perform it the way you need, even with a good prompt; when you need a small, cheap, fast model to do one job well; or when the data must stay on your own hardware. It tends not to pay off with only a few dozen examples, with facts that change, or without a way to measure the result.

## What the training data looks like

Supervised fine-tuning data is a set of example conversations: the input and the exact output you want. It is usually stored as JSONL, one example per line:

```json
{"messages": [{"role": "system", "content": "Classify the ticket. Answer with one label."}, {"role": "user", "content": "I was charged twice this month"}, {"role": "assistant", "content": "billing"}]}
{"messages": [{"role": "system", "content": "Classify the ticket. Answer with one label."}, {"role": "user", "content": "The app crashes when I upload a photo"}, {"role": "assistant", "content": "bug"}]}
```

Data quality decides most of the result. Practitioner guides warn that a small, sloppy dataset produces a model that is confidently wrong in your domain. Aim for hundreds to thousands of clean, varied examples that look like real traffic, and hold back a part for testing.

## LoRA: train a small add-on

Full fine-tuning updates every weight in the model, which needs as much GPU memory as training it in the first place. **LoRA** (low-rank adaptation) freezes the model and trains a small add-on instead. For a weight matrix W, it learns two thin matrices A and B, and the layer uses W + B·A. With a small rank `r`, A and B have far fewer numbers than W.

The arithmetic for LoRA on the `q_proj` layers of Llama-3.2-1B (hidden size 2048, 16 layers) with `r=8`:

```python
# Llama-3.2-1B: hidden size 2048, 16 layers; LoRA on q_proj (2048 x 2048) with r=8
d_in, d_out, layers, r = 2048, 2048, 16, 8

full = d_in * d_out * layers            # weights of all q_proj matrices
lora = r * (d_in + d_out) * layers      # A (r x d_in) + B (d_out x r) per layer

print(f"q_proj weights: {full:,}")
print(f"LoRA weights:   {lora:,}  ({lora / full:.2%} of q_proj)")
```

```text
q_proj weights: 67,108,864
LoRA weights:   524,288  (0.78% of q_proj)
```

The trained add-on (the **adapter**) is small enough to store and swap: the PEFT docs mention an adapter of about 6 MB next to a model of about 700 MB. One base model can serve several adapters, one per task.

## LoRA with Hugging Face PEFT

The PEFT library wraps a model with LoRA in a few lines:

```python
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-1B")
peft_config = LoraConfig(target_modules=["q_proj"], task_type=TaskType.CAUSAL_LM,
                         r=8, lora_alpha=32, lora_dropout=0.1)

peft_model = get_peft_model(model, peft_config)
peft_model.print_trainable_parameters()
```

```text
trainable params: 524,288 || all params: 1,236,338,688 || trainable%: 0.0424
```

The 524,288 matches the arithmetic above. From here you train with any normal training loop (the docs use the Transformers `Trainer`) and save only the adapter with `peft_model.save_pretrained("output_dir")`.

## QLoRA: when memory is the limit

**QLoRA** ([Dettmers et al., 2023](https://arxiv.org/abs/2305.14314)) loads the frozen base model in 4-bit precision and trains LoRA adapters on top. The paper fine-tuned a 65B-parameter model on a single 48 GB GPU. The local models post explains quantization; the short version is that 4-bit weights take a quarter of the memory of 16-bit ones, with a small loss in quality. Choose QLoRA when GPU memory, not time, is what stops you.

## Check the result

A fine-tuned model must be compared, on the same test set, with the cheaper options: the base model with a good prompt, and the base model with RAG. Check two things:

- **The target task got better**, measured on examples the model did not train on.
- **Nothing else broke.** Fine-tuning on a narrow task can make a model worse at general instructions it used to follow.

If a well-written prompt reaches the same score, keep the prompt. Base models keep improving, and a fine-tune is something you have to retrain and maintain. The evals post in the production series shows how to build the test set.

The next post covers distillation: training a small model to imitate a large one.
