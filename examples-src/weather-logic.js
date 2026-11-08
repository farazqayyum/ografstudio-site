// The Weather example: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic sends the forecast, `cities`,
// and the operator picks the `featured` city for the five-day outlook, or turns on `tour` to visit
// every city in turn. This turns that into what the layers show: one object, `ui`, with every sky,
// number, colour and date, and the weather codes the see-through rain and snow shader reads. Each
// step's numbers are already on their layers, so the steps themselves are plain animation and need
// nothing from here.
//
// A new outlook city moves the camera and dips the outlook's numbers (rules in weather.mjs). The
// outlook keeps the old city while its numbers are down: this wakes itself to change them before
// they come back up, and wakes again to move a tour on. `state` remembers where it is.
({ data, state, event, nowMs }) => {
  // Where each slot sits on the map, in the order of the cities' layers. Keep these in step with
  // weather.mjs and weather-sky.glsl.
  const SLOTS = [
    ['Lisbon', 718, 857], ['Madrid', 862, 832], ['Dublin', 888, 408], ['London', 996, 489],
    ['Paris', 1037, 581], ['Berlin', 1268, 468], ['Rome', 1261, 814], ['Vienna', 1339, 604],
    ['Warsaw', 1419, 463], ['Stockholm', 1334, 241], ['Athens', 1553, 910], ['Istanbul', 1663, 785],
  ];
  // The close-up: the map drawn 2.4 times larger, with the featured city here.
  const ZOOM = 2.4;
  const FOCUS = { x: 660, y: 640 };
  // Where the close-up's picture of the map starts. Keep in step with CLOSE_UP in weather-map.mjs.
  const CLOSE_UP = { x: 330, y: -130 };
  const BAR_W = 140; // the rain chance bar on each outlook card
  // In step with the rules in weather.mjs: the outlook's numbers are down from 0.4 s after a new
  // city until 0.92 s, so they change at 0.6 s.
  const SWAP_MS = 600;
  const STAY_MS = 7000; // a tour's time on each city, from that change to the next move
  // A tour goes round the map rather than down the list.
  const TOUR = ['Lisbon', 'Madrid', 'Rome', 'Athens', 'Istanbul', 'Vienna', 'Warsaw', 'Stockholm', 'Berlin', 'Paris', 'London', 'Dublin'];

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // WMO weather codes, as Open-Meteo sends them, to the sky an icon shows. Icons are named here, not
  // drawn: each icon layer turns the name into its picture (examples-src/weather-icons.mjs on
  // ografstudio.org).
  const skyOf = (code, day) => {
    if (code <= 1) return day ? 'sun' : 'moon';
    if (code === 2) return day ? 'partly' : 'partly-night';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'thunder';
    return 'cloud';
  };
  const WORDS = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Freezing fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Showers', 81: 'Showers',
    82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunder and hail', 99: 'Thunder and hail',
  };
  // What the shader draws: 0 nothing, 1 fog, 2 drizzle, 3 rain, 4 heavy rain, 5 thunder, 6 light snow, 7 snow.
  const kindOf = (code) => {
    if (code === 45 || code === 48) return 1;
    if (code >= 51 && code <= 57) return 2;
    if (code === 65 || code === 82) return 4;
    if ((code >= 61 && code <= 67) || code === 80 || code === 81) return 3;
    if (code >= 95) return 5;
    if (code === 71 || code === 85) return 6;
    if ((code >= 71 && code <= 77) || code === 86) return 7;
    return 0;
  };
  // Six cities to a number, one base-8 digit each.
  const pack = (kinds) => kinds.reduce((sum, kind, i) => sum + kind * 8 ** i, 0);

  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const degrees = (value) => {
    const n = Math.round(num(value));
    return `${n < 0 ? '−' : ''}${Math.abs(n)}°`;
  };
  // Cold blue to hot red.
  const chipOf = (value) => {
    const t = num(value);
    if (t <= 0) return '#8ccfff';
    if (t <= 5) return '#79e3d6';
    if (t <= 10) return '#bdeb73';
    if (t <= 15) return '#ffe36e';
    if (t <= 20) return '#ffbe55';
    if (t <= 25) return '#ff9157';
    return '#ff6464';
  };
  const dateOf = (text) => {
    const [y, m, d] = String(text ?? '').split('-').map(Number);
    if (!y || !m || !d) return null;
    return { weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], day: d, month: MONTHS[m - 1] };
  };

  // Each slot takes the city of its name, wherever the controller put it in the list.
  const sent = Array.isArray(data.cities) ? data.cities : [];
  const byName = new Map(sent.map((city) => [String(city?.name ?? '').toLowerCase(), city]));
  const cities = SLOTS.map(([name], i) => byName.get(name.toLowerCase()) ?? sent[i] ?? { name, days: [] });
  const dayOf = (city, i) => (Array.isArray(city.days) ? city.days[i] : null) ?? {};

  const ui = {};
  const kinds = { a: [], b: [], c: [] };
  cities.forEach((city, i) => {
    const today = dayOf(city, 0);
    const next = dayOf(city, 1);
    ui[`name${i}`] = String(city.name ?? SLOTS[i][0]).toUpperCase();
    // a today's high, b tonight's low, c tomorrow's high.
    const shown = {
      a: [today.code, today.high, true],
      b: [city.night_code, city.night_low, false],
      c: [next.code, next.high, true],
    };
    for (const [part, [code, value, day]] of Object.entries(shown)) {
      ui[`icon${i}${part}`] = skyOf(num(code, 3), day);
      ui[`temp${i}${part}`] = degrees(value);
      ui[`chip${i}${part}`] = chipOf(value);
      kinds[part].push(kindOf(num(code, 0)));
    }
  });

  // The titles.
  const first = dateOf(dayOf(cities[0], 0).date);
  const second = dateOf(dayOf(cities[0], 1).date);
  ui.date = first ? `${first.weekday} ${first.day} ${first.month}` : '';
  ui.sub_today = first ? `${ui.date} · highs` : 'Highs';
  ui.sub_tonight = first ? `${first.weekday} night · lows` : 'Lows';
  ui.sub_tomorrow = second ? `${second.weekday} ${second.day} ${second.month} · highs` : 'Highs';

  // Which city the outlook shows, and when that changes.
  const nameOf = (value) => SLOTS.find(([name]) => name.toLowerCase() === String(value ?? '').toLowerCase())?.[0];
  const kept = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  const now = num(nowMs);
  const touring = data.tour === true;
  const changed = (event?.type === 'data' && event.changed) || {};
  let featured = nameOf(data.featured) ?? SLOTS[0][0];
  let showing = nameOf(kept.showing) ?? featured;
  let swapAt = typeof kept.swapAt === 'number' ? kept.swapAt : null; // when the numbers change
  let nextAt = typeof kept.nextAt === 'number' ? kept.nextAt : null; // when a tour moves on
  let moveTo = null;
  if (event?.type === 'load' || event?.type === 'play' || event?.type === 'out') {
    // Nothing moves off air, so start from the featured city.
    showing = featured;
    swapAt = null;
    nextAt = null;
  }
  if ('featured' in changed) {
    swapAt = featured === showing ? null : now + SWAP_MS;
    nextAt = null;
  }
  // Turned on, a tour sets off at once.
  if ('tour' in changed) nextAt = touring && swapAt === null ? now + 300 : null;
  if (swapAt !== null && now >= swapAt) {
    showing = featured;
    swapAt = null;
  }
  if (!touring) nextAt = null;
  else if (swapAt === null && nextAt === null) nextAt = now + STAY_MS;
  else if (swapAt === null && now >= nextAt) {
    // Writing `featured` moves the camera, the same as an operator's pick.
    moveTo = TOUR[(TOUR.indexOf(featured) + 1) % TOUR.length];
    featured = moveTo;
    swapAt = now + SWAP_MS;
    nextAt = null;
  }
  const due = [swapAt, nextAt].filter((at) => at !== null);

  // Where the close-up rests before any move: on the featured city.
  const slotOf = (name) => SLOTS.findIndex(([slotName]) => slotName === name);
  const [, fx, fy] = SLOTS[slotOf(featured)];
  ui.zoom_x = Math.round(FOCUS.x - ZOOM * (fx - CLOSE_UP.x));
  ui.zoom_y = Math.round(FOCUS.y - ZOOM * (fy - CLOSE_UP.y));

  // The five-day outlook.
  const slot = slotOf(showing);
  const here = cities[slot];
  ui.city = ui[`name${slot}`];
  ui.now_icon = skyOf(num(here.code, 3), here.is_day !== false);
  ui.now_temp = degrees(here.temp);
  ui.now_sky = WORDS[num(here.code, 3)] ?? 'Cloudy';
  ui.now_info = `Feels like ${degrees(here.feels ?? here.temp)} · Wind ${Math.round(num(here.wind))} km/h · Humidity ${Math.round(num(here.humidity))}%`;
  const days = Array.from({ length: 5 }, (_, j) => dayOf(here, j));
  const firstDay = dateOf(days[0].date);
  const lastDay = dateOf(days[4].date);
  ui.sub_outlook = firstDay && lastDay ? `${firstDay.weekday} ${firstDay.day} to ${lastDay.weekday} ${lastDay.day}` : '';
  days.forEach((day, j) => {
    const when = dateOf(day.date);
    const rain = Math.max(0, Math.min(100, Math.round(num(day.rain))));
    ui[`day${j}`] = when ? when.weekday.slice(0, 3).toUpperCase() : '';
    ui[`date${j}`] = when ? `${when.day} ${when.month.slice(0, 3)}` : '';
    ui[`dicon${j}`] = skyOf(num(day.code, 3), true);
    ui[`high${j}`] = degrees(day.high);
    ui[`low${j}`] = degrees(day.low);
    ui[`rain${j}`] = `${rain}%`;
    ui[`bar${j}`] = Math.max(1, Math.round((BAR_W * rain) / 100));
    ui[`strip${j}`] = chipOf(day.high);
  });

  // Rain and snow fill the close-up when it's falling there now, or forecast for today.
  const focus = kindOf(num(here.code, 0)) || kindOf(num(days[0].code, 0));

  return {
    state: { showing, swapAt, nextAt },
    wakeAt: due.length ? Math.min(...due) : null,
    data: {
      ...(moveTo ? { featured: moveTo } : {}),
      ui,
      today_a: pack(kinds.a.slice(0, 6)),
      today_b: pack(kinds.a.slice(6)),
      tonight_a: pack(kinds.b.slice(0, 6)),
      tonight_b: pack(kinds.b.slice(6)),
      next_a: pack(kinds.c.slice(0, 6)),
      next_b: pack(kinds.c.slice(6)),
      focus,
    },
  };
}
