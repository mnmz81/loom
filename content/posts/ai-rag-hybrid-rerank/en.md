---
title: "Better retrieval: hybrid search, reranking and contextual chunks"
summary: "Three techniques that fix most RAG retrieval failures: combining keyword and vector search, reranking the candidates, and adding context to every chunk."
date: 2026-10-13
tags: [ai, rag]
series: { key: ai-rag, order: 3 }
---

When a RAG answer is bad because the right chunk was never retrieved, three techniques fix most cases, and they stack.

The rank-fusion example was run with Python 3.9 and its output is real. The reranking code follows the [Voyage AI quick start](https://www.mongodb.com/docs/voyageai/quickstart/) and was not run, so its output is **example output**. The numbers come from Anthropic's [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) article.

## Keyword search still matters

Embeddings find meaning, but can miss exact strings: an error code like `ERR_401`, a product number, a name. Keyword search is good at exactly that. The standard algorithm is **BM25**: it scores a chunk higher when it contains the query's words, especially rare ones, adjusted for chunk length.

Most search engines and many databases support BM25 (Elasticsearch, OpenSearch, PostgreSQL full-text search with an extension, `rank_bm25` for Python).

## Hybrid search

**Hybrid search** runs both searches and merges the two result lists. The scores of the two methods are on different scales, so a common way to merge is to ignore the scores and use only the ranks. **Reciprocal rank fusion** (RRF) gives each document `1 / (k + rank)` from every list it appears in, with `k` usually 60:

```python
def rrf(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)

vector_results = ["doc_login", "doc_reset", "doc_2fa"]
keyword_results = ["doc_err_401", "doc_reset", "doc_login"]

print(rrf([vector_results, keyword_results]))
```

```text
['doc_login', 'doc_reset', 'doc_err_401', 'doc_2fa']
```

Documents found by both searches rise to the top, and `doc_err_401`, which only keyword search found, still makes the list.

## Reranking

Embedding search compares two vectors that were computed separately, which is fast but rough. A **reranker** is a model that reads the query and a candidate together and scores how well the candidate answers the query. It is slower, so it runs only on the candidates from the first search:

```python
import voyageai

vo = voyageai.Client()

query = "What are my company's goals this quarter?"
candidates = [
    "This quarter, our company is focused on building new products and cutting costs.",
    "20th-century innovations centered on electronic advancements.",
    "Photosynthesis converts light energy into glucose.",
]

reranked = vo.rerank(query, candidates, model="rerank-3", top_k=2)
for r in reranked.results:
    print(f"{r.relevance_score:.2f}  {r.document[:50]}")
```

```text
0.84  This quarter, our company is focused on building
0.25  20th-century innovations centered on electronic
```

The pattern is wide-then-narrow: retrieve many candidates cheaply, then rerank down to the few you send. Anthropic retrieved the top 150 chunks and reranked them to 20.

## Contextual chunks

A chunk often makes no sense on its own. Anthropic's example: "The company's revenue grew by 3% over the previous quarter." Which company? Which quarter? Neither embeddings nor BM25 can match that chunk to a question that names the company.

**Contextual retrieval** fixes this at indexing time. For every chunk, a model writes a short context (usually 50 to 100 tokens) that places the chunk in its document, and that context is added to the chunk before both the embedding and the BM25 index are built. A prompt in the spirit of the article:

```text
<document>
{{WHOLE_DOCUMENT}}
</document>

Here is a chunk from the document above:
<chunk>
{{CHUNK}}
</chunk>

Write a short context that situates this chunk within the overall document,
to improve search retrieval of the chunk. Answer only with the context.
```

Since the whole document is sent for every chunk, prompt caching makes this much cheaper: only the chunk changes.

## How much it helps

Anthropic measured how often the right chunk was missing from the top 20 results, averaged over several datasets:

| Setup | Retrieval failures |
|---|---|
| Embeddings only | 5.7% |
| Contextual embeddings | 3.7% (35% fewer) |
| Contextual embeddings + contextual BM25 | 2.9% (49% fewer) |
| The above + reranking | 1.9% (67% fewer) |

These numbers come from their datasets and models; what transfers is the direction. Measure on your own questions before and after each change.
