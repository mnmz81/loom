---
title: "MCP: the Model Context Protocol"
summary: "What MCP is, why it exists, hosts, clients and servers, tools, resources and prompts, the two transports, and a small MCP server in Python."
date: 2026-10-13
tags: [ai, agents, mcp]
series: { key: ai-agents, order: 2 }
---

The previous post defined a tool inside one application. To use it in your IDE, your chat app and your agent, you would write the glue three times. With **MCP** (Model Context Protocol), an open standard, you write the tool once as an MCP server, and any application that speaks MCP can use it.

The facts follow the [MCP specification](https://modelcontextprotocol.io/specification/latest) (revision 2026-07-28 at the time of writing) and the official [build a server](https://modelcontextprotocol.io/docs/develop/build-server) guide. The code was not run for this post.

## Why a protocol

Without a standard, N applications and M data sources need N × M integrations. With a shared protocol, each application and each source implements MCP once.

The spec describes its inspiration as the Language Server Protocol, which did the same for programming languages and editors: one language server works in every editor that speaks LSP.

## Hosts, clients and servers

The spec defines three roles:

- **Host**: the application the user works in, such as an IDE, a chat app or an agent. It holds the conversation and the model, and it asks the user for consent.
- **Client**: a connector inside the host. Each client talks to exactly one server.
- **Server**: a program that offers capabilities: files, a database, an external API.

![A host runs one client per server; servers can be local over stdio or remote over Streamable HTTP](/images/ai-mcp/mcp-architecture.svg)

By design, a server should not be able to read the whole conversation or "see into" other servers: the host decides what each server receives.

## What a server offers

Servers offer three kinds of things, and they differ in who is in control:

- **Tools**: functions the model can call, like the tools in the previous post. The model decides when.
- **Resources**: data such as files, records or API responses, which the application or the user attaches as context.
- **Prompts**: ready-made templates that the user picks, often as a slash command.

In the other direction, a server can ask the client for things: **elicitation** (ask the user for more information) and **sampling** (ask the host's model to generate text).

Messages are JSON-RPC 2.0. The spec defines two standard transports: **stdio**, where the host starts the server as a subprocess and they talk over standard input and output, and **Streamable HTTP**, where each message is an HTTP POST to one endpoint. Local servers usually use stdio; remote servers use HTTP.

## A small MCP server in Python

The official guide uses `uv` and the `mcp` package:

```bash
uv init notes-server
cd notes-server
uv add "mcp[cli]"
```

A server with one tool. The SDK builds the tool's schema from the type hints and the docstring:

```python
import logging
from mcp.server import MCPServer

logger = logging.getLogger(__name__)
mcp = MCPServer("notes")

NOTES = {"shopping": "milk, eggs, bread", "ideas": "a blog series about AI"}

@mcp.tool()
def read_note(name: str) -> str:
    """Read one of the user's notes.

    Args:
        name: The note name, for example "shopping"
    """
    logger.info("reading note %s", name)  # logging goes to stderr
    return NOTES.get(name, f"No note named {name!r}. Available: {', '.join(NOTES)}")

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

The guide's key warning: in a stdio server, **never write to stdout**. stdout carries the JSON-RPC messages, and a stray `print()` corrupts them. Use `logging`, which writes to stderr.

## Connecting it to a host

Each host has its own configuration, but most follow the same shape: a command that starts the server. For Claude Desktop, the guide adds the server to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notes": {
      "command": "uv",
      "args": ["--directory", "/ABSOLUTE/PATH/TO/notes-server", "run", "server.py"]
    }
  }
}
```

After a restart, the host starts the server, lists its tools, and offers them to the model. Claude Code, IDEs and many agent frameworks support MCP servers in a similar way, and the Claude API has an MCP connector for remote servers.

## Security

The spec says tools "represent arbitrary code execution and must be treated with appropriate caution". Its key principles:

- The user must explicitly consent before a tool runs or data is shared with a server.
- Tool descriptions and annotations from a server you do not trust should be treated as untrusted.
- Implementors should build clear consent and authorization flows.

In practice: install MCP servers only from sources you trust, read what their tools can do, and give them the narrowest access that works. A malicious server, or a malicious document that a server returns, can try to steer the model: prompt injection, covered in the security post.

The next post is about agents: what turns a model with tools into one.
