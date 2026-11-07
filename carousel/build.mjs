/**
 * Authors the homepage feature reel through OGraf Studio's MCP server, then saves the editable
 * set and exports the certified package that the site's web player mounts.
 *
 * Needs a running Studio and MCP server; see carousel/README.md.
 */
import { readFile } from 'node:fs/promises';
import { call } from './mcp.mjs';

const C = {
  ink: '#f5f7ff',
  muted: '#bcc8e4',
  dim: '#8493b8',
  navy: '#060b1c',
  panel: '#0b1430',
  panelGlass: '#0a1226e8',
  track: '#ffffff14',
  line: '#ffffff26',
  blue: '#4a86ff',
  cyan: '#4fe0ff',
  red: '#ff4238',
  amber: '#ffb224',
  green: '#2fe6a8',
  orange: '#ff8a3d',
  violet: '#b58cff',
  linkedin: '#0a66c2',
};
// The type of ograf.ebu.io, as on the rest of the site.
const FONT = {
  display: 'Plus Jakarta Sans, Arial, sans-serif',
  text: 'Plus Jakarta Sans, Arial, sans-serif',
  mono: 'Space Mono, Courier New, monospace',
};
const IN = 50;
const OUT = 20;
const LOOP = 400;
const SLOT = 'reel';
const TICKER_SLOT = 'ticker';
const TICKER_STATE = 'ticker-on';
const TICKER_IN = 40;
// The stage's corner marks sit 24 px in from every edge (.corner in HeroReel/styles.module.css), and
// the band fits them exactly: its left, right and bottom edges are on those lines.
const SAFE = 24;
const BAND = { x: SAFE, y: 1080 - SAFE - 60, width: 1920 - SAFE * 2, height: 60, radius: 8 };
// Surfaces end at 1026, so they give up this much while the ticker is on, ending 10 px above it.
const MAKE_ROOM = 40;
// The page supplies this source when the visitor turns their webcam on (HeroReel/reelCamera.ts).
const CAMERA_TAG = 'reel-camera';
// Text and explicit item widths, measured in Plus Jakarta Sans 600 at 30 px; see carousel/README.md.
const FEED = [
  ['This ticker is its own Transition Logic lane', 584, C.cyan],
  ['Live GLSL shaders on text, shapes and images', 662, C.violet],
  ['Click, tap and hover rules ship inside the package', 711, C.amber],
  ['Video, images, SVG and Lottie on one canvas', 653, C.green],
  ['Build by hand, with the AI Assistant or over MCP', 683, C.blue],
  ['Exports standard EBU OGraf packages', 565, C.orange],
  ['Join the OGraf Studio Community on LinkedIn', 658, C.linkedin],
  ['Best of Show, IBC 2026', 344, C.red],
  ['Free and open source under AGPL-3.0', 559, C.ink],
];

const shader = async (file, parameters = {}, resolutionScale = 0.5, speed = 1) => ({
  type: 'shader',
  fragmentSource: await readFile(new URL(`./shaders/${file}.glsl`, import.meta.url), 'utf8'),
  speed,
  resolutionScale,
  parameters,
});

async function settled() {
  let last = await call('ograf_get_project', { include: ['metadata'] });
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const next = await call('ograf_get_project', { include: ['metadata'] });
    const caps = await call('ograf_get_capabilities', { sections: ['editor'] });
    if (next.revision === last.revision && caps.editor?.responsive) return next;
    last = next;
  }
  throw new Error('Studio did not settle; keep its tab visible and run again.');
}

async function apply(operations, reason) {
  const { revision } = await settled();
  const result = await call('ograf_apply_operations', {
    expectedRevision: revision,
    operations,
    reason,
  });
  if (result.validation?.valid === false) throw new Error(JSON.stringify(result.validation));
  return result;
}

async function setOperation(operation) {
  await settled();
  const { revision } = await call('ograf_get_template_set');
  return call('ograf_update_template_set', { expectedRevision: revision, operation, confirm: true });
}

async function importAsset(args) {
  const { revision } = await settled();
  return call('ograf_import_asset', { expectedRevision: revision, ...args });
}

/** Every family and weight a batch of operations asks for, as `Family weight`. */
function fontsUsed(ops) {
  const used = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') {
      if (typeof value.fontFamily === 'string')
        used.add(`${value.fontFamily.split(',')[0].trim().replace(/['"]/g, '')} ${value.fontWeight}`);
      Object.values(value).forEach(walk);
    }
  };
  walk(ops);
  return used;
}

/** Each template gets its own copy of its fonts, so a slide packages only the weights it uses. */
async function importFonts(used) {
  const sans = await readFile(new URL('./assets/PlusJakartaSans-OFL.txt', import.meta.url), 'utf8');
  const mono = await readFile(new URL('./assets/SpaceMono-OFL.txt', import.meta.url), 'utf8');
  const fonts = [
    ['plus-jakarta-sans-latin-500-normal.woff2', 'Plus Jakarta Sans', '500', sans],
    ['plus-jakarta-sans-latin-600-normal.woff2', 'Plus Jakarta Sans', '600', sans],
    ['plus-jakarta-sans-latin-700-normal.woff2', 'Plus Jakarta Sans', '700', sans],
    ['plus-jakarta-sans-latin-800-normal.woff2', 'Plus Jakarta Sans', '800', sans],
    ['space-mono-latin-400-normal.woff2', 'Space Mono', '400', mono],
  ];
  const known = new Set(fonts.map(([, family, weight]) => `${family} ${weight}`));
  for (const font of used) if (!known.has(font)) throw new Error(`No font file for ${font}`);
  for (const [file, fontFamily, fontWeight, licenseText] of fonts.filter(([, family, weight]) => used.has(`${family} ${weight}`)))
    await importAsset({
      path: `carousel/assets/${file}`,
      mimeType: 'font/woff2',
      fontFamily,
      fontWeight,
      fontStyle: 'normal',
      licenseName: 'SIL Open Font License 1.1',
      licenseText,
    });
}

/** Collects one template's operations; every layer gets an entrance and an exit. */
function scene() {
  const ops = [];
  const add = (kind, name, box, element) =>
    ops.push({
      type: 'add_layer',
      kind,
      name,
      transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
      element,
    });
  const api = {
    ops,
    rect: (name, box, fill, radius = 0, extra = {}) =>
      add('rectangle', name, box, { fill, borderRadius: radius, strokeWidth: 0, ...extra }),
    ellipse: (name, box, fill, extra = {}) =>
      add('ellipse', name, box, { fill, strokeWidth: 0, ...extra }),
    text: (name, box, content, style) =>
      add('text', name, box, {
        content,
        fontFamily: style.font ?? FONT.text,
        fontSize: style.size,
        minFontSize: Math.max(1, style.size * 0.5),
        fontWeight: style.weight ?? (style.font === FONT.mono ? 400 : 500),
        color: style.color ?? C.ink,
        lineHeight: style.lh ?? 1.2,
        letterSpacing: style.ls ?? 0,
        textAlign: style.align ?? 'left',
        verticalAlign: style.valign ?? 'top',
        autoFit: style.fit ?? 'fixed',
        ...(style.fill ? { fill: style.fill } : {}),
        ...(style.anim ? { textAnimation: style.anim } : {}),
      }),
    raw: (operation) => ops.push(operation),
    /** Keeps text readable on whatever shows through the graphic, light or dark. Small text needs more. */
    shadow(name, small = false) {
      const layers = small
        ? [
            { offsetX: 0, offsetY: 1, radius: 1, color: '#030712', opacity: 1 },
            { offsetX: 0, offsetY: 1, radius: 5, color: '#030712', opacity: 0.95 },
            { offsetX: 0, offsetY: 3, radius: 16, color: '#030712', opacity: 0.9 },
          ]
        : [
            { offsetX: 0, offsetY: 2, radius: 3, color: '#030712', opacity: 0.8 },
            { offsetX: 0, offsetY: 3, radius: 18, color: '#030712', opacity: 0.85 },
          ];
      // A new effect starts switched off unless the patch says otherwise.
      for (const params of layers)
        ops.push({ type: 'add_effect', layerName: name, effectType: 'drop-shadow', patch: { enabled: true, params } });
    },
    /** Rises into place; `finish` is how many frames before the Step the move completes. */
    enter: (name, finish, duration = 24, style = 'slide', extra = {}) =>
      ops.push({
        type: 'set_layer_motion',
        layerName: name,
        side: 'in',
        spec: {
          style,
          durationFrames: duration,
          offsetFrames: finish,
          easing: 'cubic-out',
          ...(style === 'slide' ? { direction: 'up', distance: 56 } : {}),
          ...extra,
        },
      }),
    leave: (name, finish = 2, duration = 15) =>
      ops.push({
        type: 'set_layer_motion',
        layerName: name,
        side: 'out',
        spec: { style: 'fade', durationFrames: duration, offsetFrames: finish, easing: 'cubic-in' },
      }),
    both(name, finish, duration, style, extra) {
      api.enter(name, finish, duration, style, extra);
      api.leave(name);
    },
    loop(name, tracks, duration = LOOP, phase = 0) {
      ops.push({
        type: 'set_layer_loop',
        layerName: name,
        name: `${name} loop`,
        activation: { type: 'lifecycle' },
        durationFrames: duration,
        phaseOffsetFrames: phase,
        repeatCount: null,
      });
      for (const [property, keys] of Object.entries(tracks))
        ops.push({
          type: 'set_loop_property_track',
          layerName: name,
          property,
          keys: keys.map(([frame, value, easing]) => ({
            frame,
            value,
            easing: easing ?? 'cubic-in-out',
          })),
        });
    },
  };
  return api;
}

/** Eyebrow, headline lines and body shared by the four panel slides. */
function copyColumn(s, { number, label, lines, body, accent, top = 214 }) {
  s.rect('Eyebrow mark', [96, top + 7, 20, 20], accent, 4);
  s.both('Eyebrow mark', 30, 16);
  s.shadow('Eyebrow mark');
  s.text('Eyebrow', [132, top, 720, 40], `${number}  ${label}`, {
    font: FONT.mono,
    size: 28,
    weight: 400,
    color: accent,
    ls: 2,
  });
  s.both('Eyebrow', 28, 18);
  s.shadow('Eyebrow', true);
  lines.forEach((line, index) => {
    const name = `Headline ${index + 1}`;
    s.text(name, [92, top + 56 + index * 124, 772, 126], line, {
      font: FONT.display,
      size: 112,
      weight: 800,
      lh: 1.08,
      ls: -2.5,
    });
    s.both(name, 20 - index * 5, 28);
    s.shadow(name);
  });
  s.text('Body', [96, top + 84 + lines.length * 124, 730, 300], body, {
    size: 32,
    color: '#e6ecfa',
    lh: 1.42,
  });
  s.both('Body', 2, 24);
  s.shadow('Body', true);
}

