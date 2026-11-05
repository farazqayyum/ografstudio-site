---
title: Install and run OGraf Studio
sidebar_label: Install and run
sidebar_position: 2
description: Run OGraf Studio from a single downloaded file, or from source with Node.js.
---

OGraf Studio runs in your browser. A small local server hosts the editor and the optional
connection for AI agents. You can run that server from one downloaded file, or build it from source.

## Run the single-file server

This is the quickest way to start. No Node.js, npm or Bun installation is needed.

1. Open the [latest release](https://github.com/zerodensity/ograf-studio/releases/latest) and
   download the file for your computer:

   | Computer    | File                            |
   | ----------- | ------------------------------- |
   | Windows x64 | `OGrafStudioServer.exe`         |
   | Linux x64   | `OGrafStudioServer-linux-x64`   |
   | Linux ARM64 | `OGrafStudioServer-linux-arm64` |

2. On Linux, make the file executable first:

   ```bash
   chmod +x OGrafStudioServer-linux-x64
   ```

3. Run the file, then open **http://127.0.0.1:4318/** in a Chromium-based browser such as Chrome or
   Edge. On Windows you can run `OGrafStudioServer.exe --open` to open the browser for you.

The Windows executable is unsigned, so Windows may show a SmartScreen warning the first time.
Each release lists checksums and verification details alongside the downloads.

### Useful options

```powershell
OGrafStudioServer.exe --port 4400 --workspace "D:\OGraf Projects"
OGrafStudioServer.exe --help
```

The server only accepts connections from your own computer (`127.0.0.1`). Projects that AI agents
save go to `Documents\OGraf Studio\Projects` unless you choose another folder with `--workspace`.

## Run from source

Use this when you want to change Studio itself or follow the `dev` branch. You need
[Node.js](https://nodejs.org/) 22 or newer, npm and [Bun](https://bun.sh/).

```bash
git clone https://github.com/zerodensity/ograf-studio.git
cd ograf-studio
npm ci
npm run dev
```

Open **http://localhost:5173/**. To connect AI agents as well, run `npm run mcp:start` in a second
terminal. The [development guide](/docs/development) covers the MCP server, building the
standalone executables and running the checks.

## Next steps

- [Make your first lower third](/guides/first-lower-third)
- [Connect an AI assistant](/guides/ai-assistant)
