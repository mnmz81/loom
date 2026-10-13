---
title: "AI glossary: my cheat sheet"
summary: "The AI terms from the series in one place, grouped by topic, each with a one-line definition and a link to the post that explains it: tokens, RAG, tools, MCP, agents, LoRA, evals and more."
date: 2026-10-13
tags: [ai, llm, cheatsheet]
---

Every term from the AI series in one place, with a one-line definition and a link to the post that explains it. The series has five parts: [the basics](en/posts/ai-what-is-llm/), [knowledge and RAG](en/posts/ai-embeddings/), [tools and agents](en/posts/ai-tools-function-calling/), [adapting a model](en/posts/ai-fine-tuning/) and [production](en/posts/ai-evals/).

## Models and tokens

- **LLM** (large language model): a model trained on huge amounts of text to predict the next token. [What is an LLM](en/posts/ai-what-is-llm/)
- **Token**: the unit a model reads and writes, usually a word or part of a word. [Tokens and the context window](en/posts/ai-tokens-context-window/)
- **Tokenizer**: splits text into tokens; it differs between model families. [Tokens and the context window](en/posts/ai-tokens-context-window/)
- **Context window**: everything the model can see in one request, including its answer. [Tokens and the context window](en/posts/ai-tokens-context-window/)
- **Context rot**: accuracy and recall degrade as the context grows. [Tokens and the context window](en/posts/ai-tokens-context-window/)
- **Transformer / attention**: the architecture behind LLMs; attention lets each token draw on earlier tokens. [How a language model is built](en/posts/ai-how-models-are-built/)
- **Pretraining**: training on huge amounts of text to predict the next token; produces a base model. [How a language model is built](en/posts/ai-how-models-are-built/)
- **SFT, RLHF, DPO**: supervised fine-tuning on example conversations, then training on human or AI preferences. [How a language model is built](en/posts/ai-how-models-are-built/)
- **Knowledge cutoff**: the date after which the model knows nothing. [How a language model is built](en/posts/ai-how-models-are-built/)
- **Open-weight model**: a model whose weights are published, so you can run it yourself. [Running models locally](en/posts/ai-local-models/)

## Generation and prompting

- **Logits / softmax**: raw scores per token, turned into probabilities. [Temperature, top-p and hallucinations](en/posts/ai-parameters-hallucinations/)
- **Temperature, top-p, top-k**: knobs that control how the next token is picked. [Temperature, top-p and hallucinations](en/posts/ai-parameters-hallucinations/)
- **Hallucination**: a confident answer that is wrong. [Temperature, top-p and hallucinations](en/posts/ai-parameters-hallucinations/)
- **System prompt**: instructions that apply to the whole conversation. [Prompting](en/posts/ai-prompting/)
- **Few-shot**: steering the model with a few examples in the prompt. [Prompting](en/posts/ai-prompting/)
- **Prefill**: starting the assistant's answer yourself; rejected by current Claude models. [Prompting](en/posts/ai-prompting/)
- **Structured outputs**: output constrained to a JSON schema. [Structured outputs and streaming](en/posts/ai-structured-outputs-streaming/)
- **Streaming**: receiving the answer piece by piece as it is written. [Structured outputs and streaming](en/posts/ai-structured-outputs-streaming/)
- **Thinking / reasoning model**: a model that works through a problem before answering. [Reasoning models](en/posts/ai-reasoning-models/)
- **Effort**: a setting that trades thoroughness for speed and cost. [Reasoning models](en/posts/ai-reasoning-models/)
- **Multimodal**: input beyond text, such as images and PDFs. [Multimodal](en/posts/ai-multimodal/)
- **stop_reason**: why the model stopped: `end_turn`, `max_tokens`, `tool_use`, `refusal` and more. [What is an LLM](en/posts/ai-what-is-llm/)

## Knowledge and retrieval

