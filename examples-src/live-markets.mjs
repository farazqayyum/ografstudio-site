/**
 * The Live markets example: a markets dashboard that plays live prices from a public feed.
 *
 * The layers are placed here. `live-markets-logic.js` decides what they show and
 * `live-markets-crosshair.js` follows the pointer over the chart. Whoever plays the graphic only
 * sends data; on this site that is src/components/OGrafExample/marketFeed.ts.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const here = new URL('.', import.meta.url);
const read = (file) => readFileSync(new URL(file, here), 'utf8');
// A function's source is one expression, so no closing semicolon.
const source = (file) => read(file).trim().replace(/;$/, '');

const UI = 'Inter, Arial, sans-serif';
const MONO = 'JetBrains Mono, Consolas, monospace';
const UP = '#2ee6a6';
const INK = '#eef2ff';
const SOFT = '#8f9abb';
const ACCENT = '#5b6cff';
const LINE = '#ffffff1c';
const TILE = '#ffffff09';
const CLEAR = '#ffffff00';

// Keep these in step with the same names in the two functions.
const PLOT = { x: 546, y: 330, w: 830, h: 430 };
const ROW = { y: 164, pitch: 100, h: 96 };
const TAPE = { y: 446, pitch: 58, h: 52 };
const RANGES = ['1H', '24H', '7D'];
const RANGE_X = 1226;
const VIEW_X = 1010;

const add = (kind, name, box, element) => ({
  type: 'add_layer',
  kind,
  name,
  transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
  element,
});
const rect = (name, box, fill, radius = 0, stroke = null) =>
  add('rectangle', name, box, {
    fill,
    borderRadius: radius,
    ...(stroke ? { strokeColor: stroke, strokeWidth: 1.5 } : { strokeWidth: 0 }),
  });
const dot = (name, box, fill) => add('ellipse', name, box, { fill, strokeWidth: 0 });
const text = (name, box, content, style = {}) =>
  add('text', name, box, {
    content,
    fontFamily: style.mono ? MONO : UI,
    fontSize: style.size ?? 24,
    minFontSize: style.size ?? 24,
    fontWeight: style.weight ?? 500,
    color: style.color ?? INK,
    textAlign: style.align ?? 'left',
    verticalAlign: 'middle',
    // These change several times a second, so nothing measures them to fit.
    autoFit: 'fixed',
    overflowPolicy: 'clip',
    letterSpacing: style.ls ?? 0,
  });
const label = (name, box, content, align = 'left') =>
  text(name, box, content, { size: 20, weight: 600, color: SOFT, ls: 1.6, align });

const glass = {
  type: 'linear',
  angle: 180,
  stops: [
    { offset: 0, color: '#ffffff', opacity: 0.075 },
    { offset: 1, color: '#ffffff', opacity: 0.028 },
  ],
};

const backdrop = (() => {
  const glow = (id, colour, opacity) =>
    `<radialGradient id='${id}'><stop stop-color='${colour}' stop-opacity='${opacity}'/><stop offset='1' stop-color='${colour}' stop-opacity='0'/></radialGradient>`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'><defs>${glow('a', '#3b4bd8', 0.42)}${glow('b', '#0fb5a6', 0.22)}${glow('c', '#8a4bd8', 0.2)}</defs>` +
    `<rect width='1920' height='1080' fill='#060914'/>` +
    `<ellipse cx='260' cy='20' rx='980' ry='640' fill='url(#a)'/>` +
    `<ellipse cx='1780' cy='1080' rx='980' ry='680' fill='url(#b)'/>` +
    `<ellipse cx='1620' cy='60' rx='640' ry='380' fill='url(#c)'/></svg>`;
  return `data:image/svg+xml,${svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}`;
})();

/** Plays the function once on the saved prices. Studio's canvas doesn't run functions, so that is what it shows. */
function firstLook(data) {
  const logic = runInNewContext(`(\n${source('live-markets-logic.js')}\n)`);
  const crosshair = runInNewContext(`(\n${source('live-markets-crosshair.js')}\n)`);
  const main = logic({ state: {}, data, event: { type: 'load' }, nowMs: 0 });
  const cross = crosshair({ data: { hover: false }, pointer: null, nowMs: 0 });
  return JSON.parse(JSON.stringify({ ...main.data, cross: cross.data.cross }));
}

