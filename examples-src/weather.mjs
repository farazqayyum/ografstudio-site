/**
 * The Weather examples: a five-step Europe weather sequence for a presenter, and a weather strap for
 * news bulletins. Both play a live forecast from Open-Meteo.
 *
 * The layers and their animation are placed here. `weather-logic.js` and `weather-strap-logic.js`
 * decide what they show, and `weather-sky.glsl` draws the see-through rain, snow, thunder and fog.
 * Whoever plays the graphic only sends the forecast; on this site that is
 * src/components/OGrafExample/weatherFeed.ts.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CITIES, CREDIT } from '../src/data/weatherData.mjs';

const here = new URL('.', import.meta.url);
const read = (file) => readFileSync(new URL(file, here), 'utf8');
// A function's source is one expression, so no closing semicolon.
const source = (file) => read(file).trim().replace(/;$/, '');

const UI = 'Inter, Arial, sans-serif';
const DISPLAY = 'Oswald, Arial Narrow, sans-serif';
const SEA = '#0b1f3a';
const PANEL = '#0c1f3d';
const ACCENT = '#5fd0ff';
const SOFT = '#c4d3e8';
const QUIET = '#8fa5c4';
const INK = '#08131f';

// Where each city sits on the 1920 x 1080 map, and which side of its dot the numbers go. Keep these in
// step with weather-logic.js and weather-sky.glsl.
const PLACES = {
  Lisbon: [718, 857, 'below'],
  Madrid: [862, 832, 'right'],
  Dublin: [888, 408, 'left'],
  London: [996, 489, 'right'],
  Paris: [1037, 581, 'right'],
  Berlin: [1268, 468, 'above'],
  Rome: [1261, 814, 'right'],
  Vienna: [1339, 604, 'right'],
  Warsaw: [1419, 463, 'right'],
  Stockholm: [1334, 241, 'right'],
  Athens: [1553, 910, 'right'],
  Istanbul: [1663, 785, 'above'],
};
const SIDE = { right: [14, -40], left: [-182, -40], above: [-84, -124], below: [-84, 16] };
// The map is drawn 300 px past every edge, so the close-up never runs out of land.
const MAP = { x: -300, y: -300, w: 2520, h: 1680 };
const ZOOM = 2.4;

// The five steps, at 50 frames a second. Each number is the frame the step is reached on.
const F = { open: 60, today: 125, tonight: 165, tomorrow: 205, outlook: 285, end: 315 };

const add = (kind, name, box, element) => ({
  type: 'add_layer',
  kind,
  name,
  transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
  element,
});
const rect = (name, box, fill, radius = 0) => add('rectangle', name, box, { fill, borderRadius: radius, strokeWidth: 0 });
const image = (name, box, src) => add('image', name, box, { src, fit: 'fill' });
const text = (name, box, content, style = {}) =>
  add('text', name, box, {
    content,
    fontFamily: style.font ?? UI,
    fontSize: style.size ?? 24,
    minFontSize: Math.round((style.size ?? 24) * 0.6),
    fontWeight: style.weight ?? 600,
    color: style.color ?? '#ffffff',
    textAlign: style.align ?? 'left',
    verticalAlign: 'middle',
    autoFit: 'shrink-to-fit',
    overflowPolicy: 'clip',
    letterSpacing: style.ls ?? 0,
  });
const svgData = (svg) => `data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}`;

/** A key list: [frame, value, easing of the move that arrives here]. */
const track = (layerName, property, keys) => {
  // Two keys on one frame: the later one is the one meant.
  const byFrame = new Map(keys.map(([frame, value, easing = 'cubic-out']) => [frame, { frame, value, easing }]));
  return { type: 'set_property_track', layerName, property, keys: [...byFrame.values()].sort((a, b) => a.frame - b.frame) };
};
const fade = (layerName, keys) => track(layerName, 'opacity', keys);

/** Plays a function once on the saved forecast. Studio's canvas doesn't run functions, so that is what it shows. */
function firstLook(file, data) {
  const run = runInNewContext(`(\n${source(file)}\n)`);
  return JSON.parse(JSON.stringify(run({ state: {}, data, event: { type: 'load' }, nowMs: 0 }).data));
}

