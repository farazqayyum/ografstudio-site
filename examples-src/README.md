# Example sources

`build.mjs` authors the operator-facing examples through OGraf Studio's MCP server. For each one it
saves the editable source here (`<slug>.ogs`) and exports the certified package to
`graphics/<slug>.ograf.zip`:

clock, countdown, scoreboard, lower-third, ticker, bug, rankings, live-markets, weather, weather-strap,
shader-background and lottie-pulse.

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

Europe weather and the weather strap live in `weather.mjs`, with their functions in `weather-logic.js`
and `weather-strap-logic.js`, the rain, snow, thunder and fog shader in `weather-sky.glsl`, and
`fonts/oswald.woff2` and `fonts/inter.woff2`. The cities and the Open-Meteo request are in
`src/data/weatherData.mjs`, and on the site `src/components/OGrafExample/weatherFeed.ts` sends the
forecast to the graphic. A few things to know before changing them:

- `weather-snapshot.json` is a real forecast, so the templates show true weather before a feed
  arrives. Refresh it with `node examples-src/weather-snapshot.mjs` before a rebuild, because its first
  day becomes the date on screen.
- `weather-map.svg` is drawn from Natural Earth's 1:50m countries, which are public domain:
  `node examples-src/weather-map.mjs ne_50m_admin_0_countries.geojson`. The city spots in
  `weather-logic.js` and `weather-sky.glsl` come from the same script's `project(lon, lat)`. Change the
  projection and you must update both.
- Studio names a shader's fields after its layer, as `shader_layer_<id>_<name>`, and `weather.mjs`
  finds them that way. The Weather function packs each step's weather for six cities into one number.
- The icons are drawn in `weather-icons.mjs`, each moving inside its own picture. The functions only
  name the sky, and each icon layer's binding turns the name into its picture. Pictures in the
  function's output would pass the 64 KiB a function may return, with twelve cities on screen.
- The outlook's close-up is a picture, `weather-closeup.webp`: the map drawn 2.4 times larger by
  `node examples-src/weather-closeup.mjs`. A picture moves and zooms for nothing, while the map's own
  paths took about 30 ms a frame. Draw it again after changing the map. `CLOSE_UP` in `weather-map.mjs`
  says where it starts, and `weather-logic.js` keeps a copy.
- A new outlook city is rules in `weather.mjs`: one pair of camera moves per city, the marker, and one
  dip and one rise for the numbers. The Weather function changes the numbers between the two, at
  `SWAP_MS`, and runs the tour on its own timer. Each rule that fires redraws the whole graphic once, so
  keep them few. Layers that rules move have no update transition, or an update fades them out before
  the new city even arrives.
- Text has a fixed size. Shrink-to-fit measures every label on every frame that something moves, which
  stalled a city change. Oswald's sizes are the ones shrink-to-fit used to settle on.
- Studio stores every key of every layer, so `weather.ogs` is about 6 MB. The package is about 2.7 MB.

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