const fieldTypeOf = (key, value) =>
  typeof value === 'number' ? 'number' : /_c$/.test(key) ? 'color' : 'text';

export async function liveMarkets({ apply, scene, addField, bind, rule, option }) {
  const snapshot = JSON.parse(read('live-markets-snapshot.json'));
  const inputs = {
    markets: snapshot.markets,
    history: JSON.stringify(snapshot.history),
    trades: snapshot.trades,
    fx: snapshot.fx,
    as_of: snapshot.trades[0]?.time ?? '',
    feed_status: '',
    selected: 0,
    range: '24H',
    view: 'area',
    tour: true,
    hover: false,
  };
  const look = firstLook(inputs);
  const INTERNAL = { exposeToOgraf: false };
  const prop = (key, fieldType, extra = {}) => ({ key, fieldType, ...extra });
  const objectItems = (properties) => ({ items: { key: 'item', fieldType: 'object', properties } });
  const objectOf = (values) => ({
    properties: Object.entries(values).map(([key, value]) => prop(key, fieldTypeOf(key, value))),
  });

  const first = await scene();
  const [inTransition, outTransition] = first.composition.transitions;
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

  await apply(
    [
      { type: 'set_composition', updateTransitionFrames: 0, backgroundColor: '#060914', frameRate: 50 },
      { type: 'set_transition', transitionId: inTransition.id, durationFrames: 30 },
      { type: 'set_transition', transitionId: outTransition.id, durationFrames: 14 },
      fontAsset('Inter', 'Inter', '100 900', 'inter', 'https://github.com/rsms/inter/blob/master/LICENSE.txt'),
      fontAsset('JetBrains Mono', 'JetBrains Mono', '100 800', 'jetbrains-mono', 'https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt'),

      // What a controller sends.
      addField('array', 'markets', 'Markets', 'Up to eight, in watchlist order. Prices in USD, open, high and low over 24 hours.', inputs.markets, {
        ...objectItems([
          prop('id', 'text'),
          prop('name', 'text'),
          prop('price', 'number'),
          prop('open', 'number'),
          prop('high', 'number'),
          prop('low', 'number'),
          prop('volume', 'number'),
          prop('bid', 'number'),
          prop('ask', 'number'),
        ]),
        constraints: { maxItems: 8 },
      }),
      addField('textarea', 'history', 'Candles', 'JSON. For each market ID and range: step in seconds s, last candle time t, and rows r of open, high, low, close, volume.', inputs.history),
      addField('array', 'trades', 'Trades', 'The latest trades, newest first.', inputs.trades, {
        ...objectItems([
          prop('id', 'text'),
          prop('sym', 'text'),
          prop('price', 'number'),
          prop('size', 'number'),
          prop('side', 'text'),
          prop('time', 'text'),
        ]),
      }),
      addField('array', 'fx', 'Exchange rates', 'Shown in the crawl.', inputs.fx, {
        ...objectItems([prop('pair', 'text'), prop('rate', 'number')]),
      }),
      addField('text', 'as_of', 'Last trade time', 'ISO time of the latest trade.', inputs.as_of),
      addField('text', 'feed_status', 'Feed status', 'live, connecting or reconnecting. Empty means the saved sample.', ''),

      // What someone on the graphic changes, and an operator can too.
      addField('integer', 'selected', 'Market', 'Row of the watchlist on the big chart, from 0.', 0),
      addField('select', 'range', 'Range', 'How far back the big chart looks.', '24H', {
        options: RANGES.map((value) => option(value, value)),
      }),
      addField('select', 'view', 'Chart', 'How the big chart draws prices.', 'area', {
        options: [option('area', 'Area'), option('candles', 'Candles')],
      }),
      addField('boolean', 'tour', 'Auto tour', 'Move to the next market by itself. Picking a market turns this off.', true),

      // Written by the functions; layers read them.
      addField('boolean', 'hover', 'Pointer on chart', 'Set by the chart layer rules.', false, INTERNAL),
      addField('object', 'ui', 'Display', 'Written by the Markets function.', look.ui, { ...INTERNAL, ...objectOf(look.ui) }),
      addField('array', 'tape', 'Tape', 'Written by the Markets function.', look.tape, {
        ...INTERNAL,
        ...objectItems([
          prop('id', 'text'),
          prop('slot', 'integer'),
          prop('sym', 'text'),
          prop('price', 'text'),
          prop('value', 'text'),
          prop('colour', 'color'),
        ]),
      }),
      addField('object', 'series', 'Chart series', 'Written by the Markets function, read by the Crosshair function.', look.series, {
        ...INTERNAL,
        properties: [
          prop('n', 'integer'),
          prop('closes', 'array', { items: { key: 'item', fieldType: 'number' }, constraints: { maxItems: 100 } }),
          prop('first', 'number'),
          prop('last', 'number'),
          prop('step', 'number'),
          prop('range', 'text'),
          prop('top', 'number'),
          prop('bottom', 'number'),
          prop('inner', 'number'),
          prop('centred', 'boolean'),
        ],
      }),
      addField('array', 'crawl', 'Crawl', 'Written by the Markets function.', look.crawl, INTERNAL),
      addField('object', 'cross', 'Crosshair', 'Written by the Crosshair function.', look.cross, { ...INTERNAL, ...objectOf(look.cross) }),

      { type: 'add_custom_action', actionId: 'market.prev', name: 'Previous market', description: 'Put the previous market on the big chart.' },
      { type: 'add_custom_action', actionId: 'market.next', name: 'Next market', description: 'Put the next market on the big chart.' },
      { type: 'add_custom_action', actionId: 'range.next', name: 'Change range', description: 'Step through 1H, 24H and 7D.' },
      { type: 'add_custom_action', actionId: 'view.toggle', name: 'Area or candles', description: 'Switch how the big chart draws prices.' },
      { type: 'add_custom_action', actionId: 'market.tour', name: 'Auto tour', description: 'Start or stop moving through the markets by itself.' },
    ],
    'Fonts, fields and actions',
  );

  // Region by region, bottom to top. Each list also sets when its layers arrive.
  const header = [
    rect('Header line', [32, 92, 1856, 1.5], '#ffffff12'),
    dot('Live pulse', [33, 42, 30, 30], '#2ee6a61f'),
    dot('Live dot', [41, 50, 14, 14], UP),
    text('Wordmark', [74, 30, 280, 56], 'LIVE MARKETS', { size: 32, weight: 800, ls: 3 }),
    rect('Status plate', [362, 40, 178, 36], '#ffffff0f', 18),
    text('Status', [362, 40, 178, 36], 'LIVE', { size: 20, weight: 700, ls: 1.4, align: 'center', color: UP }),
    text('As of', [556, 30, 460, 56], '', { size: 22, color: SOFT, mono: true }),
    rect('Tour plate', [1284, 34, 228, 48], TILE, 24, LINE),
    dot('Tour dot', [1304, 51, 14, 14], UP),
    text('Tour', [1326, 34, 180, 48], 'AUTO TOUR ON', { size: 20, weight: 700, ls: 1 }),
    rect('Tour hit', [1284, 34, 228, 48], CLEAR, 24),
    add('clock', 'UTC clock', [1530, 26, 358, 62], {
      fontFamily: MONO,
      fontSize: 42,
      fontWeight: 500,
      color: INK,
      textAlign: 'right',
      verticalAlign: 'middle',
      clock: { mode: 'clock', source: 'automatic', format: 'hh:mm:ss', hourCycle: '24', timeZone: 'UTC', suffix: ' UTC' },
    }),
  ];

  const left = [
    rect('Watchlist panel', [32, 104, 470, 880], glass, 24, LINE),
    label('Watchlist title', [56, 120, 240, 34], 'WATCHLIST'),
    label('Watchlist hint', [300, 120, 180, 34], '24H', 'right'),
    rect('Marker', [42, ROW.y, 450, ROW.h], '#5b6cff26', 16, '#7c8cff66'),
    rect('Marker bar', [42, ROW.y + 18, 5, 60], '#8c9aff', 3),
  ];
  const rowNames = [];
  for (let i = 0; i < 8; i++) {
    const y = ROW.y + ROW.pitch * i;
    const m = `r${i}`;
    left.push(
      text(`${m} symbol`, [62, y + 10, 118, 44], look.ui[`${m}_sym`], { size: 30, weight: 700 }),
      text(`${m} name`, [62, y + 52, 136, 32], look.ui[`${m}_name`], { size: 21, color: SOFT }),
      add('image', `${m} spark`, [190, y + 22, 120, 52], { src: look.ui[`${m}_spark`], fit: 'fill' }),
      text(`${m} price`, [314, y + 10, 166, 44], look.ui[`${m}_price`], { size: 27, mono: true, weight: 500, align: 'right' }),
      text(`${m} change`, [314, y + 52, 166, 32], look.ui[`${m}_chg`], { size: 22, mono: true, align: 'right', color: UP }),
    );
    rowNames.push(`${m} hit`);
  }
  for (let i = 0; i < 8; i++) left.push(rect(`r${i} hit`, [42, ROW.y + ROW.pitch * i, 450, ROW.h], CLEAR, 16));

  const centre = [
    rect('Main panel', [518, 104, 960, 880], glass, 24, LINE),
    text('Name', [546, 116, 450, 58], look.ui.name, { size: 44, weight: 700 }),
    text('Pair', [546, 170, 450, 32], look.ui.pair, { size: 23, color: SOFT, weight: 500, ls: 1 }),

    rect('View track', [VIEW_X, 126, 204, 48], TILE, 14, LINE),
    rect('View pill', [VIEW_X + 4, 130, 94, 40], ACCENT, 11),
    text('View area', [VIEW_X, 126, 102, 48], 'Area', { size: 21, weight: 600, align: 'center' }),
    text('View candles', [VIEW_X + 102, 126, 102, 48], 'Candles', { size: 21, weight: 600, align: 'center' }),
    rect('View area hit', [VIEW_X, 126, 102, 48], CLEAR, 14),
    rect('View candles hit', [VIEW_X + 102, 126, 102, 48], CLEAR, 14),

    rect('Range track', [RANGE_X, 126, 228, 48], TILE, 14, LINE),
    rect('Range pill', [RANGE_X + 4, 130, 68, 40], ACCENT, 11),
    ...RANGES.map((name, i) => text(`Range ${name}`, [RANGE_X + i * 76, 126, 76, 48], name, { size: 21, weight: 600, align: 'center' })),
    ...RANGES.map((name, i) => rect(`Range ${name} hit`, [RANGE_X + i * 76, 126, 76, 48], CLEAR, 14)),

    text('Price', [546, 204, 660, 116], look.ui.price, { size: 100, mono: true, weight: 500, ls: -3 }),
    rect('Change chip', [1224, 212, 230, 98], look.ui.chip_c, 18),
    text('Change', [1224, 218, 230, 52], look.ui.chg, { size: 38, mono: true, weight: 600, align: 'center', color: UP }),
    text('Change amount', [1224, 266, 230, 36], look.ui.chg_abs, { size: 23, mono: true, align: 'center', color: UP }),

    add('image', 'Chart', [PLOT.x, PLOT.y, PLOT.w, PLOT.h], { src: look.ui.chart, fit: 'fill' }),
    ...Array.from({ length: 7 }, (_, i) =>
      text(`Y${i}`, [1384, look.ui[`y${i}_y`], 88, 28], look.ui[`y${i}`], { size: 20, mono: true, color: SOFT }),
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      text(`X${i}`, [PLOT.x + (i * PLOT.w) / 5, 764, PLOT.w / 5, 30], look.ui[`x${i}`], { size: 20, mono: true, color: SOFT, align: 'center' }),
    ),
    dot('Last pulse', [PLOT.x, PLOT.y, 40, 40], '#ffffff40'),
    dot('Last dot', [PLOT.x, PLOT.y, 16, 16], UP),
    rect('Tag plate', [1374, PLOT.y, 96, 32], UP, 7),
    text('Tag', [1374, PLOT.y, 96, 32], look.ui.tag, { size: 19, mono: true, weight: 700, align: 'center', color: '#04120e' }),

    rect('Open tile', [546, 804, 222, 88], TILE, 14),
    rect('High tile', [778, 804, 222, 88], TILE, 14),
    rect('Low tile', [1010, 804, 222, 88], TILE, 14),
    rect('Volume tile', [1242, 804, 222, 88], TILE, 14),
    label('Open label', [564, 812, 190, 30], 'OPEN'),
    label('High label', [796, 812, 190, 30], '24H HIGH'),
    label('Low label', [1028, 812, 190, 30], '24H LOW'),
    label('Volume label', [1260, 812, 190, 30], '24H VOLUME'),
    text('Open', [564, 842, 196, 42], look.ui.open, { size: 29, mono: true }),
    text('High', [796, 842, 196, 42], look.ui.high, { size: 29, mono: true }),
    text('Low', [1028, 842, 196, 42], look.ui.low, { size: 29, mono: true }),
    text('Volume', [1260, 842, 196, 42], look.ui.volume, { size: 29, mono: true }),

    label('Meter title', [776, 904, 458, 30], '24H RANGE', 'center'),
    text('Meter low', [546, 904, 220, 30], look.ui.low, { size: 22, mono: true, color: SOFT }),
    text('Meter high', [1244, 904, 220, 30], look.ui.high, { size: 22, mono: true, color: SOFT, align: 'right' }),
    rect('Meter track', [546, 946, 918, 10], '#ffffff14', 5),
    rect('Meter fill', [546, 946, 460, 10], { type: 'linear', angle: 90, stops: [{ offset: 0, color: ACCENT, opacity: 0.35 }, { offset: 1, color: '#8c9aff', opacity: 1 }] }, 5),
    dot('Meter knob', [996, 941, 20, 20], '#ffffff'),
  ];

  // The crosshair sits over the chart but under the layer that catches the pointer.
  const crosshair = [
    rect('Cross line', [PLOT.x, PLOT.y, 2, PLOT.h], '#ffffff59'),
    add('ellipse', 'Cross dot', [PLOT.x, PLOT.y, 14, 14], { fill: '#ffffff', strokeColor: '#060914', strokeWidth: 3 }),
    rect('Tip plate', [PLOT.x, PLOT.y, 256, 82], '#0d1324f2', 12, '#ffffff33'),
    text('Tip price', [PLOT.x, PLOT.y, 256, 42], '', { size: 28, mono: true, weight: 600, align: 'center', color: UP }),
    text('Tip info', [PLOT.x, PLOT.y, 256, 30], '', { size: 19, mono: true, align: 'center', color: SOFT }),
    rect('Chart hit', [PLOT.x, PLOT.y, PLOT.w, PLOT.h], CLEAR),
  ];

  const right = [
    rect('Side panel', [1494, 104, 394, 880], glass, 24, LINE),
    label('Breadth title', [1518, 120, 346, 34], 'MARKET BREADTH'),
    text('Breadth', [1518, 152, 346, 36], look.ui.breadth, { size: 24, weight: 600 }),
    rect('Breadth falling', [1518, 194, 346, 12], '#ff5c7a', 6),
    rect('Breadth rising', [1518, 194, 173, 12], UP, 6),
    rect('Best tile', [1518, 222, 168, 92], TILE, 14),
    rect('Worst tile', [1696, 222, 168, 92], TILE, 14),
    label('Best label', [1530, 228, 150, 26], 'BEST'),
    label('Worst label', [1708, 228, 150, 26], 'WORST'),
    text('Best', [1530, 254, 66, 52], look.ui.best_sym, { size: 22, weight: 700 }),
    text('Best change', [1590, 254, 90, 52], look.ui.best_chg, { size: 19, mono: true, align: 'right', color: UP }),
    text('Worst', [1708, 254, 66, 52], look.ui.worst_sym, { size: 22, weight: 700 }),
    text('Worst change', [1768, 254, 90, 52], look.ui.worst_chg, { size: 19, mono: true, align: 'right', color: UP }),
    label('Bid label', [1518, 322, 150, 28], 'BID'),
    label('Ask label', [1650, 322, 130, 28], 'ASK'),
    label('Spread label', [1764, 322, 100, 28], 'SPREAD', 'right'),
    text('Bid', [1518, 350, 132, 40], look.ui.bid, { size: 22, mono: true, color: UP }),
    text('Ask', [1650, 350, 132, 40], look.ui.ask, { size: 22, mono: true, color: '#ff5c7a' }),
    text('Spread', [1764, 350, 100, 40], look.ui.spread, { size: 20, mono: true, color: SOFT, align: 'right' }),
    rect('Side line', [1518, 402, 346, 1.5], '#ffffff12'),
    label('Tape title', [1518, 410, 346, 32], 'LIVE TRADES'),
  ];
  const TAPE_ROW = ['Tape bar', 'Tape symbol', 'Tape price', 'Tape value'];
  const tapeLayers = [
    rect('Tape bar', [1518, TAPE.y + 10, 4, 32], UP, 2),
    text('Tape symbol', [1532, TAPE.y, 84, TAPE.h], 'BTC', { size: 24, weight: 700 }),
    text('Tape price', [1610, TAPE.y, 156, TAPE.h], '0', { size: 23, mono: true, align: 'right' }),
    text('Tape value', [1770, TAPE.y, 94, TAPE.h], '$0', { size: 21, mono: true, align: 'right', color: UP }),
  ];

  const crawl = [
    rect('Crawl plate', [32, 1000, 1856, 52], '#ffffff0a', 14, '#ffffff12'),
    add('ticker', 'Crawl', [44, 1002, 1832, 48], {
      speedPixelsPerSecond: 70,
      gap: 90,
      entryFade: 90,
      exitFade: 90,
      fadeSoftness: 0.6,
      updatePolicy: 'next-appearance',
      items: look.crawl,
    }),
  ];

  await apply(
    [
      add('image', 'Backdrop', [0, 0, 1920, 1080], { src: backdrop, fit: 'fill' }),
      ...crawl,
      ...left,
      ...centre,
      ...crosshair,
      ...right,
      ...tapeLayers,
      ...header,
    ],
    'Layers',
  );

  const { composition, field } = await scene();
  const ui = (layerName, map) =>
    bind(
      layerName,
      Object.entries(map).map(([targetProperty, key]) => ({ fieldKey: 'ui', targetProperty, sourcePath: [key] })),
    );
  const cross = (layerName, map) =>
    bind(
      layerName,
      Object.entries(map).map(([targetProperty, key]) => ({ fieldKey: 'cross', targetProperty, sourcePath: [key] })),
    );
  const hoverVeil = (id, value = '#ffffff12') =>
    rule(id, 'Hover', {
      trigger: 'hover',
      actions: [{ type: 'property', targetProperty: 'fill', value, transitionFrames: 5 }],
    });
  const click = (id, fieldKey, value, mode = 'set') =>
    rule(id, 'Click', {
      trigger: 'click',
      actions: [{ type: 'set-data', fieldId: field(fieldKey).id, mode, ...(mode === 'set' ? { value } : {}) }],
    });
  const key = (id, keyName, actions) => rule(id, `Key ${keyName}`, { trigger: 'key-down', keyboard: { key: keyName }, actions });
  const motion = (names, offsetFrames) =>
    names.flatMap((layerName) => [
      { type: 'set_layer_motion', layerName, side: 'in', spec: { style: 'fade', durationFrames: 16, offsetFrames, easing: 'cubic-out' } },
      { type: 'set_layer_motion', layerName, side: 'out', spec: { style: 'fade', durationFrames: 10, offsetFrames: 0, easing: 'cubic-in' } },
    ]);
  const namesOf = (operations) => operations.map((operation) => operation.name);

  await apply(
    [
      // The display reads everything from the function's one object.
      ui('Status', { content: 'status', color: 'status_c' }),
      ui('Live pulse', { fill: 'live_c' }),
      ui('Live dot', { fill: 'status_c' }),
      ui('As of', { content: 'as_of' }),
      ui('Tour', { content: 'tour' }),
      ui('Tour dot', { fill: 'tour_c' }),
      ui('Marker', { 'layer.y': 'marker_y' }),
      ui('Marker bar', { 'layer.y': 'marker_bar_y' }),
      ...Array.from({ length: 8 }, (_, i) => [
        ui(`r${i} symbol`, { content: `r${i}_sym` }),
        ui(`r${i} name`, { content: `r${i}_name` }),
        ui(`r${i} spark`, { src: `r${i}_spark` }),
        ui(`r${i} price`, { content: `r${i}_price`, color: `r${i}_price_c` }),
        ui(`r${i} change`, { content: `r${i}_chg`, color: `r${i}_chg_c` }),
      ]).flat(),
      ui('Name', { content: 'name' }),
      ui('Pair', { content: 'pair' }),
      ui('View pill', { 'layer.x': 'view_x' }),
      ui('Range pill', { 'layer.x': 'range_x' }),
      ui('Price', { content: 'price', color: 'price_c' }),
      ui('Change chip', { fill: 'chip_c' }),
      ui('Change', { content: 'chg', color: 'chg_c' }),
      ui('Change amount', { content: 'chg_abs', color: 'chg_c' }),
      ui('Chart', { src: 'chart' }),
      ...Array.from({ length: 7 }, (_, i) => ui(`Y${i}`, { content: `y${i}`, 'layer.y': `y${i}_y` })),
      ...Array.from({ length: 5 }, (_, i) => ui(`X${i}`, { content: `x${i}` })),
      ui('Last pulse', { 'layer.x': 'halo_x', 'layer.y': 'halo_y', fill: 'halo_c' }),
      ui('Last dot', { 'layer.x': 'dot_x', 'layer.y': 'dot_y', fill: 'dot_c', 'layer.opacity': 'dot_o' }),
      ui('Tag plate', { 'layer.y': 'tag_y', fill: 'tag_c' }),
      ui('Tag', { 'layer.y': 'tag_y', content: 'tag' }),
      ui('Open', { content: 'open' }),
      ui('High', { content: 'high' }),
      ui('Low', { content: 'low' }),
      ui('Volume', { content: 'volume' }),
      ui('Meter low', { content: 'low' }),
      ui('Meter high', { content: 'high' }),
      ui('Meter fill', { 'layer.width': 'meter_w' }),
      ui('Meter knob', { 'layer.x': 'meter_x' }),
      ui('Breadth', { content: 'breadth' }),
      ui('Breadth rising', { 'layer.width': 'breadth_w' }),
      ui('Best', { content: 'best_sym' }),
      ui('Best change', { content: 'best_chg', color: 'best_c' }),
      ui('Worst', { content: 'worst_sym' }),
      ui('Worst change', { content: 'worst_chg', color: 'worst_c' }),
      ui('Bid', { content: 'bid' }),
      ui('Ask', { content: 'ask' }),
      ui('Spread', { content: 'spread' }),
      bind('Crawl', [{ fieldKey: 'crawl', targetProperty: 'items' }]),

      cross('Cross line', { 'layer.x': 'x', 'layer.opacity': 'o' }),
      cross('Cross dot', { 'layer.x': 'dot_x', 'layer.y': 'dot_y', 'layer.opacity': 'o' }),
      cross('Tip plate', { 'layer.x': 'tip_x', 'layer.y': 'tip_y', 'layer.opacity': 'o' }),
      cross('Tip price', { 'layer.x': 'tip_x', 'layer.y': 'price_y', 'layer.opacity': 'o', content: 'price', color: 'price_c' }),
      cross('Tip info', { 'layer.x': 'tip_x', 'layer.y': 'info_y', 'layer.opacity': 'o', content: 'info' }),

      // One row of the trade tape. The collection repeats it nine times.
      bind('Tape bar', [{ fieldKey: 'tape', targetProperty: 'fill', sourcePath: ['colour'] }]),
      bind('Tape symbol', [{ fieldKey: 'tape', targetProperty: 'content', sourcePath: ['sym'] }]),
      bind('Tape price', [{ fieldKey: 'tape', targetProperty: 'content', sourcePath: ['price'] }]),
      bind('Tape value', [
        { fieldKey: 'tape', targetProperty: 'content', sourcePath: ['value'] },
        { fieldKey: 'tape', targetProperty: 'color', sourcePath: ['colour'] },
      ]),
      ...TAPE_ROW.map((layerName) => ({ type: 'set_layer_layout', layerName, groupId: 'tape-row' })),
      {
        type: 'create_runtime_collection',
        name: 'Trade rows',
        fieldKey: 'tape',
        layerNames: TAPE_ROW,
        offsetPerItem: { x: 0, y: TAPE.pitch },
        capacity: 9,
        overflow: 'truncate',
        itemKeyPath: ['id'],
        sortPath: ['slot'],
        sortDirection: 'ascending',
      },

      // What the pointer and the keyboard do.
      ...rowNames.map((layerName, i) => ({
        type: 'set_layer_visual_rules',
        layerName,
        rules: [
          hoverVeil(`row-${i}-hover`),
          rule(`row-${i}-click`, 'Click', {
            trigger: 'click',
            actions: [
              { type: 'set-data', fieldId: field('selected').id, mode: 'set', value: i },
              // Clicking the market already showing changes nothing else, but it still ends the tour.
              { type: 'set-data', fieldId: field('tour').id, mode: 'set', value: false },
            ],
          }),
        ],
      })),
      ...RANGES.map((name) => ({
        type: 'set_layer_visual_rules',
        layerName: `Range ${name} hit`,
        rules: [hoverVeil(`range-${name}-hover`), click(`range-${name}-click`, 'range', name)],
      })),
      ...[
        ['area', 'View area hit'],
        ['candles', 'View candles hit'],
      ].map(([value, layerName]) => ({
        type: 'set_layer_visual_rules',
        layerName,
        rules: [hoverVeil(`view-${value}-hover`), click(`view-${value}-click`, 'view', value)],
      })),
      {
        type: 'set_layer_visual_rules',
        layerName: 'Tour hit',
        rules: [hoverVeil('tour-hover'), click('tour-click', 'tour', undefined, 'toggle')],
      },
      {
        type: 'set_layer_visual_rules',
        layerName: 'Chart hit',
        rules: [
          rule('chart-enter', 'Pointer on', {
            trigger: 'pointer-enter',
            actions: [{ type: 'set-data', fieldId: field('hover').id, mode: 'set', value: true }],
          }),
          rule('chart-leave', 'Pointer off', {
            trigger: 'pointer-leave',
            actions: [{ type: 'set-data', fieldId: field('hover').id, mode: 'set', value: false }],
          }),
        ],
      },
      {
        type: 'set_layer_visual_rules',
        layerName: 'Wordmark',
        rules: [
          key('key-down', 'ArrowDown', [{ type: 'custom-action', actionId: 'market.next' }]),
          key('key-up', 'ArrowUp', [{ type: 'custom-action', actionId: 'market.prev' }]),
          key('key-1', '1', [{ type: 'set-data', fieldId: field('range').id, mode: 'set', value: '1H' }]),
          key('key-2', '2', [{ type: 'set-data', fieldId: field('range').id, mode: 'set', value: '24H' }]),
          key('key-3', '3', [{ type: 'set-data', fieldId: field('range').id, mode: 'set', value: '7D' }]),
          key('key-c', 'c', [{ type: 'custom-action', actionId: 'view.toggle' }]),
          key('key-t', 't', [{ type: 'custom-action', actionId: 'market.tour' }]),
        ],
      },

      // Arrivals, left to right.
      ...motion(['Backdrop', 'Crawl plate', 'Crawl', ...namesOf(header)], 0),
      ...motion(namesOf(left), 2),
      ...motion(namesOf(centre), 6),
      ...motion([...namesOf(right), ...TAPE_ROW], 10),

      {
        type: 'set_logic_functions',
        compositionId: composition.id,
        functions: [
          {
            type: 'javascript',
            version: 1,
            id: 'markets',
            name: 'Markets',
            enabled: true,
            source: source('live-markets-logic.js'),
            inputs: Object.fromEntries(
              ['markets', 'history', 'trades', 'fx', 'as_of', 'feed_status', 'selected', 'range', 'view', 'tour', 'hover'].map(
                (name) => [name, field(name).id],
              ),
            ),
            outputs: Object.fromEntries(
              ['ui', 'tape', 'series', 'crawl', 'selected', 'range', 'view', 'tour'].map((name) => [name, field(name).id]),
            ),
            actions: ['market.prev', 'market.next', 'range.next', 'view.toggle', 'market.tour'],
            initialState: {},
            // A wall-clock limit: a busy machine must not stop the graphic from loading.
            timeoutMs: 1000,
          },
          {
            type: 'javascript',
            version: 1,
            id: 'crosshair',
            name: 'Crosshair',
            enabled: true,
            pointer: true,
            source: source('live-markets-crosshair.js'),
            inputs: { hover: field('hover').id, series: field('series').id },
            outputs: { cross: field('cross').id },
            actions: [],
            initialState: {},
            timeoutMs: 500,
          },
        ],
      },
    ],
    'Bindings, rules, motion and functions',
  );
}