- **Embedding**: a vector that represents the meaning of a text. [Embeddings and semantic search](en/posts/ai-embeddings/)
- **Cosine similarity**: a measure of how close two vectors point. [Embeddings and semantic search](en/posts/ai-embeddings/)
- **Vector database**: stores vectors and finds the nearest ones fast. [Embeddings and semantic search](en/posts/ai-embeddings/)
- **RAG** (retrieval-augmented generation): retrieve relevant text and put it in the prompt. [RAG](en/posts/ai-rag-pipeline/)
- **Chunking**: splitting documents into small pieces before indexing. [RAG](en/posts/ai-rag-pipeline/)
- **BM25**: the classic keyword-ranking algorithm. [Better retrieval](en/posts/ai-rag-hybrid-rerank/)
- **Hybrid search / RRF**: combining keyword and vector search, often with reciprocal rank fusion. [Better retrieval](en/posts/ai-rag-hybrid-rerank/)
- **Reranker**: a model that scores query and candidate together, to reorder results. [Better retrieval](en/posts/ai-rag-hybrid-rerank/)
- **Contextual retrieval**: adding a short context to each chunk before indexing it. [Better retrieval](en/posts/ai-rag-hybrid-rerank/)
- **Agentic RAG**: the model searches as a tool, as often as it needs. [Agentic RAG and GraphRAG](en/posts/ai-agentic-rag-graphrag/)
- **Knowledge graph / GraphRAG**: facts as connected entities; GraphRAG summarizes graph communities to answer global questions. [Agentic RAG and GraphRAG](en/posts/ai-agentic-rag-graphrag/)

## Tools and agents

- **Tool / function calling**: the model asks your code to run a function. [Tools and function calling](en/posts/ai-tools-function-calling/)
- **tool_use / tool_result**: the model's request, and the result your code sends back. [Tools and function calling](en/posts/ai-tools-function-calling/)
- **MCP** (Model Context Protocol): an open standard for packaging tools, resources and prompts as servers. [MCP](en/posts/ai-mcp/)
- **Agent**: a model that chooses its own steps, using tools in a loop. [Agents](en/posts/ai-agents/)
- **Workflow**: steps fixed in code, with the model filling in each one. [Five workflow patterns](en/posts/ai-workflow-patterns/)
- **Prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer**: the five workflow patterns. [Five workflow patterns](en/posts/ai-workflow-patterns/)
- **Context engineering**: deciding what goes into the context on every turn. [Memory and context management](en/posts/ai-memory-context/)
- **Compaction**: replacing old turns with a summary. [Memory and context management](en/posts/ai-memory-context/)
- **Memory tool**: files the model reads and writes to remember across sessions. [Memory and context management](en/posts/ai-memory-context/)
- **Subagent / multi-agent**: a lead agent delegates focused work to agents with their own context. [Multi-agent systems](en/posts/ai-multi-agent/)
- **Computer use**: a model that operates a desktop through screenshots, mouse and keyboard. [Computer use and Agent Skills](en/posts/ai-computer-use-skills/)
- **Agent Skills**: folders of instructions and scripts loaded only when needed. [Computer use and Agent Skills](en/posts/ai-computer-use-skills/)

## Adapting models

- **Fine-tuning**: further training on your own examples, which changes the weights. [Fine-tuning](en/posts/ai-fine-tuning/)
- **LoRA / adapter**: training a small add-on instead of the whole model. [Fine-tuning](en/posts/ai-fine-tuning/)
- **QLoRA**: LoRA on top of a 4-bit base model. [Fine-tuning](en/posts/ai-fine-tuning/)
- **Distillation**: training a small student model to imitate a large teacher. [Distillation](en/posts/ai-distillation/)
- **Soft targets**: the teacher's full probability distribution, used to train the student. [Distillation](en/posts/ai-distillation/)
- **Quantization**: storing weights with fewer bits to save memory. [Running models locally](en/posts/ai-local-models/)
- **Ollama / GGUF**: a tool for running open models locally, and a common file format for them. [Running models locally](en/posts/ai-local-models/)

## Production

- **Eval**: test cases plus a way to grade the output. [Evals](en/posts/ai-evals/)
- **LLM-as-judge**: a model that grades output against a rubric. [Evals](en/posts/ai-evals/)
- **Trace / span**: all the steps of one request, and each step within it. [Observability](en/posts/ai-observability/)
- **Prompt caching**: reusing a repeated prompt prefix, cheaper and faster. [Cost and latency](en/posts/ai-cost-latency/)
- **Batch API**: asynchronous requests at a discount. [Cost and latency](en/posts/ai-cost-latency/)
- **Prompt injection**: untrusted text that tries to act as an instruction; direct or indirect. [Security](en/posts/ai-security/)
- **Excessive agency**: a model with more tools or permissions than the task needs. [Security](en/posts/ai-security/)
- **Guardrails**: checks around the model on input, output and actions. [Guardrails](en/posts/ai-guardrails/)
- **Red-teaming**: attacking your own system on purpose before attackers do. [Security](en/posts/ai-security/)
