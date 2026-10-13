---
title: "Multimodal: images and PDFs"
summary: "Sending images and PDFs to a model, how image tokens are counted, what vision is still bad at, and what to do with audio."
date: 2026-10-13
tags: [ai, llm, tutorial]
series: { key: ai-basics, order: 8 }
---

Current models read more than text. All current Claude models accept images, and PDFs are read page by page, with both the text and a picture of each page. This post shows how to send them, what they cost, and where the limits are.

The API code follows the official [vision](https://platform.claude.com/docs/en/build-with-claude/vision) and [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) docs and was not run, so its output is **example output**. The token calculation was run with Python 3.9 and its output is real.

## Sending an image

An image is a content block in the user message, next to a text block. The source can be a URL, base64 data, or a `file_id` from the Files API:

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "url",
                "url": "https://platform.claude.com/docs/images/vision-example.jpg"}},
            {"type": "text", "text": "Describe this image in one sentence."},
        ],
    }],
)
print(message.content[0].text)
```

```text
A wide landscape photo of a mountain range under a clear sky.
```

The docs recommend putting images **before** the question, the same way long documents go before the question. With several images, label them ("Image 1:", "Image 2:") so you can refer to them. Supported formats are JPEG, PNG, GIF (first frame only) and WebP.

## How many tokens an image costs

The model sees an image as a grid of 28×28-pixel patches, and each patch is one token. The docs give the formula `⌈width / 28⌉ × ⌈height / 28⌉`:

```python
import math

def image_tokens(width, height):
    return math.ceil(width / 28) * math.ceil(height / 28)

for w, h in [(200, 200), (1000, 1000), (1920, 1080)]:
    print(f"{w}x{h}: {image_tokens(w, h)} tokens")
```

```text
200x200: 64 tokens
1000x1000: 1296 tokens
1920x1080: 2691 tokens
```

Images larger than the model's limit are scaled down first, which caps the cost. On Claude 4.7 and later models the limit is 2576 pixels on the long edge and 4784 tokens; older models use a lower limit. If you do not need the detail, resize images before sending them: it is cheaper and faster.

## PDFs

A PDF is a `document` block. The model gets the extracted text **and** an image of every page, so it can read charts, tables and scanned pages:

```python
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "document", "source": {"type": "url",
                "url": "https://example.com/annual-report.pdf"}},
            {"type": "text", "text": "What are the key findings in this document?"},
        ],
    }],
)
```

At the time of writing the docs list a limit of 600 pages and 32 MB per request (100 pages for models with a smaller context window), and no encrypted or password-protected files. Because every page is also an image, dense PDFs can fill the context window before they reach the page limit.

## What vision is still bad at

The docs list limitations worth knowing before you build on images:

- Small, blurry or rotated images (under about 200 pixels) cause mistakes.
- Counting many small objects is approximate.
- Coordinates and positions are approximate.
- It cannot tell whether an image is AI-generated.
- It will not identify people by face.
- It only **understands** images. It does not create or edit them.

## Audio

The current Claude models take text and images as input; they do not accept audio. To work with recordings, first convert speech to text with a speech-to-text model or service, then send the transcript. The same applies to video: extract frames as images, or a transcript.

The next series is about knowledge: how to give a model access to your own documents with embeddings and RAG.
