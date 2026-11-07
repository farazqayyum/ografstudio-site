/**
 * Authors the "Take the controls" examples through OGraf Studio's MCP server, saves each editable
 * source next to this script and exports the certified package the site plays.
 *
 *   node examples-src/build.mjs              every example
 *   node examples-src/build.mjs clock bug    just these
 *
 * Needs a running Studio and MCP server; see README.md in this folder.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { call } from '../carousel/mcp.mjs';
import { liveMarkets } from './live-markets.mjs';
import { weather, weatherStrap } from './weather.mjs';

const FONT = 'Roboto Condensed, Arial Narrow, Arial, sans-serif';

// Studio's recipes embed a 371 KB TrueType copy of this font unless the template already has one, so
// these templates bring the same font as WOFF2. Every character and weight stays.
const ROBOTO_EXAMPLES = new Set(['clock', 'countdown', 'scoreboard', 'lower-third', 'ticker', 'bug']);
const robotoFont = () => ({
  type: 'add_asset',
  name: 'Roboto Condensed Variable',
  mimeType: 'font/woff2',
  fontFamily: 'Roboto Condensed',
  fontWeight: '100 900',
  fontStyle: 'normal',
  packagePath: 'assets/fonts/roboto-condensed.woff2',
  licenseName: 'SIL Open Font License 1.1',
  licenseUrl: 'https://github.com/google/fonts/blob/69d0549e8fc7ad72e1531734c81237be401ec4fd/ofl/robotocondensed/OFL.txt',
  licenseText: readFileSync(new URL('fonts/roboto-condensed-OFL.txt', import.meta.url), 'utf8'),
  data: readFileSync(new URL('fonts/roboto-condensed.woff2', import.meta.url)).toString('base64'),
});

async function settled() {
  let last = await call('ograf_get_project', { include: ['metadata'] });
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => setTimeout(resolve, 150));
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

async function fresh() {
  const start = await settled();
  await call('ograf_reset_project', { expectedRevision: start.revision, confirm: true });
}

/** The main composition, plus lookups by layer name and field key. */
async function scene() {
  const { project } = await call('ograf_get_project', {});
  const composition =
    project.compositions.find((item) => item.id === project.mainCompositionId) ??
    project.compositions[0];
  const layer = (name) => {
    const found = composition.layers.find((item) => item.name === name);
    if (!found) throw new Error(`No layer "${name}".`);
    return found;
  };
  const field = (key) => {
    const found = composition.dataFields.find((item) => item.key === key);
    if (!found) throw new Error(`No field "${key}".`);
    return found;
  };
  return { project, composition, layer, field };
}

/** The recipes' shader panels stay, but their four settings are not what an operator changes. */
function hidePanelSettings(composition) {
  return composition.dataFields
    .filter((item) => item.key.startsWith('shader_'))
    .map((item) => ({ type: 'update_data_field', fieldId: item.id, exposeToOgraf: false }));
}

const relabel = (fieldKey, label, description, patch = {}) => ({
  type: 'update_data_field',
  fieldKey,
  label,
  description,
  ...patch,
});

const option = (value, label) => ({ value, label });

const addField = (fieldType, key, label, description, defaultValue, extra = {}) => ({
  type: 'add_data_field',
  fieldType,
  key,
  label,
  description,
  defaultValue,
  ...extra,
});

const bind = (layerName, bindings) => ({ type: 'set_layer_bindings', layerName, bindings });

const rule = (id, name, fields) => ({ id, name, enabled: true, ...fields });

const fadeMotion = (layerName) => [
  {
    type: 'set_layer_motion',
    layerName,
    side: 'in',
    spec: { style: 'fade', durationFrames: 10, offsetFrames: 2, easing: 'cubic-out' },
  },
  {
    type: 'set_layer_motion',
    layerName,
    side: 'out',
    spec: { style: 'fade', durationFrames: 8, offsetFrames: 1, easing: 'cubic-in' },
  },
];

const rect = (name, box, fill, radius = 0) => ({
  type: 'add_layer',
  kind: 'rectangle',
  name,
  transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
  element: { fill, borderRadius: radius, strokeWidth: 0 },
});

const text = (name, box, content, style = {}) => ({
  type: 'add_layer',
  kind: 'text',
  name,
  transform: { x: box[0], y: box[1], width: box[2], height: box[3] },
  element: {
    content,
    fontFamily: style.font ?? FONT,
    fontSize: style.size ?? 28,
    minFontSize: Math.round((style.size ?? 28) * 0.5),
    fontWeight: style.weight ?? 600,
    color: style.color ?? '#ffffff',
    textAlign: style.align ?? 'left',
    verticalAlign: 'middle',
    autoFit: 'shrink-to-fit',
    overflowPolicy: 'clip',
    letterSpacing: style.ls ?? 0,
  },
});

/** One row of the Rankings board, in paint order. */
const BOARD_ROW = [
  'Row tile',
  'Row glow',
  'Row place',
  'Row avatar',
  'Row initials',
  'Row name',
  'Row chip',
  'Row award',
  'Row move',
  'Row up',
  'Row down',
  'Row moved',
  'Row points',
];

/** Everything that fades as the board goes off air. */
const MOTION_OUT = [
  'Board panel',
  'Board glow',
  'Board accent',
  'Title',
  'Subtitle',
  ...BOARD_ROW,
  'Leader glint',
  'Side panel',
  'Side glow',
  'Side accent',
  'Jury status',
  'Jury count',
  'Jury name',
  'Pip',
  'Ladder plate',
  'Ladder points',
  'Ladder name',
  'Top tile',
  'Top glint',
  'Top caption',
  'Top value',
  'Top name',
];

/** A band of light crossing a layer once per loop, then waiting offstage. */
function glintTrack(layerName, durationFrames, sweepFrames) {
  const stop = (index, from, to) => ({
    type: 'set_loop_property_track',
    layerName,
    property: `fill.stops[${index}].offset`,
    keys: [
      { frame: 0, value: from, easing: 'cubic-in-out' },
      { frame: sweepFrames, value: to },
      { frame: durationFrames, value: to },
    ],
  });
  return [
    stop(0, 0, 0.8),
    stop(1, 0, 0.9),
    stop(2, 0.2, 1),
    {
      type: 'set_loop_property_track',
      layerName,
      property: 'opacity',
      keys: [
        { frame: 0, value: 0 },
        { frame: 4, value: 1 },
        { frame: sweepFrames - 4, value: 1 },
        { frame: sweepFrames, value: 0 },
        { frame: durationFrames, value: 0 },
      ],
    },
  ];
}

const ZONE_LABELS = {
  local: 'LOCAL TIME',
  UTC: 'UTC',
  'Europe/London': 'LONDON',
  'America/New_York': 'NEW YORK',
  'Europe/Istanbul': 'ISTANBUL',
  'Asia/Tokyo': 'TOKYO',
};

