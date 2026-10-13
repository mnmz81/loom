---
title: "Embeddings and semantic search"
summary: "What an embedding is, how cosine similarity finds texts that mean the same thing, how to create embeddings with Voyage AI, and where to store them."
date: 2026-10-13
tags: [ai, rag, tutorial]
series: { key: ai-rag, order: 1 }
---

The basics series ended with a problem: a model only knows what was in its training data. To answer questions about your own documents, you first have to find the right pieces of them. Keyword search misses texts that say the same thing in other words. **Embeddings** solve that, and they are the foundation of RAG.

The similarity example was run with Python 3.9 and its output is real. The Voyage AI code follows the [embeddings guide](https://platform.claude.com/docs/en/build-with-claude/embeddings) in the Claude docs and was not run, so its output is **example output**.

## What an embedding is

An **embedding** is a list of numbers (a vector) that represents the meaning of a text. An embedding model is trained so that texts with similar meanings get vectors that point in similar directions. "How do I reset my password?" and "I forgot my login credentials" share almost no words, but their vectors end up close together.

Real embeddings have hundreds or thousands of numbers. The individual numbers mean nothing on their own; only the distances between vectors matter.

## Measuring similarity

The common measure is **cosine similarity**: the cosine of the angle between two vectors. 1 means the same direction, 0 means unrelated. A toy example with 3-dimensional vectors:

```python
import math

# Toy 3-dimensional "embeddings" (real ones have about 1,000 dimensions)
vectors = {
    "How do I reset my password?": [0.9, 0.1, 0.0],
    "I forgot my login credentials": [0.8, 0.2, 0.1],
    "What is the refund policy?": [0.1, 0.9, 0.2],
    "Best pizza in Tel Aviv": [0.0, 0.1, 0.9],
}

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

query = vectors["How do I reset my password?"]
for text, vec in vectors.items():
    print(f"{cosine(query, vec):.2f}  {text}")
```

```text
1.00  How do I reset my password?
0.98  I forgot my login credentials
0.21  What is the refund policy?
0.01  Best pizza in Tel Aviv
```

**Semantic search** is exactly this: embed the query, compare it with the stored document vectors, and return the closest ones. Many embedding models return vectors normalized to length 1, and then the dot product equals the cosine similarity and is faster to compute.

## Creating real embeddings

Anthropic does not offer its own embedding model; the Claude docs point to Voyage AI as one provider, and recommend comparing several. The pattern is the same with any provider: embed the documents once, embed each query when it arrives.

```python
import numpy as np
import voyageai

vo = voyageai.Client()  # reads VOYAGE_API_KEY

documents = [
    "Apple's conference call is scheduled for Thursday, November 2, 2023 at 2:00 p.m. PT.",
    "Photosynthesis converts light energy into glucose.",
    "Shakespeare's works endure in literature.",
]
doc_vectors = vo.embed(documents, model="voyage-4", input_type="document").embeddings

query = "When is Apple's conference call scheduled?"
query_vector = vo.embed([query], model="voyage-4", input_type="query").embeddings[0]

scores = np.dot(doc_vectors, query_vector)
print(documents[int(np.argmax(scores))])
```

```text
Apple's conference call is scheduled for Thursday, November 2, 2023 at 2:00 p.m. PT.
```

Note `input_type`. The docs ask you to always set it: `"document"` when indexing and `"query"` when searching, because the model embeds the two slightly differently for better retrieval. Model names change, so check the guide for the current list.

## Where to store vectors

For a few thousand vectors, a NumPy array in memory is enough. Beyond that you want a **vector database** or a vector index in a database you already run. Common options are pgvector (an extension for PostgreSQL), Chroma, Qdrant, Pinecone, and the vector search in MongoDB Atlas or Elasticsearch.

They all do the same core job: store vectors with their text and metadata, and return the nearest neighbors of a query vector fast, using approximate search so that millions of vectors stay quick.

## Limits of embeddings

Embeddings capture meaning, which is also their weak spot:

- **Exact terms.** An error code, a product SKU or a rare name may not be close to anything in vector space. Keyword search finds them easily.
- **Lost context.** A short piece of a document ("revenue grew 3%") does not say which company or which quarter.
- **Domain.** A general model may not separate terms that matter in law, medicine or code. There are domain-specific models for some fields.

The next posts deal with each of these. The next one builds the full RAG pipeline.
