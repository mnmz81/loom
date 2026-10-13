---
title: "Tools and function calling"
summary: "How a model calls your functions: defining a tool, the tool use loop, tool results and errors, the raw JSON on the wire, the SDK's tool runner, and how to write good tools."
date: 2026-10-13
tags: [ai, agents]
series: { key: ai-agents, order: 1 }
---

A model on its own can only write text. **Tools** (also called function calling) let it act: look up the weather, query a database, create a ticket. The model never runs anything itself. It asks your code to run a function, and your code decides whether and how. This loop is the foundation of every agent in this series.

The code follows the official [tool use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) and [tool runner docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner). It was not run for this post, so the output blocks are **example output**.

## Defining a tool

A tool has three parts: a `name`, a `description` that tells the model when and how to use it, and an `input_schema` in JSON Schema that describes its arguments:

```python
tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a given location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and state, e.g. San Francisco, CA",
                }
            },
            "required": ["location"],
        },
    }
]
```

The model sees the tool definitions as part of the prompt, so they cost input tokens and count toward the context window. The description matters more than anything else here: it is how the model decides to call the tool.

## The tool use loop

When the model wants a tool, it stops and answers with `stop_reason: "tool_use"` and one or more `tool_use` blocks, each with an `id`, the tool `name` and its `input`. Your code runs the tool and sends back a `tool_result` block with the same id, in a new user message. Then you call the model again. The loop ends when the model answers with `end_turn`.

![The tool use loop: the app sends messages and tools, the model answers with tool_use, the app runs the tool and sends tool_result, until end_turn](/images/ai-tools-function-calling/tool-loop.svg)

A complete loop that handles several tool calls per turn and reports errors back to the model:

```python
import anthropic

client = anthropic.Anthropic()

def get_weather(location):
    return "15 degrees Celsius, partly cloudy"  # your real lookup goes here

TOOL_FUNCTIONS = {"get_weather": get_weather}

def run(user_text):
    messages = [{"role": "user", "content": user_text}]
    while True:
        response = client.messages.create(
            model="claude-opus-5-5",
            max_tokens=4096,
            tools=tools,
            messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return next(b.text for b in response.content if b.type == "text")

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            print(f"Claude called {block.name} with {block.input}")
            try:
                output = TOOL_FUNCTIONS[block.name](**block.input)
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})
            except Exception as error:
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": str(error), "is_error": True})
        messages.append({"role": "user", "content": results})

print(run("What's the weather in San Francisco?"))
```

```text
Claude called get_weather with {'location': 'San Francisco, CA'}
The current weather in San Francisco is 15 degrees Celsius with partly cloudy skies.
```

Three details make this loop correct:

- The assistant's `content` is appended **unchanged**. It may contain thinking blocks, which must be sent back as they are.
- All `tool_result` blocks for one turn go back in **one** user message. The model can ask for several tools at once (parallel tool use).
- Errors go back as a `tool_result` with `is_error: True`. The model reads the error and can try again with different input, instead of your program crashing.

## What travels over the wire

Under the SDK, the model's request for a tool is plain JSON in the response body. This is what the `tool_use` part of the response looks like:

```json
{
  "stop_reason": "tool_use",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01A09q90qw90lq917835lq9",
      "name": "get_weather",
      "input": { "location": "San Francisco, CA" }
    }
  ]
}
```

Any language that can send an HTTP POST and parse JSON can run this loop. The SDK only saves typing.

## Controlling when tools are called

By default (`tool_choice` of `auto`) the model decides on every turn whether to call a tool or answer. The docs list the other options: `any` (must call some tool), `tool` with a name (must call that tool), and `none`. The system prompt also steers it: the docs suggest "Use the tools to investigate before responding." to increase tool use.

Adding `"strict": True` to a tool definition guarantees that the model's input matches the schema exactly, the same mechanism as structured outputs.

## The tool runner

The Python SDK has a beta helper that runs the loop for you. The `@beta_tool` decorator builds the schema from type hints and the docstring:

```python
from anthropic import Anthropic, beta_tool

client = Anthropic()

@beta_tool
def get_weather(location: str) -> str:
    """Get the current weather for a given location.

    Args:
        location: City and state, e.g. San Francisco, CA
    """
    return "15 degrees Celsius, partly cloudy"

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=1024,
    tools=[get_weather],
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
)
final_message = runner.until_done()
print(final_message.content[-1].text)
```

Use the runner for simple cases. Write the loop yourself when you need human approval before a tool runs, custom logging, or limits on what can be called.

## Writing good tools

Anthropic's [Building effective agents](https://www.anthropic.com/research/building-effective-agents) puts it this way: give tool definitions as much care as prompts. In practice:

- Write the description as you would for a new colleague: what the tool does, when to use it, what it returns, and its limits.
- Make mistakes hard. The article's example: requiring absolute file paths removed a whole class of errors with relative paths.
- Return useful, short results. A 5,000-line JSON dump fills the context window; return what the model needs and an error message that says how to fix the call.
- Keep the set small and distinct. Two tools with overlapping descriptions confuse the model.
- Never trust a tool's input blindly. The model can be wrong or manipulated, so validate and limit what a tool can do. The security post covers this.

The next post covers MCP: a standard way to package tools so that any application can use them.
