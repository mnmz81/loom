---
title: "Agentic RAG and GraphRAG"
summary: "Two steps beyond a fixed RAG pipeline: letting the model search as a tool, as many times as it needs, and building a knowledge graph for questions that span many documents."
date: 2026-10-13
tags: [ai, rag, tutorial]
series: { key: ai-rag, order: 4 }
---

The RAG pipeline from the previous posts runs the same way for every question: one search, then one answer. That works for questions like "how many vacation days do I get?". It breaks down for questions that need several searches, or that are about a whole collection rather than one passage. This post covers two answers to that: agentic RAG and GraphRAG.

The graph example was run with Python 3.9 and its output is real. The tool definition follows the [tool use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), and the GraphRAG description follows the paper [From Local to Global](https://arxiv.org/abs/2404.16130).

## Where a fixed pipeline breaks

Three kinds of questions are hard for one-shot RAG:

- **Multi-step**: "Which of our services depend on the database that had the outage last week?" First find the outage, then the database, then the services.
- **Badly worded**: the user's words do not match the documents' words, and one search misses.
- **Global**: "What are the main complaints in this year's support tickets?" No single chunk holds the answer.

## Agentic RAG: search as a tool

In **agentic RAG**, retrieval stops being a fixed step and becomes a **tool** the model can call. The model decides what to search for, reads the results, and decides whether to search again with a better query, search somewhere else, or answer. The tool is defined with a name, a description and a JSON schema for its input:

```python
search_tool = {
    "name": "search_docs",
    "description": (
        "Search the company knowledge base. Returns the 10 most relevant chunks "
        "with their source. Use short, specific queries. Call it again with a "
        "different query if the results do not answer the question."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
            "source": {"type": "string", "enum": ["wiki", "tickets", "code"]},
        },
        "required": ["query"],
    },
}
```

Your code runs the actual search (the hybrid search and reranking from the previous post) whenever the model asks for it. The tools series that comes next shows the complete loop. The trade-off is clear: better answers on hard questions, at the cost of more model calls, more tokens and more latency. For simple question-answer traffic, the fixed pipeline is still cheaper.

## Knowledge graphs

A **knowledge graph** stores facts as connections between entities: (subject, relation, object). Questions that hop from one fact to another become a walk along the edges:

```python
# Facts extracted from documents as (subject, relation, object)
triples = [
    ("Dana", "manages", "Payments team"),
    ("Payments team", "owns", "checkout-service"),
    ("checkout-service", "depends on", "postgres-main"),
    ("Avi", "manages", "Search team"),
]

def neighbors(entity):
    return [(rel, obj) for subj, rel, obj in triples if subj == entity]

# Multi-hop question: what does Dana's team ultimately depend on?
entity = "Dana"
for _ in range(3):
    rel, entity = neighbors(entity)[0]
    print(f"--{rel}--> {entity}")
```

```text
--manages--> Payments team
--owns--> checkout-service
--depends on--> postgres-main
```

Each of these facts may live in a different document, so similarity search alone is unlikely to put all three in the top results.

## GraphRAG

**GraphRAG** is a method described by Microsoft researchers in [From Local to Global](https://arxiv.org/abs/2404.16130). It uses an LLM to build the graph and then summarizes it:

1. An LLM reads the documents and extracts entities and the relations between them.
2. Closely related entities are grouped into communities.
3. An LLM writes a summary for every community, ahead of time.
4. To answer a global question, each relevant community summary produces a partial answer, and the partial answers are combined into one.

The paper targets "global sensemaking" questions over a whole corpus, such as the main themes in a dataset, and reports more comprehensive and diverse answers than standard RAG on datasets of about a million tokens.

## When to use what

- **Plain RAG**: most question-answer traffic over documents. Start here.
- **Agentic RAG**: questions that need several searches or several sources, when quality matters more than latency and cost.
- **GraphRAG**: questions about relationships and themes across a large collection. Building and updating the graph costs many LLM calls, so use it when those questions are the core of the product.

In every case, measure: a small set of real questions with known answers tells you which approach actually helps. The production series covers how.

This ends the RAG series. The next series covers tools and agents: how a model takes action.
