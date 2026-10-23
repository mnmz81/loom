---
title: "Claude API version 2026-10-21: what breaks and how to upgrade"
summary: "The first new Claude API version since 2023-06-01: temperature, top_p and top_k are gone, new SDK majors send it by default, and API keys move to Authorization: Bearer."
date: 2026-10-23
tags: [ai, llm]
---

Every Claude API request carries an `anthropic-version` header, and since mid-2023 its value was `2023-06-01`. On October 21, 2026 Anthropic released `2026-10-21`, together with new major versions of every SDK and of the `ant` CLI that send it by default.

The facts follow the official [versions page](https://platform.claude.com/docs/en/api/versioning) and the [migration guide](https://platform.claude.com/docs/en/api/migration-2026-10-21). The Python example ran with Python 3.13 and `anthropic` 2.1.0.

## Which version your code sends

An SDK sends the API version that was current when its major version came out. Upgrading within the same major keeps `2023-06-01`; these are the first versions that send `2026-10-21`:

| SDK | First version on 2026-10-21 |
| --- | --- |
| Python `anthropic` | 2.0.0 |
| TypeScript `@anthropic-ai/sdk` | 1.0.0 |
| C# `Anthropic` | 13.0.0 |
| Go `anthropic-sdk-go/v2` | 2.0.0 |
| Java `anthropic-java` | 3.0.0 |
| PHP `anthropic-ai/sdk` | 1.0.0 |
| Ruby `anthropic` | 2.0.0 |
| `ant` CLI | 2.0.0 |

To see what your client sends:

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-test")
print(anthropic.__version__)
print(client.default_headers["anthropic-version"])
print(client.auth_headers)
```

```text
2.1.0
2026-10-21
{'Authorization': 'Bearer sk-test'}
```

The same code with `anthropic` 1.17.0 prints `2023-06-01` and `{'X-Api-Key': 'sk-test'}`. Without an SDK you set the header yourself: `-H "anthropic-version: 2026-10-21"`.

## What breaks in the Messages API

These apply to `POST /v1/messages`, to token counting and to every request in a Message Batch created with `2026-10-21`. Each one returns a 400 error:

- **`temperature`, `top_p` and `top_k` are removed**, on every model, even at their default value. Without them a request samples with the defaults (`temperature` 1.0). Claude 4.7 and later models already accept only the defaults, so nothing changes for them. On a model such as Claude Sonnet 4.6, a request that lowered `temperature` loses that effect, and no other setting replaces it: drop the parameter, or keep that request on `2023-06-01`.
- **A `document` block directly in an `assistant` message.** Send documents in `user` messages. A document nested in another block, such as a web fetch result Claude returned, is still accepted.
- **A `text` block with non-empty `citations` in a `user` message**, including inside a `search_result` block. Citations in `assistant` messages and the `"citations": {"enabled": true}` setting still work.

## What changes in the SDKs

The removed parameters and old field names are gone from the SDK types too, so the type checker finds most call sites. The rest:

- **The API key goes in `Authorization: Bearer`** instead of `X-Api-Key`. The API accepts both, but a proxy, gateway, log filter or test stub that reads `X-Api-Key` must change.
- **A client holds one credential.** In Python, passing both `api_key` and `auth_token` now raises `ValueError`.
- **`MessageParam` is a union** of `UserMessageParam`, `AssistantMessageParam` and `SystemMessageParam`. A message written as a dict needs no change; calling `MessageParam(role=..., content=...)` raises `TypeError`.
- **Text Completions is removed** from the TypeScript, Go, Java and Ruby SDKs and the CLI. Use the Messages API.
- **The CLI drops `--api-key` and `--auth-token`**, because a value on the command line ends up in shell history. Use `ANTHROPIC_API_KEY`, `--api-key-stdin` or `ant auth login`.
- **Go** has a new module path, `github.com/anthropics/anthropic-sdk-go/v2`, and needs Go 1.25 or later.

The Admin API renames fields: RBAC groups return `role_ids` instead of `roles`, group members `rbac_group_id` instead of `group_id`, roles `display_name` instead of `name`, rate limits `group.type` instead of `group_type`, and API keys `scope.workspace_id` instead of `workspace_id`.

## Upgrade order

The guide's order: upgrade the SDK, fix each breaking change that affects you, then test against `2026-10-21` before releasing. In TypeScript, move `@anthropic-ai/bedrock-sdk`, `vertex-sdk`, `foundry-sdk`, `aws-sdk` and `google-cloud-sdk` to v1 in the same upgrade, or the package manager installs a second, older copy of `@anthropic-ai/sdk` for them.

```bash
pip install --upgrade "anthropic>=2"
npm install @anthropic-ai/sdk@^1
```

The new version is available on the Claude API, Claude Platform on AWS, Microsoft Foundry and Google Cloud. On Amazon Bedrock it works only with Claude 4.7 and later models; calls to older models there stay on the SDK version you use today.
