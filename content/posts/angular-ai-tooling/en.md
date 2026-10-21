---
title: "Angular and AI tools: the MCP server, guidance files, Agent Skills and WebMCP"
summary: "What Angular offers for working with coding agents: the CLI's MCP server (ng mcp), ng generate ai-config, llms.txt, Agent Skills and experimental WebMCP, with a real run and each part's stability."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 83 }
---

A coding agent that doesn't know which version of Angular you use may write old-style code, like `*ngIf` and `@Input()`. Angular publishes several things meant to fix that, and also a way to expose the app itself to agents. Each part is marked here by what [angular.dev/ai](https://angular.dev/ai) says about it.

Every example was checked with Angular CLI 22.2 and Angular 22.2. Working with a real agent or browser was not tested: the MCP server was checked by talking to it directly, and WebMCP against a mock implementation of the browser side.

## The CLI's MCP server

The [Model Context Protocol](https://modelcontextprotocol.io) lets an agent call another program's tools. The Angular CLI ships such a server. Per the [docs](https://angular.dev/ai/mcp) you configure it in your tool's settings file, for example `.vscode/mcp.json` in VS Code (the key is `servers`) or `.cursor/mcp.json` in Cursor (the key is `mcpServers`):

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

Inside a workspace you can also run `ng mcp` directly. The command speaks MCP over stdin and stdout, so in a terminal it prints nothing. To see what it offers I sent it the protocol's handshake messages and asked for a tool list:

```text
ai_tutor
get_best_practices
search_documentation
list_projects
onpush_zoneless_migration
run_target
devserver_start
devserver_stop
devserver_wait_for_build
```

Among them: `get_best_practices` returns the best-practices guide, `run_target` runs a build or tests, and `onpush_zoneless_migration` proposes a migration plan to [OnPush](en/posts/angular-onpush/) and [zoneless](en/posts/angular-zoneless-migration/).

Two flags shrink the list. `--read-only` registers only tools that don't change the project (the list dropped to 6: `run_target`, `devserver_start` and `devserver_stop` disappeared), and `--local-only` registers only tools that don't need the internet (`search_documentation` disappeared). You add them to `args`, for example `["-y", "@angular/cli", "mcp", "--read-only"]`.

The page about developing with AI calls the server "experimental", and its own setup page has no stability label. So treat it as something that may change, and start with `--read-only`.

## Guidance files for AI tools

An agent that reads a guidance file in the project gets the best practices without being asked. The CLI creates it for you:

```bash
ng generate ai-config --tool=claude-code
```

```text
CREATE CLAUDE.md (2970 bytes)
CREATE .mcp.json (121 bytes)
```

`ng new` takes the same choice in its `--ai-config` flag. The possible values per `--help`: `claude-code`, `cursor`, `gemini-cli`, `open-ai-codex`, `vscode` and `none`. The command also wrote the MCP configuration from the previous section, and `CLAUDE.md` opens like this:

```text
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
```

The same content is also available as public files you can download and paste into a tool that isn't on the list. Per the [page on developing with AI](https://angular.dev/ai/develop-with-ai):

- [`llms.txt`](https://angular.dev/llms.txt): an index of links to key resources, in a format the site calls a "proposed standard".
- [`llms-full.txt`](https://angular.dev/assets/context/llms-full.txt): a fuller collection describing how Angular works. When I checked it was about 850KB, so it's meant for tools with a large context window.
- [`best-practices.md`](https://angular.dev/assets/context/best-practices.md): the guidance itself, short. You add it as system instructions or as context to a prompt.

The generated file is a copy: after upgrading Angular, generate it again.

## Agent Skills

Agent Skills are bundles of instructions an agent loads only when the task needs them. Per the [docs](https://angular.dev/ai/agent-skills) they live at [github.com/angular/skills](https://github.com/angular/skills) and are installed like this:

```bash
npx skills add https://github.com/angular/skills
```

There are two: `angular-developer` for writing code and architectural guidance (components, services, signals, forms, routing, SSR, accessibility and testing), and `angular-new-app` for creating a new app with the CLI. I didn't run them, because the agent loads them, not Angular. In the site's navigation they're marked "New", and the page itself has no stability label.

## WebMCP: the app as a source of tools

The earlier sections help an agent write the app. [WebMCP](https://angular.dev/ai/webmcp) is the opposite direction: the app running in the browser offers tools to an agent. Per the docs it's a proposed standard, and Angular adds experimental support in which a tool lives as long as the injector that registered it. The docs state explicitly that "APIs are subject to change even outside of major versions".

```typescript
import { ApplicationConfig, inject, provideExperimentalWebMcpTools } from '@angular/core';
import { Todos } from './todos';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalWebMcpTools([
      {
        name: 'add_todo',
        description: 'Adds an item to the todo list shown on the page.',
        inputSchema: {
          type: 'object',
          properties: { title: { type: 'string', description: 'The item text' } },
          required: ['title'],
        },
        execute: ({ title }) => {
          const todos = inject(Todos);
          if (!title.trim()) return 'Rejected: empty title';
          todos.items.update((items) => [...items, title]);
          return `Added: ${title}`;
        },
      },
    ]),
  ],
};
```

(`Todos` is a [`@Service()`](en/posts/angular-service-decorator/) with a list signal.) `execute` can use `inject`, and `title` is typed `string` from the schema. A Vitest test defined a mock `navigator.modelContext` with `registerTool`, and printed the result:

```text
registered: [ 'add_todo' ]
Added: Buy milk
Rejected: empty title
```

So registration happens when the app starts, and the tool runs in the injection context. What wasn't tested: a browser where `navigator.modelContext` exists, and an agent calling the tool. Per Angular's code, if the browser doesn't provide `modelContext`, registration simply skips.

Three warnings from the docs: Angular doesn't validate that the input matches the schema, so you check in `execute` (as the tool above checks for an empty title); a tool name must be unique, and registering twice throws; and a tool registered in a route stays available after you leave it, unless you use the router's `withAutoCleanupInjectors`.

## Mistakes beginners make

- **Running the MCP server without `--read-only` on a project not saved in git.** Tools like `run_target` run commands in the project.
- **Relying on the guidance file without checking the code.** It reduces version mistakes, it doesn't remove them.

## What's next

This is the last post in the series. The series page [Angular from beginner to expert](en/series/angular/) collects all the posts, and you can go back to it according to what your app needs.