async function surfaceLayers() {
  return [
    {
      type: 'add_layer',
      kind: 'rectangle',
      name: 'Surface',
      transform: { x: 872, y: 54, width: 952, height: 972 },
      element: {
        fill: await shader(
          '36-silk-ribbons',
          {
            baseColor: [0.05, 0.17, 0.55],
            sheenColor: [0.6, 0.82, 1],
            shadowColor: [0.01, 0.02, 0.1],
            flowSpeed: 0.34,
            foldScale: 1.3,
          },
          0.4,
        ),
        borderRadius: 44,
        strokeWidth: 0,
      },
    },
    {
      type: 'add_layer',
      kind: 'rectangle',
      name: 'Surface scrim',
      transform: { x: 872, y: 54, width: 952, height: 972 },
      element: { fill: C.navy, borderRadius: 44, strokeWidth: 0 },
    },
    {
      type: 'add_layer',
      kind: 'rectangle',
      name: 'Surface edge',
      transform: { x: 872, y: 54, width: 952, height: 972 },
      element: { fill: '#00000000', borderRadius: 44, strokeColor: C.line, strokeWidth: 2 },
    },
  ];
}

/** Each slide's pose for the shared surface; the morph between them is Transition Logic. */
const POSES = {
  studio: { box: [48, 54, 1824, 972], scrim: 0.78, edge: 1 },
  transitions: { box: [872, 54, 952, 972], scrim: 0.5, edge: 1 },
  shaders: { box: [-70, -70, 2060, 1220], scrim: 0.42, edge: 0 },
  touch: { box: [872, 54, 952, 972], scrim: 0.72, edge: 1 },
  media: { box: [872, 54, 952, 536], scrim: 0.3, edge: 0 },
  charts: { box: [48, 54, 1824, 972], scrim: 0.74, edge: 1 },
  ai: { box: [872, 54, 952, 972], scrim: 0.62, edge: 1 },
  community: { box: [-70, -70, 2060, 1220], scrim: 0.5, edge: 0 },
};

async function slideTransitions(s, fallbackAsset) {
  copyColumn(s, {
    number: '02',
    label: 'TRANSITION LOGIC',
    accent: C.cyan,
    lines: ['Graphics', 'that know', "what's on air."],
    body: 'Put templates in lanes. A Take morphs what they share, makes room, and follows the rules you set.',
  });

  // A small programme monitor: the ticker takes, the lower third makes room, then morphs.
  const mon = [912, 94, 872, 490];
  s.rect('Monitor', mon, {
    type: 'linear',
    angle: 135,
    stops: [
      { offset: 0, color: '#1a2d63', opacity: 1 },
      { offset: 1, color: '#070d20', opacity: 1 },
    ],
  }, 20);
  s.both('Monitor', 14, 26, 'fade');
  s.raw({ type: 'set_layer_layout', layerName: 'Monitor', clipChildren: true });

  // The picture on air: the visitor's webcam once they turn it on, and a still until then. Being a
  // live Media fill, any host that supplies this tag can feed it. Shader 20 keeps the signal breaking
  // up, and leaves the alpha alone, so torn lines spill into the see-through margin.
  s.rect('Camera', mon, {
    type: 'media',
    source: { kind: 'live', tag: CAMERA_TAG, fallback: `asset:${fallbackAsset}` },
    fit: 'cover',
    positionX: 0.5,
    positionY: 0.5,
    loop: true,
    speed: 1,
    offsetMs: 0,
    trimEndMs: null,
    timelineStartMs: 0,
    muted: true,
  }, 20);
  s.both('Camera', 12, 24, 'fade');
  s.raw({
    type: 'add_effect',
    layerName: 'Camera',
    effectType: 'shader',
    patch: {
      enabled: true,
      name: 'Signal Glitch',
      shader: {
        ...(await shader(
          '20-signal-glitch',
          // Tuned in the shader explorer. There, zoom was 0.8. On a Media fill the runtime keeps the
          // untouched picture showing behind an effect, so the shader's own zoom doubles the image.
          // The frames have the same 10% margin built in instead, and zoom stays at 1.
          {
            amount: 0.24,
            autoGlitch: true,
            burstRate: 0.7,
            burstLength: 0.48,
            blockSize: 39,
            tear: 0.059,
            rgbSplit: 0.0225,
            scanlines: 1,
            snow: 0.68,
            bandColor: [0.38, 1, 0.796],
            zoom: 1,
          },
          1,
        )),
        name: 'Signal Glitch',
      },
    },
  });

  s.rect('PGM tally', [936, 118, 16, 16], C.red, 4);
  s.both('PGM tally', 10, 14, 'fade');
  s.text('PGM label', [962, 110, 300, 34], 'PROGRAM', { font: FONT.mono, size: 24, color: C.ink, ls: 2 });
  s.both('PGM label', 10, 14, 'fade');
  s.shadow('PGM label');

  const child = (name) =>
    s.raw({ type: 'set_layer_layout', layerName: name, parentId: 'Monitor' });
  s.rect('LT panel', [952, 450, 408, 92], C.blue, 8);
  s.text('LT name', [974, 458, 372, 44], 'Amara Okafor', { font: FONT.display, size: 34, weight: 700, lh: 1.15 });
  s.text('LT role', [974, 500, 372, 34], 'Correspondent, Geneva', { size: 22, color: '#e4ecff' });
  s.text('Break line', [974, 354, 760, 76], 'Summit ends in deal', { font: FONT.display, size: 62, weight: 800, lh: 1.1, ls: -1 });
  s.rect('Ticker band', [912, 590, 872, 58], '#0a1226');
  s.rect('Ticker plate', [912, 590, 150, 58], C.red);
  s.text('Ticker label', [912, 590, 150, 58], 'Latest', { font: FONT.display, size: 28, weight: 700, lh: 1.1, align: 'center', valign: 'middle' });
  s.text('Ticker text', [1082, 590, 700, 58], 'Markets close higher  /  Storm warning lifted', { font: FONT.display, size: 26, weight: 600, lh: 1.1, color: C.muted, valign: 'middle' });
  child('Camera');
  for (const name of ['LT panel', 'LT name', 'LT role', 'Break line', 'Ticker band', 'Ticker plate', 'Ticker label', 'Ticker text']) {
    child(name);
    s.leave(name);
  }
  s.enter('LT panel', 6, 20, 'fade');
  s.enter('LT name', 6, 20, 'fade');
  s.enter('LT role', 6, 20, 'fade');

  const room = -74;
  s.loop('LT panel', {
    y: [[0, 450], [70, 450], [110, 450 + room], [230, 450 + room], [275, 330], [345, 330], [390, 450], [400, 450]],
    width: [[0, 408], [230, 408], [275, 792], [345, 792], [390, 408], [400, 408]],
    height: [[0, 92], [230, 92], [275, 112], [345, 112], [390, 92], [400, 92]],
  });
  s.loop('LT name', {
    y: [[0, 458], [70, 458], [110, 458 + room], [360, 458 + room], [374, 458], [400, 458]],
    opacity: [[0, 1], [228, 1], [244, 0], [370, 0], [390, 1], [400, 1]],
  });
  s.loop('LT role', {
    y: [[0, 500], [70, 500], [110, 500 + room], [360, 500 + room], [374, 500], [400, 500]],
    opacity: [[0, 1], [228, 1], [244, 0], [370, 0], [390, 1], [400, 1]],
  });
  s.loop('Break line', {
    opacity: [[0, 0], [255, 0], [275, 1], [345, 1], [360, 0], [400, 0]],
  });
  for (const [name, y] of [['Ticker band', 590], ['Ticker plate', 590], ['Ticker label', 590], ['Ticker text', 590]])
    s.loop(name, {
      y: [[0, y], [60, y], [100, y - 66], [340, y - 66], [380, y], [400, y]],
    });

  // Lanes, drawn the way the Transitions pane draws them, with a playhead in step with the loop.
  s.rect('Lanes panel', [912, 604, 872, 366], C.panelGlass, 20);
  s.both('Lanes panel', 12, 26, 'fade');
  const trackX = 1140;
  const trackW = 620;
  const frameX = (frame) => trackX + (frame / LOOP) * trackW;
  const rows = [
    ['LOWER THIRD', [[0, 400, `${C.blue}66`], [230, 275, C.green], [345, 390, C.green]]],
    ['TICKER', [[60, 100, C.blue], [100, 340, `${C.blue}66`], [340, 380, C.orange]]],
    ['MAKE ROOM', [[60, 100, C.green], [345, 390, C.green]]],
    ['BREAKING', [[255, 275, C.blue], [275, 345, `${C.blue}66`], [345, 360, C.orange]]],
  ];
  rows.forEach(([label, bars], row) => {
    const y = 640 + row * 76;
    s.text(`Lane ${row + 1} label`, [940, y + 8, 196, 34], label, { font: FONT.mono, size: 22, color: C.muted, ls: 1 });
    s.both(`Lane ${row + 1} label`, 8 - row, 18, 'fade');
    s.rect(`Lane ${row + 1} track`, [trackX, y, trackW, 50], C.track, 10);
    s.both(`Lane ${row + 1} track`, 8 - row, 18, 'fade');
    bars.forEach(([from, to, color], index) => {
      const name = `Lane ${row + 1} bar ${index + 1}`;
      s.rect(name, [frameX(from), y, frameX(to) - frameX(from), 50], color, 10);
      s.both(name, 4, 18, 'fade');
    });
  });
  s.rect('Playhead', [trackX, 628, 4, 302], C.ink, 2);
  s.both('Playhead', 2, 14, 'fade');
  s.loop('Playhead', { x: [[0, trackX, 'linear'], [LOOP, trackX + trackW, 'linear']] });
}

