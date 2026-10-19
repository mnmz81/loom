---
title: "WebMCP: web pages as tools for AI agents"
summary: "What WebMCP is and how it relates to MCP: a page registers tools with document.modelContext, forms become tools with two attributes, annotations, iframes, testing in Chrome, and the security risks."
date: 2026-10-13
tags: [ai, agents, mcp]
series: { key: ai-agents, order: 8 }
---

In the [computer use post](en/posts/ai-computer-use-skills/) an agent operates a website from screenshots: it guesses which pixel is "Add to cart", clicks, and takes another screenshot. That's slow, expensive, and breaks when a button moves. **WebMCP** is a proposal where the page itself publishes what it can do, as tools the agent calls.

The facts follow the [WebMCP draft specification](https://webmachinelearning.github.io/webmcp/) (Draft Community Group Report, 9 October 2026) and Chrome's [WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp). WebMCP is still changing: the code was not run for this post, and names may change again.

## What it is, and what it isn't

WebMCP is a browser API. A page registers **tools**, and an agent working in the browser discovers and calls them. The tool runs as JavaScript inside the open page, with the page's own code and the user's session, and the user sees the page change.

The concepts are those of the [MCP post](en/posts/ai-mcp/): named tools, a description written for the model, a JSON Schema for the input. But WebMCP is not the MCP protocol: no JSON-RPC, no server process. The tools exist only while the page is open.

![Left: with MCP, an agent host talks JSON-RPC to a separate MCP server process, which calls your API with its own credentials. Right: with WebMCP, a web page in the user's browser tab registers tools with document.modelContext.registerTool, and a browser agent calls them; the JavaScript runs in the page with the user's session.](/images/ai-webmcp/mcp-vs-webmcp.svg)

Its status:

- A **draft** from the W3C Web Machine Learning Community Group, with editors from Microsoft and Google. A Community Group report is not a W3C Standard.
- Chrome supports it in an **origin trial** from Chrome 149 (a way for sites to try a new feature in production before it ships). For local testing, enable `chrome://flags/#enable-webmcp-testing`.
- Early versions used `navigator.modelContext`; the spec and Chrome's docs now use `document.modelContext`.
- Chrome's docs say the API is "primarily designed for local browser workflows with a human in the loop", and that agents "must visit a site directly to know if it has callable tools". There is no central registry of sites.

## The imperative API: registering a tool in JavaScript

A to-do app that lets an agent add items:

```js
if ('modelContext' in document) {
  const controller = new AbortController();

  await document.modelContext.registerTool(
    {
      name: 'add_todo',
      description: "Add an item to the user's to-do list.",
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The to-do text' },
        },
        required: ['text'],
      },
      annotations: { readOnlyHint: false },
      async execute({ text }, { signal }) {
        const item = await addTodo(text, { signal });
        return { id: item.id, text: item.text };
      },
    },
    { signal: controller.signal },
  );

  // Later, when the tool should disappear:
  // controller.abort();
}
```

- `'modelContext' in document` checks for WebMCP support; without it, the page works as before.
- `name`, `description` and `execute` are required. `inputSchema` is a JSON Schema, the same format as in [tools and function calling](en/posts/ai-tools-function-calling/).
- `execute` receives the input as an object, plus an options object whose `signal` reports a cancelled call. Passing the input as a JSON string, as early versions did, is deprecated from Chrome 155.
- Whatever `execute` returns is serialized to a JSON string and handed to the agent.
- There's no `unregisterTool()`: pass an `AbortSignal` when registering and abort it.

A single-page app registers and removes tools as the user moves around, so the agent sees only what makes sense on the current screen.

### Annotations

Hints for the agent and the browser. The spec defines four, all `false` by default:

- `readOnlyHint`: the tool only reads.
- `consequentialHint`: the tool has real consequences, such as a purchase or a deletion. The spec lists it as a mitigation that can trigger user confirmation.
- `untrustedContentHint`: the result contains content the site doesn't control, such as user reviews or comments, and may hold a prompt injection.
- `debugging`: a tool meant for development.

## The declarative API: a form becomes a tool

Chrome's [declarative API](https://developer.chrome.com/docs/ai/webmcp/declarative-api) turns a form into a tool with two attributes:

```html
<form toolname="search_flights"
      tooldescription="Search flights between two cities on a date."
      action="/search">
  <label for="from">From</label>
  <input id="from" name="from" required>

  <label for="to">To</label>
  <input id="to" name="to" required>

  <label for="date">Date</label>
  <input id="date" name="date" type="date" required>

  <button type="submit">Search</button>
</form>
```

Each field's `name` becomes a property in the tool's input schema. The description comes from `toolparamdescription` on the field, or the field's `<label>`, or its `aria-description`. A `<select>` becomes an `enum` of its options.

When an agent calls the tool, the browser fills the form in front of the user, who still clicks **Search** unless the form has `toolautosubmit`. The CSS pseudo-classes `:tool-form-active` and `:tool-submit-active` let you style a form while an agent fills it.

To return a result to the agent instead of navigating, handle the submit event:

```js
const form = document.querySelector('form[toolname="search_flights"]');

form.addEventListener('submit', (event) => {
  if (!event.agentInvoked) return;
  event.preventDefault();
  event.respondWith(searchFlights(new FormData(form)));
});
```

`agentInvoked` is `true` when an agent submitted the form. `respondWith()` takes a promise, and its value goes back to the agent as the tool's output.

## Who calls the tools

The main caller is an **agent built into the browser** or a browser extension. For testing, Chrome's docs point to the Model Context Tool Inspector extension, which lists a page's tools and calls them, and to DevTools support for debugging them. These extensions are separate from Gemini in Chrome.

A page can also run its own **in-page agent**: `document.modelContext.getTools()` lists the registered tools and `executeTool()` calls one.

**Iframes** are locked down by default. Both APIs are controlled by a Permissions Policy called `tools`, whose default is `self`: a cross-origin iframe can't register tools unless the parent page allows it with `<iframe allow="tools">`. When registering, the `exposedTo` option lists which other origins in the page may see a tool.

## Security

WebMCP hands an agent actions in a logged-in session. The spec lists three risks:

- **Prompt injection.** Tool results and even tool descriptions can carry instructions that steer the agent. A tool that returns user reviews returns whatever an attacker wrote in a review. Mark such tools with `untrustedContentHint`.
- **Misrepresentation of intent.** The spec says plainly: "There is no guarantee that a WebMCP tool's declared intent matches its actual behavior." A tool called `finalizeCart` might actually place an order.
- **Privacy leakage.** A tool that asks for more parameters than it needs can get an agent to hand over personal details, such as age or location.

For site authors, the habits of any API apply:

- Validate every input in `execute` and on the server. An agent is just another client, and the input can be anything.
- Expose only what the user could do in the UI anyway, with the same permission checks.
- Mark tools that buy, send or delete with `consequentialHint`, and keep a confirmation step for them.
- Return small, structured results, not whole pages of user content.

For users, the rule from the [security post](en/posts/ai-security/) holds: an agent acting in your browser can do anything you can. Watch what it does on sites that matter.

## Should you use it now?

WebMCP is early and adoption is small. A few `registerTool()` calls behind a feature check, or `toolname` and `tooldescription` on an existing form, cost little and change nothing for normal visitors. Don't build a product on it until it ships in more than one browser.

This ends the agents series. The next series covers adapting a model itself: fine-tuning, distillation and running models locally.