const EXAMPLES = {
  async clock() {
    await apply(
      [
        {
          type: 'create_clock',
          stylePack: 'news',
          asComponent: false,
          name: 'Clock',
          timeZone: 'UTC',
          placement: { x: 1464, y: 54, width: 360, height: 170 },
        },
      ],
      'Clock recipe',
    );
    const { composition } = await scene();
    await apply(
      [
        ...hidePanelSettings(composition),
        addField('select', 'time_zone', 'Time zone', 'Any IANA zone works from a feed.', 'UTC', {
          options: [
            option('UTC', 'UTC'),
            option('local', "Viewer's local time"),
            option('Europe/London', 'London'),
            option('America/New_York', 'New York'),
            option('Europe/Istanbul', 'Istanbul'),
            option('Asia/Tokyo', 'Tokyo'),
          ],
        }),
        addField('select', 'hour_format', 'Hour format', '24-hour, or 12-hour with AM/PM.', '24', {
          options: [option('24', '24-hour'), option('12', '12-hour')],
        }),
        addField('boolean', 'show_seconds', 'Show seconds', 'Hide them for a calmer on-air clock.', true),
        bind('Clock · Time', [
          { fieldKey: 'time_zone', targetProperty: 'clock.timeZone' },
          { fieldKey: 'hour_format', targetProperty: 'clock.hourCycle' },
          {
            fieldKey: 'show_seconds',
            targetProperty: 'clock.format',
            valueMap: { true: 'hh:mm:ss', false: 'hh:mm' },
          },
        ]),
        bind('Clock · Label', [
          { fieldKey: 'time_zone', targetProperty: 'content', valueMap: ZONE_LABELS },
        ]),
      ],
      'Clock settings',
    );
    // showAmPm reads the same field as the hour cycle, so it needs its own map.
    const after = await scene();
    const time = after.layer('Clock · Time');
    await apply(
      [
        bind('Clock · Time', [
          ...time.bindings,
          {
            fieldKey: 'hour_format',
            targetProperty: 'clock.showAmPm',
            valueMap: { 24: false, 12: true },
          },
        ]),
      ],
      'AM/PM follows the hour format',
    );
  },

  async countdown() {
    await apply(
      [
        {
          type: 'create_countdown',
          stylePack: 'sports',
          asComponent: false,
          name: 'Countdown',
          durationSeconds: 30,
          placement: { x: 1464, y: 54, width: 360, height: 230 },
        },
      ],
      'Countdown recipe',
    );
    const first = await scene();
    await apply(
      [
        ...hidePanelSettings(first.composition),
        addField('text', 'title', 'Title', 'The line above the digits.', 'TIME REMAINING', {
          constraints: { maxLength: 24 },
        }),
        addField('select', 'duration', 'Duration', 'What Reset and Restart go back to.', '30000', {
          options: [
            option('30000', '30 seconds'),
            option('60000', '1 minute'),
            option('300000', '5 minutes'),
          ],
        }),
        addField('boolean', 'overtime', 'Run into overtime', 'Keep counting past zero.', false),
        addField('boolean', 'warning', 'Five-second warning', 'The alarm fires inside the graphic.', true),
        addField('color', 'warning_colour', 'Warning colour', 'Colour of the warning line.', '#ffbd4a'),
        bind('Countdown · Label', [{ fieldKey: 'title', targetProperty: 'content' }]),
        bind('Countdown · Timer', [
          { fieldKey: 'duration', targetProperty: 'clock.initialValueMs' },
          {
            fieldKey: 'overtime',
            targetProperty: 'clock.endBehavior',
            valueMap: { true: 'continue', false: 'stop' },
          },
        ]),
        bind('Countdown · Five-second warning', [
          { fieldKey: 'warning_colour', targetProperty: 'fill.stops[0].color' },
          { fieldKey: 'warning_colour', targetProperty: 'fill.stops[1].color' },
        ]),
      ],
      'Countdown controls',
    );
    const { layer, field } = await scene();
    const timer = layer('Countdown · Timer');
    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: timer.name,
          rules: timer.visualRules.map((item) =>
            item.name === 'Five seconds remaining'
              ? {
                  ...item,
                  // The primary condition is for data rules; an event is guarded by `conditions`.
                  conditions: [
                    { fieldId: field('warning').id, operator: 'equals', value: true, sourcePath: [] },
                  ],
                }
              : item,
          ),
        },
      ],
      'The warning can be switched off',
    );
  },

  async scoreboard() {
    const panel = { x: 96, y: 54, width: 806, height: 120 };
    await apply(
      [
        {
          type: 'create_scoreboard',
          stylePack: 'sports',
          asComponent: false,
          name: 'Scoreboard',
          placement: panel,
          content: { homeName: 'HARBOUR', homeScore: 1, awayScore: 0, awayName: 'NORTHSIDE' },
        },
      ],
      'Scoreboard recipe',
    );
    const first = await scene();
    const bar = [panel.x, panel.y + panel.height, panel.width, 48];
    await apply(
      [
        ...hidePanelSettings(first.composition),
        relabel('home_name', 'Home team', 'Home team name.'),
        relabel('home_score', 'Home score', 'Home score.'),
        relabel('away_score', 'Away score', 'Away score.'),
        relabel('away_name', 'Away team', 'Away team name.'),
        addField('color', 'home_colour', 'Home colour', 'Home team strip.', '#ff4238'),
        addField('color', 'away_colour', 'Away colour', 'Away team strip.', '#4a86ff'),
        addField('select', 'period', 'Period', 'Shown beside the match clock.', 'first', {
          options: [
            option('first', 'First half'),
            option('second', 'Second half'),
            option('extra', 'Extra time'),
            option('penalties', 'Penalties'),
          ],
        }),
        { type: 'add_custom_action', actionId: 'add:home_score:1', name: 'Home +1', description: 'The graphic adds the point itself.' },
        { type: 'add_custom_action', actionId: 'add:away_score:1', name: 'Away +1', description: 'The graphic adds the point itself.' },
        rect('Home strip', [panel.x, panel.y, 10, panel.height], '#ff4238'),
        rect('Away strip', [panel.x + panel.width - 10, panel.y, 10, panel.height], '#4a86ff'),
        rect('Info bar', bar, '#0a1226f2'),
        text('Period', [bar[0] + 22, bar[1], 360, bar[3]], 'FIRST HALF', { size: 24, ls: 1.5, color: '#c7d5ea' }),
        {
          type: 'add_layer',
          kind: 'clock',
          name: 'Match clock',
          transform: { x: bar[0] + bar[2] - 222, y: bar[1], width: 200, height: bar[3] },
          element: {
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'right',
            verticalAlign: 'middle',
            clock: { mode: 'count-up', source: 'automatic', format: 'mm:ss', autoStart: true, pauseWhenOffAir: true },
          },
        },
        bind('Home strip', [{ fieldKey: 'home_colour', targetProperty: 'fill' }]),
        bind('Away strip', [{ fieldKey: 'away_colour', targetProperty: 'fill' }]),
        bind('Period', [
          {
            fieldKey: 'period',
            targetProperty: 'content',
            valueMap: { first: 'FIRST HALF', second: 'SECOND HALF', extra: 'EXTRA TIME', penalties: 'PENALTIES' },
          },
        ]),
        ...['Home strip', 'Away strip', 'Info bar', 'Period', 'Match clock'].flatMap((name) => fadeMotion(name)),
      ],
      'Scoreboard controls',
    );
    const { layer, field } = await scene();
    const home = field('home_score').id;
    const away = field('away_score').id;
    const leader = (id, name, own, other) =>
      rule(id, name, {
        trigger: 'data',
        fieldId: own,
        sourcePath: [],
        operator: 'greater-than',
        compareFieldId: other,
        actions: [
          { type: 'property', targetProperty: 'fill.stops[0].color', value: '#ffd24a', transitionFrames: 10 },
          { type: 'property', targetProperty: 'fill.stops[1].color', value: '#ffd24a', transitionFrames: 10 },
        ],
      });
    const goal = (id, actionId, fieldId) =>
      rule(id, id, {
        trigger: 'custom-action',
        eventId: actionId,
        actions: [{ type: 'set-data', fieldId, mode: 'increase', value: 1 }],
      });
    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: 'Scoreboard · Home Score',
          rules: [leader('home-leads', 'Home leads', home, away), goal('home-goal', 'add:home_score:1', home)],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Scoreboard · Away Score',
          rules: [leader('away-leads', 'Away leads', away, home), goal('away-goal', 'add:away_score:1', away)],
        },
      ],
      'Goals and the leader highlight live in the graphic',
    );
    void layer;
  },

  async 'lower-third'() {
    const panel = { x: 96, y: 800, width: 900, height: 170 };
    await apply(
      [
        {
          type: 'create_lower_third',
          stylePack: 'news',
          asComponent: false,
          name: 'Lower Third',
          placement: panel,
          content: { headline: 'Alex Morgan', subheadline: 'Chief Correspondent, Newsroom' },
        },
      ],
      'Lower third recipe',
    );
    const first = await scene();
    const tag = [panel.x, panel.y - 46, 170, 46];
    const STYLES = { news: '#e11d2e', breaking: '#ffb224', sport: '#2fe6a8' };
    await apply(
      [
        ...hidePanelSettings(first.composition),
        relabel('headline', 'Name', 'First line.', { constraints: { maxLength: 40 } }),
        relabel('subheadline', 'Role', 'Second line.', { constraints: { maxLength: 60 } }),
        addField('select', 'style', 'Style', 'One field restyles the whole strap.', 'news', {
          options: [option('news', 'News'), option('breaking', 'Breaking'), option('sport', 'Sport')],
        }),
        addField('boolean', 'live_tag', 'Live tag', 'Show the tag above the strap.', true),
        rect('Tag plate', tag, '#e11d2e'),
        text('Tag', [tag[0] + 14, tag[1], tag[2] - 28, tag[3]], 'LIVE', { size: 26, weight: 800, ls: 1.5, align: 'center' }),
        bind('Tag plate', [{ fieldKey: 'style', targetProperty: 'fill', valueMap: STYLES }]),
        bind('Lower Third · Accent', [{ fieldKey: 'style', targetProperty: 'fill', valueMap: STYLES }]),
        bind('Tag', [
          {
            fieldKey: 'style',
            targetProperty: 'content',
            valueMap: { news: 'LIVE', breaking: 'BREAKING', sport: 'SPORT' },
          },
        ]),
        ...['Tag plate', 'Tag'].flatMap((name) => fadeMotion(name)),
      ],
      'Lower third controls',
    );
    const { field, layer } = await scene();
    const hidden = (id) =>
      rule(id, 'Hide without the live tag', {
        trigger: 'data',
        fieldId: field('live_tag').id,
        sourcePath: [],
        operator: 'equals',
        value: false,
        actions: [{ type: 'visibility', visible: false, transitionFrames: 8 }],
      });
    await apply(
      [
        { type: 'set_layer_visual_rules', layerName: 'Tag plate', rules: [hidden('hide-plate')] },
        { type: 'set_layer_visual_rules', layerName: 'Tag', rules: [hidden('hide-tag')] },
      ],
      'Live tag switch',
    );
    void layer;
  },

  async ticker() {
    await apply(
      [
        {
          type: 'create_ticker',
          stylePack: 'news',
          asComponent: false,
          name: 'News Ticker',
          content: {
            label: 'NEWS',
            text: 'Councils agree new flood defences  •  Rail strike called off after late talks  •  Harbour wins the cup on penalties',
          },
        },
      ],
      'Ticker recipe',
    );
    const first = await scene();
    const ticker = first.layer('News Ticker · Native ticker');
    await apply(
      [
        ...hidePanelSettings(first.composition),
        relabel('ticker_label', 'Label', 'The plate beside the crawl.', { constraints: { maxLength: 12 } }),
        relabel('ticker_text', 'Headlines', 'The running text.'),
        addField('integer', 'speed', 'Scroll speed', 'Pixels per second.', 120, {
          constraints: { minimum: 20, maximum: 400, step: 10 },
        }),
        addField('select', 'direction', 'Direction', 'Which way the crawl moves.', 'left', {
          options: [option('left', 'Right to left'), option('right', 'Left to right')],
        }),
        addField('select', 'text_direction', 'Text direction', 'Arabic and Hebrew crawl correctly with RTL.', 'auto', {
          options: [option('auto', 'Automatic'), option('ltr', 'Left to right'), option('rtl', 'Right to left')],
        }),
        addField('select', 'apply_updates', 'Apply updates', 'Join the crawl next time round, or cut now.', 'next-appearance', {
          options: [option('next-appearance', 'At next appearance'), option('immediate', 'Immediately')],
        }),
        addField('boolean', 'breaking', 'Breaking', 'A rule restyles the label.', false),
        bind(ticker.name, [
          ...ticker.bindings,
          { fieldKey: 'speed', targetProperty: 'speedPixelsPerSecond' },
          { fieldKey: 'direction', targetProperty: 'direction' },
          { fieldKey: 'text_direction', targetProperty: 'textDirection' },
          { fieldKey: 'apply_updates', targetProperty: 'updatePolicy' },
        ]),
      ],
      'Ticker controls',
    );
    const { field } = await scene();
    const breaking = field('breaking').id;
    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: 'News Ticker · Label Plate',
          rules: [
            rule('breaking-plate', 'Breaking plate', {
              trigger: 'data',
              fieldId: breaking,
              sourcePath: [],
              operator: 'equals',
              value: true,
              actions: [{ type: 'property', targetProperty: 'fill', value: '#ffb224', transitionFrames: 8 }],
            }),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'News Ticker · Label',
          rules: [
            rule('breaking-label', 'Breaking label', {
              trigger: 'data',
              fieldId: breaking,
              sourcePath: [],
              operator: 'equals',
              value: true,
              actions: [{ type: 'property', targetProperty: 'content', value: 'BREAKING' }],
            }),
          ],
        },
      ],
      'Breaking rule',
    );
  },

  async 'shader-background'() {
    const fragmentSource = readFileSync(new URL('../static/downloads/wave-bands.glsl', import.meta.url), 'utf8');
    await apply(
      [
        {
          type: 'add_layer',
          kind: 'rectangle',
          name: 'Wave bands',
          transform: { x: 0, y: 0, width: 1920, height: 1080 },
          element: { strokeWidth: 0 },
        },
      ],
      'Full-frame rectangle',
    );
    await apply(
      [
        {
          type: 'update_element',
          layerName: 'Wave bands',
          patch: { fill: { type: 'shader', fragmentSource, speed: 1, resolutionScale: 1, parameters: {} } },
        },
      ],
      'Shader fill',
    );
    // Studio makes one field per #pragma ograf line, with a key that starts with the layer's name.
    const { composition } = await scene();
    const texts = {
      speed: ['Speed', 'How fast the light streaks move.'],
      tint: ['Tint', 'Colour of the light streaks.'],
      glow: ['Glow', 'Turns the extra glow on or off.'],
    };
    await apply(
      composition.dataFields.map((item) => {
        const key = item.key.split('_').pop();
        return { type: 'update_data_field', fieldId: item.id, key, label: texts[key][0], description: texts[key][1] };
      }),
      'Field names',
    );
  },

  async 'lottie-pulse'() {
    const animationData = JSON.parse(readFileSync(new URL('../static/downloads/pulse.json', import.meta.url), 'utf8'));
    await apply(
      [
        {
          type: 'add_layer',
          kind: 'lottie',
          name: 'Pulse',
          transform: { x: 680, y: 260, width: 560, height: 560 },
          element: { animationData },
        },
      ],
      'Lottie layer',
    );
  },

  async bug() {
    const panel = { x: 1584, y: 54, width: 240, height: 90 };
    await apply(
      [
        {
          type: 'create_bug',
          stylePack: 'news',
          asComponent: false,
          name: 'Channel Bug',
          placement: panel,
          content: { label: 'OGRAF 1' },
        },
      ],
      'Bug recipe',
    );
    const first = await scene();
    await apply(
      [
        ...hidePanelSettings(first.composition),
        relabel('bug_label', 'Channel', 'One package, every channel in the group.', {
          fieldType: 'select',
          options: [option('OGRAF 1', 'OGraf 1'), option('OGRAF NEWS', 'OGraf News'), option('OGRAF SPORT', 'OGraf Sport')],
        }),
        addField('boolean', 'live', 'Live indicator', 'A dot that pulses for as long as it is on.', true),
        {
          type: 'add_layer',
          kind: 'ellipse',
          name: 'Live dot',
          transform: { x: panel.x + panel.width - 30, y: panel.y + 12, width: 16, height: 16 },
          element: { fill: '#ff4238', strokeWidth: 0 },
        },
        ...fadeMotion('Live dot'),
        {
          type: 'set_layer_loop',
          layerName: 'Live dot',
          name: 'Live pulse',
          activation: { type: 'lifecycle' },
          durationFrames: 50,
          phaseOffsetFrames: 0,
          repeatCount: null,
        },
        {
          type: 'set_loop_property_track',
          layerName: 'Live dot',
          property: 'opacity',
          keys: [
            { frame: 0, value: 1, easing: 'cubic-in-out' },
            { frame: 25, value: 0.35, easing: 'cubic-in-out' },
            { frame: 50, value: 1 },
          ],
        },
      ],
      'Bug controls',
    );
    const { field } = await scene();
    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: 'Live dot',
          rules: [
            rule('dot-off', 'Hide the dot', {
              trigger: 'data',
              fieldId: field('live').id,
              sourcePath: [],
              operator: 'equals',
              value: false,
              actions: [{ type: 'visibility', visible: false, transitionFrames: 8 }],
            }),
          ],
        },
      ],
      'Live indicator switch',
    );
  },

  async rankings() {
    const OSWALD = 'Oswald, Arial Narrow, Arial, sans-serif';
    const here = new URL('.', import.meta.url);
    // A function's source is one expression, so no closing semicolon.
    const source = readFileSync(new URL('rankings-votes.js', here), 'utf8').trim().replace(/;$/, '');
    const ROWS = 12;
    const PANEL = '#10133a';
    const ACCENT = '#ff3d8b';
    const ACCENT_2 = '#8a5cff';
    const SOFT = '#aab2ea';
    const INK = '#14163a';
    const TILE = ['#2b3080', '#1d215c'];
    const GOLD = ['#ffe27d', '#e6a51c'];
    const SILVER = ['#f4f7fb', '#b1bbcb'];
    const BRONZE = ['#f6c292', '#c27c40'];
    const BOARD = { x: 96, y: 54, w: 1170, h: 972 };
    const SIDE = { x: 1290, y: 54, w: 534, h: 972 };
    const R = { x: 116, y: 142, w: 1130, h: 64, pitch: 72 };
    const ALL_ROWS_H = R.pitch * ROWS;
    const grad = ([from, to], angle = 90) => ({
      type: 'linear',
      angle,
      stops: [
        { offset: 0, color: from, opacity: 1 },
        { offset: 1, color: to, opacity: 1 },
      ],
    });
    const glint = (angle) => ({
      type: 'linear',
      angle,
      stops: [
        { offset: 0, color: '#ffffff', opacity: 0 },
        { offset: 0.1, color: '#ffffff', opacity: 0.7 },
        { offset: 0.2, color: '#ffffff', opacity: 0 },
      ],
    });
    const glow = (color, opacity) => ({
      type: 'linear',
      angle: 180,
      stops: [
        { offset: 0, color, opacity },
        { offset: 1, color, opacity: 0 },
      ],
    });
    const style = (size, weight, extra = {}) => ({ font: OSWALD, size, weight, ...extra });

    const CONTESTANTS = [
      ['mk', 'Mira Kolar', '#ff5d73'],
      ['tl', 'Theo Lang', '#ffa23d'],
      ['ar', 'Ana Reis', '#f2c21b'],
      ['ka', 'Kenji Aoki', '#68c93b'],
      ['lv', 'Lena Vogel', '#22c79a'],
      ['oh', 'Omar Haddad', '#1fb4e6'],
      ['sr', 'Sofia Ricci', '#4f8dff'],
      ['ea', 'Emre Aydin', '#8a6cff'],
      ['nh', 'Nora Holm', '#c364f5'],
      ['jb', 'Jonas Berg', '#f25fc4'],
      ['pn', 'Priya Nair', '#ff8558'],
      ['lm', 'Leo Marin', '#8796ba'],
    ].map(([id, name, colour]) => ({ id, name, colour, points: 0 }));
    // Each jury's ranking, best first. The story: eight changes of lead, and the last jury's
    // top score lifts Priya Nair five places to win.
    const JURIES = [
      ['Lisbon', 'lv,nh,oh,ka,ea,ar,sr,jb,pn,lm'],
      ['Oslo', 'tl,jb,pn,oh,sr,ka,nh,ea,lv,ar'],
      ['Istanbul', 'ka,pn,sr,ea,ar,tl,jb,oh,lv,nh'],
      ['Tokyo', 'oh,ea,lv,ar,pn,tl,ka,jb,nh,sr'],
      ['Toronto', 'pn,sr,ka,lv,ar,nh,oh,tl,ea,lm'],
    ].map(([name, ranking]) => ({ name, ranking }));
    const SCALE = '1,2,3,4,5,6,7,8,10,12';
    const INITIAL_STATE = {
      order: [],
      awarded: {},
      queue: [],
      jury: -1,
      landed: 0,
      chips: {},
      topChips: {},
      lit: {},
      moves: {},
      baseline: [],
      top: 'wait',
      topTo: null,
      phase: 'ready',
    };

    // Studio's canvas doesn't run functions, so the internal fields' defaults show the design: the
    // same function played up to the top score of the second jury. On air, it starts from zero.
    const score = runInNewContext(`(${source})`);
    const sample = { contestants: CONTESTANTS, juries: JURIES, points_scale: SCALE, reveal: 'auto' };
    let played = { state: structuredClone(INITIAL_STATE) };
    let now = 0;
    const step = (event) => {
      played = score({ state: played.state, data: sample, event, nowMs: now });
      while (played.wakeAt !== null) {
        now = played.wakeAt;
        played = score({ state: played.state, data: sample, event: { type: 'tick' }, nowMs: now });
      }
    };
    step({ type: 'load' });
    for (let press = 0; press < 3; press++) step({ type: 'custom-action', actionId: 'vote.next' });
    const look = JSON.parse(JSON.stringify(played.data));

    const INTERNAL = { exposeToOgraf: false };
    const objectItems = (properties) => ({
      items: { key: 'item', fieldType: 'object', properties },
    });
    const prop = (key, fieldType, label) => ({ key, fieldType, ...(label ? { label } : {}) });
    const giveOptions = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1].map((points) =>
      option(String(points), `${points} point${points === 1 ? '' : 's'}`),
    );

    const first = await scene();
    const [inTransition, outTransition] = first.composition.transitions;
    await apply(
      [
        // The rows take this long to reach their new places.
        { type: 'set_composition', updateTransitionFrames: 16 },
        { type: 'set_transition', transitionId: inTransition.id, durationFrames: 30 },
        { type: 'set_transition', transitionId: outTransition.id, durationFrames: 16 },
        {
          type: 'add_asset',
          name: 'Oswald',
          mimeType: 'font/woff2',
          fontFamily: 'Oswald',
          fontWeight: '200 700',
          fontStyle: 'normal',
          packagePath: 'assets/fonts/oswald.woff2',
          licenseName: 'SIL Open Font License 1.1',
          licenseUrl: 'https://github.com/google/fonts/blob/6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec/ofl/oswald/OFL.txt',
          licenseText: readFileSync(new URL('fonts/oswald-OFL.txt', here), 'utf8'),
          data: readFileSync(new URL('fonts/oswald.woff2', here)).toString('base64'),
        },
        addField('text', 'title', 'Title', 'The heading of the board.', 'GRAND FINAL', {
          constraints: { maxLength: 28 },
        }),
        addField('select', 'reveal', 'Low scores', 'How Next vote plays the scores below a jury\'s top score.', 'auto', {
          options: [
            option('auto', 'Run by themselves'),
            option('together', 'Land together'),
            option('manual', 'One per press'),
          ],
        }),
        addField('select', 'give_to', 'Give to', 'Who Give points scores for.', 'pn', {
          options: CONTESTANTS.map((item) => option(item.id, item.name)),
        }),
        addField('select', 'give_points', 'Points', 'How many Give points adds.', '12', { options: giveOptions }),
        addField('text', 'points_scale', 'Points scale', 'What a jury can give, separated by commas.', SCALE, {
          constraints: { maxLength: 60 },
        }),
        addField('array', 'contestants', 'Contestants', 'The running order. Points set a starting score, for example from a feed.', CONTESTANTS, {
          ...objectItems([
            prop('id', 'text', 'ID'),
            prop('name', 'text', 'Name'),
            prop('colour', 'color', 'Colour'),
            prop('points', 'integer', 'Starting points'),
          ]),
          constraints: { maxItems: ROWS },
        }),
        addField('array', 'juries', 'Juries', 'In voting order. Ranking lists contestant IDs, best first.', JURIES, {
          ...objectItems([prop('name', 'text', 'Name'), prop('ranking', 'text', 'Ranking')]),
        }),
        // Written by the function; layers read them.
        addField('array', 'board', 'Board', 'Written by the Jury vote function.', look.board, {
          ...INTERNAL,
          ...objectItems([
            prop('id', 'text'),
            prop('slot', 'integer'),
            prop('name', 'text'),
            prop('initials', 'text'),
            prop('colour', 'color'),
            prop('points', 'integer'),
            prop('rank', 'integer'),
            prop('place', 'text'),
            prop('award', 'text'),
            prop('top', 'boolean'),
            prop('lit', 'boolean'),
            prop('move', 'text'),
            prop('moved', 'text'),
          ]),
        }),
        addField('array', 'ladder', 'Ladder', 'Written by the Jury vote function.', look.ladder, {
          ...INTERNAL,
          ...objectItems([
            prop('key', 'text'),
            prop('points', 'text'),
            prop('name', 'text'),
            prop('state', 'text'),
          ]),
        }),
        addField('array', 'pips', 'Pips', 'Written by the Jury vote function.', look.pips, {
          ...INTERNAL,
          ...objectItems([prop('key', 'text'), prop('state', 'text')]),
        }),
        ...[
          ['jury_status', look.jury_status],
          ['jury_name', look.jury_name],
          ['jury_count', look.jury_count],
          ['top_state', look.top_state],
          ['top_value', look.top_value],
          ['top_caption', look.top_caption],
          ['top_name', look.top_name],
        ].map(([key, value]) => addField('text', key, key, 'Written by the Jury vote function.', value, INTERNAL)),
        addField('boolean', 'voting_started', 'voting_started', 'Written by the Jury vote function.', look.voting_started, INTERNAL),
        { type: 'add_custom_action', actionId: 'vote.next', name: 'Next vote', description: 'Plays the next scores of the current jury, or starts the next jury.' },
        { type: 'add_custom_action', actionId: 'vote.give', name: 'Give points', description: 'Adds points by hand. A controller can send {to, points}; without them it uses Give to and Points.' },
        { type: 'add_custom_action', actionId: 'vote.reset', name: 'Start over', description: 'Clears every score and every jury.' },

        // The board.
        rect('Board panel', [BOARD.x, BOARD.y, BOARD.w, BOARD.h], PANEL, 16),
        rect('Board glow', [BOARD.x, BOARD.y, BOARD.w, 86], glow(ACCENT_2, 0.5), 16),
        rect('Board accent', [BOARD.x, BOARD.y, BOARD.w, 6], grad([ACCENT, ACCENT_2])),
        text('Title', [126, 66, 720, 60], 'GRAND FINAL', style(46, 700, { ls: 1.5 })),
        text('Subtitle', [846, 66, 380, 60], 'JURY VOTE', style(26, 500, { ls: 3, align: 'right', color: SOFT })),

        // One row of the board. The collection repeats it twelve times.
        rect('Row tile', [R.x, R.y, R.w, R.h], grad(TILE), 10),
        {
          type: 'add_layer',
          kind: 'rectangle',
          name: 'Row glow',
          transform: { x: R.x, y: R.y, width: R.w, height: R.h },
          element: { fill: '#ffffff2e', borderRadius: 10, strokeColor: '#ffffff', strokeWidth: 3 },
        },
        text('Row place', [R.x + 6, R.y, 66, R.h], '–', style(34, 700, { align: 'center', color: SOFT })),
        {
          type: 'add_layer',
          kind: 'ellipse',
          name: 'Row avatar',
          transform: { x: R.x + 80, y: R.y + 8, width: 48, height: 48 },
          element: { fill: '#5b6bff', strokeWidth: 0 },
        },
        text('Row initials', [R.x + 80, R.y + 8, 48, 48], 'AA', style(20, 700, { align: 'center' })),
        text('Row name', [R.x + 142, R.y, 560, R.h], 'Contestant', style(34, 500)),
        rect('Row chip', [R.x + 716, R.y + 10, 92, 44], '#0c0e2b', 22),
        text('Row award', [R.x + 716, R.y + 10, 92, 44], '+12', style(28, 700, { align: 'center' })),
        rect('Row move', [R.x + 820, R.y + 10, 84, 44], '#0c0e2b', 22),
        {
          type: 'add_layer',
          kind: 'path',
          name: 'Row up',
          transform: { x: R.x + 834, y: R.y + 22, width: 20, height: 20 },
          element: { d: 'M50,8 L96,88 L4,88 Z', fill: '#39e38f', viewBoxWidth: 100, viewBoxHeight: 100, strokeWidth: 0 },
        },
        {
          type: 'add_layer',
          kind: 'path',
          name: 'Row down',
          transform: { x: R.x + 834, y: R.y + 22, width: 20, height: 20 },
          element: { d: 'M4,12 L96,12 L50,92 Z', fill: '#ff5a72', viewBoxWidth: 100, viewBoxHeight: 100, strokeWidth: 0 },
        },
        text('Row moved', [R.x + 858, R.y + 10, 36, 44], '1', style(26, 600, { align: 'center' })),
        text('Row points', [R.x + 916, R.y, 194, R.h], '0', style(44, 700, { align: 'right' })),
        ...[
          ['Row name', 'content', ['name']],
          ['Row place', 'content', ['place']],
          ['Row initials', 'content', ['initials']],
          ['Row avatar', 'fill', ['colour']],
          ['Row award', 'content', ['award']],
          ['Row moved', 'content', ['moved']],
          ['Row points', 'content', ['points']],
        ].map(([layerName, targetProperty, sourcePath]) =>
          bind(layerName, [{ fieldKey: 'board', targetProperty, sourcePath }]),
        ),
        bind('Title', [{ fieldKey: 'title', targetProperty: 'content' }]),
        ...BOARD_ROW.map((layerName) => ({ type: 'set_layer_layout', layerName, groupId: 'board-row' })),
        {
          type: 'create_runtime_collection',
          name: 'Board rows',
          fieldKey: 'board',
          layerNames: BOARD_ROW,
          offsetPerItem: { x: 0, y: R.pitch },
          capacity: ROWS,
          overflow: 'truncate',
          itemKeyPath: ['id'],
          sortPath: ['slot'],
          sortDirection: 'ascending',
        },

        // A light sweeping over whoever leads.
        {
          type: 'add_layer',
          kind: 'rectangle',
          name: 'Leader glint',
          transform: { x: R.x, y: R.y, width: R.w, height: R.h },
          element: { fill: glint(90), borderRadius: 10, strokeWidth: 0 },
        },

        // Lifts off the rows as the board comes in.
        rect('Curtain', [R.x - 8, R.y - 4, R.w + 16, ALL_ROWS_H + 8], PANEL),
        rect('Curtain edge', [R.x - 8, R.y - 4, R.w + 16, 4], grad([ACCENT, ACCENT_2])),

        // The jury panel.
        rect('Side panel', [SIDE.x, SIDE.y, SIDE.w, SIDE.h], PANEL, 16),
        rect('Side glow', [SIDE.x, SIDE.y, SIDE.w, 152], glow(ACCENT, 0.3), 16),
        rect('Side accent', [SIDE.x, SIDE.y, SIDE.w, 6], grad([ACCENT_2, ACCENT])),
        text('Jury status', [SIDE.x + 28, SIDE.y + 20, 300, 36], 'NOW VOTING', style(24, 600, { ls: 3, color: ACCENT })),
        text('Jury count', [SIDE.x + 306, SIDE.y + 20, 200, 36], 'JURY 1 OF 5', style(22, 500, { ls: 1, align: 'right', color: SOFT })),
        text('Jury name', [SIDE.x + 28, SIDE.y + 56, 478, 80], 'Lisbon', style(62, 700)),
        rect('Pip', [SIDE.x + 28, SIDE.y + 142, 52, 8], '#3a3f8f', 4),
        rect('Ladder plate', [SIDE.x + 28, SIDE.y + 166, 478, 46], '#ffffff0a', 8),
        text('Ladder points', [SIDE.x + 28, SIDE.y + 166, 66, 46], '1', style(28, 700, { align: 'center', color: '#5a60a8' })),
        text('Ladder name', [SIDE.x + 104, SIDE.y + 166, 392, 46], '', style(28, 500)),
        rect('Top tile', [SIDE.x + 28, SIDE.y + 648, 478, 300], grad(TILE, 180), 14),
        {
          type: 'add_layer',
          kind: 'rectangle',
          name: 'Top glint',
          transform: { x: SIDE.x + 28, y: SIDE.y + 648, width: 478, height: 300 },
          element: { fill: glint(110), borderRadius: 14, strokeWidth: 0 },
        },
        text('Top caption', [SIDE.x + 48, SIDE.y + 664, 438, 44], 'THE TOP SCORE', style(28, 600, { ls: 3, align: 'center', color: SOFT })),
        text('Top value', [SIDE.x + 48, SIDE.y + 708, 438, 124], '12 POINTS', style(92, 700, { align: 'center', color: '#5a60a8' })),
        text('Top name', [SIDE.x + 48, SIDE.y + 846, 438, 86], '', style(58, 700, { align: 'center' })),
        bind('Jury status', [{ fieldKey: 'jury_status', targetProperty: 'content' }]),
        bind('Jury name', [{ fieldKey: 'jury_name', targetProperty: 'content' }]),
        bind('Jury count', [{ fieldKey: 'jury_count', targetProperty: 'content' }]),
        bind('Top caption', [{ fieldKey: 'top_caption', targetProperty: 'content' }]),
        bind('Top value', [{ fieldKey: 'top_value', targetProperty: 'content' }]),
        bind('Top name', [{ fieldKey: 'top_name', targetProperty: 'content' }]),
        bind('Ladder points', [{ fieldKey: 'ladder', targetProperty: 'content', sourcePath: ['points'] }]),
        bind('Ladder name', [{ fieldKey: 'ladder', targetProperty: 'content', sourcePath: ['name'] }]),
        { type: 'set_layer_layout', layerName: 'Pip', groupId: 'jury-pip' },
        {
          type: 'create_runtime_collection',
          name: 'Jury pips',
          fieldKey: 'pips',
          layerNames: ['Pip'],
          offsetPerItem: { x: 60, y: 0 },
          capacity: 8,
          overflow: 'truncate',
          itemKeyPath: ['key'],
        },
        ...['Ladder plate', 'Ladder points', 'Ladder name'].map((layerName) => ({
          type: 'set_layer_layout',
          layerName,
          groupId: 'ladder-row',
        })),
        {
          type: 'create_runtime_collection',
          name: 'Ladder rows',
          fieldKey: 'ladder',
          layerNames: ['Ladder plate', 'Ladder points', 'Ladder name'],
          offsetPerItem: { x: 0, y: 52 },
          capacity: 9,
          overflow: 'truncate',
          itemKeyPath: ['key'],
        },
        {
          type: 'update_element',
          layerName: 'Top name',
          patch: {
            textAnimation: {
              type: 'pop',
              split: 'grapheme',
              durationFrames: 12,
              cursor: 'none',
              cursorBlinkFrames: 25,
              replayOnUpdate: true,
              customActionId: null,
            },
          },
        },
      ],
      'The voting board',
    );

    const { field, composition } = await scene();
    const when = (id, name, fieldKey, sourcePath, operator, value, actions) =>
      rule(id, name, {
        trigger: 'data',
        fieldId: field(fieldKey).id,
        sourcePath,
        operator,
        ...(value === undefined ? {} : { value }),
        actions,
      });
    const stops = ([from, to]) => [
      { type: 'property', targetProperty: 'fill.stops[0].color', value: from },
      { type: 'property', targetProperty: 'fill.stops[1].color', value: to },
    ];
    const ink = [{ type: 'property', targetProperty: 'color', value: INK }];
    const hide = (transitionFrames = 0) => [{ type: 'visibility', visible: false, transitionFrames }];
    const medalText = (prefix) =>
      when(`${prefix}-medal`, 'Dark on a medal', 'board', ['rank'], 'one-of', [1, 2, 3], ink);

    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row tile',
          rules: [
            when('tile-gold', 'First place is gold', 'board', ['rank'], 'equals', 1, stops(GOLD)),
            when('tile-silver', 'Second place is silver', 'board', ['rank'], 'equals', 2, stops(SILVER)),
            when('tile-bronze', 'Third place is bronze', 'board', ['rank'], 'equals', 3, stops(BRONZE)),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row glow',
          rules: [when('glow-off', 'Lit when it scores', 'board', ['lit'], 'equals', false, hide(10))],
        },
        { type: 'set_layer_visual_rules', layerName: 'Row place', rules: [medalText('place')] },
        { type: 'set_layer_visual_rules', layerName: 'Row name', rules: [medalText('name')] },
        { type: 'set_layer_visual_rules', layerName: 'Row points', rules: [medalText('points')] },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row chip',
          rules: [
            when('chip-off', 'No score, no chip', 'board', ['award'], 'empty', undefined, hide()),
            when('chip-top', 'The top score stands out', 'board', ['top'], 'equals', true, [
              { type: 'property', targetProperty: 'fill', value: ACCENT },
            ]),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row award',
          rules: [when('award-off', 'No score, no chip', 'board', ['award'], 'empty', undefined, hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row move',
          rules: [when('move-off', 'Only when it moved', 'board', ['move'], 'equals', 'same', hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row up',
          rules: [when('up-off', 'Only when it climbed', 'board', ['move'], 'not-equals', 'up', hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row down',
          rules: [when('down-off', 'Only when it fell', 'board', ['move'], 'not-equals', 'down', hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Row moved',
          rules: [when('moved-off', 'Only when it moved', 'board', ['move'], 'equals', 'same', hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Leader glint',
          rules: [when('glint-off', 'Nobody leads yet', 'voting_started', [], 'equals', false, hide())],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Pip',
          rules: [
            when('pip-done', 'Voted', 'pips', ['state'], 'equals', 'done', [
              { type: 'property', targetProperty: 'fill', value: ACCENT_2 },
            ]),
            when('pip-now', 'Voting now', 'pips', ['state'], 'equals', 'now', [
              { type: 'property', targetProperty: 'fill', value: ACCENT },
            ]),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Ladder plate',
          rules: [
            when('ladder-done', 'Given', 'ladder', ['state'], 'equals', 'done', [
              { type: 'property', targetProperty: 'fill', value: '#2b3080' },
            ]),
            when('ladder-next', 'Next up', 'ladder', ['state'], 'equals', 'next', [
              { type: 'property', targetProperty: 'fill', value: '#ff3d8b40' },
            ]),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Ladder points',
          rules: [
            when('ladder-points-done', 'Given', 'ladder', ['state'], 'not-equals', 'wait', [
              { type: 'property', targetProperty: 'color', value: '#ffffff' },
            ]),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Top tile',
          rules: [
            when('top-gold', 'Gold once it is called', 'top_state', [], 'not-equals', 'wait', stops(GOLD)),
          ],
        },
        {
          type: 'set_layer_visual_rules',
          layerName: 'Top glint',
          rules: [when('top-glint-off', 'Only for the top score', 'top_state', [], 'equals', 'wait', hide())],
        },
        ...['Top caption', 'Top value', 'Top name'].map((layerName, index) => ({
          type: 'set_layer_visual_rules',
          layerName,
          rules: [when(`top-ink-${index}`, 'Dark on gold', 'top_state', [], 'not-equals', 'wait', ink)],
        })),

        // Motion: panels fade, then the curtain lifts off the rows.
        ...['Board panel', 'Board glow', 'Board accent', 'Side panel', 'Side glow', 'Side accent', 'Curtain'].map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'fade', durationFrames: 8, offsetFrames: 22, easing: 'cubic-out' },
        })),
        ...BOARD_ROW.map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'fade', durationFrames: 1, offsetFrames: 21, easing: 'linear' },
        })),
        ...['Title', 'Subtitle'].map((layerName, index) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'slide', direction: 'left', distance: 40, durationFrames: 12, offsetFrames: 14 - index * 3, easing: 'cubic-out' },
        })),
        ...['Jury status', 'Jury count', 'Jury name', 'Pip'].map((layerName, index) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'slide', direction: 'right', distance: 40, durationFrames: 12, offsetFrames: 14 - index * 2, easing: 'cubic-out' },
        })),
        ...['Ladder plate', 'Ladder points', 'Ladder name'].map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'fade', durationFrames: 12, offsetFrames: 3, easing: 'cubic-out' },
        })),
        ...['Top tile', 'Top caption', 'Top value', 'Top name'].map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'pop', durationFrames: 12, offsetFrames: 0 },
        })),
        ...['Leader glint', 'Top glint'].map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'in',
          spec: { style: 'fade', durationFrames: 1, offsetFrames: 0, easing: 'linear' },
        })),
        {
          type: 'set_property_track',
          layerName: 'Curtain',
          property: 'y',
          keys: [
            { frame: 8, value: R.y - 4 },
            { frame: 28, value: R.y + ALL_ROWS_H + 4, easing: 'cubic-in-out' },
          ],
        },
        {
          type: 'set_property_track',
          layerName: 'Curtain',
          property: 'height',
          keys: [
            { frame: 8, value: ALL_ROWS_H + 8 },
            { frame: 28, value: 0, easing: 'cubic-in-out' },
          ],
        },
        {
          type: 'set_property_track',
          layerName: 'Curtain edge',
          property: 'y',
          keys: [
            { frame: 8, value: R.y - 4 },
            { frame: 28, value: R.y + ALL_ROWS_H, easing: 'cubic-in-out' },
          ],
        },
        {
          type: 'set_property_track',
          layerName: 'Curtain edge',
          property: 'opacity',
          keys: [
            { frame: 0, value: 0 },
            { frame: 8, value: 1 },
            { frame: 25, value: 1 },
            { frame: 29, value: 0 },
          ],
        },
        ...MOTION_OUT.map((layerName) => ({
          type: 'set_layer_motion',
          layerName,
          side: 'out',
          spec: { style: 'fade', durationFrames: 12, offsetFrames: 0, easing: 'cubic-in' },
        })),
        {
          type: 'set_layer_loop',
          layerName: 'Leader glint',
          name: 'Leader sweep',
          activation: { type: 'lifecycle' },
          durationFrames: 125,
          phaseOffsetFrames: 0,
          repeatCount: null,
        },
        ...glintTrack('Leader glint', 125, 40),
        {
          type: 'set_layer_loop',
          layerName: 'Top glint',
          name: 'Top sweep',
          activation: { type: 'lifecycle' },
          durationFrames: 75,
          phaseOffsetFrames: 0,
          repeatCount: null,
        },
        ...glintTrack('Top glint', 75, 30),
        {
          type: 'set_logic_functions',
          compositionId: composition.id,
          functions: [
            {
              type: 'javascript',
              version: 1,
              id: 'jury-vote',
              name: 'Jury vote',
              enabled: true,
              source,
              inputs: Object.fromEntries(
                ['contestants', 'juries', 'points_scale', 'reveal', 'give_to', 'give_points'].map((key) => [key, field(key).id]),
              ),
              outputs: Object.fromEntries(
                [
                  'board',
                  'ladder',
                  'pips',
                  'jury_status',
                  'jury_name',
                  'jury_count',
                  'top_state',
                  'top_value',
                  'top_caption',
                  'top_name',
                  'voting_started',
                ].map((key) => [key, field(key).id]),
              ),
              actions: ['vote.next', 'vote.give', 'vote.reset'],
              initialState: INITIAL_STATE,
              // A wall-clock limit: a busy machine must not stop the graphic from loading.
              timeoutMs: 1000,
            },
          ],
        },
      ],
      'Rules, motion and the scoring function',
    );
  },
};