async function slideShaders(s) {
  s.text('Giant word', [84, 52, 1752, 560], 'Shaders', {
    font: FONT.display,
    size: 440,
    weight: 800,
    lh: 1,
    ls: -8,
    align: 'center',
    valign: 'middle',
    fit: 'fit-to-width',
    // A coordinated template prepares hidden and caches blank shader coverage for text until the
    // text's styles change. Text FX changes them, and the letters rising in chrome is the point.
    anim: { type: 'rise', durationFrames: 42, split: 'grapheme' },
    fill: await shader(
      '45-liquid-chrome',
      { iridescence: 0.85, flowSpeed: 0.45, contrast: 1.1, scale: 1.1 },
      0.75,
    ),
  });
  s.enter('Giant word', 38, 10, 'fade');
  s.leave('Giant word');

  s.rect('Eyebrow mark', [96, 641, 20, 20], C.violet, 4);
  s.both('Eyebrow mark', 16, 16);
  s.text('Eyebrow', [132, 634, 680, 40], '03  LIVE GLSL', { font: FONT.mono, size: 28, color: C.violet, ls: 2 });
  s.both('Eyebrow', 14, 18);
  s.text('Headline 1', [92, 682, 800, 92], 'Real GLSL, live on air.', { font: FONT.display, size: 74, weight: 800, lh: 1.1, ls: -1.5 });
  s.both('Headline 1', 10, 24);
  s.text('Body', [96, 786, 760, 200], 'Paint text, shapes, images and Lottie with a fragment shader. Mark a constant with a pragma and operators get a colour picker or a slider.', {
    size: 30,
    color: C.ink,
    lh: 1.42,
  });
  s.both('Body', 4, 24);

  // A shader can be a fill, an outline or an effect: one of each, all live.
  const tile = (name, x, label, finish) => {
    s.text(`${name} label`, [x, 938, 270, 36], label, { font: FONT.mono, size: 24, ls: 2, align: 'center', color: C.ink });
    s.both(`${name} label`, finish, 18, 'fade');
  };
  s.ellipse('Fill tile', [950, 634, 280, 280], await shader('19-neon-tunnel', { speed: 1.2, glow: 1.8, fog: 0.15, lineWidth: 0.05 }, 0.75));
  s.both('Fill tile', 12, 26, 'pop');
  tile('Fill tile', 955, 'FILL', 8);

  s.rect('Outline plate', [1250, 634, 280, 280], '#050914d9', 36);
  s.both('Outline plate', 10, 24, 'fade');
  s.text('Outline tile', [1250, 634, 280, 280], 'GL', {
    font: FONT.display,
    size: 170,
    weight: 800,
    lh: 1,
    align: 'center',
    valign: 'middle',
    color: '#00000000',
    anim: { type: 'fade', durationFrames: 40, split: 'grapheme' },
  });
  s.raw({
    type: 'update_element',
    layerName: 'Outline tile',
    patch: {
      strokeWidth: 7,
      strokeColor: C.ink,
      strokePaint: await shader('11-aurora-curtains', { intensity: 2.4, curtainHeight: 0.7, starAmount: 0 }, 0.6),
    },
  });
  s.both('Outline tile', 8, 24, 'fade');
  tile('Outline tile', 1255, 'OUTLINE', 6);

  s.rect('Image plate', [1550, 634, 280, 280], '#050914d9', 36);
  s.both('Image plate', 8, 24, 'fade');
  s.raw({ type: 'image-tile-placeholder' });
  tile('Image tile', 1555, 'IMAGE', 4);
}

function slideTouch(s) {
  copyColumn(s, {
    number: '04',
    label: 'TOUCH CONTROLS',
    accent: C.amber,
    lines: ['Tap it.', 'It answers.'],
    body: 'Click, tap and hover rules ship inside the exported graphic, so a presenter can drive it on a touch wall. No host code. Go on, tap a tab.',
  });

  const panelX = 912;
  const panelW = 872;
  s.text('Match title', [panelX, 92, 500, 56], 'Match centre', { font: FONT.display, size: 44, weight: 800, lh: 1.2, ls: -0.5 });
  s.both('Match title', 18, 20);
  s.rect('Live chip', [panelX + panelW - 118, 98, 118, 44], C.red, 10);
  s.both('Live chip', 18, 20, 'fade');
  s.text('Live text', [panelX + panelW - 118, 98, 118, 44], 'LIVE', { font: FONT.display, size: 26, weight: 700, lh: 1.1, align: 'center', valign: 'middle', ls: 1 });
  s.both('Live text', 18, 20, 'fade');

  const tabs = [
    { label: 'Possession', home: '58', away: '42', hw: 780, aw: 565 },
    { label: 'Shots', home: '9', away: '14', hw: 501, aw: 780 },
    { label: 'Passes', home: '512', away: '387', hw: 780, aw: 589 },
  ];
  const tabW = 280;
  const tabX = (index) => panelX + index * (tabW + 16);
  // Each tab is a real-looking button at rest: outlined, with a small bar under its name.
  tabs.forEach((tab, index) => {
    const n = index + 1;
    const finish = 14 - index * 2;
    // Hidden until the pointer is over the tab; its hover rule shows it.
    s.rect(`Tab ${n} glow`, [tabX(index) - 8, 162, tabW + 16, 134], `${C.amber}38`, 24, { strokeColor: C.amber, strokeWidth: 4 });
    s.raw({ type: 'set_layer_flags', layerName: `Tab ${n} glow`, isVisible: false });
    s.leave(`Tab ${n} glow`);
    s.rect(`Tab ${n}`, [tabX(index), 170, tabW, 118], '#ffffff1c', 18, { strokeColor: '#ffffff66', strokeWidth: 2 });
    s.both(`Tab ${n}`, finish, 22);
    s.raw({ type: 'set_layer_layout', layerName: `Tab ${n}`, clipChildren: true });
    // A band of light parked just left of the tab; hover sends it across.
    s.rect(`Tab ${n} sheen`, [tabX(index) - 110, 170, 90, 118], {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#ffffff', opacity: 0 },
        { offset: 0.5, color: '#ffffff', opacity: 0.42 },
        { offset: 1, color: '#ffffff', opacity: 0 },
      ],
    });
    s.raw({ type: 'set_layer_layout', layerName: `Tab ${n} sheen`, parentId: `Tab ${n}` });
    s.leave(`Tab ${n} sheen`);
  });
  s.rect('Tab indicator', [tabX(0), 170, tabW, 118], C.amber, 18);
  s.both('Tab indicator', 10, 22);
  tabs.forEach((tab, index) => {
    const n = index + 1;
    const finish = 14 - index * 2;
    s.text(`Tab ${n} label`, [tabX(index), 180, tabW, 76], tab.label, {
      font: FONT.display,
      size: 36,
      weight: 700,
      lh: 1.1,
      align: 'center',
      valign: 'middle',
      color: index === 0 ? C.navy : C.ink,
    });
    s.both(`Tab ${n} label`, finish, 22);
    s.rect(`Tab ${n} bar`, [tabX(index) + tabW / 2 - 22, 262, 44, 5], '#ffffff99', 3);
    s.both(`Tab ${n} bar`, finish, 22);
  });

  const blocks = [
    { key: 'home', label: 'HOME', y: 318, color: C.blue, width: tabs[0].hw, value: tabs[0].home },
    { key: 'away', label: 'AWAY', y: 538, color: C.amber, width: tabs[0].aw, value: tabs[0].away },
  ];
  blocks.forEach((block, index) => {
    const finish = 10 - index * 4;
    s.text(`${block.label} label`, [panelX, block.y + 76, 300, 44], block.label, { font: FONT.mono, size: 30, color: C.muted, ls: 3 });
    s.both(`${block.label} label`, finish, 22);
    s.raw({
      type: 'add_data_field',
      fieldType: 'text',
      key: `${block.key}Value`,
      label: `${block.label} value`,
      defaultValue: block.value,
    });
    s.text(`${block.label} value`, [panelX + panelW - 360, block.y, 360, 136], block.value, {
      font: FONT.display,
      size: 112,
      weight: 800,
      lh: 1.2,
      ls: -2,
      align: 'right',
      anim: { type: 'roll-up', durationFrames: 18, replayOnUpdate: true },
    });
    s.raw({
      type: 'set_layer_bindings',
      layerName: `${block.label} value`,
      bindings: [{ fieldKey: `${block.key}Value`, targetProperty: 'content' }],
    });
    s.both(`${block.label} value`, finish, 22);
    s.rect(`${block.label} track`, [panelX, block.y + 148, panelW, 40], C.track, 20);
    s.both(`${block.label} track`, finish, 22, 'fade');
    s.rect(`${block.label} bar`, [panelX, block.y + 148, block.width, 40], block.color, 20);
    s.both(`${block.label} bar`, finish - 2, 26, 'fade');
  });

  // What the tap is actually doing, written the way the Rules pane writes it.
  s.rect('Rule card', [panelX, 774, panelW, 196], C.panelGlass, 20);
  s.both('Rule card', 6, 22, 'fade');
  [
    ['HOVER', 'Tab glows, its bar grows'],
    ['TAP', 'Bar widths move over 16 frames'],
    ['TAP', 'Set field  >  digits roll'],
  ].forEach(([key, value], index) => {
    const y = 796 + index * 54;
    s.text(`Rule key ${index + 1}`, [panelX + 32, y, 110, 40], key, { font: FONT.mono, size: 28, color: C.amber, ls: 2 });
    s.text(`Rule value ${index + 1}`, [panelX + 150, y, 690, 40], value, { font: FONT.mono, size: 28, color: C.ink });
    s.both(`Rule key ${index + 1}`, 4 - index, 16, 'fade');
    s.both(`Rule value ${index + 1}`, 4 - index, 16, 'fade');
  });

  // Coach mark on the next tab; the first tap retires it.
  s.ellipse('Tap hint', [tabX(1) + tabW - 58, 184, 42, 42], '#ffffff33', { strokeColor: C.ink, strokeWidth: 3 });
  s.both('Tap hint', 0, 16, 'fade');
  s.loop('Tap hint', {
    opacity: [[0, 0.95], [44, 0.25], [70, 0.95]],
  }, 70);

  // Invisible hit areas on top: the only layers here that take the pointer.
  tabs.forEach((tab, index) => {
    s.rect(`Tab ${index + 1} hit`, [tabX(index), 170, tabW, 118], '#00000000', 18);
  });

  return { tabs, tabW, tabX };
}

function touchRules(s, ids, { tabs, tabW, tabX }) {
  tabs.forEach((tab, index) => {
    const n = index + 1;
    const x = tabX(index);
    const label = (i) => ({
      type: 'property',
      targetLayerId: ids[`Tab ${i + 1} label`],
      targetProperty: 'color',
      value: i === index ? C.navy : C.ink,
    });
    s.raw({
      type: 'set_layer_visual_rules',
      layerName: `Tab ${n} hit`,
      rules: [
        {
          id: `tab-${n}-tap`,
          name: `Show ${tab.label.toLowerCase()}`,
          enabled: true,
          trigger: 'click',
          actions: [
            { type: 'property', targetLayerId: ids['Tab indicator'], targetProperty: 'layer.x', value: x, transitionFrames: 14 },
            label(0),
            label(1),
            label(2),
            { type: 'property', targetLayerId: ids['HOME bar'], targetProperty: 'layer.width', value: tab.hw, transitionFrames: 16 },
            { type: 'property', targetLayerId: ids['AWAY bar'], targetProperty: 'layer.width', value: tab.aw, transitionFrames: 16 },
            { type: 'set-data', fieldId: ids.homeValue, mode: 'set', value: tab.home },
            { type: 'set-data', fieldId: ids.awayValue, mode: 'set', value: tab.away },
            { type: 'visibility', visible: false, targetLayerId: ids['Tap hint'], transitionFrames: 6 },
          ],
        },
        {
          id: `tab-${n}-hover`,
          name: `Hover ${tab.label.toLowerCase()}`,
          enabled: true,
          trigger: 'hover',
          actions: [
            { type: 'visibility', visible: true, targetLayerId: ids[`Tab ${n} glow`], transitionFrames: 8 },
            { type: 'property', targetLayerId: ids[`Tab ${n} label`], targetProperty: 'layer.scale', value: 1.08, transitionFrames: 8 },
            { type: 'property', targetLayerId: ids[`Tab ${n} bar`], targetProperty: 'layer.x', value: x + 48, transitionFrames: 12 },
            { type: 'property', targetLayerId: ids[`Tab ${n} bar`], targetProperty: 'layer.width', value: tabW - 96, transitionFrames: 12 },
            { type: 'property', targetLayerId: ids[`Tab ${n} sheen`], targetProperty: 'layer.x', value: x + tabW + 20, transitionFrames: 26 },
          ],
        },
      ],
    });
  });
}

