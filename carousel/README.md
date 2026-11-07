# Homepage feature reel

The hero carousel on the homepage is a real OGraf graphic, not a video or a web animation. It's a
template set with nine templates in two Transition Logic lanes, exported as one certified coordinated
package, `graphics/feature-reel.ograf.zip`, and played by the OGraf web player.

- The **reel** lane holds the eight slides. The surface that glides between them is one shared
  element morphing between its pose in each template.
- The **ticker** lane holds the ticker. Taking it in makes the surface give up 40 px of height
  through a Transition Logic layout rule, and taking it out gives them back. The band fits the stage's
  corner marks exactly, so `SAFE` and `BAND` in `build.mjs` have to match `.corner` in
  `src/components/HeroReel/styles.module.css`.

## Files

- `build.mjs` authors the whole set through Studio's MCP server, saves `feature-reel.ogs` (the
  editable source) and exports the package. Change the reel here, or open the `.ogs` in Studio. Don't
  do both: running `build.mjs` replaces the `.ogs` and loses anything edited in Studio.
- `export.mjs` re-exports the set already open in Studio. `capture.mjs` saves a PNG of each template.
- `charts-seed.ogs` is an empty template with the Chart.js renderer pinned. `build.mjs` starts from
  it; see "The chart renderer" below.
- `sound/build-sound.mjs` makes the Media slide's sound, in `static/audio/`.
- `src/components/HeroReel` mounts the package and drives it with the package's own
  `transition.take` and `transition.out` custom actions. Its lane and state IDs must match
  `build.mjs`.
- `assets/` and `shaders/` hold what the reel uses. See Credits below.

## Rebuild

The `.ogs` and the package need Studio 0.23 or later, and these scripts need its MCP server. Run a
separate copy so they never touch an editor you're working in. From a Studio checkout:

```bash
OGRAF_MCP_PORT=4398 OGRAF_WORKSPACE_ROOT=/path/to/ografstudio-site npm run mcp:start
```

```bash
VITE_OGRAF_AGENT_BRIDGE_URL=ws://127.0.0.1:4398/editor npm run dev --workspace apps/editor -- --port 5190 --strictPort
```

Open Studio on port 5190 and keep its tab visible. Certification plays the graphic in real time, so
it times out in a background tab. Then, from this site:

```bash
node carousel/build.mjs
```

```bash
npm run graphics
```

If the export fails after a long session, reload the Studio tab and run `node carousel/export.mjs`.
Each shader holds a WebGL context, and a tab that has opened many projects runs out of them.

### Keeping it light

The reel loads on the homepage, so its weight is every visitor's. Screenshots and stills are WebP, and the
clip is 640 pixels wide because it fills about a third of the frame. Each template carries its own copy of its
fonts, so `importFonts` packages only the weights that slide uses. Cutting the shaders' `resolutionScale` by about
a quarter to a half didn't raise the frame rate and visibly softened them, so they stay as they are.

### The chart renderer

A chart needs its renderer pinned in its template, and MCP can't pin one: only Studio's **Plugins**
pane can. So `charts-seed.ogs` holds the exact Chart.js 1.3.1 bundle that ships with Studio, and the
Charts slide is authored first, on the template opened from it. New templates start with an empty
renderer catalog, so the slide can't be authored later in the order.

Studio trusts the seed because its bytes match the bundle compiled into Studio. If Studio stops
shipping that version, opening the seed reports a plugin mismatch, and you need a new seed. Make one
in a blank template: open **Window > Plugins > Chart**, click any chart type, delete the chart that
appears, and save the template over `carousel/charts-seed.ogs`. Deleting the chart keeps the pin.

### The editor screenshots

The Studio slide is a tour of real screenshots, `assets/studio-*.webp`, 1920 by 1080. `TOUR` in
`build.mjs` lists them with the part of each to zoom into. They're from Studio holding this reel, so
retake them when the editor's look changes: build once, keep Studio open at a 1440 by 810 window, set up
each pane, and save a JPEG at a device scale of 1.333. Check them for personal details before publishing.

### The LinkedIn button

OGraf rules can't open a web page, so the Join button on the Community slide is drawn in the graphic and
`HeroReel` lays a real link over it. `JOIN_BUTTON` in `build.mjs` and in `HeroReel/index.tsx` must match.
Where the package plays elsewhere, the button doesn't respond and the address under it does the job.

### Changing the ticker's text

The feed uses explicit item widths, so a longer headline clips instead of growing. Each width in
`FEED` in `build.mjs` is the text measured in Plus Jakarta Sans 600 at 30 px, rounded up with a few
pixels spare. Measure new text in a browser console on the site:

