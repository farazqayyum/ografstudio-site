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
import { iconsFor } from './weather-icons.mjs';
import { CLOSE_UP } from './weather-map.mjs';

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
// Where each icon starts in its loops, in seconds, so the same weather doesn't move in step.
const MAP_LAG = (i) => i * 0.61;
const CARD_LAG = (j) => 0.37 + j * 0.53;

// The five steps, at 50 frames a second. Each number is the frame the step is reached on. The map's
// three days come one frame apart, because rules change the day, not the timeline: the steps only
// tell the rules which day to show, and so do the day buttons.
const F = { open: 60, today: 125, next: 126, after: 127, outlook: 207, end: 237 };
/** A frame of the move from the map to the outlook, counted from its start. */
const T = (n) => F.after + n;
// The day buttons: where the row starts, each button's size, and the tray's margin round them.
const DAY = { x: 96, y: 326, w: 188, h: 52, pad: 4 };
const dayX = (d) => DAY.x + DAY.pad + d * DAY.w;
// The map's days, in order, as the `view` field names them, with their title and sub layers.
const MAP_DAYS = [
  ['today', 'Today', 'Title today', 'Sub today'],
  ['tomorrow', 'Tomorrow', 'Title tomorrow', 'Sub tomorrow'],
  ['after', 'Day after', 'Title after', 'Sub after'],
];

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
const PARAMS = ['today_a', 'today_b', 'next_a', 'next_b', 'after_a', 'after_b', 'w_today', 'w_next', 'w_after', 'stage', 'focus', 'edge', 'world'];
/** The shader's weather for each day, which the Weather function writes. */
const KINDS = ['today_a', 'today_b', 'next_a', 'next_b', 'after_a', 'after_b', 'focus'];
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
  const closeUpSrc = `data:image/webp;base64,${readFileSync(new URL('weather-closeup.webp', here)).toString('base64')}`;
  const drop = svgData(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 22'><path d='M8 1C8 1 1 10 1 14a7 7 0 0 0 14 0C15 10 8 1 8 1Z' fill='#5fd0ff'/></svg>`);

  await apply(
    [
      { type: 'set_composition', updateTransitionFrames: 14, frameRate: 50 },
      ...FONTS,
      citiesField(addField, inputs.cities, 12),
      addField('select', 'featured', 'Outlook city', 'Whose five days the last step shows.', 'Lisbon', {
        options: CITIES.map(({ name }) => option(name, name)),
      }),
      addField('boolean', 'tour', 'Tour cities', 'The outlook moves on to the next city every eight seconds or so.', false),
      addField('text', 'credit', 'Credit', 'Where the forecast comes from, at the bottom right.', CREDIT),
      addField('object', 'ui', 'Display', 'Written by the Weather function.', look.ui, { ...INTERNAL, ...objectOf(look.ui) }),
      // The steps and the day buttons write this, and rules show what it names.
      addField('select', 'view', 'View', 'What the graphic shows: the opening, one of the map\'s days, or the outlook.', 'open', {
        ...INTERNAL,
        options: [option('open', 'Open'), ...MAP_DAYS.map(([value, label]) => option(value, label)), option('outlook', 'Outlook')],
      }),
    ],
    'Fonts and fields',
  );
  await lifecycle(apply, scene, ['Open', ...MAP_DAYS.map(([, label]) => label), 'Outlook'], [
    F.open,
    F.today - F.open,
    F.next - F.today,
    F.after - F.next,
    F.outlook - F.after,
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
    // A picture of the map rather than its paths, so moving and zooming it costs nothing (weather-closeup.mjs).
    image('Map close-up', [look.ui.zoom_x, look.ui.zoom_y, CLOSE_UP.w * ZOOM, CLOSE_UP.h * ZOOM], closeUpSrc),
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
        image(`${name} icon ${part}`, [bx, by, 64, 64], iconsFor(MAP_LAG(i))[look.ui[`icon${i}${part}`]]),
        rect(`${name} chip ${part}`, [bx + 70, by + 4, 98, 56], look.ui[`chip${i}${part}`], 10),
        text(`${name} temp ${part}`, [bx + 70, by + 4, 98, 56], look.ui[`temp${i}${part}`], {
          font: DISPLAY,
          size: 39.7,
          weight: 600,
          color: INK,
          align: 'center',
        }),
      );
    }
  }

  const titles = [
    text('Kicker open', [96, 76, 760, 40], 'EUROPE', { size: 26, weight: 700, ls: 6.8, color: ACCENT }),
    text('Title open', [90, 116, 900, 172], 'WEATHER', { font: DISPLAY, size: 117.7, weight: 600 }),
    text('Date', [96, 314, 760, 44], look.ui.date, { size: 30, weight: 500, color: SOFT }),
    text('Kicker', [96, 76, 760, 36], 'EUROPE WEATHER', { size: 22, weight: 700, ls: 5.7, color: ACCENT }),
    text('Kicker outlook', [96, 76, 760, 36], 'FIVE-DAY OUTLOOK', { size: 22, weight: 700, ls: 5.7, color: ACCENT }),
    text('Title today', [92, 114, 760, 112], 'TODAY', { font: DISPLAY, size: 76.6, weight: 600 }),
    text('Title tomorrow', [92, 114, 760, 112], 'TOMORROW', { font: DISPLAY, size: 76.6, weight: 600 }),
    text('Title after', [92, 114, 760, 112], look.ui.title_after, { font: DISPLAY, size: 76.6, weight: 600 }),
    text('Title outlook', [92, 114, 760, 112], look.ui.city, { font: DISPLAY, size: 76.6, weight: 600 }),
    rect('Title bar', [96, 236, 96, 6], ACCENT),
    text('Sub today', [96, 252, 760, 40], look.ui.sub_today, { size: 30, weight: 500, color: SOFT }),
    text('Sub tomorrow', [96, 252, 760, 40], look.ui.sub_next, { size: 30, weight: 500, color: SOFT }),
    text('Sub after', [96, 252, 760, 40], look.ui.sub_after, { size: 30, weight: 500, color: SOFT }),
    text('Sub outlook', [96, 252, 760, 40], look.ui.sub_outlook, { size: 30, weight: 500, color: SOFT }),
  ];

  // The presenter's day buttons, under the titles: a tray, a pill under the day shown, a label for
  // each day, and on top the see-through areas a touch or a click lands on.
  const buttons = [
    add('rectangle', 'Day tray', [DAY.x, DAY.y, DAY.w * 3 + DAY.pad * 2, DAY.h + DAY.pad * 2], {
      fill: '#0c1f3de6',
      borderRadius: DAY.h / 2 + DAY.pad,
      strokeColor: '#ffffff33',
      strokeWidth: 1.5,
    }),
    rect('Day pill', [dayX(0), DAY.y + DAY.pad, DAY.w, DAY.h], ACCENT, DAY.h / 2),
    ...['TODAY', 'TOMORROW', look.ui.title_after].map((label, d) =>
      text(`Day ${d}`, [dayX(d), DAY.y + DAY.pad, DAY.w, DAY.h], label, { size: 19, weight: 700, ls: 2.4, align: 'center' }),
    ),
    ...[0, 1, 2].map((d) => rect(`Day ${d} hit`, [dayX(d), DAY.y + DAY.pad, DAY.w, DAY.h], '#00000000', DAY.h / 2)),
  ];

  const FOCUS = { x: 660, y: 640 };
  const outlook = [
    add('ellipse', 'Focus ring', [FOCUS.x - 20, FOCUS.y - 20, 40, 40], { fill: '#5fd0ff59', strokeWidth: 0 }),
    add('ellipse', 'Focus dot', [FOCUS.x - 9, FOCUS.y - 9, 18, 18], { fill: '#ffffff', strokeColor: SEA, strokeWidth: 4 }),
    rect('Now panel', [760, 96, 1064, 250], PANEL, 14),
    image('Now icon', [796, 146, 150, 150], iconsFor()[look.ui.now_icon]),
    text('Now temp', [966, 110, 250, 220], look.ui.now_temp, { font: DISPLAY, size: 149.9, weight: 600 }),
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
      image(`Card ${j} icon`, [x + 46, 500, 104, 104], iconsFor(CARD_LAG(j))[look.ui[`dicon${j}`]]),
      text(`Card ${j} high`, [x, 614, 196, 84], look.ui[`high${j}`], { font: DISPLAY, size: 58.2, weight: 600, align: 'center' }),
      text(`Card ${j} low`, [x, 696, 196, 48], look.ui[`low${j}`], { font: DISPLAY, size: 33.3, weight: 500, color: QUIET, align: 'center' }),
      image(`Card ${j} drop`, [x + 54, 768, 16, 22], drop),
      text(`Card ${j} rain`, [x + 78, 762, 90, 34], look.ui[`rain${j}`], { size: 24, weight: 600 }),
      rect(`Card ${j} track`, [x + 28, 806, 140, 8], '#ffffff1f', 4),
      rect(`Card ${j} bar`, [x + 28, 806, look.ui[`bar${j}`], 8], ACCENT, 4),
    ];
  };
  const cards = [0, 1, 2, 3, 4].flatMap(card);
  const credit = text('Credit', [1224, 994, 600, 32], CREDIT, { size: 19, weight: 500, color: QUIET, align: 'right' });

  // Every value here fits its box, so the text keeps its size. Shrink-to-fit would measure each
  // label on every frame that anything moves, and again from the start whenever its value changes,
  // which stalled a city change for a sixth of a second. The Oswald sizes are the ones it used to
  // settle on: Oswald's tall line box made it shrink those to fit their boxes.
  const fixedSize = (op) => (op.element?.autoFit ? { ...op, element: { ...op.element, autoFit: 'fixed' } } : op);
  await apply([...ground, ...dots, ...cityLayers, ...titles, ...buttons, ...outlook, ...cards, credit].map(fixedSize), 'Layers');

  const { composition, field } = await scene();
  const sky = shaderFields(composition, 'Sky');
  const ui = (layerName, map) =>
    bind(
      layerName,
      Object.entries(map).map(([targetProperty, key]) => ({ fieldKey: 'ui', targetProperty, sourcePath: [key] })),
    );

  // The function names each sky; the icon layer looks up its moving picture.
  const skyIcon = (layerName, key, lag) =>
    bind(layerName, [{ fieldKey: 'ui', targetProperty: 'src', sourcePath: [key], valueMap: iconsFor(lag) }]);

  const bindings = [
    ui('Map close-up', { 'layer.x': 'zoom_x', 'layer.y': 'zoom_y' }),
    ui('Date', { content: 'date' }),
    ui('Title outlook', { content: 'city' }),
    ui('Title after', { content: 'title_after' }),
    ui('Day 2', { content: 'title_after' }),
    ui('Sub today', { content: 'sub_today' }),
    ui('Sub tomorrow', { content: 'sub_next' }),
    ui('Sub after', { content: 'sub_after' }),
    ui('Sub outlook', { content: 'sub_outlook' }),
    skyIcon('Now icon', 'now_icon', 0),
    ui('Now temp', { content: 'now_temp' }),
    ui('Now sky', { content: 'now_sky' }),
    ui('Now info', { content: 'now_info' }),
    bind('Credit', [{ fieldKey: 'credit', targetProperty: 'content' }]),
    ...cityNames.flatMap((name, i) => [
      ui(name, { content: `name${i}` }),
      ...['a', 'b', 'c'].flatMap((part) => [
        skyIcon(`${name} icon ${part}`, `icon${i}${part}`, MAP_LAG(i)),
        ui(`${name} chip ${part}`, { fill: `chip${i}${part}` }),
        ui(`${name} temp ${part}`, { content: `temp${i}${part}` }),
      ]),
    ]),
    ...[0, 1, 2, 3, 4].flatMap((j) => [
      ui(`Card ${j} strip`, { fill: `strip${j}` }),
      ui(`Card ${j} day`, { content: `day${j}` }),
      ui(`Card ${j} date`, { content: `date${j}` }),
      skyIcon(`Card ${j} icon`, `dicon${j}`, CARD_LAG(j)),
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
  k(fade('Map', [[0, 0], [30, 1, 'sine-out'], [T(2), 1], [T(42), 0, 'sine-in'], [F.end, 0]]));
  k(track('Map', 'x', [[0, MAP.x + 260], [45, MAP.x], [T(2), MAP.x], [T(45), 960 - (960 - MAP.x) * 1.15, 'cubic-in'], [T(95), MAP.x, 'linear']]));
  k(track('Map', 'y', [[T(2), MAP.y], [T(45), 540 - (540 - MAP.y) * 1.15, 'cubic-in'], [T(95), MAP.y, 'linear']]));
  k(track('Map', 'width', [[T(2), MAP.w], [T(45), MAP.w * 1.15, 'cubic-in'], [T(95), MAP.w, 'linear']]));
  k(track('Map', 'height', [[T(2), MAP.h], [T(45), MAP.h * 1.15, 'cubic-in'], [T(95), MAP.h, 'linear']]));
  // The close-up already sits on the featured city; it comes up as the overview pushes in and goes.
  k(fade('Map close-up', [[0, 0], [T(17), 0], [T(57), 1, 'sine-in-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  // The outlook dims the map a little for the cards.
  k(fade('Shade', [[0, 0], [T(20), 0], [T(50), 0.42, 'sine-in-out'], [F.outlook, 0.42], [F.end, 0, 'cubic-in']]));
  k(fade('Sky', [[0, 0], [70, 0], [110, 1, 'sine-in-out'], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  // The weather round the cities gives way to the close-up's.
  k(track('Sky', 'fill.parameters.stage', [[0, 0], [T(10), 0], [T(50), 1, 'sine-in-out']]));
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
  k(...titleSpan('Kicker', 76, 72, T(2)));
  // The map's three days share one place and arrive together; rules show the one picked (below).
  for (const [, , title, sub] of MAP_DAYS) {
    k(...titleSpan(title, 114, 74, T(2)));
    k(...titleSpan(sub, 252, 78, T(4)));
  }
  k(...titleSpan('Kicker outlook', 76, T(12)));
  k(...titleSpan('Title outlook', 114, T(14)));
  k(...titleSpan('Sub outlook', 252, T(18)));
  // The bar sits under the big title at Open and under the step titles after it.
  k(fade('Title bar', [[0, 0], [10, 0], [24, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(track('Title bar', 'y', [[0, 296], [62, 296], [80, 236, 'cubic-in-out']]));
  k(track('Title bar', 'width', [[10, 0], [30, 96]]));
  // The day buttons rise in under the titles and leave with them.
  for (const name of ['Day tray', 'Day pill', 'Day 0', 'Day 1', 'Day 2', 'Day 0 hit', 'Day 1 hit', 'Day 2 hit']) {
    const y = name === 'Day tray' ? DAY.y : DAY.y + DAY.pad;
    k(fade(name, [[0, 0], [84, 0], [98, 1], [T(2), 1], [T(12), 0, 'cubic-in'], [F.end, 0]]));
    k(track(name, 'y', [[84, y + 14], [102, y], [T(2), y], [T(12), y - 12, 'cubic-in']]));
  }

  // Cities, west to east. All three of the map's days arrive together, and rules hide the two not shown.
  const westToEast = [...cityNames].sort((a, b) => PLACES[a][0] - PLACES[b][0]);
  for (const name of cityNames) {
    const order = westToEast.indexOf(name);
    const [, y, side] = PLACES[name];
    const by = y + SIDE[side][1];
    const ty = by + 4;
    const gone = T(2) + order; // they leave for the outlook
    k(fade(`${name} dot`, [[0, 0], [24 + 2 * order, 0], [36 + 2 * order, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    // The icon drops in with a small bounce, the number rises into its chip.
    const s = 66 + 4 * order;
    k(fade(name, [[0, 0], [s + 4, 0], [s + 12, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
    for (const part of ['a', 'b', 'c']) {
      k(track(`${name} icon ${part}`, 'y', [[s, by - 18], [s + 14, by, 'back-out']]));
      k(fade(`${name} icon ${part}`, [[0, 0], [s, 0], [s + 8, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
      k(fade(`${name} chip ${part}`, [[0, 0], [s + 3, 0], [s + 11, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
      k(fade(`${name} temp ${part}`, [[0, 0], [s + 3, 0], [s + 11, 1], [gone, 1], [gone + 12, 0, 'cubic-in']]));
      k(track(`${name} temp ${part}`, 'y', [[s + 3, ty + 12], [s + 13, ty]]));
    }
  }

  // Outlook: the city marker lands, the Now panel wipes on, the cards follow 80 ms apart.
  k(fade('Focus ring', [[0, 0], [T(45), 0], [T(57), 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  k(fade('Focus dot', [[0, 0], [T(41), 0], [T(51), 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]));
  const slideIn = (layerName, x, at, distance = 60) => [
    fade(layerName, [[0, 0], [at, 0], [at + 14, 1], [F.outlook, 1], [F.end, 0, 'cubic-in']]),
    track(layerName, 'x', [[at, x + distance], [at + 18, x]]),
  ];
  k(...slideIn('Now panel', 760, T(31)));
  k(...slideIn('Now icon', 796, T(35)));
  k(...slideIn('Now temp', 966, T(37)));
  k(...slideIn('Now label', 1232, T(39)));
  k(...slideIn('Now sky', 1232, T(40)));
  k(...slideIn('Now info', 1232, T(41)));
  for (const j of [0, 1, 2, 3, 4]) {
    const at = T(43) + 4 * j;
    const x = CARD(j);
    for (const [suffix, dx] of [['', 0], [' strip', 14], [' day', 0], [' date', 0], [' icon', 46], [' high', 0], [' low', 0], [' drop', 54], [' rain', 78], [' track', 28], [' bar', 28]])
      k(...slideIn(`Card ${j}${suffix}`, x + dx, at, 90));
  }

  const shaderSetup = [
    ...Object.values(sky).map((item) => ({ type: 'update_data_field', fieldId: item.id, exposeToOgraf: false })),
    ...KINDS.map((param) => ({
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
            inputs: { cities: field('cities').id, featured: field('featured').id, tour: field('tour').id },
            outputs: {
              // A tour writes `featured` itself, the same as an operator's pick.
              featured: field('featured').id,
              ui: field('ui').id,
              ...Object.fromEntries(
                KINDS.map((param) => [param, sky[param].id]),
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

  // A new outlook city moves the camera: the map glides to the city in one move, at the close-up's
  // zoom, taking longer for longer trips. Rules do it inside the graphic, so any controller that
  // changes `featured`, and the Weather function's tour, gets the same move.
  //
  // A rule's move starts again, from a standstill, whenever anything else in the graphic changes
  // while it runs: another rule firing, or new data. So nothing else happens while the camera moves.
  // First the outlook's rain, snow or fog clears and its numbers and marker go down; the camera
  // waits for that (CLEAR), then sets off. They all come back when the Weather function counts the
  // landing (`ui.landed`), with the new city's weather and numbers already in place. A zoom out and
  // back in on long trips would take two moves in a row, and the second would stop the first.
  //
  // A move's length depends on where the camera leaves from too, so there is a rule for every pair of
  // cities: the function tells the rules which city the camera is on (`ui.shown`), and keeps it on the
  // old one until the landing. The close-up's bound position is that city's, for before any move. Layers
  // that rules move have no update transition: an update fades such a layer out before the new data
  // even arrives.
  const featured = field('featured').id;
  const uiField = field('ui').id;
  const view = field('view').id;
  // Frames the camera waits for the weather to clear. Keep in step with CLEAR_MS in weather-logic.js.
  const CLEAR = 16;
  // Frames at 50 a second. Keep in step with flightFrames in weather-logic.js.
  const flightFrames = (from, to) => {
    const [ax, ay] = PLACES[from];
    const [bx, by] = PLACES[to];
    return from === to ? 40 : Math.round(26 + 1.8 * Math.sqrt(Math.hypot(bx - ax, by - ay)));
  };
  const rule = (id, name, fields) => ({ id, name, enabled: true, trigger: 'data', ...fields });
  const onChange = (extra = []) => ({
    fieldId: featured,
    sourcePath: [],
    operator: 'changed',
    ...(extra.length ? { conditions: extra, match: 'all' } : {}),
  });
  // The close-up's picture must reach past every edge of the frame for every city. A glide between two
  // cities keeps the zoom, so its frames stay inside the two ends.
  if (CLOSE_UP.scale !== ZOOM) throw new Error('weather-closeup.webp is drawn for another zoom: run weather-closeup.mjs.');
  for (const [name, [x, y]] of Object.entries(PLACES)) {
    const left = x - FOCUS.x / ZOOM;
    const right = x + (1920 - FOCUS.x) / ZOOM;
    const top = y - FOCUS.y / ZOOM;
    const bottom = y + (1080 - FOCUS.y) / ZOOM;
    const mapRight = MAP.x + MAP.w; // nothing is drawn past the map's own edge
    if (left < CLOSE_UP.x || top < CLOSE_UP.y || bottom > CLOSE_UP.y + CLOSE_UP.h || Math.min(right, mapRight) > CLOSE_UP.x + CLOSE_UP.w)
      throw new Error(`The close-up doesn't cover ${name}: widen CLOSE_UP in weather-map.mjs.`);
  }
  const glide = (name, frames) => {
    const [x, y] = PLACES[name];
    return [
      ['layer.x', FOCUS.x - ZOOM * (x - CLOSE_UP.x)],
      ['layer.y', FOCUS.y - ZOOM * (y - CLOSE_UP.y)],
    ].map(([targetProperty, value]) => ({ type: 'property', targetProperty, value: Math.round(value), transitionFrames: frames }));
  };
  const props = (frames, values) =>
    Object.entries(values).map(([targetProperty, value]) => ({ type: 'property', targetProperty, value, transitionFrames: frames }));
  const cityMoves = cityNames.flatMap((to) =>
    cityNames.map((from) =>
      rule(`fly-${from.toLowerCase()}-${to.toLowerCase()}`, `${from} to ${to}`, {
        ...onChange([
          { fieldId: featured, sourcePath: [], operator: 'equals', value: to },
          { fieldId: uiField, sourcePath: ['shown'], operator: 'equals', value: from },
        ]),
        delayFrames: CLEAR,
        actions: glide(to, flightFrames(from, to)),
      }),
    ),
  );
  // The outlook's numbers dip and come back up on the new city, rippling from left to right. Every
  // rule that fires redraws the whole graphic once, so the ripple comes from each column taking a
  // little longer, not from a rule per column.
  const layerId = (name) => composition.layers.find((layer) => layer.name === name).id;
  const DIP = 16; // how far the numbers drop
  const columns = [
    ['Title outlook'],
    ['Now icon', 'Now temp', 'Now sky', 'Now info'],
    ...[0, 1, 2, 3, 4].map((j) => ['strip', 'icon', 'high', 'low', 'drop', 'rain', 'bar'].map((part) => `Card ${j} ${part}`)),
  ];
  const each = (frames, values) =>
    columns.flatMap((names, k) =>
      names.flatMap((name) => props(frames(k), values).map((action) => ({ ...action, targetLayerId: layerId(name) }))),
    );
  const marker = (frames, dot, ring) => [
    ...props(frames, dot).map((action) => ({ ...action, targetLayerId: layerId('Focus dot') })),
    ...props(frames + 6, ring).map((action) => ({ ...action, targetLayerId: layerId('Focus ring') })),
  ];
  // The map's days. `view` names what shows: the opening, a day, or the outlook. A day out of view
  // waits above its place if it's earlier than the one shown and below if it's later, so a later day
  // rolls up into place and an earlier one rolls down. Each city takes a little longer than the one
  // to its west, so the change ripples across the map.
  const ROLL = 14;
  const rank = { open: 0, today: 0, tomorrow: 1, after: 2, outlook: 3 };
  const views = (test) => Object.keys(rank).filter((name) => test(rank[name]));
  const each2 = (names, frames, values) =>
    names.flatMap((name) => props(frames, values).map((action) => ({ ...action, targetLayerId: layerId(name) })));
  const dayAway = (d, dir) => {
    const part = 'abc'[d];
    const [, , title, sub] = MAP_DAYS[d];
    return [
      ...westToEast.flatMap((name, order) => [
        ...each2([`${name} icon ${part}`, `${name} chip ${part}`], 10 + order, { 'layer.opacity': 0 }),
        ...each2([`${name} temp ${part}`], 10 + order, { 'layer.opacity': 0, 'layer.offsetY': dir * ROLL }),
      ]),
      ...each2([title, sub], 10, { 'layer.opacity': 0, 'layer.offsetY': dir * 12 }),
    ];
  };
  const dayRules = MAP_DAYS.flatMap(([, label], d) =>
    [
      ['above', -1, views((r) => r > d)],
      ['below', 1, views((r) => r < d)],
    ]
      .filter(([, , list]) => list.length)
      .map(([where, dir, list]) =>
        rule(`day-${d}-${where}`, `${label} waits ${where}`, {
          fieldId: view,
          sourcePath: [],
          operator: 'one-of',
          value: list,
          actions: dayAway(d, dir),
        }),
      ),
  );
  const isView = (value) => ({ fieldId: view, sourcePath: [], operator: Array.isArray(value) ? 'one-of' : 'equals', value });
  // The pill slides under the day shown, whose label turns dark on it. The rain, snow and fog round
  // the cities cross-fade to the new day's.
  const pickedRules = [
    rule('pill-1', 'Pill on tomorrow', { ...isView('tomorrow'), actions: each2(['Day pill'], 14, { 'layer.offsetX': DAY.w }) }),
    rule('pill-2', 'Pill on the day after', { ...isView('after'), actions: each2(['Day pill'], 14, { 'layer.offsetX': 2 * DAY.w }) }),
    ...MAP_DAYS.map(([value, label], d) =>
      rule(`label-${d}`, `${label} label on the pill`, {
        ...isView(d === 0 ? ['open', 'today'] : value),
        actions: each2([`Day ${d}`], 10, { color: INK }),
      }),
    ),
    rule('sky-1', 'Tomorrow\'s weather', {
      ...isView('tomorrow'),
      actions: each2(['Sky'], 20, { 'fill.parameters.w_today': 0, 'fill.parameters.w_next': 1 }),
    }),
    rule('sky-2', 'The day after\'s weather', {
      ...isView('after'),
      actions: each2(['Sky'], 20, { 'fill.parameters.w_today': 0, 'fill.parameters.w_after': 1 }),
    }),
  ];
  // The steps say which day to show, and so do the buttons, but only while the map is up.
  const stepId = (name) => composition.keyframes.find((keyframe) => keyframe.name === name).id;
  const setView = (value) => ({ type: 'set-data', fieldId: view, mode: 'set', value });
  const stepRules = [
    rule('view-open', 'Start at the opening', { trigger: 'play', actions: [setView('open')] }),
    ...[...MAP_DAYS, ['outlook', 'Outlook']].map(([value, label]) =>
      rule(`step-${value}`, `${label} step`, { trigger: 'step', eventId: stepId(label), actions: [setView(value)] }),
    ),
  ];
  const tapRules = MAP_DAYS.map(([value, label], d) => ({
    type: 'set_layer_visual_rules',
    layerName: `Day ${d} hit`,
    rules: [
      rule(`tap-${d}`, `Show ${label.toLowerCase()}`, {
        trigger: 'click',
        conditions: [isView(MAP_DAYS.map(([name]) => name))],
        actions: [setView(value)],
      }),
    ],
  }));
  const ruleTargets = (rules) => rules.flatMap((item) => item.actions.map((action) => action.targetLayerId).filter(Boolean));
  const outlookRules = [
    rule('leave', 'Leave for a new city', {
      ...onChange([isView('outlook')]),
      actions: [
        ...each((k) => 6 + k, { 'layer.opacity': 0, 'layer.offsetY': DIP }),
        ...marker(8, { 'layer.opacity': 0 }, { 'layer.opacity': 0, 'layer.scale': 1.8 }),
        ...each2(['Sky'], 14, { 'layer.opacity': 0 }),
      ],
    }),
    rule('land', 'Land on the new city', {
      fieldId: uiField,
      sourcePath: ['landed'],
      operator: 'changed',
      actions: [
        ...each((k) => 14 + 4 * k, { 'layer.opacity': 1, 'layer.offsetY': 0 }),
        ...marker(10, { 'layer.opacity': 1 }, { 'layer.opacity': 1, 'layer.scale': 1 }),
        ...each2(['Sky'], 24, { 'layer.opacity': 1 }),
      ],
    }),
  ];
  // Layers that rules change have no update transition: an update fades such a layer out before the
  // new data even arrives.
  const moved = [
    ...new Set([
      'Map close-up',
      ...ruleTargets([...outlookRules, ...dayRules, ...pickedRules]).map((id) => composition.layers.find((layer) => layer.id === id).name),
    ]),
  ];
  await apply(
    [
      ...moved.map((layerName) => ({
        type: 'set_layer_layout',
        layerName,
        updateTransition: { style: 'none', durationFrames: 0, distance: 0 },
      })),
      { type: 'set_layer_visual_rules', layerName: 'Map close-up', rules: cityMoves },
      { type: 'set_layer_visual_rules', layerName: 'Now panel', rules: outlookRules },
      { type: 'set_layer_visual_rules', layerName: 'Day tray', rules: [...stepRules, ...dayRules, ...pickedRules] },
      ...tapRules,
    ],
    'The camera, and the map\'s days',
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
    .replace('const float stage = 0.0;', 'const float stage = 1.0;')
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
      image('Icon', [X + 24, Y + 24, 112, 112], iconsFor()[look.ui.icon]),
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
      bind('Icon', [{ fieldKey: 'ui', targetProperty: 'src', sourcePath: ['icon'], valueMap: iconsFor() }]),
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