function slideMedia(s, assets, lottie) {
  copyColumn(s, {
    number: '05',
    label: 'MEDIA',
    accent: C.green,
    lines: ['Every kind', 'of picture.'],
    body: 'Video, images, SVG and Lottie on the canvas. Sound Events and Media Cues on the timeline, plus live sources from the renderer.',
  });

  s.rect('Video', [872, 54, 952, 536], {
    type: 'media',
    source: { kind: 'clip', src: `asset:${assets.video}` },
    fit: 'cover',
    positionX: 0.5,
    positionY: 0.5,
    loop: true,
    speed: 1,
    offsetMs: 0,
    trimEndMs: null,
    timelineStartMs: 0,
    muted: true,
  }, 44);
  s.both('Video', 14, 26, 'fade');
  s.rect('Video chip', [904, 86, 296, 52], '#050914cc', 12);
  s.both('Video chip', 8, 18, 'fade');
  s.text('Video chip text', [904, 86, 296, 52], 'VIDEO  MP4 / WEBM', { font: FONT.mono, size: 24, weight: 400, align: 'center', valign: 'middle', ls: 1 });
  s.both('Video chip text', 8, 18, 'fade');
  // CC BY needs the credit, so it travels with the picture.
  s.rect('Film credit plate', [904, 534, 590, 38], '#050914cc', 10);
  s.both('Film credit plate', 8, 18, 'fade');
  s.text('Film credit', [904, 540, 590, 28], 'BIG BUCK BUNNY  © BLENDER FOUNDATION  CC BY 3.0', { font: FONT.mono, size: 19, align: 'center', color: C.ink });
  s.both('Film credit', 8, 18, 'fade');

  const tiles = [
    ['Lottie', 872],
    ['Image', 1197],
    ['SVG', 1523],
  ];
  tiles.forEach(([name, x], index) => {
    s.rect(`${name} tile`, [x, 610, 301, 260], C.panel, 28);
    // 0.1 s apart, each on one of the three ticks in carousel/sound/build-sound.mjs.
    s.both(`${name} tile`, 16 - index * 5, 24);
    s.text(`${name} caption`, [x, 826, 301, 34], name === 'Image' ? 'IMAGE + MASK' : name.toUpperCase(), {
      font: FONT.mono,
      size: 22,
      color: C.muted,
      align: 'center',
      ls: 2,
    });
    s.both(`${name} caption`, 16 - index * 5, 22, 'fade');
  });

  s.raw({
    type: 'add_layer',
    kind: 'lottie',
    name: 'Lottie art',
    transform: { x: 922, y: 616, width: 201, height: 201 },
    element: { animationData: lottie, speed: 1 },
  });
  s.both('Lottie art', 16, 24, 'fade');

  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Image art',
    transform: { x: 1231, y: 624, width: 233, height: 190 },
    element: { src: `asset:${assets.still}`, fit: 'cover' },
  });
  s.both('Image art', 11, 24, 'fade');
  s.ellipse('Image matte', [1252, 624, 190, 190], '#ffffff');
  s.raw({
    type: 'set_layer_mask',
    layerName: 'Image art',
    sourceLayerName: 'Image matte',
    mode: 'path',
  });

  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'SVG art',
    transform: { x: 1569, y: 680, width: 208, height: 70 },
    element: { src: `asset:${assets.logo}`, fit: 'contain' },
  });
  s.both('SVG art', 6, 24, 'fade');

  s.rect('Audio strip', [872, 884, 952, 86], C.panel, 24);
  s.both('Audio strip', 6, 22);
  s.text('Audio label', [906, 907, 420, 40], 'SOUND EFFECTS', { font: FONT.mono, size: 24, color: C.muted, ls: 1 });
  s.both('Audio label', 4, 20, 'fade');
  const levels = [18, 38, 26, 56, 34, 62, 28, 44, 20, 52, 30, 60, 24, 48, 36, 58, 22, 42, 32, 54];
  levels.forEach((level, index) => {
    const name = `Wave ${index + 1}`;
    const x = 1370 + index * 21.6;
    const mid = 927;
    s.rect(name, [x, mid - level / 2, 10, level], C.green, 5);
    s.both(name, 2, 14, 'fade');
    const next = levels[(index + 7) % levels.length];
    s.loop(name, {
      height: [[0, level], [24, next], [48, level]],
      y: [[0, mid - level / 2], [24, mid - next / 2], [48, mid - level / 2]],
    }, 48, index * 3);
  });
}

// The renderer draws straight segments between points, so a gentle curve takes plenty of points.
const curve = (base, rise, wave, ripple, phase) =>
  Array.from({ length: 40 }, (_, index) => {
    const t = index / 39;
    return Number((base + rise * t + wave * Math.sin(t * 5 + phase) + ripple * Math.sin(t * 13 + phase * 2)).toFixed(1));
  });

// Two states of a made-up audience night. The slide morphs to the second and back again, so it
// always comes back on air showing the first.
const CHART_STATES = [
  {
    hours: [1.1, 1.4, 1.9, 2.3, 2.1, 2.8, 3.4, 3.1, 3.9, 4.6, 5.2, 5.9, 6.6, 7.3, 6.8, 5.7],
    ring: [46, 31, 15, 8],
    line: curve(24, 22, 2.5, 0.7, 0.4),
    now: '4.82M',
    peak: '7.31M',
    share: '38.4%',
  },
  {
    hours: [0.9, 1.2, 1.5, 1.8, 2.6, 3.3, 2.9, 3.8, 4.7, 5.4, 4.9, 4.4, 5.3, 6.1, 7.6, 7.1],
    ring: [38, 39, 17, 6],
    line: curve(23, 30, 4, 0.9, 1.6),
    now: '6.14M',
    peak: '7.62M',
    share: '44.7%',
  },
];
const HOURS = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
// A warm-to-cool run that picks up the bars' orange and the trend's blue. Checked against the panel
// colour for contrast and colour-blind separation between neighbouring slices.
const RING = [
  ['Broadcast', '#f2610c'],
  ['Streaming', '#e0246f'],
  ['Social', '#7c3aed'],
  ['Radio', '#0b9be6'],
];
// Blank, because the renderer tilts and skips axis labels this dense; the slide has its own.
const LINE_LABELS = Array.from({ length: 40 }, () => '');

const chartData = {
  bars: (state) => ({
    labels: HOURS,
    datasets: [{ label: 'Audience', data: state.hours, backgroundColor: C.orange, borderColor: C.orange }],
  }),
  ring: (state) => ({
    labels: RING.map(([name]) => name),
    datasets: [{ label: 'Share', data: state.ring, backgroundColor: RING.map(([, color]) => color), borderColor: '#0a1226' }],
  }),
  line: (state) => ({
    labels: LINE_LABELS,
    datasets: [{ label: 'Share', data: state.line, backgroundColor: C.cyan, borderColor: C.cyan }],
  }),
};