EXAMPLES['live-markets'] = () => liveMarkets({ apply, scene, addField, bind, rule, option });
EXAMPLES.weather = () => weather({ apply, scene, addField, bind, option });
EXAMPLES['weather-strap'] = () => weatherStrap({ apply, scene, addField, bind, option });

const NAMES = {
  'live-markets': 'Live markets',
  weather: 'Europe weather',
  'weather-strap': 'Weather strap',
  clock: 'Clock',
  countdown: 'Countdown',
  scoreboard: 'Scoreboard',
  'lower-third': 'Lower third',
  ticker: 'Ticker',
  bug: 'Bug / DOG',
  rankings: 'Rankings',
  'shader-background': 'Shader background',
  'lottie-pulse': 'Lottie pulse',
};

/** These hold no clock or rule, so they seek to the same frame and suit non-real-time playout too. */
const DUAL_MODE = new Set(['shader-background', 'lottie-pulse']);

const wanted = process.argv.slice(2);
for (const slug of wanted.length ? wanted : Object.keys(EXAMPLES)) {
  console.log(`--- ${slug}`);
  await fresh();
  if (ROBOTO_EXAMPLES.has(slug)) await apply([robotoFont()], 'Add the font');
  await EXAMPLES[slug]();
  // Live clocks, timers and rules: these are made for real-time playout.
  await apply(
    [
      {
        type: 'set_project_metadata',
        name: NAMES[slug],
        description: 'A live example from ografstudio.org.',
        supportsRealTime: true,
        supportsNonRealTime: DUAL_MODE.has(slug),
      },
    ],
    'Name',
  );
  const ready = await settled();
  const certified = await call('ograf_export_package', {
    path: `graphics/${slug}.ograf.zip`,
    expectedRevision: ready.revision,
    operationId: `${slug}-${Date.now()}`,
    confirm: true,
    overwrite: true,
    profile: DUAL_MODE.has(slug) ? 'dual' : 'realtime',
  });
  console.log(JSON.stringify(certified).slice(0, 300));
  await call('ograf_save_project', {
    expectedRevision: (await settled()).revision,
    path: `examples-src/${slug}.ogs`,
    confirm: true,
    overwrite: true,
  });
}
