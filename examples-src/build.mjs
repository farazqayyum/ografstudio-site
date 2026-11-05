/**
 * Authors the "Take the controls" examples through OGraf Studio's MCP server, saves each editable
 * source next to this script and exports the certified package the site plays.
 *
 *   node examples-src/build.mjs              every example
 *   node examples-src/build.mjs clock bug    just these
 *
 * Needs a running Studio and MCP server; see README.md in this folder.
 */
import { call } from '../carousel/mcp.mjs';

const FONT = 'Roboto Condensed, Arial Narrow, Arial, sans-serif';

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
    fontFamily: FONT,
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
    const X = 96;
    const Y = 200;
    const W = 720;
    const ROW = 64;
    const ROUNDS = [
      [['am', 'A. Moreau', 25], ['kt', 'K. Tanaka', 18], ['rs', 'R. Silva', 15], ['jn', 'J. Novak', 12], ['ld', 'L. Dubois', 10], ['ma', 'M. Aydin', 8]],
      [['kt', 'K. Tanaka', 43], ['am', 'A. Moreau', 33], ['ma', 'M. Aydin', 33], ['rs', 'R. Silva', 27], ['jn', 'J. Novak', 22], ['ld', 'L. Dubois', 16]],
      [['ma', 'M. Aydin', 58], ['kt', 'K. Tanaka', 55], ['am', 'A. Moreau', 51], ['jn', 'J. Novak', 37], ['rs', 'R. Silva', 33], ['ld', 'L. Dubois', 24]],
    ].map((round) => round.map(([id, name, points]) => ({ id, name, points })));
    const rows = 6;
    await apply(
      [
        { type: 'add_lifecycle_step', name: 'After round 2' },
        { type: 'add_lifecycle_step', name: 'After round 3' },
        addField('text', 'title', 'Title', 'The heading of the table.', 'DRIVER STANDINGS', {
          constraints: { maxLength: 28 },
        }),
        addField('array', 'standings', 'Standings', 'One entry per driver; the graphic sorts them.', ROUNDS[0], {
          items: {
            key: 'item',
            fieldType: 'object',
            properties: [
              { key: 'id', fieldType: 'text' },
              { key: 'name', fieldType: 'text' },
              { key: 'points', fieldType: 'integer' },
            ],
          },
        }),
        rect('Table panel', [X, Y - 96, W, 96 + rows * ROW + 16], '#0a1226f2', 6),
        rect('Table accent', [X, Y - 96, 8, 96 + rows * ROW + 16], '#4fe0ff'),
        text('Title', [X + 30, Y - 88, W - 240, 52], 'DRIVER STANDINGS', { size: 36, weight: 800, ls: 1 }),
        text('Round', [X + W - 210, Y - 88, 186, 52], 'ROUND 1', { size: 24, ls: 1.5, align: 'right', color: '#4fe0ff' }),
        ...Array.from({ length: rows }, (_, index) =>
          text(`Rank ${index + 1}`, [X + 26, Y + index * ROW, 48, ROW - 8], String(index + 1), {
            size: 30,
            weight: 800,
            align: 'center',
            color: '#8493b8',
          }),
        ),
        rect('Row plate', [X + 84, Y, W - 110, ROW - 8], '#ffffff14', 4),
        text('Row name', [X + 104, Y, W - 300, ROW - 8], 'Driver', { size: 30 }),
        text('Row points', [X + W - 170, Y, 120, ROW - 8], '0', { size: 32, weight: 800, align: 'right', color: '#4fe0ff' }),
        bind('Title', [{ fieldKey: 'title', targetProperty: 'content' }]),
        bind('Row name', [{ fieldKey: 'standings', targetProperty: 'content', sourcePath: ['name'] }]),
        bind('Row points', [{ fieldKey: 'standings', targetProperty: 'content', sourcePath: ['points'] }]),
        ...['Row plate', 'Row name', 'Row points'].map((layerName) => ({
          type: 'set_layer_layout',
          layerName,
          groupId: 'standings-row',
        })),
        {
          type: 'create_runtime_collection',
          name: 'Standings rows',
          fieldKey: 'standings',
          layerNames: ['Row plate', 'Row name', 'Row points'],
          offsetPerItem: { x: 0, y: ROW },
          capacity: rows,
          overflow: 'truncate',
          itemKeyPath: ['id'],
          sortPath: ['points'],
          sortDirection: 'descending',
        },
        ...[
          'Table panel',
          'Table accent',
          'Title',
          'Round',
          'Row plate',
          'Row name',
          'Row points',
          ...Array.from({ length: rows }, (_, index) => `Rank ${index + 1}`),
        ].flatMap((name) => fadeMotion(name)),
      ],
      'Rankings table',
    );
    const { composition, field, layer } = await scene();
    const steps = composition.keyframes ?? [];
    const stepIds = steps.filter((item) => item.role === 'step').map((item) => item.id);
    if (stepIds.length !== 3) throw new Error(`Expected three steps: ${JSON.stringify(Object.keys(composition))} ${JSON.stringify(steps).slice(0, 400)}`);
    const standings = field('standings').id;
    const roundRule = (id, trigger, eventId, index) =>
      rule(id, `Round ${index + 1}`, {
        trigger,
        ...(eventId ? { eventId } : {}),
        actions: [
          { type: 'set-data', fieldId: standings, mode: 'set', value: ROUNDS[index] },
          { type: 'property', targetProperty: 'content', value: `ROUND ${index + 1}`, targetLayerId: layer('Round').id },
        ],
      });
    await apply(
      [
        {
          type: 'set_layer_visual_rules',
          layerName: 'Table panel',
          rules: [
            roundRule('round-1', 'play', null, 0),
            roundRule('round-2', 'step', stepIds[1], 1),
            roundRule('round-3', 'step', stepIds[2], 2),
          ],
        },
      ],
      'Next plays each round into the table',
    );
  },
};

const NAMES = {
  clock: 'Clock',
  countdown: 'Countdown',
  scoreboard: 'Scoreboard',
  'lower-third': 'Lower third',
  ticker: 'Ticker',
  bug: 'Bug / DOG',
  rankings: 'Rankings',
};

const wanted = process.argv.slice(2);
for (const slug of wanted.length ? wanted : Object.keys(EXAMPLES)) {
  console.log(`--- ${slug}`);
  await fresh();
  await EXAMPLES[slug]();
  // Live clocks, timers and rules: these are made for real-time playout.
  await apply(
    [
      {
        type: 'set_project_metadata',
        name: NAMES[slug],
        description: 'A live example from ografstudio.org.',
        supportsRealTime: true,
        supportsNonRealTime: false,
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
    profile: 'realtime',
  });
  console.log(JSON.stringify(certified).slice(0, 300));
  await call('ograf_save_project', {
    expectedRevision: (await settled()).revision,
    path: `examples-src/${slug}.ogs`,
    confirm: true,
    overwrite: true,
  });
}