/** The dashboard. Everything in it comes from data fields, so it can change on air. */
async function slideCharts(s, provider) {
  const first = CHART_STATES[0];
  const chartFont = { fontFamily: 'Plus Jakarta Sans', fontWeight: 600 };
  const motion = (delayFrames, staggerFrames = 1) => ({
    type: 'grow',
    durationFrames: 30,
    delayFrames,
    staggerFrames,
    easing: 'cubic-out',
    replayOnUpdate: true,
    updateMode: 'morph',
  });
  const field = (key, label, fieldType, defaultValue) =>
    s.raw({ type: 'add_data_field', fieldType, key, label, defaultValue });
  const chart = (name, box, preset, key, element) => {
    field(key, name, 'textarea', JSON.stringify(element.data));
    s.raw({
      type: 'add_layer',
      kind: 'chart',
      name,
      transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
      element: { provider, preset, textColor: C.muted, fontSize: 20, showLegend: false, showGrid: false, ...element },
    });
    s.raw({ type: 'set_layer_bindings', layerName: name, bindings: [{ fieldKey: key, targetProperty: 'data' }] });
    s.leave(name);
  };
  const number = (name, box, key, value, size, align = 'left') => {
    field(key, name, 'text', value);
    s.text(name, box, value, {
      font: FONT.display,
      size,
      weight: 800,
      lh: 1.1,
      ls: -0.5,
      align,
      valign: 'middle',
      anim: { type: 'roll-up', durationFrames: 18, replayOnUpdate: true },
    });
    s.raw({ type: 'set_layer_bindings', layerName: name, bindings: [{ fieldKey: key, targetProperty: 'content' }] });
  };

  // Heading, set wider and shorter than the other slides because the charts want the room.
  s.rect('Eyebrow mark', [96, 99, 20, 20], C.orange, 4);
  s.both('Eyebrow mark', 30, 16);
  s.text('Eyebrow', [132, 92, 680, 40], '06  CHARTS', { font: FONT.mono, size: 28, color: C.orange, ls: 2 });
  s.both('Eyebrow', 28, 18);
  s.text('Headline 1', [92, 132, 1110, 108], 'Numbers that perform.', { font: FONT.display, size: 92, weight: 800, lh: 1.1, ls: -2 });
  s.both('Headline 1', 20, 28);
  s.text('Body', [96, 244, 1090, 92], 'Chart.js charts bound to live data. They morph when a value changes, and a live shader can paint the marks.', {
    size: 28,
    color: C.muted,
    lh: 1.36,
  });
  s.both('Body', 14, 24);

  // The hero: sixteen bars painted by one running shader.
  s.rect('Bars panel', [96, 346, 1114, 624], C.panelGlass, 24);
  s.both('Bars panel', 16, 26, 'fade');
  s.text('Bars title', [128, 366, 760, 36], 'AUDIENCE BY HOUR, MILLIONS', { font: FONT.mono, size: 24, color: C.muted, ls: 2 });
  s.both('Bars title', 14, 20, 'fade');
  chart('Bars chart', [116, 410, 1074, 544], 'bar', 'barsData', {
    data: chartData.bars(first),
    fill: await shader('36-silk-ribbons', { baseColor: [1, 0.42, 0.14], sheenColor: [1, 0.93, 0.72], shadowColor: [0.72, 0.08, 0.42], flowSpeed: 0.8, foldScale: 1.6 }, 0.6),
    presentation: { ...chartFont, valueAxis: { min: 0, max: 8, step: 2, decimals: 0 }, maxBarThickness: 46 },
    animation: motion(4, 1),
  });

  // Three headline numbers.
  [
    ['NOW', 'kpiNow', first.now, C.ink, 1240],
    ['PEAK', 'kpiPeak', first.peak, C.ink, 1440],
    ['SHARE', 'kpiShare', first.share, C.cyan, 1640],
  ].forEach(([label, key, value, , x], index) => {
    s.rect(`${label} tile`, [x, 92, 184, 150], C.panelGlass, 20);
    s.both(`${label} tile`, 16 - index * 3, 24);
    s.text(`${label} label`, [x + 18, 106, 150, 30], label, { font: FONT.mono, size: 22, color: C.muted, ls: 2 });
    s.both(`${label} label`, 14 - index * 3, 22, 'fade');
    number(`${label} value`, [x + 16, 142, 160, 84], key, value, 46);
    s.both(`${label} value`, 14 - index * 3, 22, 'fade');
  });

  // Where they're watching: a ring with its legend beside it.
  s.rect('Ring panel', [1240, 258, 584, 340], C.panelGlass, 24);
  s.both('Ring panel', 12, 24, 'fade');
  chart('Ring chart', [1252, 270, 316, 316], 'doughnut', 'ringData', {
    data: chartData.ring(first),
    presentation: chartFont,
    animation: motion(10, 3),
  });
  number('Ring value', [1320, 392, 180, 72], 'ringLead', `${first.ring[0]}%`, 54, 'center');
  s.both('Ring value', 6, 22, 'fade');
  RING.forEach(([name, color], index) => {
    const y = 296 + index * 68;
    s.rect(`${name} chip`, [1588, y + 8, 18, 18], color, 5);
    s.both(`${name} chip`, 8 - index, 18, 'fade');
    s.text(`${name} name`, [1616, y, 192, 34], name, { font: FONT.display, size: 24, weight: 600, lh: 1.2, color: C.muted });
    s.both(`${name} name`, 8 - index, 18, 'fade');
    number(`${name} value`, [1616, y + 30, 192, 34], `ring${index + 1}`, `${first.ring[index]}%`, 28);
    s.both(`${name} value`, 8 - index, 18, 'fade');
  });

  // The trend under it.
  s.rect('Line panel', [1240, 614, 584, 356], C.panelGlass, 24);
  s.both('Line panel', 10, 24, 'fade');
  s.text('Line title', [1268, 632, 520, 34], 'SHARE, LAST HOUR', { font: FONT.mono, size: 24, color: C.muted, ls: 2 });
  s.both('Line title', 8, 20, 'fade');
  chart('Line chart', [1252, 672, 560, 258], 'area', 'lineData', {
    data: chartData.line(first),
    presentation: {
      ...chartFont,
      valueAxis: { min: 0, max: 60, step: 20, format: 'percent', decimals: 0 },
      gradient: { from: '#0d2c63', to: '#4fe0ff' },
    },
    animation: { ...motion(14, 0), type: 'reveal', durationFrames: 34 },
  });
  s.text('Line start', [1306, 930, 150, 28], '1 HOUR AGO', { font: FONT.mono, size: 20, color: C.muted, ls: 1 });
  s.both('Line start', 4, 18, 'fade');
  s.text('Line end', [1656, 930, 150, 28], 'NOW', { font: FONT.mono, size: 20, color: C.ink, ls: 1, align: 'right' });
  s.both('Line end', 4, 18, 'fade');
}

/** While on air the dashboard morphs to the second state, then back again. */
function chartRules(s, ids) {
  const actions = (state) => [
    { type: 'set-data', fieldId: ids.barsData, mode: 'set', value: JSON.stringify(chartData.bars(state)) },
    { type: 'set-data', fieldId: ids.ringData, mode: 'set', value: JSON.stringify(chartData.ring(state)) },
    { type: 'set-data', fieldId: ids.lineData, mode: 'set', value: JSON.stringify(chartData.line(state)) },
    { type: 'set-data', fieldId: ids.kpiNow, mode: 'set', value: state.now },
    { type: 'set-data', fieldId: ids.kpiPeak, mode: 'set', value: state.peak },
    { type: 'set-data', fieldId: ids.kpiShare, mode: 'set', value: state.share },
    { type: 'set-data', fieldId: ids.ringLead, mode: 'set', value: `${state.ring[0]}%` },
    ...state.ring.map((value, index) => ({ type: 'set-data', fieldId: ids[`ring${index + 1}`], mode: 'set', value: `${value}%` })),
  ];
  s.raw({
    type: 'set_layer_visual_rules',
    layerName: 'Bars panel',
    rules: [
      { id: 'charts-update', name: 'New numbers come in', enabled: true, trigger: 'step', delayFrames: 170, actions: actions(CHART_STATES[1]) },
      { id: 'charts-restore', name: 'And settle back', enabled: true, trigger: 'step', delayFrames: 370, actions: actions(CHART_STATES[0]) },
    ],
  });
}

function slideAI(s) {
  copyColumn(s, {
    number: '07',
    label: 'AI, IN STUDIO AND OVER MCP',
    accent: C.blue,
    lines: ['Ask it.', 'Or wire it in.'],
    body: 'The AI Assistant works inside Studio and shows its changes on the canvas for you to accept. Over MCP, your own agent gets the same tools, and the ograf-authoring skill teaches it to use them at their best. This reel was built that way.',
  });

  const show = (name, frame) =>
    s.loop(name, { opacity: [[0, 0, 'linear'], [frame, 0, 'linear'], [frame + 12, 1, 'cubic-out'], [460, 1, 'linear']] }, 460);

  s.rect('Chat panel', [912, 94, 872, 446], C.panelGlass, 24);
  s.both('Chat panel', 14, 26, 'fade');
  s.text('Chat title', [944, 116, 420, 36], 'AI ASSISTANT', { font: FONT.mono, size: 26, ls: 2 });
  s.both('Chat title', 12, 20, 'fade');
  s.text('Chat where', [1400, 116, 352, 36], 'INSIDE STUDIO', { font: FONT.mono, size: 26, color: C.dim, ls: 2, align: 'right' });
  s.both('Chat where', 12, 20, 'fade');
  s.rect('User bubble', [1168, 170, 584, 116], C.blue, 22);
  s.both('User bubble', 8, 22);
  // Typing splits the text into separate characters, which can wrap mid-word, so the break is set here.
  s.text('User text', [1194, 184, 536, 92], 'Wipe this lower third in\nand use the team colours.', {
    size: 29,
    lh: 1.32,
    anim: { type: 'typewriter', durationFrames: 90, split: 'grapheme', cursor: 'none' },
  });
  s.leave('User text');
  s.text('Reply text', [944, 306, 780, 92], 'Added the wipe and linked both colours to Brand Kit tokens. Review it on the canvas.', {
    size: 29,
    lh: 1.32,
    color: C.muted,
  });
  s.leave('Reply text');
  show('Reply text', 110);
  s.rect('Accept button', [944, 424, 300, 80], C.green, 16);
  s.text('Accept text', [944, 424, 300, 80], 'Accept changes', { font: FONT.display, size: 28, weight: 700, color: C.navy, align: 'center', valign: 'middle', lh: 1.1 });
  s.rect('Reject button', [1260, 424, 170, 80], '#ffffff14', 16);
  s.text('Reject text', [1260, 424, 170, 80], 'Reject', { font: FONT.display, size: 28, weight: 700, align: 'center', valign: 'middle', lh: 1.1 });
  for (const name of ['Accept button', 'Accept text', 'Reject button', 'Reject text']) {
    s.leave(name);
    show(name, 150);
  }

  s.rect('Terminal panel', [912, 560, 872, 410], '#050914f2', 24);
  s.both('Terminal panel', 10, 26, 'fade');
  s.text('Terminal title', [944, 582, 200, 36], 'MCP', { font: FONT.mono, size: 26, ls: 2 });
  s.both('Terminal title', 8, 20, 'fade');
  s.text('Terminal where', [1280, 582, 472, 36], '127.0.0.1:4318/mcp', { font: FONT.mono, size: 26, color: C.dim, align: 'right' });
  s.both('Terminal where', 8, 20, 'fade');
  [
    ['skill: ograf-authoring', 'loaded'],
    ['ograf_get_capabilities', 'connected'],
    ['ograf_apply_operations', 'applied'],
    ['ograf_render_strip', '12 frames'],
    ['ograf_certify_project', 'passed'],
    ['ograf_export_coordinated_package', '.ograf.zip'],
  ].forEach(([tool, result], index) => {
    const y = 636 + index * 54;
    const name = `Call ${index + 1}`;
    const out = `Result ${index + 1}`;
    s.text(name, [944, y, 580, 40], `> ${tool}`, { font: FONT.mono, size: 26, color: C.ink });
    s.text(out, [1532, y, 220, 40], result, { font: FONT.mono, size: 26, color: C.green, align: 'right' });
    s.leave(name);
    s.leave(out);
    show(name, 30 + index * 48);
    show(out, 52 + index * 48);
  });
}

// The tour on the Studio slide. Each stop is a real screenshot of the editor, with the part of it to
// look at, as the box it grows to across the stop. Taken with carousel/capture-studio.mjs.
const WINDOW = { x: 512, y: 92, width: 1328, height: 747 };
const STOP_FRAMES = 175;
const TOUR_FADE = 8;
const TOUR = [
  {
    file: 'studio-canvas',
    name: 'Canvas',
    line: 'Layers, canvas and properties.',
    caption: 'Draw on a real broadcast canvas: text, shapes, images, video, Lottie and charts as layers.',
    zoom: { x: 0.5, y: 0.34, scale: 1.1 },
  },
  {
    file: 'studio-timeline',
    name: 'Timeline',
    line: 'Keyframes, easing and steps.',
    caption: 'Animate any property on the timeline, with steps an operator can play through on air.',
    zoom: { x: 0.5, y: 1, scale: 1.24 },
  },
  {
    file: 'studio-transitions',
    name: 'Transitions',
    line: 'Lanes, takes and morphs.',
    caption: 'Lay templates out in lanes, and Studio morphs what they share on every Take.',
    zoom: { x: 0.6, y: 1, scale: 1.22 },
  },
  {
    file: 'studio-data',
    name: 'Data and rules',
    line: 'Fields, bindings and triggers.',
    caption: 'Bind anything to a data field, then add rules for clicks, taps, hovers and values.',
    zoom: { x: 1, y: 0.5, scale: 1.2 },
  },
];