const prop = (key, fieldType, extra = {}) => ({ key, fieldType, ...extra });
const objectOf = (values) => ({
  properties: Object.entries(values).map(([key, value]) =>
    prop(key, typeof value === 'number' ? 'number' : /^(chip|strip)\d/.test(key) ? 'color' : 'text'),
  ),
});
const citiesField = (addField, cities, maxItems) =>
  addField('array', 'cities', 'Forecast', 'One entry per city: now, tonight and the next five days, today first. Temperatures in °C, wind in km/h, weather as WMO codes.', cities, {
    items: {
      key: 'item',
      fieldType: 'object',
      properties: [
        prop('name', 'text'),
        prop('temp', 'number'),
        prop('feels', 'number'),
        prop('code', 'integer'),
        prop('is_day', 'boolean'),
        prop('wind', 'number'),
        prop('humidity', 'number'),
        prop('night_code', 'integer'),
        prop('night_low', 'number'),
        prop('days', 'array', {
          items: {
            key: 'item',
            fieldType: 'object',
            properties: [prop('date', 'text'), prop('code', 'integer'), prop('high', 'number'), prop('low', 'number'), prop('rain', 'number')],
          },
          constraints: { maxItems: 5 },
        }),
      ],
    },
    constraints: { maxItems },
  });

const fontAsset = (name, family, weight, file, license) => ({
  type: 'add_asset',
  name,
  mimeType: 'font/woff2',
  fontFamily: family,
  fontWeight: weight,
  fontStyle: 'normal',
  packagePath: `assets/fonts/${file}.woff2`,
  licenseName: 'SIL Open Font License 1.1',
  licenseUrl: license,
  licenseText: read(`fonts/${file}-OFL.txt`),
  data: readFileSync(new URL(`fonts/${file}.woff2`, here)).toString('base64'),
});
const FONTS = [
  fontAsset('Inter', 'Inter', '100 900', 'inter', 'https://github.com/rsms/inter/blob/master/LICENSE.txt'),
  fontAsset('Oswald', 'Oswald', '200 700', 'oswald', 'https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/oswald/OFL.txt'),
];

/** The shader's data fields, by parameter name. Studio makes one per `#pragma ograf` line. */
const PARAMS = ['today_a', 'today_b', 'tonight_a', 'tonight_b', 'next_a', 'next_b', 'stage', 'focus', 'edge', 'world'];
function shaderFields(composition, layerName) {
  const layer = composition.layers.find((item) => item.name === layerName);
  const tag = layer.id.replace(/\W/g, '_').replace(/^layer_/, '');
  return Object.fromEntries(
    PARAMS.map((param) => {
      const field = composition.dataFields.find(
        (item) => item.key.startsWith('shader_') && item.key.includes(tag) && item.key.endsWith(`_${param}`),
      );
      if (!field) throw new Error(`No shader field for ${param}; fields are ${composition.dataFields.map((item) => item.key).join(', ')}`);
      return [param, field];
    }),
  );
}
const shaderFill = (fragmentSource = read('weather-sky.glsl'), resolutionScale = 1) => ({
  type: 'shader',
  fragmentSource,
  speed: 1,
  resolutionScale,
  parameters: {},
});
/** Steps start as Start, Step 1, End: name the first and add the rest before End. */
async function lifecycle(apply, scene, names, durations) {
  const first = await scene();
  const step = first.composition.keyframes.find((keyframe) => keyframe.role === 'step');
  await apply(
    [
      { type: 'rename_lifecycle_keyframe', keyframeId: step.id, name: names[0] },
      ...names.slice(1).map((name) => ({ type: 'add_lifecycle_step', name })),
    ],
    'Steps',
  );
  const { composition } = await scene();
  const order = composition.keyframes.map((keyframe) => keyframe.id);
  const transitions = [...composition.transitions].sort(
    (a, b) => order.indexOf(a.fromKeyframeId) - order.indexOf(b.fromKeyframeId),
  );
  if (transitions.length !== durations.length) throw new Error(`Expected ${durations.length} transitions, found ${transitions.length}`);
  await apply(
    transitions.map((transition, i) => ({
      type: 'set_transition',
      transitionId: transition.id,
      durationFrames: durations[i],
      easing: 'linear',
    })),
    'Step timing',
  );
}

