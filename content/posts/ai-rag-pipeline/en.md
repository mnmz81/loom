---
title: "RAG: retrieval-augmented generation"
summary: "The full RAG pipeline: when you need it, splitting documents into chunks, retrieving the closest ones, and building a prompt that answers only from them."
date: 2026-10-13
tags: [ai, rag, tutorial]
series: { key: ai-rag, order: 2 }
---

**RAG** (retrieval-augmented generation) is the most common way to let a model answer from your own documents. The idea is simple: before asking the model, search your documents for the relevant pieces, and put them in the prompt. The model then answers from text it can see, not from memory.

The chunking example was run with Python 3.9 and its output is real. The API code follows the official docs and was not run, so its output is **example output**. Numbers about retrieval quality come from Anthropic's [Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) article.

## Do you need RAG at all?

Not always. Anthropic's article says that if your knowledge base is smaller than about 200,000 tokens (roughly 500 pages), you can put all of it in the prompt and skip retrieval. With prompt caching, repeated requests over the same text become much cheaper and faster.

RAG is needed when the documents do not fit, when they change often, or when you want to cite exactly which source each answer came from. Most company knowledge bases end up there.

## The pipeline

RAG has two paths. **Indexing** runs once, and again whenever documents change. **Answering** runs for every question.

![Indexing: documents, chunks, embeddings, vector store. Answering: question, embedding, top-k chunks, prompt to the LLM](/images/ai-rag-pipeline/rag-pipeline.svg)

The previous post covered embeddings and vector stores. This one covers the two parts that decide most of the quality: chunking and the prompt.

## Chunking

Documents are split into **chunks** before embedding, for two reasons: one vector cannot represent a 50-page document well, and you want to send the model only the relevant parts. Anthropic's article says chunks are usually no more than a few hundred tokens.

The simplest method is fixed-size chunks with **overlap**, so that a sentence cut at a boundary still appears whole in one of the chunks:

```python
def chunk_words(text, size, overlap):
    words = text.split()
    step = size - overlap
    return [" ".join(words[i:i + size]) for i in range(0, len(words), step) if words[i:i + size]]

text = "one two three four five six seven eight nine ten eleven twelve"
for c in chunk_words(text, size=5, overlap=2):
    print(c)
```

```text
one two three four five
four five six seven eight
seven eight nine ten eleven
ten eleven twelve
```

Real systems usually split along the document's own structure instead: headings, paragraphs, functions in code. Keep metadata with every chunk (the file, the section, the date) so you can show the source and filter by it later.

## Building the prompt

After retrieval you have the top chunks. The prompt puts them at the top, in tags, and asks the model to answer only from them, using the techniques from the prompting and hallucination posts:

```python
import anthropic

client = anthropic.Anthropic()

def answer(question, chunks):
    docs = "\n".join(
        f'<document index="{i}"><source>{c["source"]}</source>'
        f'<document_content>{c["text"]}</document_content></document>'
        for i, c in enumerate(chunks, start=1)
    )
    prompt = (
        f"<documents>\n{docs}\n</documents>\n\n"
        "Answer the question using only the documents above. "
        "Cite the document index for each claim. "
        "If the documents do not contain the answer, say so.\n\n"
        f"Question: {question}"
    )
    message = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

chunks = [
    {"source": "hr/vacation.md", "text": "Employees get 20 vacation days per year."},
    {"source": "hr/sick.md", "text": "Sick days do not count as vacation days."},
]
print(answer("How many vacation days do I get?", chunks))
```

```text
You get 20 vacation days per year [1]. Sick days are counted separately [2].
```

## How many chunks to send

Too few chunks and the answer may be missing; too many and you pay for noise and risk context rot. In Anthropic's experiments, passing the top 20 chunks worked better than 5 or 10. Treat that as a starting point and measure on your own questions.

## When RAG gives a bad answer

There are two different failures, and they have different fixes:

- **Retrieval failed**: the right chunk was not in the results. Fix the chunking, the embeddings or the search. The next post covers hybrid search and reranking.
- **Generation failed**: the right chunk was there, but the model ignored it or added things. Fix the prompt.

To tell them apart, log the retrieved chunks with every answer. The post on evals shows how to measure both.

The next post improves retrieval with keyword search, reranking and contextual chunks.