async function slideStudio(s, shots, assets) {
  s.rect('Eyebrow mark', [96, 99, 20, 20], C.blue, 4);
  s.both('Eyebrow mark', 30, 16);
  s.text('Eyebrow', [132, 92, 360, 40], '01  THE EDITOR', { font: FONT.mono, size: 28, color: C.cyan, ls: 2 });
  s.both('Eyebrow', 28, 18);
  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Best of Show award',
    transform: { x: 1691, y: 846, width: 149, height: 130 },
    element: { src: `asset:${assets.award}`, fit: 'contain' },
  });
  s.both('Best of Show award', 24, 24, 'fade');
  ['This is', 'Studio.'].forEach((line, index) => {
    const name = `Headline ${index + 1}`;
    s.text(name, [92, 136 + index * 98, 410, 104], line, { font: FONT.display, size: 92, weight: 800, lh: 1.08, ls: -2 });
    s.both(name, 20 - index * 5, 28);
  });
  s.text('Body', [96, 348, 396, 130], 'One window to design, animate, bind to data and export standard OGraf.', {
    size: 28,
    color: '#e6ecfa',
    lh: 1.36,
  });
  s.both('Body', 8, 24);

  // The stops, with a marker that moves to the one on screen.
  const rowY = (index) => 510 + index * 112;
  s.rect('Stop marker', [84, rowY(0), 404, 100], '#ffffff1f', 14, { strokeColor: C.cyan, strokeWidth: 2 });
  s.both('Stop marker', 6, 20, 'fade');
  const steps = TOUR.flatMap((_, index) => {
    const start = index * STOP_FRAMES;
    return [
      [start, rowY(index)],
      [start + STOP_FRAMES - 16, rowY(index)],
    ];
  });
  s.loop('Stop marker', { y: [...steps, [TOUR.length * STOP_FRAMES, rowY(0)]] }, TOUR.length * STOP_FRAMES);
  TOUR.forEach((stop, index) => {
    s.text(`Stop ${index + 1} name`, [104, rowY(index) + 12, 372, 44], stop.name, { font: FONT.display, size: 34, weight: 700, lh: 1.2 });
    s.both(`Stop ${index + 1} name`, 6 - index, 20, 'fade');
    s.text(`Stop ${index + 1} line`, [104, rowY(index) + 56, 372, 34], stop.line, { size: 24, color: C.muted, lh: 1.2 });
    s.both(`Stop ${index + 1} line`, 6 - index, 20, 'fade');
  });

  // The window: a clipped frame, and the screenshots inside it.
  const { x, y, width, height } = WINDOW;
  s.rect('Window', [x, y, width, height], '#16181d', 16);
  s.both('Window', 16, 26, 'fade');
  s.raw({ type: 'set_layer_layout', layerName: 'Window', clipChildren: true });
  const total = TOUR.length * STOP_FRAMES;
  TOUR.forEach((stop, index) => {
    const name = `Screen ${index + 1}`;
    const start = index * STOP_FRAMES;
    const end = start + STOP_FRAMES;
    s.raw({
      type: 'add_layer',
      kind: 'image',
      name,
      transform: { x, y, width, height },
      element: { src: `asset:${shots[index]}`, fit: 'cover' },
    });
    s.raw({ type: 'set_layer_layout', layerName: name, parentId: 'Window' });
    s.both(name, 14, 26, 'fade');
    const grownWidth = width * stop.zoom.scale;
    const grownHeight = height * stop.zoom.scale;
    const grownX = x - (grownWidth - width) * stop.zoom.x;
    const grownY = y - (grownHeight - height) * stop.zoom.y;
    // Grows for the whole stop plus the fades either side, then resets while it can't be seen.
    const from = Math.max(0, start - TOUR_FADE);
    const to = Math.min(total - 1, end + TOUR_FADE);
    const grow = (rest, grown) => [
      ...(from > 0 ? [[0, rest, 'linear']] : []),
      [from, rest, 'linear'],
      [to, grown, 'linear'],
      ...(to + 1 < total ? [[to + 1, rest, 'linear']] : []),
      [total, rest, 'linear'],
    ];
    const tracks = {
      x: grow(x, grownX),
      y: grow(y, grownY),
      width: grow(width, grownWidth),
      height: grow(height, grownHeight),
    };
    // The first screen stays underneath, so the last one fades out to it and the tour has no seam.
    if (index > 0)
      tracks.opacity = [
        [0, 0, 'linear'],
        [start - TOUR_FADE, 0, 'linear'],
        [start + TOUR_FADE, 1, 'linear'],
        ...(index < TOUR.length - 1
          ? [[end + TOUR_FADE, 1, 'linear'], [end + TOUR_FADE + 1, 0, 'linear']]
          : [[total - TOUR_FADE * 2, 1, 'linear'], [total, 0, 'linear']]),
        [total, 0, 'linear'],
      ].filter(([frame], at, keys) => at === 0 || frame > keys[at - 1][0]);
    s.loop(name, tracks, total);

    const caption = `Caption ${index + 1}`;
    s.text(caption, [x, y + height + 26, width - 170, 96], stop.caption, { size: 32, color: C.ink, lh: 1.32 });
    s.leave(caption);
    s.loop(caption, {
      opacity: [
        [0, index === 0 ? 1 : 0, 'linear'],
        ...(index === 0
          ? [[STOP_FRAMES - 12, 1, 'linear'], [STOP_FRAMES, 0, 'linear'], [total - 12, 0, 'linear'], [total, 1, 'linear']]
          : [[start, 0, 'linear'], [start + 14, 1, 'linear'], [end - 12, 1, 'linear'], [end, 0, 'linear']]),
        ...(index > 0 && end < total ? [[total, 0, 'linear']] : []),
      ],
    }, total);
  });
  s.rect('Window edge', [x, y, width, height], '#00000000', 16, { strokeColor: '#ffffff40', strokeWidth: 2 });
  s.both('Window edge', 14, 26, 'fade');
}

// JOIN_BUTTON in src/components/HeroReel/index.tsx puts the page's link over this box.
const JOIN_BUTTON = [96, 672, 590, 112];

function slideCommunity(s, assets) {
  copyColumn(s, {
    number: '08',
    label: 'COMMUNITY',
    accent: C.cyan,
    top: 150,
    lines: ['Come and', 'join us.'],
    body: 'A public LinkedIn group for everyone who builds with OGraf Studio. Ask questions and share what you make.',
  });

  const [bx, by, bw, bh] = JOIN_BUTTON;
  s.rect('Join pulse', [bx, by, bw, bh], '#00000000', 18, { strokeColor: '#7fb6ff', strokeWidth: 4 });
  s.leave('Join pulse');
  s.loop('Join pulse', {
    x: [[0, bx], [80, bx - 18], [120, bx - 18]],
    y: [[0, by], [80, by - 18], [120, by - 18]],
    width: [[0, bw], [80, bw + 36], [120, bw + 36]],
    height: [[0, bh], [80, bh + 36], [120, bh + 36]],
    opacity: [[0, 0.9], [80, 0], [120, 0]],
  }, 120);
  s.rect('Join button', [bx, by, bw, bh], C.linkedin, 18);
  s.both('Join button', 10, 22, 'pop', { easing: 'back-out' });
  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Join mark',
    transform: { x: bx + 36, y: by + 28, width: 56, height: 56 },
    element: { src: `asset:${assets.linkedin}`, fit: 'contain' },
  });
  s.both('Join mark', 8, 20, 'fade');
  s.text('Join text', [bx + 112, by, bw - 130, bh], 'Join on LinkedIn', { font: FONT.display, size: 48, weight: 700, lh: 1.1, valign: 'middle' });
  s.both('Join text', 8, 20, 'fade');
  s.text('Join address', [bx + 2, by + bh + 22, 700, 40], 'linkedin.com/groups/40618425', { font: FONT.mono, size: 28, color: C.ink, ls: 0.5 });
  s.both('Join address', 6, 20, 'fade');
  s.shadow('Join address', true);

  // The group's card, in the look of its LinkedIn banner: the editor behind the OGraf blue.
  const card = { x: 1064, y: 150, width: 760, height: 700 };
  const bannerHeight = 330;
  s.rect('Card', [card.x, card.y, card.width, card.height], '#0a1226f2', 28, { strokeColor: C.line, strokeWidth: 2 });
  s.both('Card', 16, 26);
  s.raw({ type: 'set_layer_layout', layerName: 'Card', clipChildren: true });
  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Banner picture',
    transform: { x: card.x, y: card.y, width: card.width, height: bannerHeight },
    element: { src: `asset:${assets.banner}`, fit: 'cover' },
  });
  s.raw({ type: 'set_layer_layout', layerName: 'Banner picture', parentId: 'Card' });
  s.both('Banner picture', 14, 24, 'fade');
  s.rect('Banner shade', [card.x, card.y, card.width, bannerHeight], {
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#0b1a4a', opacity: 0.96 },
      { offset: 1, color: '#0b1a4a', opacity: 0.72 },
    ],
  });
  s.raw({ type: 'set_layer_layout', layerName: 'Banner shade', parentId: 'Card' });
  s.both('Banner shade', 14, 24, 'fade');
  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Banner logo',
    transform: { x: card.x + 40, y: card.y + 58, width: 196, height: 66 },
    element: { src: `asset:${assets.logo}`, fit: 'contain' },
  });
  s.both('Banner logo', 12, 22, 'fade');
  s.text('Banner studio', [card.x + 250, card.y + 52, 300, 76], 'Studio', { font: FONT.display, size: 62, weight: 700, lh: 1.1, ls: -0.8, valign: 'middle' });
  s.both('Banner studio', 12, 22, 'fade');
  s.text('Banner community', [card.x + 42, card.y + 134, 680, 72], 'Community', { font: FONT.display, size: 60, weight: 700, lh: 1.1, color: '#a9c6ff', ls: -0.8 });
  s.both('Banner community', 10, 22, 'fade');
  s.text('Banner line', [card.x + 42, card.y + 228, 680, 44], "built for EBU's OGraf standard", { font: FONT.mono, size: 30, color: C.ink });
  s.both('Banner line', 8, 22, 'fade');

  const copyX = card.x + 42;
  s.text('Card name', [copyX, card.y + bannerHeight + 28, 690, 62], 'OGraf Studio Community', { font: FONT.display, size: 50, weight: 800, lh: 1.15, ls: -0.8 });
  s.both('Card name', 8, 22, 'fade');
  s.text('Card kind', [copyX, card.y + bannerHeight + 94, 690, 40], 'Public group on LinkedIn', { size: 30, color: C.muted });
  s.both('Card kind', 6, 22, 'fade');
  ['Ask questions', 'Share your templates', 'See what others build'].forEach((line, index) => {
    const y = card.y + bannerHeight + 156 + index * 56;
    s.rect(`Card mark ${index + 1}`, [copyX + 2, y + 12, 18, 18], C.cyan, 4);
    s.both(`Card mark ${index + 1}`, 5 - index, 18, 'fade');
    s.text(`Card line ${index + 1}`, [copyX + 38, y, 640, 44], line, { size: 32, color: C.ink, lh: 1.25 });
    s.both(`Card line ${index + 1}`, 5 - index, 18, 'fade');
  });
}