```js
const context = document.createElement('canvas').getContext('2d');
context.font = '600 30px "Plus Jakarta Sans"';
context.measureText('Your headline').width;
```

### The webcam on the monitor

The monitor on the Transition Logic slide has a live Media fill with the source tag `reel-camera`,
and shader 20, Signal Glitch, as an effect on that layer. A live fill asks its renderer for frames
through a `zd-ograf-media` element, and this site is the renderer here:
`src/components/HeroReel/reelCamera.ts` defines that element and hands it the visitor's camera.
Until the camera is on, or wherever the package plays without that element, the fill shows its
fallback, `assets/monitor-still.webp`. The camera only starts from a click and nothing leaves the
browser.

The glitch's values were tuned in the shader explorer, with `zoom` at 0.8. A Media fill keeps the
untouched picture showing behind a shader effect, so the shader's own zoom doubles the image. Instead
`zoom` stays at 1 and the picture has the same 10% margin built in: `reelCamera.ts` draws the camera
into a transparent frame, and `monitor-still.webp` is `sunset-still.jpg` on a transparent frame, 800 by
450 px. Torn lines spill into that margin, as they do in the explorer.

### Changing the film clip

The clip and its sound are the same excerpt of `bbb_sunflower_1080p_30fps_normal.mp4`, from the
Blender Foundation's [download server](https://download.blender.org/demo/movies/BBB/). It runs from
1:17.9 to 1:34.2, starting and ending on cuts in the film so that its loop looks like another cut.

```bash
ffmpeg -ss 77.9 -t 16.27 -i bbb_sunflower_1080p_30fps_normal.mp4 -an -vf "scale=640:360:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -profile:v high -preset veryslow -crf 27 -g 60 -movflags +faststart carousel/assets/big-buck-bunny-clip.mp4
```

```bash
node carousel/sound/build-sound.mjs --film bbb_sunflower_1080p_30fps_normal.mp4
```

`FILM_START` and `FILM_SECONDS` in `sound/build-sound.mjs` must match the first command.

## Known Studio limits this works around

- **No audio in a coordinated set.** Export rejects audio layers and Media Cues, and Sound Events are
  Media Cues, while Media fills are always muted. So the clip plays as a muted Media fill, and
  `src/components/HeroReel/reelSound.ts` plays the sound on the page, following the video element's
  time. The downloadable package is therefore silent. Media fills are real-time only, so the package
  is exported with the `realtime` profile.
- **No hand cursor over rule layers in a coordinated set.** `transitionLogicRendering.ts` enables
  pointer input on them but doesn't set a cursor, unlike `GraphicElement.ts`. `HeroReel` sets it from
  the page, so the cursor is missing where the package plays elsewhere. Remove `onStagePointerMove`
  once Studio does this.
- **Shader-painted text needs Text FX.** A coordinated template prepares while hidden, and
  `packages/ograf-runtime/src/shaderPaintMask.ts` skips hidden text and then caches that empty mask
  until the text's styles change. Shader fills and outlines on text stay blank unless a Text FX
  animation changes those styles after the template is revealed.
- **Shader effects can stay blank in a coordinated set.** On a plain image the output stayed empty,
  although the same layer painted in a standalone export, so the third tile on the Shaders slide is a
  shader fill on an image instead. An effect on a Media fill does paint, as the monitor's glitch shows.
- **`add_effect` starts switched off.** Unless its patch sets `enabled: true`, the effect is added
  but does nothing, with no warning.

## Credits

- Film clip and its sound: excerpt of Big Buck Bunny, © 2008 Blender Foundation,
  [peach.blender.org](https://peach.blender.org/), cut and re-encoded, under
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The credit is on the slide and on the
  third-party credits page.
- Sound effects: synthesised by `sound/build-sound.mjs`.
- Charts: Chart.js 4.5.1, MIT licence, through Studio's AGPL-3.0 renderer. The chart figures are made
  up.
- Shaders: from the ZD News Package, CC0-1.0.
- `sunset-still.jpg`: rendered from the CC0 shader `13-sunset-sea`.
- Plus Jakarta Sans: SIL Open Font License 1.1, `assets/PlusJakartaSans-OFL.txt`.
- Space Mono: SIL Open Font License 1.1, `assets/SpaceMono-OFL.txt`.
- OGraf logo: © European Broadcasting Union, MIT licence.
- LinkedIn mark: a trademark of LinkedIn Corporation, used only to link to the group.
  `linkedin-mark-white.svg` is the Simple Icons drawing, CC0-1.0.