export async function weather({ apply, scene, addField, bind, option }) {
  const snapshot = JSON.parse(read('weather-snapshot.json'));
  const inputs = { cities: snapshot.cities, featured: 'Lisbon' };
  const look = firstLook('weather-logic.js', inputs);
  const INTERNAL = { exposeToOgraf: false };
  const mapSrc = svgData(read('weather-map.svg'));
  const drop = svgData(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 22'><path d='M8 1C8 1 1 10 1 14a7 7 0 0 0 14 0C15 10 8 1 8 1Z' fill='#5fd0ff'/></svg>`);

  await apply(
    [
      { type: 'set_composition', updateTransitionFrames: 14, frameRate: 50 },
      ...FONTS,
      citiesField(addField, inputs.cities, 12),
      addField('select', 'featured', 'Outlook city', 'Whose five days the last step shows.', 'Lisbon', {
        options: CITIES.map(({ name }) => option(name, name)),
      }),
      addField('text', 'credit', 'Credit', 'Where the forecast comes from, at the bottom right.', CREDIT),
      addField('object', 'ui', 'Display', 'Written by the Weather function.', look.ui, { ...INTERNAL, ...objectOf(look.ui) }),
    ],
    'Fonts and fields',
  );
  await lifecycle(apply, scene, ['Open', 'Today', 'Tonight', 'Tomorrow', 'Outlook'], [
    F.open,
    F.today - F.open,
    F.tonight - F.today,
    F.tomorrow - F.tonight,
    F.outlook - F.tomorrow,
    F.end - F.outlook,
  ]);

  // Bottom to top.
  const ground = [
    // The sea, see-through on the presenter's side so whatever stands behind shows, dimmed.
    rect('Sea', [0, 0, 1920, 1080], {
      type: 'linear',
      angle: 90,
      stops: [
        { offset: 0, color: '#071226', opacity: 0.5 },
        { offset: 0.2, color: '#081631', opacity: 0.58 },
        { offset: 0.42, color: SEA, opacity: 1 },
        { offset: 1, color: '#0a1830', opacity: 1 },
      ],
    }),
    image('Map', [MAP.x, MAP.y, MAP.w, MAP.h], mapSrc),
    image('Map close-up', [look.ui.zoom_x, look.ui.zoom_y, MAP.w * ZOOM, MAP.h * ZOOM], mapSrc),
    rect('Shade', [0, 0, 1920, 1080], '#040a16'),
    rect('Sky', [0, 0, 1920, 1080], shaderFill()),
    // Keeps the titles readable over the presenter's side.
    // A soft pool of shade round the titles, gone well before any edge of its box.
    rect('Title shade', [-600, -440, 1640, 1120], {
      type: 'radial',
      angle: 0,
      stops: [
        { offset: 0, color: '#040a16', opacity: 0.6 },
        { offset: 0.3, color: '#040a16', opacity: 0.45 },
        { offset: 0.68, color: '#040a16', opacity: 0 },
        { offset: 1, color: '#040a16', opacity: 0 },
      ],
    }),
  ];

  const cityNames = Object.keys(PLACES);
  const cityLayers = [];
  const dots = [];
  for (const [i, name] of cityNames.entries()) {
    const [x, y, side] = PLACES[name];
    const bx = x + SIDE[side][0];
    const by = y + SIDE[side][1];
    dots.push(add('ellipse', `${name} dot`, [x - 7, y - 7, 14, 14], { fill: '#ffffff', strokeColor: SEA, strokeWidth: 3 }));
    cityLayers.push(text(`${name}`, [bx + 4, by + 66, 200, 24], look.ui[`name${i}`], { size: 17, weight: 700, ls: 2 }));
    for (const part of ['a', 'b', 'c']) {
      cityLayers.push(
        image(`${name} icon ${part}`, [bx, by, 64, 64], look.ui[`icon${i}${part}`]),
        rect(`${name} chip ${part}`, [bx + 70, by + 4, 98, 56], look.ui[`chip${i}${part}`], 10),
        text(`${name} temp ${part}`, [bx + 70, by + 4, 98, 56], look.ui[`temp${i}${part}`], {
          font: DISPLAY,
          size: 44,
          weight: 600,
          color: INK,
          align: 'center',
        }),
      );
    }
  }

  const titles = [
    text('Kicker open', [96, 76, 760, 40], 'EUROPE', { size: 26, weight: 700, ls: 6.8, color: ACCENT }),
    text('Title open', [90, 116, 900, 172], 'WEATHER', { font: DISPLAY, size: 168, weight: 600 }),
    text('Date', [96, 314, 760, 44], look.ui.date, { size: 30, weight: 500, color: SOFT }),
    text('Kicker', [96, 76, 760, 36], 'EUROPE WEATHER', { size: 22, weight: 700, ls: 5.7, color: ACCENT }),
    text('Kicker outlook', [96, 76, 760, 36], 'FIVE-DAY OUTLOOK', { size: 22, weight: 700, ls: 5.7, color: ACCENT }),
    text('Title today', [92, 114, 760, 112], 'TODAY', { font: DISPLAY, size: 104, weight: 600 }),
    text('Title tonight', [92, 114, 760, 112], 'TONIGHT', { font: DISPLAY, size: 104, weight: 600 }),
    text('Title tomorrow', [92, 114, 760, 112], 'TOMORROW', { font: DISPLAY, size: 104, weight: 600 }),
    text('Title outlook', [92, 114, 760, 112], look.ui.city, { font: DISPLAY, size: 104, weight: 600 }),
    rect('Title bar', [96, 236, 96, 6], ACCENT),
    text('Sub today', [96, 252, 760, 40], look.ui.sub_today, { size: 30, weight: 500, color: SOFT }),
    text('Sub tonight', [96, 252, 760, 40], look.ui.sub_tonight, { size: 30, weight: 500, color: SOFT }),
    text('Sub tomorrow', [96, 252, 760, 40], look.ui.sub_tomorrow, { size: 30, weight: 500, color: SOFT }),
    text('Sub outlook', [96, 252, 760, 40], look.ui.sub_outlook, { size: 30, weight: 500, color: SOFT }),
  ];

  const FOCUS = { x: 660, y: 640 };
  const outlook = [
    add('ellipse', 'Focus ring', [FOCUS.x - 20, FOCUS.y - 20, 40, 40], { fill: '#5fd0ff59', strokeWidth: 0 }),
    add('ellipse', 'Focus dot', [FOCUS.x - 9, FOCUS.y - 9, 18, 18], { fill: '#ffffff', strokeColor: SEA, strokeWidth: 4 }),
    rect('Now panel', [760, 96, 1064, 250], PANEL, 14),
    image('Now icon', [796, 146, 150, 150], look.ui.now_icon),
    text('Now temp', [966, 110, 250, 220], look.ui.now_temp, { font: DISPLAY, size: 156, weight: 600 }),
    text('Now label', [1232, 136, 560, 30], 'NOW', { size: 20, weight: 700, ls: 4, color: ACCENT }),
    text('Now sky', [1232, 168, 560, 58], look.ui.now_sky, { size: 44, weight: 700 }),
    text('Now info', [1232, 234, 560, 36], look.ui.now_info, { size: 24, weight: 500, color: SOFT }),
  ];
  const CARD = (j) => 760 + j * 217;
  const card = (j) => {
    const x = CARD(j);
    return [
      rect(`Card ${j}`, [x, 396, 196, 430], PANEL, 14),
      rect(`Card ${j} strip`, [x + 14, 396, 168, 6], look.ui[`strip${j}`], 3),
      text(`Card ${j} day`, [x, 424, 196, 32], look.ui[`day${j}`], { size: 24, weight: 700, ls: 3.8, color: ACCENT, align: 'center' }),
      text(`Card ${j} date`, [x, 458, 196, 28], look.ui[`date${j}`], { size: 20, weight: 500, color: QUIET, align: 'center' }),
      image(`Card ${j} icon`, [x + 46, 500, 104, 104], look.ui[`dicon${j}`]),
      text(`Card ${j} high`, [x, 614, 196, 84], look.ui[`high${j}`], { font: DISPLAY, size: 76, weight: 600, align: 'center' }),
      text(`Card ${j} low`, [x, 696, 196, 48], look.ui[`low${j}`], { font: DISPLAY, size: 40, weight: 500, color: QUIET, align: 'center' }),
      image(`Card ${j} drop`, [x + 54, 768, 16, 22], drop),
      text(`Card ${j} rain`, [x + 78, 762, 90, 34], look.ui[`rain${j}`], { size: 24, weight: 600 }),
      rect(`Card ${j} track`, [x + 28, 806, 140, 8], '#ffffff1f', 4),
      rect(`Card ${j} bar`, [x + 28, 806, look.ui[`bar${j}`], 8], ACCENT, 4),
    ];
  };
  const cards = [0, 1, 2, 3, 4].flatMap(card);
  const credit = text('Credit', [1224, 994, 600, 32], CREDIT, { size: 19, weight: 500, color: QUIET, align: 'right' });

  await apply([...ground, ...dots, ...cityLayers, ...titles, ...outlook, ...cards, credit], 'Layers');

  const { composition, field } = await scene();
  const sky = shaderFields(composition, 'Sky');
  const ui = (layerName, map) =>
    bind(
      layerName,
      Object.entries(map).map(([targetProperty, key]) => ({ fieldKey: 'ui', targetProperty, sourcePath: [key] })),
    );

  const bindings = [
    ui('Map close-up', { 'layer.x': 'zoom_x', 'layer.y': 'zoom_y' }),
    ui('Date', { content: 'date' }),
    ui('Title outlook', { content: 'city' }),
    ui('Sub today', { content: 'sub_today' }),
    ui('Sub tonight', { content: 'sub_tonight' }),
    ui('Sub tomorrow', { content: 'sub_tomorrow' }),
    ui('Sub outlook', { content: 'sub_outlook' }),
    ui('Now icon', { src: 'now_icon' }),
    ui('Now temp', { content: 'now_temp' }),
    ui('Now sky', { content: 'now_sky' }),
    ui('Now info', { content: 'now_info' }),
    bind('Credit', [{ fieldKey: 'credit', targetProperty: 'content' }]),
    ...cityNames.flatMap((name, i) => [
      ui(name, { content: `name${i}` }),
      ...['a', 'b', 'c'].flatMap((part) => [
        ui(`${name} icon ${part}`, { src: `icon${i}${part}` }),
        ui(`${name} chip ${part}`, { fill: `chip${i}${part}` }),
        ui(`${name} temp ${part}`, { content: `temp${i}${part}` }),
      ]),
    ]),
    ...[0, 1, 2, 3, 4].flatMap((j) => [
      ui(`Card ${j} strip`, { fill: `strip${j}` }),
      ui(`Card ${j} day`, { content: `day${j}` }),
      ui(`Card ${j} date`, { content: `date${j}` }),
      ui(`Card ${j} icon`, { src: `dicon${j}` }),
      ui(`Card ${j} high`, { content: `high${j}` }),
      ui(`Card ${j} low`, { content: `low${j}` }),
      ui(`Card ${j} rain`, { content: `rain${j}` }),
      ui(`Card ${j} bar`, { 'layer.width': `bar${j}` }),
    ]),
  ];

  // ---- Motion. Everything is see-through at Start and at End, so Take out from any step fades it all.
  const keys = [];
  const k = (...ops) => keys.push(...ops);

  // Open: the sea and the map slide in from the right, the title arrives, the dots come up west to east.
  k(fade('Sea', [[0, 0], [20, 1, 'sine-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(fade('Map', [[0, 0], [30, 1, 'sine-out'], [207, 1], [247, 0, 'sine-in'], [F.end, 0]]));
  k(track('Map', 'x', [[0, MAP.x + 260], [45, MAP.x], [207, MAP.x], [250, 960 - (960 - MAP.x) * 1.15, 'cubic-in'], [300, MAP.x, 'linear']]));
  k(track('Map', 'y', [[207, MAP.y], [250, 540 - (540 - MAP.y) * 1.15, 'cubic-in'], [300, MAP.y, 'linear']]));
  k(track('Map', 'width', [[207, MAP.w], [250, MAP.w * 1.15, 'cubic-in'], [300, MAP.w, 'linear']]));
  k(track('Map', 'height', [[207, MAP.h], [250, MAP.h * 1.15, 'cubic-in'], [300, MAP.h, 'linear']]));
  // The close-up already sits on the featured city; it comes up as the overview pushes in and goes.
  k(fade('Map close-up', [[0, 0], [222, 0], [262, 1, 'sine-in-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  // Night dims the map; the outlook dims it a little more for the cards.
  k(fade('Shade', [[0, 0], [127, 0], [157, 0.36, 'sine-in-out'], [167, 0.36], [197, 0, 'sine-in-out'], [225, 0], [255, 0.42, 'sine-in-out'], [F.outlook, 0.42], [F.end, 0, 'cubic-in']]));
  k(fade('Sky', [[0, 0], [70, 0], [110, 1, 'sine-in-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(track('Sky', 'fill.parameters.stage', [[0, 0], [127, 0], [157, 1, 'sine-in-out'], [167, 1], [197, 2, 'sine-in-out'], [215, 2], [255, 3, 'sine-in-out']]));
  k(fade('Title shade', [[0, 0], [24, 1, 'sine-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(fade('Credit', [[0, 0], [30, 1, 'sine-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));

  // Titles change in place: the old one lifts away, the new one rises in.
  /** A title that arrives at `inAt` and leaves at `outAt`. Opacity and y are each one track. */
  const titleSpan = (name, y, inAt, outAt) => {
    const opacity = [[0, 0], [inAt, 0], [inAt + 14, 1]];
    const move = [[inAt, y + 16], [inAt + 18, y]];
    if (outAt) {
      opacity.push([outAt, 1], [outAt + 10, 0, 'cubic-in']);
      move.push([outAt, y], [outAt + 10, y - 12, 'cubic-in']);
    }
    opacity.push([F.outlook, outAt ? 0 : 1], [F.end, 0, 'cubic-in']);
    return [fade(name, opacity), track(name, 'y', move)];
  };
  k(...titleSpan('Kicker open', 76, 4, 62));
  k(...titleSpan('Title open', 116, 8, 64));
  k(...titleSpan('Date', 314, 14, 66));
  k(...titleSpan('Kicker', 76, 72, 207));
  k(...titleSpan('Title today', 114, 74, 127));
  k(...titleSpan('Sub today', 252, 78, 129));
  k(...titleSpan('Title tonight', 114, 133, 167));
  k(...titleSpan('Sub tonight', 252, 137, 169));
  k(...titleSpan('Title tomorrow', 114, 173, 207));
  k(...titleSpan('Sub tomorrow', 252, 177, 209));
  k(...titleSpan('Kicker outlook', 76, 217));
  k(...titleSpan('Title outlook', 114, 219));
  k(...titleSpan('Sub outlook', 252, 223));
  // The bar sits under the big title at Open and under the step titles after it.
  k(fade('Title bar', [[0, 0], [10, 0], [24, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(track('Title bar', 'y', [[0, 296], [62, 296], [80, 236, 'cubic-in-out']]));
  k(track('Title bar', 'width', [[10, 0], [30, 96]]));

  // Cities, west to east.
  const westToEast = [...cityNames].sort((a, b) => PLACES[a][0] - PLACES[b][0]);
  for (const name of cityNames) {
    const order = westToEast.indexOf(name);
    const [, y, side] = PLACES[name];
    const by = y + SIDE[side][1];
    const gone = 207 + order; // they leave for the outlook
    k(fade(`${name} dot`, [[0, 0], [24 + 2 * order, 0], [36 + 2 * order, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));

    // Today: the icon drops in with a small bounce, the number rises into its chip.
    const s = 66 + 4 * order;
    k(fade(name, [[0, 0], [s + 4, 0], [s + 12, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    k(track(`${name} icon a`, 'y', [[s, by - 18], [s + 14, by, 'back-out']]));
    // Tonight: the icons swap in place and the numbers roll down to the lows.
    const n = 127 + 2 * order;
    // Tomorrow: they roll back up to the highs.
    const m = 167 + 2 * order;
    k(fade(`${name} icon a`, [[0, 0], [s, 0], [s + 8, 1], [n, 1], [n + 8, 0]]));
    k(fade(`${name} icon b`, [[0, 0], [n + 2, 0], [n + 12, 1], [m, 1], [m + 8, 0]]));
    k(fade(`${name} icon c`, [[0, 0], [m + 2, 0], [m + 12, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    k(fade(`${name} chip a`, [[0, 0], [s + 3, 0], [s + 11, 1], [n, 1], [n + 10, 0, 'sine-in-out']]));
    k(fade(`${name} chip b`, [[0, 0], [n, 0], [n + 10, 1, 'sine-in-out'], [m, 1], [m + 10, 0, 'sine-in-out']]));
    k(fade(`${name} chip c`, [[0, 0], [m, 0], [m + 10, 1, 'sine-in-out'], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    const ty = by + 4;
    // The old number is gone before the new one arrives, so the two never read as one.
    k(fade(`${name} temp a`, [[0, 0], [s + 3, 0], [s + 11, 1], [n, 1], [n + 6, 0, 'cubic-in']]));
    k(track(`${name} temp a`, 'y', [[s + 3, ty + 12], [s + 13, ty], [n, ty], [n + 6, ty + 14, 'cubic-in']]));
    k(fade(`${name} temp b`, [[0, 0], [n + 5, 0], [n + 12, 1], [m, 1], [m + 6, 0, 'cubic-in']]));
    k(track(`${name} temp b`, 'y', [[n + 5, ty - 14], [n + 14, ty], [m, ty], [m + 6, ty - 14, 'cubic-in']]));
    k(fade(`${name} temp c`, [[0, 0], [m + 5, 0], [m + 12, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    k(track(`${name} temp c`, 'y', [[m + 5, ty + 14], [m + 14, ty]]));
  }

  // Outlook: the city marker lands, the Now panel wipes on, the cards follow 80 ms apart.
  k(fade('Focus ring', [[0, 0], [250, 0], [262, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(fade('Focus dot', [[0, 0], [246, 0], [256, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  const slideIn = (layerName, x, at, distance = 60) => [
    fade(layerName, [[0, 0], [at, 0], [at + 14, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]),
    track(layerName, 'x', [[at, x + distance], [at + 18, x]]),
  ];
  k(...slideIn('Now panel', 760, 236));
  k(...slideIn('Now icon', 796, 240));
  k(...slideIn('Now temp', 966, 242));
  k(...slideIn('Now label', 1232, 244));
  k(...slideIn('Now sky', 1232, 245));
  k(...slideIn('Now info', 1232, 246));
  for (const j of [0, 1, 2, 3, 4]) {
    const at = 248 + 4 * j;
    const x = CARD(j);
    for (const [suffix, dx] of [['', 0], [' strip', 14], [' day', 0], [' date', 0], [' icon', 46], [' high', 0], [' low', 0], [' drop', 54], [' rain', 78], [' track', 28], [' bar', 28]])
      k(...slideIn(`Card ${j}${suffix}`, x + dx, at, 90));
  }

  // A data update rolls the numbers that change and cross-fades the rest.
  const rolling = [
    ...cityNames.flatMap((name) => ['a', 'b', 'c'].map((part) => `${name} temp ${part}`)),
    'Now temp',
    ...[0, 1, 2, 3, 4].flatMap((j) => [`Card ${j} high`, `Card ${j} low`]),
  ];
  const updates = rolling.map((layerName) => ({
    type: 'set_layer_layout',
    layerName,
    updateTransition: { style: 'slide-up', durationFrames: 14, distance: 22 },
  }));

  const shaderSetup = [
    ...Object.values(sky).map((item) => ({ type: 'update_data_field', fieldId: item.id, exposeToOgraf: false })),
    ...['today_a', 'today_b', 'tonight_a', 'tonight_b', 'next_a', 'next_b', 'focus'].map((param) => ({
      type: 'update_data_field',
      fieldId: sky[param].id,
      defaultValue: look[param],
    })),
  ];

  await apply([...bindings, ...shaderSetup], 'Bindings');
  // Keys go in a few batches; each is a full track per property.
  for (let i = 0; i < keys.length; i += 120) await apply(keys.slice(i, i + 120), `Motion ${i / 120 + 1}`);
  await apply(
    [
      ...updates,
      {
        type: 'set_logic_functions',
        compositionId: composition.id,
        functions: [
          {
            type: 'javascript',
            version: 1,
            id: 'weather',
            name: 'Weather',
            enabled: true,
            source: source('weather-logic.js'),
            inputs: { cities: field('cities').id, featured: field('featured').id },
            outputs: {
              ui: field('ui').id,
              ...Object.fromEntries(
                ['today_a', 'today_b', 'tonight_a', 'tonight_b', 'next_a', 'next_b', 'focus'].map((param) => [param, sky[param].id]),
              ),
            },
            actions: [],
            initialState: {},
            timeoutMs: 1000,
          },
        ],
      },
    ],
    'Updates and function',
  );
}

/** The strap for news bulletins: one city, from the same forecast. */
export async function weatherStrap({ apply, scene, addField, bind, option }) {
  const snapshot = JSON.parse(read('weather-snapshot.json'));
  const inputs = { cities: snapshot.cities, city: 'Madrid', when: 'today' };
  const look = firstLook('weather-strap-logic.js', inputs);
  const INTERNAL = { exposeToOgraf: false };
  const NAVY = '#0b1f3a';
  const BOX = '#0e2a52';
  const X = 96;
  const Y = 806;
  const LOW = Y + 190; // off the bottom of the frame, where it rises from

  // The same sky, always filling its layer: an icon box 160 px square.
  const boxSky = read('weather-sky.glsl')
    .replace('const float stage = 0.0;', 'const float stage = 3.0;')
    .replace('const float edge = 0.26;', 'const float edge = 0.0;')
    .replace('const vec2 world = vec2(1920.0, 1080.0);', 'const vec2 world = vec2(160.0, 160.0);');

  await apply(
    [
      { type: 'set_composition', updateTransitionFrames: 14, frameRate: 50 },
      ...FONTS,
      citiesField(addField, inputs.cities, 12),
      addField('select', 'city', 'City', 'Which city the strap is about.', inputs.city, {
        options: CITIES.map(({ name }) => option(name, name)),
      }),
      addField('select', 'when', 'When', 'Now, or the forecast for today, tonight or tomorrow.', inputs.when, {
        options: [option('now', 'Now'), option('today', 'Today'), option('tonight', 'Tonight'), option('tomorrow', 'Tomorrow')],
      }),
      addField('text', 'credit', 'Credit', 'Where the forecast comes from, under the strap.', CREDIT),
      addField('object', 'ui', 'Display', 'Written by the Strap function.', look.ui, { ...INTERNAL, ...objectOf(look.ui) }),
    ],
    'Fonts and fields',
  );
  const first = await scene();
  const [inTransition, outTransition] = first.composition.transitions;
  const ON = 26;
  const END = ON + 16;
  await apply(
    [
      { type: 'set_transition', transitionId: inTransition.id, durationFrames: ON, easing: 'linear' },
      { type: 'set_transition', transitionId: outTransition.id, durationFrames: END - ON, easing: 'linear' },
    ],
    'Timing',
  );

  await apply(
    [
      // The white bar runs under the icon box, so its rounded left end never shows.
      rect('Bar', [X + 148, Y, 892, 160], '#ffffff', 12),
      rect('Box', [X, Y, 160, 160], BOX, 12),
      rect('Box join', [X + 140, Y, 20, 160], BOX),
      rect('Sky', [X, Y, 160, 160], shaderFill(boxSky), 12),
      image('Icon', [X + 24, Y + 24, 112, 112], look.ui.icon),
      text('Label', [X + 196, Y + 26, 560, 28], look.ui.label, { size: 20, weight: 700, ls: 4, color: '#1478c8' }),
      text('Headline', [X + 196, Y + 58, 560, 72], look.ui.headline, { size: 54, weight: 700, color: NAVY }),
      text('Temp', [X + 760, Y, 176, 160], look.ui.temp, { font: DISPLAY, size: 120, weight: 600, color: NAVY, align: 'right' }),
      text('High', [X + 948, Y + 38, 92, 40], look.ui.high, { size: 28, weight: 600, color: '#4a5870' }),
      text('Low', [X + 948, Y + 82, 92, 40], look.ui.low, { size: 28, weight: 600, color: '#4a5870' }),
      rect('Line', [X, Y + 160, 1040, 6], ACCENT),
      rect('Credit plate', [X + 816, Y + 166, 224, 32], '#071226d1'),
      text('Credit', [X + 816, Y + 166, 224, 32], CREDIT, { size: 16, weight: 500, color: SOFT, align: 'center' }),
    ],
    'Layers',
  );

  const { composition, field } = await scene();
  const sky = shaderFields(composition, 'Sky');
  const ui = (layerName, map) =>
    bind(
      layerName,
      Object.entries(map).map(([targetProperty, key]) => ({ fieldKey: 'ui', targetProperty, sourcePath: [key] })),
    );
  // In: the icon box rises first, the bar wipes open behind it, the words follow. Out: it all drops away.
  const rise = (layerName, y, at) => [
    fade(layerName, [[0, 0], [at, 0], [at + 6, 1, 'linear'], [ON, 1], [END, 0, 'cubic-in']]),
    track(layerName, 'y', [[at, y + (LOW - Y)], [at + 16, y], [ON, y], [END, y + (LOW - Y), 'cubic-in']]),
  ];
  const words = (layerName, x, at) => [
    fade(layerName, [[0, 0], [at, 0], [at + 10, 1], [ON, 1], [END, 0, 'cubic-in']]),
    track(layerName, 'x', [[at, x - 24], [at + 12, x]]),
  ];
  await apply(
    [
      ui('Icon', { src: 'icon' }),
      ui('Label', { content: 'label' }),
      ui('Headline', { content: 'headline' }),
      ui('Temp', { content: 'temp' }),
      ui('High', { content: 'high' }),
      ui('Low', { content: 'low' }),
      bind('Credit', [{ fieldKey: 'credit', targetProperty: 'content' }]),
      ...Object.values(sky).map((item) => ({ type: 'update_data_field', fieldId: item.id, exposeToOgraf: false })),
      { type: 'update_data_field', fieldId: sky.focus.id, defaultValue: look.focus },
      ...rise('Box', Y, 0),
      ...rise('Box join', Y, 0),
      ...rise('Sky', Y, 0),
      ...rise('Icon', Y + 24, 2),
      fade('Bar', [[0, 0], [5, 0], [6, 1, 'linear'], [ON, 1], [END, 0, 'cubic-in']]),
      track('Bar', 'width', [[6, 12], [22, 892]]),
      track('Bar', 'y', [[ON, Y], [END, LOW, 'cubic-in']]),
      ...words('Label', X + 196, 12),
      ...words('Headline', X + 196, 14),
      ...words('Temp', X + 760, 16),
      ...words('High', X + 948, 18),
      ...words('Low', X + 948, 19),
      fade('Line', [[0, 0], [8, 0], [9, 1, 'linear'], [ON, 1], [END, 0, 'cubic-in']]),
      track('Line', 'width', [[8, 0], [24, 1040]]),
      fade('Credit plate', [[0, 0], [16, 0], [24, 1], [ON, 1], [END, 0, 'cubic-in']]),
      fade('Credit', [[0, 0], [16, 0], [24, 1], [ON, 1], [END, 0, 'cubic-in']]),
      ...['Temp', 'High', 'Low'].map((layerName) => ({
        type: 'set_layer_layout',
        layerName,
        updateTransition: { style: 'slide-up', durationFrames: 14, distance: 22 },
      })),
      {
        type: 'set_logic_functions',
        compositionId: composition.id,
        functions: [
          {
            type: 'javascript',
            version: 1,
            id: 'strap',
            name: 'Strap',
            enabled: true,
            source: source('weather-strap-logic.js'),
            inputs: { cities: field('cities').id, city: field('city').id, when: field('when').id },
            outputs: { ui: field('ui').id, focus: sky.focus.id },
            actions: [],
            initialState: {},
            timeoutMs: 1000,
          },
        ],
      },
    ],
    'Bindings, motion and function',
  );
}