/** The ticker's own template: a floating band over the bottom of every slide. */
async function sceneTicker(s, logoAsset) {
  const { x, y, width, height, radius } = BAND;
  s.rect('Band', [x, y, width, height], {
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#14224f', opacity: 0.97 },
      { offset: 1, color: '#0a1226', opacity: 0.97 },
    ],
  }, radius, { strokeColor: '#ffffff33', strokeWidth: 2 });
  s.enter('Band', 2, 30, 'wipe', { direction: 'right' });
  s.leave('Band', 0, 16);
  s.raw({ type: 'set_layer_layout', layerName: 'Band', clipChildren: true });

  // A light running along the band's top edge, so it reads as live even between items.
  s.rect('Band glint', [x, y, 240, 3], {
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: C.cyan, opacity: 0 },
      { offset: 0.5, color: C.cyan, opacity: 1 },
      { offset: 1, color: C.cyan, opacity: 0 },
    ],
  });
  s.raw({ type: 'set_layer_layout', layerName: 'Band glint', parentId: 'Band' });
  s.leave('Band glint');
  s.loop('Band glint', { x: [[0, x - 240, 'linear'], [300, x + width, 'linear']] }, 300);

  // The navbar's logo without ".org". Its blues need a light plate: they vanish on a blue one.
  const plateWidth = 232;
  s.rect('Plate', [x, y, plateWidth, height], {
    type: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '#ffffff', opacity: 1 },
      { offset: 1, color: '#d6e2fa', opacity: 1 },
    ],
  }, radius);
  s.enter('Plate', 14, 18, 'pop', { easing: 'back-out' });
  s.leave('Plate', 2, 12);
  s.raw({
    type: 'add_layer',
    kind: 'image',
    name: 'Logo',
    transform: { x: x + 18, y: y + 17, width: 195, height: 31 },
    element: { src: `asset:${logoAsset}`, fit: 'contain' },
  });
  s.enter('Logo', 10, 14, 'fade');
  s.leave('Logo', 2, 10);

  const clockWidth = 130;
  s.raw({
    type: 'add_layer',
    kind: 'ticker',
    name: 'Feed',
    transform: { x: x + plateWidth + 12, y, width: width - plateWidth - clockWidth - 24, height },
  });
  s.enter('Feed', 0, 18, 'fade');
  s.leave('Feed', 2, 12);

  s.rect('Clock plate', [x + width - clockWidth, y, clockWidth, height], '#ffffff14', radius);
  s.enter('Clock plate', 6, 18, 'fade');
  s.leave('Clock plate', 2, 12);
  s.raw({
    type: 'add_layer',
    kind: 'clock',
    name: 'Clock',
    transform: { x: x + width - clockWidth, y: y + 8, width: clockWidth, height: 44 },
    element: {
      clock: { format: 'hh:mm' },
      fontFamily: FONT.mono,
      fontSize: 30,
      minFontSize: 16,
      fontWeight: 400,
      color: C.ink,
      lineHeight: 1.1,
      textAlign: 'center',
      verticalAlign: 'middle',
      autoFit: 'fixed',
    },
  });
  s.enter('Clock', 4, 18, 'fade');
  s.leave('Clock', 2, 12);
}

/** Replaces the default feed; child elements start from the complete ones Studio made. */
async function fillFeed() {
  const { project } = await call('ograf_get_project');
  const layers = project.compositions[0].layers;
  const named = (name) => layers.find((layer) => layer.name === name).element;
  const text = named('Feed').items[0].element;
  const shape = named('Clock plate');
  const items = FEED.flatMap(([content, width, color], index) => [
    {
      id: `chip-${index + 1}`,
      name: 'Chip',
      width: 14,
      height: 14,
      element: { ...shape, fill: color, borderRadius: 4, strokeWidth: 0 },
    },
    {
      id: `item-${index + 1}`,
      name: content,
      width,
      element: {
        ...text,
        content,
        fontFamily: FONT.display,
        fontSize: 30,
        minFontSize: 16,
        fontWeight: 600,
        color: C.ink,
        letterSpacing: 0,
        lineHeight: 1.1,
        textAlign: 'left',
        verticalAlign: 'middle',
        autoFit: 'fixed',
        overflowPolicy: 'clip',
      },
    },
  ]);
  await apply(
    [
      {
        type: 'update_element',
        layerName: 'Feed',
        patch: { items, speedPixelsPerSecond: 120, gap: 22, direction: 'left', entryFade: 90, exitFade: 70, fadeSoftness: 0.6 },
      },
    ],
    'Write the ticker feed',
  );
}

const SLIDES = [
  { id: 'studio', name: 'Studio' },
  { id: 'transitions', name: 'Transition Logic' },
  { id: 'shaders', name: 'Shaders' },
  { id: 'touch', name: 'Touch Controls' },
  { id: 'media', name: 'Media' },
  { id: 'charts', name: 'Charts' },
  { id: 'ai', name: 'AI' },
  { id: 'community', name: 'Community' },
];
// Charts come first because only the template opened from charts-seed.ogs has their renderer pinned.
// New templates start with an empty renderer catalog; it's put back in order at the end.
const AUTHORING_ORDER = [SLIDES.find((slide) => slide.id === 'charts'), ...SLIDES.filter((slide) => slide.id !== 'charts')];

async function layerIds() {
  const { project } = await call('ograf_get_project', { include: ['compositions', 'layers'], tracks: 'none' }).catch(() =>
    call('ograf_get_project'),
  );
  const composition = project.compositions[0];
  return Object.fromEntries(composition.layers.map((layer) => [layer.name, layer.id]));
}

async function fieldIds() {
  const { project } = await call('ograf_get_project');
  const composition = project.compositions[0];
  return Object.fromEntries((composition.dataFields ?? project.dataFields ?? []).map((field) => [field.key, field.id]));
}

