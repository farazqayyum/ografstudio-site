---
title: Connect an AI assistant
sidebar_label: Connect an AI assistant
sidebar_position: 11
description: Use Studio's built-in AI Assistant, or drive Studio from an MCP client such as Claude Desktop or Codex.
---

AI in Studio edits the same layers, keyframes and data fields that you do. Larger changes arrive as
proposals on the canvas, which you can compare with the original and then accept or reject. An
accepted proposal is a single undo step.

There are two ways to work with AI: the built-in **AI Assistant**, or an external AI client that
connects over MCP.

## The built-in AI Assistant

The **AI Assistant** tab sits beside **Layers**. Its model runs from Studio's local server, so
credentials stay on the server and never reach the browser or your project files.

Choose one provider, configure it in the environment of the process that runs the server, and
restart the server:

| Provider                  | What you need                                       | Setting                                  |
| ------------------------- | --------------------------------------------------- | ---------------------------------------- |
| Codex                     | The Codex CLI, signed in                            | `OGRAF_AGENT_PROVIDER=codex`             |
| Anthropic Claude          | An Anthropic API key and a model ID for your account | `OGRAF_AGENT_PROVIDER=anthropic`         |
| OpenAI-compatible service | Its endpoint, model ID and credential               | `OGRAF_AGENT_PROVIDER=openai-compatible` |

For example, with Codex on Windows:

```powershell
$env:OGRAF_AGENT_PROVIDER = "codex"
$env:OGRAF_AGENT_MODEL = "default"
.\OGrafStudioServer.exe
```

The [AI authoring reference](/docs/ai-authoring) has the Anthropic setup, including how to keep the
key in Windows Credential Manager.

### Point at what you mean

Select layers, or use **Capture areas** to draw rectangles or freehand outlines on the canvas and
give each area its own instruction, such as "Area 1: make the background smaller". This needs a
model that supports images.

## External AI clients over MCP

Studio's server also offers an MCP endpoint at `http://127.0.0.1:4318/mcp`. To use it from Claude
Desktop on Windows, add this to `%APPDATA%\Claude\claude_desktop_config.json`, then quit and reopen
Claude:

```json
{
  "mcpServers": {
    "ograf-studio": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://127.0.0.1:4318/mcp", "--allow-http"]
    }
  }
}
```

`--allow-http` is acceptable here only because the endpoint is local to your computer.

### Install the authoring skill

The [`ograf-authoring` skill](https://github.com/zerodensity/ograf-studio/tree/stable/skills/ograf-authoring)
teaches agents to use Studio well: inspect the scene before editing, keep animation editable, and
check and certify before saving. For Codex, copy the whole folder to
`%USERPROFILE%\.agents\skills\ograf-authoring`, then ask, for example:

```text
$ograf-authoring create an editable 90-frame lower third with name and role fields,
inspect its entrance and exit animation, certify it, and save the .ogs source.
```
