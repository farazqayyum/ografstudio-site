# Example sources

`build.mjs` authors the operator-facing examples through OGraf Studio's MCP server. For each one it
saves the editable source here (`<slug>.ogs`) and exports the certified package to
`graphics/<slug>.ograf.zip`:

clock, countdown, scoreboard, lower-third, ticker, bug and rankings.

`shader-background` and `lottie-pulse` are not built here.

## What each one needs from Studio

These sources use settings driven by data on clocks and timers (`clock.timeZone`, `clock.format` and
others) and native ticker bindings. Open or rebuild them with a Studio that has those features.

## Rebuild

Run a separate copy of Studio, so the script never touches an editor you're working in. From a Studio
checkout:

```bash
OGRAF_MCP_PORT=4398 OGRAF_WORKSPACE_ROOT=/path/to/ografstudio-site npm run mcp:start
```

```bash
VITE_OGRAF_AGENT_BRIDGE_URL=ws://127.0.0.1:4398/editor npm run dev --workspace apps/editor -- --port 5190 --strictPort
```

Open Studio on port 5190 and keep its tab visible, because certification plays each graphic in real
time. Then, from this site:

```bash
node examples-src/build.mjs
```

```bash
npm run graphics
```

Pass slugs to rebuild only some: `node examples-src/build.mjs clock bug`.

The MCP server loads the OGraf runtime when it starts. After changing the runtime in Studio, restart
both servers before exporting, or the packages keep the old one.

## Controls on the site

The form in `src/components/OGrafExample` is built from each package's manifest:

- Field titles, descriptions and dropdown labels come from the data fields in `build.mjs`.
- Each custom action becomes a button. An action with the id `add:<field>:<step>` also moves the
  form's copy of that field, because the graphic changes the field itself.
- A package with more than one step gets a Next button.
