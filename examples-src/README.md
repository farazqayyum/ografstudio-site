# Example sources

`build.mjs` authors the operator-facing examples through OGraf Studio's MCP server. For each one it
saves the editable source here (`<slug>.ogs`) and exports the certified package to
`graphics/<slug>.ograf.zip`:

clock, countdown, scoreboard, lower-third, ticker, bug, rankings, live-markets, shader-background and
lottie-pulse.

`npm run graphics` copies each `.ogs` to `static/graphics`, and the player's caption links to it. The
prompt, model and generation time on each page live in `origin` in `src/data/examples.ts`. The time
is estimated from the session records and counts writing and building only. When you rebuild a
template from a new prompt, update its record.

The last two are built from `static/downloads/wave-bands.glsl` and `static/downloads/pulse.json`.

Rankings also has `rankings-votes.js`, the scoring function that Studio's Functions pane shows, and
`fonts/oswald.woff2` with its licence. Studio's canvas doesn't run functions, so `build.mjs` plays the
function up to the second jury's top score and uses the result as the default of the fields it
writes. That sample is what you see while designing. On air, the graphic starts from zero.

Live markets lives in `live-markets.mjs`, with its two functions in `live-markets-logic.js` and
`live-markets-crosshair.js`, and `fonts/inter.woff2` and `fonts/jetbrains-mono.woff2` with their licences.
`live-markets-snapshot.json` holds real prices, so the template has something to show before a feed
arrives. Refresh it with `node examples-src/live-markets-snapshot.mjs` before a rebuild. On the site the
data comes from `src/components/OGrafExample/marketFeed.ts`, and the markets and ranges both read are in
`src/data/marketData.mjs`. Three limits shaped it:

- Keep looping layers out of it. While any layer loops, the runtime redraws every layer on every frame,
  and with about 180 layers that starved the function workers until they failed. The dots beat when data
  arrives instead.
- A function takes at most 64 KiB of input, so `history` stays around 45 KB.
- A function runs in a new worker for each call, and all functions share one queue. A call that's already
  running can return after a click, so return only what the call changed, never an input as it came in.

## Fonts

Studio's recipes embed a 371 KB TrueType copy of Roboto Condensed unless the template already has the
family, so `build.mjs` gives those templates `fonts/roboto-condensed.woff2` first. Both fonts here are
the upstream variable fonts as WOFF2 without hinting, which their scaled text doesn't use. Every character
and weight is still there, because visitors type into these forms and broadcasters download them:

```bash
pyftsubset font.ttf --unicodes='*' --layout-features='*' --no-hinting --name-IDs='*' --name-languages='*' --notdef-outline --flavor=woff2
```

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
