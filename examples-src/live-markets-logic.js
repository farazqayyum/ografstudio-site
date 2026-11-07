// The Live markets example: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic only sends data: `markets`,
// `history`, `trades` and `fx`. Everything you click is answered here: which market is on the big
// chart, which range, area or candles, the auto tour. The function writes one object, `ui`, and
// layers read their text, colours, positions and pictures from it.
//
// The chart is a picture this function draws. A Function can't touch layers, but it can write an SVG
// to a field, and an image layer shows whatever its bound field holds.
({ state, data, event, nowMs }) => {
  // Where things sit on the canvas. Keep these in step with the layers in live-markets.mjs.
  const PLOT = { x: 546, y: 330, w: 830, h: 430 };
  const ROW = { y: 164, pitch: 100 };
  const RANGE_X = { '1H': 1230, '24H': 1306, '7D': 1382 };
  const VIEW_X = { area: 1014, candles: 1116 };
  const BAR_W = 346; // the breadth bar
  const METER = { x: 546, w: 918 }; // the 24-hour range meter

  const MORPH_MS = 420; // a chart reshaping into another market or range
  const FLASH_MS = 300; // a price lit up after it changes, and the dots beating as data arrives
  const TOUR_MS = 7000; // how long the auto tour stays on each market
  const LATE_MS = 20000; // no update for this long, and the feed counts as delayed
  const FRAME_MS = 33; // how often the chart redraws while it reshapes

  const UP = '#2ee6a6';
  const DOWN = '#ff5c7a';
  const INK = '#eef2ff';
  const SOFT = '#8f9abb';
  const WAIT = '#ffb547';
  const POINTS = 120; // the area line always has this many, so any two can morph into each other

  const s = state;
  const markets = Array.isArray(data.markets) ? data.markets : [];
  const count = markets.length;
  let history = {};
  try {
    history = JSON.parse(data.history || '{}');
  } catch {
    history = {};
  }
  const changed = event.changed ?? {};

  // Numbers, the way a markets screen writes them.
  const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fixed = (value, places) => {
    const [whole, part] = Math.abs(value).toFixed(places).split('.');
    return (value < 0 ? '-' : '') + group(whole) + (part ? `.${part}` : '');
  };
  const places = (price) => (price >= 10 ? 2 : price >= 1 ? 4 : 5);
  const money = (price) => (Number.isFinite(price) ? fixed(price, places(price)) : '—');
  const compact = (value) => {
    if (!Number.isFinite(value)) return '—';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}k`;
    return value < 1 ? '<$1' : `$${value.toFixed(0)}`;
  };
  const signed = (value, text) => (value >= 0 ? `+${text}` : text);
  const percent = (value) => (Number.isFinite(value) ? `${signed(value, value.toFixed(2))}%` : '—');
  const changeOf = (market) => (market.open ? (market.price - market.open) / market.open : 0) * 100;

  // A picture for an image layer. Attributes use single quotes, so this escapes very little.
  const picture = (svg) =>
    `data:image/svg+xml,${svg.replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}`;
  const n1 = (value) => Math.round(value * 10) / 10;

  // The candles of a market and range, with the latest price running on the last one.
  const candlesOf = (market, range, live = true) => {
    const stored = history[market.id]?.[range];
    if (!stored || !Array.isArray(stored.r) || !stored.r.length) return null;
    const rows = stored.r.map((row) => row.slice());
    if (live && Number.isFinite(market.price)) {
      const last = rows[rows.length - 1];
      last[3] = market.price;
      last[1] = Math.max(last[1], market.price);
      last[2] = Math.min(last[2], market.price);
    }
    return { rows, step: stored.s, last: stored.t };
  };

  // These show the stored candles without the latest price, so they aren't redrawn on every trade.
  const sparkline = (market) => {
    const candles = candlesOf(market, '24H', false);
    if (!candles) return picture("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 52'/>");
    const closes = candles.rows.map((row) => row[3]);
    const low = Math.min(...closes);
    const span = Math.max(...closes) - low || 1;
    const stride = Math.max(1, Math.floor(closes.length / 40));
    const line = [];
    for (let i = 0; i < closes.length; i += stride) line.push(closes[i]);
    if (line[line.length - 1] !== closes[closes.length - 1]) line.push(closes[closes.length - 1]);
    const d = line
      .map((value, i) => `${n1((i / (line.length - 1)) * 118 + 1)},${n1(46 - ((value - low) / span) * 40)}`)
      .join('L');
    const colour = changeOf(market) >= 0 ? UP : DOWN;
    return picture(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 52'><defs><linearGradient id='a' x2='0' y2='1'><stop stop-color='${colour}' stop-opacity='.28'/><stop offset='1' stop-color='${colour}' stop-opacity='0'/></linearGradient></defs><path d='M${d}L119,52L1,52Z' fill='url(#a)'/><path d='M${d}' fill='none' stroke='${colour}' stroke-width='2.2' stroke-linejoin='round' stroke-linecap='round'/></svg>`,
    );
  };

  // Round numbers for the price axis, wherever they happen to fall.
  const niceStep = (span) => {
    const raw = span / 5;
    const size = 10 ** Math.floor(Math.log10(raw));
    const scaled = raw / size;
    return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10) * size;
  };
  const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  const timeLabel = (seconds, range) => {
    const iso = new Date(seconds * 1000).toISOString();
    return range === '7D'
      ? `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`
      : iso.slice(11, 16);
  };

  // The same price at the same place in every view, so the crosshair can find it again.
  const scaleOf = (rows, view) => {
    const highs = rows.map((row) => (view === 'candles' ? row[1] : row[3]));
    const lows = rows.map((row) => (view === 'candles' ? row[2] : row[3]));
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const margin = (high - low || Math.abs(high) * 0.001 || 1) * 0.08;
    const top = high + margin;
    const bottom = low - margin;
    // The bottom of the picture belongs to the volume bars.
    const usable = PLOT.h - 72;
    return { top, bottom, y: (price) => 6 + ((top - price) / (top - bottom)) * (usable - 6) };
  };

  const resample = (values) => {
    const out = [];
    for (let i = 0; i < POINTS; i++) {
      const at = (i / (POINTS - 1)) * (values.length - 1);
      const below = Math.floor(at);
      const above = Math.min(values.length - 1, below + 1);
      out.push(values[below] + (values[above] - values[below]) * (at - below));
    }
    return out;
  };

  // Draws the chart. `amount` is how far it has come from the previous shape, 0 to 1.
  const drawChart = (candles, view, trendUp, targetLine, fromLine, amount) => {
    const { rows } = candles;
    const scale = scaleOf(rows, view);
    const colour = trendUp ? UP : DOWN;
    const width = PLOT.w;
    const height = PLOT.h;
    const inner = width - 16; // room for the dot on the last price
    const peak = Math.max(...rows.map((row) => row[4]), 1e-9);
    const slot = inner / rows.length;

    const step = niceStep(scale.top - scale.bottom);
    const ticks = [];
    for (let tick = Math.ceil(scale.bottom / step) * step; tick <= scale.top && ticks.length < 7; tick += step)
      ticks.push(tick);
    const grid = ticks.map((tick) => `M0,${n1(scale.y(tick))}H${width}`).join('');

    const volume = { up: '', down: '' };
    rows.forEach((row, i) => {
      const barHeight = (row[4] / peak) * 58 * amount;
      if (barHeight < 0.5) return;
      volume[row[3] >= row[0] ? 'up' : 'down'] += `M${n1((i + 0.5) * slot)},${height}v-${n1(barHeight)}`;
    });
    const volumeWidth = Math.max(1.5, n1(slot * 0.6));
    let body;
    let lastY;
    if (view === 'candles') {
      const middle = (PLOT.h - 72) / 2;
      const grow = (y) => n1(middle + (y - middle) * amount);
      const wicks = { up: '', down: '' };
      const bodies = { up: '', down: '' };
      const bodyWidth = Math.max(2, n1(slot * 0.62));
      rows.forEach((row, i) => {
        const side = row[3] >= row[0] ? 'up' : 'down';
        const x = n1((i + 0.5) * slot);
        const open = grow(scale.y(row[0]));
        const close = grow(scale.y(row[3]));
        const top = Math.min(open, close);
        const tall = Math.max(1.5, n1(Math.abs(close - open)));
        wicks[side] += `M${x},${grow(scale.y(row[1]))}V${grow(scale.y(row[2]))}`;
        bodies[side] += `M${n1(x - bodyWidth / 2)},${top}h${bodyWidth}v${tall}h-${bodyWidth}Z`;
      });
      body =
        `<path d='${wicks.up}' stroke='${UP}' stroke-width='1.5'/><path d='${wicks.down}' stroke='${DOWN}' stroke-width='1.5'/>` +
        `<path d='${bodies.up}' fill='${UP}'/><path d='${bodies.down}' fill='${DOWN}'/>`;
      lastY = middle + (scale.y(rows[rows.length - 1][3]) - middle) * amount;
    } else {
      const shown = targetLine.map((y, i) => (fromLine ? fromLine[i] + (y - fromLine[i]) * amount : y));
      const line = shown.map((y, i) => `${n1((i / (POINTS - 1)) * inner)},${n1(y)}`).join('L');
      body =
        `<path d='M${line}L${inner},${height}L0,${height}Z' fill='url(#a)'/>` +
        `<path d='M${line}' fill='none' stroke='${colour}' stroke-opacity='.16' stroke-width='10' stroke-linejoin='round'/>` +
        `<path d='M${line}' fill='none' stroke='${colour}' stroke-width='3' stroke-linejoin='round' stroke-linecap='round'/>`;
      lastY = shown[shown.length - 1];
    }
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'>` +
      `<defs><linearGradient id='a' x2='0' y2='1'><stop stop-color='${colour}' stop-opacity='.34'/><stop offset='.85' stop-color='${colour}' stop-opacity='0'/></linearGradient></defs>` +
      `<path d='${grid}' stroke='#fff' stroke-opacity='.07'/>` +
      `<path d='${volume.up}' stroke='${UP}' stroke-opacity='.3' stroke-width='${volumeWidth}'/>` +
      `<path d='${volume.down}' stroke='${DOWN}' stroke-opacity='.3' stroke-width='${volumeWidth}'/>` +
      body +
      `<path d='M0,${n1(lastY)}H${width}' stroke='${colour}' stroke-opacity='.55' stroke-dasharray='3 7'/>` +
      `</svg>`;
    return { svg, ticks, step, scale, lastY, inner };
  };

  // What the buttons and the feed changed since the last call.
  if (event.type === 'load') {
    s.selected = 0;
    s.prices = {};
    s.flash = {};
    s.morph = null;
    s.line = null;
    s.onAir = false;
  }
  if (event.type === 'play') {
    s.onAir = true;
    s.tourAt = nowMs + TOUR_MS;
    s.morph = { from: nowMs, line: null };
  }
  if (event.type === 'out') s.onAir = false;

  const clampIndex = (value) => (count ? ((Math.round(Number(value) || 0) % count) + count) % count : 0);
  let selected = clampIndex(data.selected);
  let range = ['1H', '24H', '7D'].includes(data.range) ? data.range : '24H';
  let view = data.view === 'candles' ? 'candles' : 'area';
  let tour = Boolean(data.tour);
  // Someone picked one. Only this function moves the tour, and it records where it went.
  if (event.type !== 'load' && selected !== s.selected) tour = false;
  const go = (by) => {
    selected = clampIndex(selected + by);
    tour = false;
  };
  if (event.type === 'custom-action') {
    if (event.actionId === 'market.next') go(1);
    if (event.actionId === 'market.prev') go(-1);
    if (event.actionId === 'market.tour') tour = !tour;
    if (event.actionId === 'view.toggle') view = view === 'area' ? 'candles' : 'area';
    if (event.actionId === 'range.next')
      range = { '1H': '24H', '24H': '7D', '7D': '1H' }[range];
  }
  if (tour && s.onAir && !data.hover && count > 1) {
    if (nowMs >= (s.tourAt ?? 0)) {
      selected = clampIndex(selected + 1);
      s.tourAt = nowMs + TOUR_MS;
    }
  } else if (s.tourAt < nowMs || data.hover) s.tourAt = nowMs + TOUR_MS;

  // A different picture on the big chart: it morphs there from the shape it has now.
  const shape = `${selected}/${range}/${view}`;
  if (s.shape !== undefined && s.shape !== shape)
    s.morph = { from: nowMs, line: s.line, marker: s.marker, rangeX: s.rangeX, viewX: s.viewX };
  else if (changed.history !== undefined && s.line)
    s.morph = { from: nowMs, line: s.line, marker: s.marker, rangeX: s.rangeX, viewX: s.viewX };
  s.shape = shape;
  s.selected = selected;
  let amount = 1;
  if (s.morph) {
    const progress = (nowMs - s.morph.from) / MORPH_MS;
    if (progress >= 1) s.morph = null;
    else amount = 1 - (1 - Math.max(0, progress)) ** 3;
  }
  const morphing = Boolean(s.morph);
  // The markers glide to their new places along with the chart.
  const glide = (from, to) => (morphing && Number.isFinite(from) ? from + (to - from) * amount : to);

  // Prices that moved light up for a moment.
  if (changed.markets !== undefined || event.type === 'load') {
    s.lastFeed = nowMs;
    if (event.type !== 'load') s.beat = nowMs + FLASH_MS;
    for (const market of markets) {
      const before = s.prices[market.id];
      if (before !== undefined && before !== market.price)
        s.flash[market.id] = { until: nowMs + FLASH_MS, up: market.price > before };
      s.prices[market.id] = market.price;
    }
  }
  for (const id of Object.keys(s.flash)) if (s.flash[id].until <= nowMs) delete s.flash[id];
  const priceColour = (market) => {
    const flash = s.flash[market.id];
    return flash ? (flash.up ? UP : DOWN) : INK;
  };

  const ui = {};

  // The watchlist.
  markets.slice(0, 8).forEach((market, i) => {
    const change = changeOf(market);
    ui[`r${i}_sym`] = market.id;
    ui[`r${i}_name`] = market.name ?? market.id;
    ui[`r${i}_price`] = money(market.price);
    ui[`r${i}_chg`] = percent(change);
    ui[`r${i}_chg_c`] = change >= 0 ? UP : DOWN;
    ui[`r${i}_price_c`] = priceColour(market);
    ui[`r${i}_spark`] = sparkline(market);
  });
  ui.marker_y = glide(s.morph?.marker, ROW.y + ROW.pitch * selected);
  ui.marker_bar_y = ui.marker_y + 18;
  s.marker = ui.marker_y;

  // The market on the big chart.
  const market = markets[selected] ?? { id: '—', name: 'Waiting for data', price: NaN, open: NaN };
  const change = changeOf(market);
  const up = change >= 0;
  ui.name = market.name ?? market.id;
  ui.pair = `${market.id} / USD`;
  ui.price = money(market.price);
  ui.price_c = priceColour(market);
  ui.chg = percent(change);
  ui.chg_abs = Number.isFinite(market.price - market.open)
    ? signed(market.price - market.open, fixed(market.price - market.open, places(market.price)))
    : '—';
  ui.chg_c = up ? UP : DOWN;
  ui.chip_c = up ? '#2ee6a624' : '#ff5c7a24';
  ui.open = money(market.open);
  ui.high = money(market.high);
  ui.low = money(market.low);
  ui.volume = compact(market.volume * market.price);
  ui.bid = money(market.bid ?? NaN);
  ui.ask = money(market.ask ?? NaN);
  ui.spread =
    Number.isFinite(market.ask) && Number.isFinite(market.bid)
      ? `$${fixed(market.ask - market.bid, places(market.price))}`
      : '—';
  const dayLow = Math.min(market.low, market.price);
  const daySpan = Math.max(market.high, market.price) - dayLow;
  const meterAt = daySpan > 0 ? (market.price - dayLow) / daySpan : 0.5;
  ui.meter_x = METER.x + (Number.isFinite(meterAt) ? meterAt : 0.5) * METER.w - 10;
  ui.meter_w = (Number.isFinite(meterAt) ? meterAt : 0.5) * METER.w;
  ui.range_x = glide(s.morph?.rangeX, RANGE_X[range]);
  ui.view_x = glide(s.morph?.viewX, VIEW_X[view]);
  s.rangeX = ui.range_x;
  s.viewX = ui.view_x;

  // The chart itself.
  const candles = candlesOf(market, range);
  let series = { n: 0 };
  if (candles) {
    const { rows } = candles;
    // Over 24 hours the chart agrees with the change beside it. The first candle starts a little later
    // than the market's own 24-hour open, so comparing with that could disagree on a quiet day.
    const trendUp = range === '24H' ? up : rows[rows.length - 1][3] >= rows[0][0];
    const lineScale = scaleOf(rows, view);
    const targetLine = resample(rows.map((row) => lineScale.y(row[3])));
    // With nothing to morph from, the area rises out of the volume bars instead.
    const startLine = morphing ? (s.morph.line ?? targetLine.map(() => PLOT.h - 72)) : null;
    const drawn = drawChart(candles, view, trendUp, targetLine, startLine, amount);
    ui.chart = picture(drawn.svg);
    s.line = startLine
      ? targetLine.map((y, i) => n1(startLine[i] + (y - startLine[i]) * amount))
      : targetLine.map(n1);

    const lead = drawn.step / 10 ** Math.floor(Math.log10(drawn.step));
    const decimals = Math.max(0, Math.ceil(-Math.log10(drawn.step)) + (Math.abs(lead - 2.5) < 1e-6 ? 1 : 0));
    for (let i = 0; i < 7; i++) {
      const tick = drawn.ticks[i];
      // A label under the tag on the last price would only peek out around it.
      const covered = tick !== undefined && Math.abs(lineScale.y(tick) - drawn.lastY) < 30;
      ui[`y${i}`] = tick === undefined || covered ? '' : fixed(tick, decimals);
      ui[`y${i}_y`] = tick === undefined ? PLOT.y : PLOT.y + lineScale.y(tick) - 14;
    }
    for (let i = 0; i < 5; i++) {
      const index = Math.min(rows.length - 1, Math.floor(((i + 0.5) / 5) * rows.length));
      ui[`x${i}`] = timeLabel(candles.last - (rows.length - 1 - index) * candles.step, range);
    }
    const trendColour = trendUp ? UP : DOWN;
    ui.tag_y = PLOT.y + drawn.lastY - 16;
    ui.tag_c = trendColour;
    ui.tag = market.price >= 1000 ? fixed(market.price, 0) : money(market.price);
    ui.dot_y = PLOT.y + drawn.lastY - 8;
    ui.dot_c = trendColour;
    ui.dot_x = PLOT.x + (view === 'candles' ? drawn.inner - (drawn.inner / rows.length) / 2 : drawn.inner) - 8;
    ui.dot_o = 1;
    ui.halo_x = ui.dot_x - 12;
    // Lights up when this market trades. A looping layer would do it too, but while any layer loops, the
    // runtime redraws every layer on every frame.
    ui.halo_c = `${trendColour}${s.flash[market.id] ? '66' : '1f'}`;
    ui.halo_y = ui.dot_y - 12;

    // For the crosshair, which is its own small function.
    series = {
      n: rows.length,
      closes: rows.map((row) => row[3]),
      first: rows[0][0],
      last: candles.last,
      step: candles.step,
      range,
      top: lineScale.top,
      bottom: lineScale.bottom,
      inner: drawn.inner,
      centred: view === 'candles',
    };
  } else {
    ui.chart = picture("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 830 430'/>");
    for (let i = 0; i < 7; i++) {
      ui[`y${i}`] = '';
      ui[`y${i}_y`] = PLOT.y;
    }
    for (let i = 0; i < 5; i++) ui[`x${i}`] = '';
    ui.tag_y = PLOT.y;
    ui.tag_c = SOFT;
    ui.tag = '';
    ui.dot_x = PLOT.x;
    ui.dot_y = PLOT.y;
    ui.dot_c = SOFT;
    ui.dot_o = 0;
    ui.halo_x = PLOT.x;
    ui.halo_c = '#ffffff00';
    ui.halo_y = PLOT.y;
  }

  // The whole market at a glance.
  const moves = markets.map((item) => ({ item, change: changeOf(item) }));
  const risers = moves.filter((entry) => entry.change >= 0).length;
  ui.breadth = `${risers} rising · ${count - risers} falling`;
  ui.breadth_w = count ? (risers / count) * BAR_W : BAR_W / 2;
  const ranked = [...moves].sort((a, b) => b.change - a.change);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  ui.best_sym = best?.item.id ?? '—';
  ui.best_chg = best ? percent(best.change) : '—';
  ui.best_c = (best?.change ?? 0) >= 0 ? UP : DOWN;
  ui.worst_sym = worst?.item.id ?? '—';
  ui.worst_chg = worst ? percent(worst.change) : '—';
  ui.worst_c = (worst?.change ?? 0) >= 0 ? UP : DOWN;

  // Is the feed alive?
  const late = nowMs - (s.lastFeed ?? 0) > LATE_MS;
  const feed = String(data.feed_status ?? '');
  const status =
    feed === 'live'
      ? late
        ? ['DELAYED', WAIT]
        : ['LIVE', UP]
      : feed === 'connecting'
        ? ['CONNECTING', WAIT]
        : feed === 'reconnecting'
          ? ['RECONNECTING', WAIT]
          : ['SAMPLE DATA', WAIT];
  ui.status = status[0];
  ui.status_c = status[1];
  ui.live_c = `${status[1]}${s.beat > nowMs ? '73' : '1f'}`;
  ui.as_of = data.as_of ? `Last trade ${String(data.as_of).slice(11, 19)} UTC` : 'Waiting for the first trade';

  ui.tour = tour ? 'AUTO TOUR ON' : 'AUTO TOUR OFF';
  ui.tour_c = tour ? UP : SOFT;
  ui.tour_o = tour ? 1 : 0;

  // The last trades, newest on top. The collection slides each row to its new place.
  const tape = (Array.isArray(data.trades) ? data.trades : []).slice(0, 9).map((trade, slot) => ({
    id: String(trade.id),
    slot,
    sym: trade.sym,
    price: money(trade.price),
    value: compact(trade.price * trade.size),
    colour: trade.side === 'sell' ? DOWN : UP,
  }));

  // The crawl along the bottom: daily exchange rates and where all this comes from.
  const crawlItem = (id, parts) => {
    const content = parts.map((part) => part[0]).join('');
    return {
      id,
      name: id,
      width: Math.round(content.length * 14.6) + 24,
      height: 48,
      element: {
        type: 'text',
        content,
        runs: parts.map(([text, color, fontWeight]) => ({ text, color, fontWeight })),
        color: INK,
        strokeColor: 'transparent',
        strokeWidth: 0,
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 25,
        fontWeight: 500,
        textAlign: 'left',
        verticalAlign: 'middle',
        lineHeight: 1,
        letterSpacing: 0,
        baselineShift: 0,
        textTransform: 'none',
        minFontSize: 25,
        overflowPolicy: 'clip',
        autoFit: 'fixed',
        direction: 'ltr',
        language: 'en',
        textAnimation: {
          type: 'none',
          split: 'grapheme',
          durationFrames: 18,
          cursor: 'none',
          cursorBlinkFrames: 30,
          replayOnUpdate: false,
        },
      },
    };
  };
  const rates = (Array.isArray(data.fx) ? data.fx : []).map((rate) =>
    crawlItem(`fx-${rate.pair.replace(/\W/g, '')}`, [
      [`${rate.pair}  `, SOFT, 600],
      [rate.rate.toFixed(rate.rate >= 20 ? 2 : 4), INK, 600],
    ]),
  );
  const crawl = [
    ...rates,
    crawlItem('note-source', [
      ['Crypto: Coinbase Exchange, live  ·  Exchange rates: ECB via Frankfurter, daily', SOFT, 500],
    ]),
    crawlItem('note-advice', [['For illustration only, not investment advice', SOFT, 500]]),
  ];

  // When to run again: the next frame of a morph, the end of a flash, the next tour stop.
  const wakes = [];
  if (morphing) wakes.push(nowMs + FRAME_MS);
  for (const id of Object.keys(s.flash)) wakes.push(s.flash[id].until);
  if (s.beat > nowMs) wakes.push(s.beat);
  if (s.onAir) {
    if (tour) wakes.push(Math.max(s.tourAt, nowMs + FRAME_MS));
    if (feed === 'live') wakes.push(Math.max((s.lastFeed ?? 0) + LATE_MS + 1, nowMs + 1000));
  }

  // Only what this call changed. A click can land while a call is running, and echoing the old value
  // back would undo it.
  const out = { ui, tape, crawl };
  // The crosshair runs whenever this changes, and it has nothing to do until someone is on the chart.
  if (data.hover || event.type === 'load') out.series = series;
  if (selected !== Number(data.selected)) out.selected = selected;
  if (range !== data.range) out.range = range;
  if (view !== data.view) out.view = view;
  if (tour !== Boolean(data.tour)) out.tour = tour;

  return { state: s, data: out, wakeAt: wakes.length ? Math.min(...wakes) : null };
}