/** A new template can finish switching just after its first batch, so check the batch landed. */
async function formatTemplate(name, inFrames) {
  for (let attempt = 0; ; attempt++) {
    await apply(
      [
        { type: 'set_project_metadata', name, description: 'Part of the ografstudio.org feature reel.', supportsRealTime: true, supportsNonRealTime: false },
        { type: 'set_composition', frameRate: 50, width: 1920, height: 1080, backgroundColor: 'transparent' },
        { type: 'retime_animation_phase', phase: 'in', targetFrames: inFrames },
        { type: 'retime_animation_phase', phase: 'out', targetFrames: OUT },
      ],
      `Format ${name}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    const { project } = await call('ograf_get_project');
    const frames = project.compositions[0].transitions.map((transition) => transition.durationFrames);
    if (frames[0] === inFrames && frames[1] === OUT) return;
    if (attempt === 4) throw new Error(`Could not format ${name}: ${JSON.stringify(frames)}`);
  }
}

async function main() {
  const lottie = JSON.parse(await readFile(new URL('./assets/pulse-rings.json', import.meta.url), 'utf8'));

  const start = await settled();
  await call('ograf_reset_project', { expectedRevision: start.revision, confirm: true });
  await call('ograf_open_project', { sessionId: 'editor', path: 'carousel/charts-seed.ogs' });
  await settled();
  await setOperation({ type: 'create', name: 'OGraf Studio Feature Reel' });

  const placements = {};
  let component = null;

  for (const [index, slide] of AUTHORING_ORDER.entries()) {
    if (index > 0) await setOperation({ type: 'new_template' });
    slide.templateId = (await call('ograf_get_template_set')).activeTemplateId;
    await formatTemplate(slide.name, IN);

    // The shared surface first, so it sits under everything the slide adds.
    if (!component) {
      await apply(await surfaceLayers(), 'Add the shared surface');
      const named = await layerIds();
      await apply(
        [{ type: 'save_component', scope: 'set', layerIds: [named.Surface, named['Surface scrim'], named['Surface edge']], name: 'Reel Surface' }],
        'Share the surface across slides',
      );
      const { project } = await call('ograf_get_project');
      const layerNamed = (name) => project.compositions[0].layers.find((layer) => layer.name === name);
      const link = layerNamed('Surface').componentLink;
      component = {
        componentId: link.componentId,
        instanceId: link.instanceId,
        surface: link.sourceLayerId,
        scrim: layerNamed('Surface scrim').componentLink.sourceLayerId,
        edge: layerNamed('Surface edge').componentLink.sourceLayerId,
      };
    } else {
      await apply(
        [{ type: 'instantiate_component', componentId: component.componentId, instanceId: component.instanceId, linked: true }],
        'Place the shared surface',
      );
    }

    const pose = POSES[slide.id];
    const placed = (await call('ograf_get_project')).project.compositions[0].layers;
    const placedId = (source) => placed.find((layer) => layer.componentLink?.sourceLayerId === source).id;
    await apply(
      [
        ...[component.surface, component.scrim, component.edge].map((source) => ({
          type: 'update_transform',
          layerId: placedId(source),
          patch: { x: pose.box[0], y: pose.box[1], width: pose.box[2], height: pose.box[3] },
        })),
        { type: 'update_transform', layerId: placedId(component.scrim), patch: { opacity: pose.scrim } },
        { type: 'update_transform', layerId: placedId(component.edge), patch: { opacity: pose.edge } },
      ],
      `Pose the surface for ${slide.name}`,
    );

    const s = scene();
    const assets = {};
    if (slide.id === 'media') {
      assets.still = (await importAsset({ path: 'carousel/assets/sunset-still.jpg', mimeType: 'image/jpeg', name: 'Sunset still' })).assets?.[0]?.id;
      assets.logo = (await importAsset({ path: 'carousel/assets/ograf-logo-mono-white.svg', mimeType: 'image/svg+xml', name: 'OGraf logo' })).assets?.[0]?.id;
      assets.video = (await importAsset({ path: 'carousel/assets/big-buck-bunny-clip.mp4', mimeType: 'video/mp4', name: 'Big Buck Bunny clip' })).assets?.[0]?.id;
      if (!assets.still || !assets.logo || !assets.video) throw new Error(`Asset ids missing: ${JSON.stringify(assets)}`);
    }
    if (slide.id === 'transitions') {
      assets.still = (await importAsset({ path: 'carousel/assets/monitor-still.webp', mimeType: 'image/webp', name: 'Monitor still' })).assets?.[0]?.id;
      if (!assets.still) throw new Error('Monitor still asset id missing');
    }

    const screenshot = async (file) => {
      const id = (await importAsset({ path: `carousel/assets/${file}.webp`, mimeType: 'image/webp', name: file })).assets?.[0]?.id;
      if (!id) throw new Error(`${file} asset id missing`);
      return id;
    };
    let shots = [];
    if (slide.id === 'studio') {
      for (const stop of TOUR) shots.push(await screenshot(stop.file));
      assets.award = (await importAsset({ path: 'carousel/assets/tvbeurope-best-of-show.png', mimeType: 'image/png', name: 'TVBEurope Best of Show' })).assets?.[0]?.id;
      if (!assets.award) throw new Error('Award asset id missing');
    }
    if (slide.id === 'community') {
      assets.banner = await screenshot(TOUR[0].file);
      assets.logo = (await importAsset({ path: 'carousel/assets/ograf-logo-mono-white.svg', mimeType: 'image/svg+xml', name: 'OGraf logo' })).assets?.[0]?.id;
      assets.linkedin = (await importAsset({ path: 'carousel/assets/linkedin-mark-white.svg', mimeType: 'image/svg+xml', name: 'LinkedIn mark' })).assets?.[0]?.id;
      if (!assets.logo || !assets.linkedin) throw new Error(`Asset ids missing: ${JSON.stringify(assets)}`);
    }

    let touch = null;
    if (slide.id === 'transitions') await slideTransitions(s, assets.still);
    if (slide.id === 'shaders') await slideShaders(s);
    if (slide.id === 'touch') touch = slideTouch(s);
    if (slide.id === 'media') slideMedia(s, assets, lottie);
    if (slide.id === 'charts') {
      const { project } = await call('ograf_get_project');
      const pinned = (project.compositions[0].rendererPlugins ?? []).find((entry) => entry.manifest?.id === 'ograf.chartjs');
      if (!pinned) throw new Error('charts-seed.ogs lost its Chart.js renderer; see carousel/README.md.');
      await slideCharts(s, { id: pinned.manifest.id, version: pinned.manifest.version, sha256: pinned.sha256 });
    }
    if (slide.id === 'ai') slideAI(s);
    if (slide.id === 'studio') await slideStudio(s, shots, assets);
    if (slide.id === 'community') slideCommunity(s, assets);

    // parentId needs the real id, so layout links go in a second batch.
    const parentOps = s.ops.filter((op) => op.type === 'set_layer_layout' && op.parentId);
    const firstOps = s.ops.filter((op) => !parentOps.includes(op) && op.type !== 'image-tile-placeholder');
    await importFonts(fontsUsed(firstOps));
    await apply(firstOps, `Author ${slide.name}`);

    const after = await layerIds();
    if (parentOps.length)
      await apply(parentOps.map((op) => ({ ...op, parentId: after[op.parentId] })), `Clip ${slide.name} children`);

    if (slide.id === 'shaders') {
      const assetId = (await importAsset({ path: 'carousel/assets/ograf-logo-mono-white.svg', mimeType: 'image/svg+xml', name: 'OGraf logo' })).assets?.[0]?.id;
      if (!assetId) throw new Error('OGraf logo asset id missing');
      const tile = scene();
      tile.raw({
        type: 'add_layer',
        kind: 'image',
        name: 'Image tile',
        transform: { x: 1574, y: 730, width: 232, height: 88 },
        element: {
          src: `asset:${assetId}`,
          fit: 'contain',
          fill: await shader('36-silk-ribbons', { baseColor: [1, 0.5, 0.16], sheenColor: [1, 0.93, 0.72], shadowColor: [0.72, 0.1, 0.42], flowSpeed: 0.9, foldScale: 2.2 }, 1),
        },
      });
      tile.both('Image tile', 6, 24, 'fade');
      await apply(tile.ops, 'Fill the logo with a shader');
    }

    if (slide.id === 'charts') {
      const rules = scene();
      chartRules(rules, await fieldIds());
      await apply(rules.ops, 'Make the charts update on air');
    }

    if (touch) {
      const fields = await fieldIds();
      const rules = scene();
      touchRules(rules, { ...after, ...fields }, touch);
      await apply(rules.ops, 'Make the tabs answer a tap');
    }
    console.log(`Authored ${slide.name}`);
  }

  await setOperation({ type: 'new_template' });
  const tickerTemplateId = (await call('ograf_get_template_set')).activeTemplateId;
  await formatTemplate('Ticker', TICKER_IN);
  const logoAsset = (await importAsset({ path: 'carousel/assets/ograf-studio-logo-ticker.png', mimeType: 'image/png', name: 'OGraf Studio logo' })).assets?.[0]?.id;
  if (!logoAsset) throw new Error('OGraf Studio logo asset id missing');
  const band = scene();
  await sceneTicker(band, logoAsset);
  const bandParents = band.ops.filter((op) => op.type === 'set_layer_layout' && op.parentId);
  await importFonts(fontsUsed(band.ops));
  await apply(band.ops.filter((op) => !bandParents.includes(op)), 'Author the ticker');
  const bandIds = await layerIds();
  await apply(bandParents.map((op) => ({ ...op, parentId: bandIds[op.parentId] })), 'Clip the ticker glint');
  await fillFeed();
  console.log('Authored Ticker');

  // Transition Logic: a reel lane with one state per slide and one surface that morphs between them, and
  // a ticker lane that runs on its own. The surface makes room while the ticker is on.
  const { surface, scrim, edge } = component;
  const values = (slideId) => {
    const pose = POSES[slideId];
    const geometry = (layer) => [
      ['x', pose.box[0]],
      ['y', pose.box[1]],
      ['width', pose.box[2]],
      ['height', pose.box[3]],
    ].map(([property, value]) => ({ instanceId: component.instanceId, sourceLayerId: layer, property, value }));
    const fade = (layer, value) => ({ instanceId: component.instanceId, sourceLayerId: layer, property: 'opacity', value });
    return [
      ...geometry(surface),
      fade(surface, 1),
      ...geometry(scrim),
      fade(scrim, pose.scrim),
      ...geometry(edge),
      fade(edge, pose.edge),
    ];
  };
  const first = POSES[SLIDES[0].id];
  const definition = {
    version: 5,
    id: 'feature-reel',
    name: 'Feature reel',
    defaultTransitionId: 'reel-morph',
    slots: [
      { id: SLOT, name: 'Reel', order: 0 },
      { id: TICKER_SLOT, name: 'Ticker', order: 1 },
    ],
    states: [
      ...SLIDES.map((slide) => ({
        id: slide.id,
        name: slide.name,
        slotId: SLOT,
        templateId: slide.templateId,
        sharedValues: values(slide.id),
      })),
      { id: TICKER_STATE, name: 'Ticker', slotId: TICKER_SLOT, templateId: tickerTemplateId },
    ],
    transitions: [
      { id: 'reel-morph', name: 'Reel morph', durationFrames: 62, outgoingFrames: OUT, incomingStartFrame: 12, incomingFrames: IN, sharedFrames: 56, easing: 'ease-in-out', contentMotion: 'authored' },
      { id: 'reel-in', name: 'Reel take in', durationFrames: 60, outgoingFrames: 0, incomingStartFrame: 10, incomingFrames: IN, sharedFrames: 40, easing: 'ease-out', contentMotion: 'authored' },
      { id: 'reel-out', name: 'Reel take out', durationFrames: 30, outgoingFrames: OUT, incomingStartFrame: 0, incomingFrames: 0, sharedFrames: 30, easing: 'ease-in-out', contentMotion: 'authored' },
      { id: 'ticker-in', name: 'Ticker in', durationFrames: TICKER_IN, outgoingFrames: 0, incomingStartFrame: 0, incomingFrames: TICKER_IN, sharedFrames: TICKER_IN, easing: 'ease-out', layoutPhase: { startFrame: 0, durationFrames: TICKER_IN }, contentMotion: 'authored' },
      { id: 'ticker-out', name: 'Ticker out', durationFrames: OUT + 4, outgoingFrames: OUT, incomingStartFrame: 0, incomingFrames: 0, sharedFrames: OUT + 4, easing: 'ease-in-out', layoutPhase: { startFrame: 0, durationFrames: OUT + 4 }, contentMotion: 'authored' },
    ],
    routes: [
      { id: 'reel-enter', slotId: SLOT, from: null, to: '*', transitionId: 'reel-in', priority: 10 },
      { id: 'reel-leave', slotId: SLOT, from: '*', to: null, transitionId: 'reel-out', priority: 20 },
      { id: 'ticker-enter', slotId: TICKER_SLOT, from: null, to: '*', transitionId: 'ticker-in', priority: 10 },
      { id: 'ticker-leave', slotId: TICKER_SLOT, from: '*', to: null, transitionId: 'ticker-out', priority: 20 },
    ],
    sharedInstances: [
      { id: component.instanceId, name: 'Reel surface', componentAssetId: component.componentId, continuityKey: 'reel-surface', slotId: SLOT },
    ],
    initialSharedValues: [
      ...[surface, scrim, edge].flatMap((layer) =>
        [
          ['x', first.box[0]],
          ['y', first.box[1]],
          ['width', first.box[2]],
          ['height', first.box[3]],
          ['opacity', 0],
        ].map(([property, value]) => ({ instanceId: component.instanceId, sourceLayerId: layer, property, value })),
      ),
    ],
    layoutRules: [
      {
        id: 'make-room-for-ticker',
        name: 'Make room for the ticker',
        slotId: SLOT,
        whenSlotId: TICKER_SLOT,
        sharedOffsets: [surface, scrim, edge].map((layer) => ({
          instanceId: component.instanceId,
          sourceLayerId: layer,
          property: 'height',
          value: -MAKE_ROOM,
        })),
      },
    ],
  };
  for (const slide of SLIDES) await setOperation({ type: 'rename_template', templateId: slide.templateId, name: slide.name });
  await setOperation({ type: 'rename_template', templateId: tickerTemplateId, name: 'Ticker' });
  const charts = SLIDES.find((slide) => slide.id === 'charts');
  const media = SLIDES.find((slide) => slide.id === 'media');
  await setOperation({ type: 'reorder_template', templateId: charts.templateId, targetTemplateId: media.templateId, side: 'after' });
  await setOperation({ type: 'set_transition_logic', definition });
  console.log('Transition Logic set');

  const latest = await call('ograf_get_template_set');
  await call('ograf_save_template_set', {
    expectedRevision: latest.revision,
    path: 'carousel/feature-reel.ogs',
    confirm: true,
    overwrite: true,
  });
  console.log('Saved carousel/feature-reel.ogs');

  const ready = await call('ograf_get_template_set');
  const exported = await call('ograf_export_coordinated_package', {
    path: 'graphics/feature-reel.ograf.zip',
    expectedRevision: ready.revision,
    operationId: `feature-reel-${Date.now()}`,
    confirm: true,
    overwrite: true,
    profile: 'realtime',
  });
  console.log(JSON.stringify(exported).slice(0, 800));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
