// The Weather example: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic sends the forecast, `cities`,
// and the operator picks the `featured` city for the five-day outlook. This turns that into what the
// layers show: one object, `ui`, with every icon, number, colour and date, and the weather codes the
// see-through rain and snow shader reads. Each step's numbers are already on their layers, so the
// steps themselves are plain animation and need nothing from here.
({ data }) => {
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
  const MARGIN = 300; // the map is drawn this far past every edge of the frame
  const BAR_W = 140; // the rain chance bar on each outlook card

  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // The icons, drawn on a 64 x 64 grid.
  const CLOUD = (y, fill = '#E8EFF8') =>
    `<path d='M17 ${y}h31a11 11 0 0 0 1.6-21.9A15 15 0 0 0 21 ${y - 26.5}A11.5 11.5 0 0 0 17 ${y}Z' fill='${fill}'/>`;
  const SMALL_CLOUD = `<path d='M23 54h28a10 10 0 0 0 1.4-19.9A13.5 13.5 0 0 0 26.8 30A10.4 10.4 0 0 0 23 54Z' fill='#E8EFF8'/>`;
  const ICONS = {
    sun: `<g stroke='#FFC53D' stroke-width='4.5' stroke-linecap='round'><path d='M32 5v8M32 51v8M5 32h8M51 32h8M12.9 12.9l5.7 5.7M45.4 45.4l5.7 5.7M12.9 51.1l5.7-5.7M45.4 18.6l5.7-5.7'/></g><circle cx='32' cy='32' r='12.5' fill='#FFC53D'/>`,
    moon: `<path d='M38 8A24 24 0 1 0 56 42A21 21 0 0 1 38 8Z' fill='#F3E3A2'/>`,
    partly: `<g stroke='#FFC53D' stroke-width='3.5' stroke-linecap='round'><path d='M24 4v6M7 21h6M11.3 8.3l4.2 4.2M36.7 8.3l-4.2 4.2M11.3 33.7l4.2-4.2'/></g><circle cx='24' cy='21' r='9.5' fill='#FFC53D'/>${SMALL_CLOUD}`,
    'partly-night': `<path d='M27 5A17 17 0 1 0 40 29A15 15 0 0 1 27 5Z' fill='#F3E3A2'/>${SMALL_CLOUD}`,
    cloud: CLOUD(48),
    fog: `${CLOUD(36)}<g stroke='#B9C8DB' stroke-width='4.5' stroke-linecap='round'><path d='M10 44h44M16 53h38'/></g>`,
    drizzle: `${CLOUD(40)}<g stroke='#7FD0FF' stroke-width='3.5' stroke-linecap='round'><path d='M24 47l-1.5 4M34 47l-1.5 4M44 47l-1.5 4M29 55l-1.5 4M39 55l-1.5 4'/></g>`,
    rain: `${CLOUD(40)}<g stroke='#4FB3FF' stroke-width='4' stroke-linecap='round'><path d='M23 46l-4 10M34 46l-4 10M45 46l-4 10'/></g>`,
    snow: `${CLOUD(40)}<g fill='#FFFFFF'><circle cx='22' cy='49' r='3'/><circle cx='34' cy='52' r='3'/><circle cx='46' cy='49' r='3'/><circle cx='28' cy='59' r='3'/><circle cx='40' cy='59' r='3'/></g>`,
    thunder: `${CLOUD(40, '#C9D4E3')}<path d='M34 37l-9 13h7l-4 11 13-16h-7l4-8Z' fill='#FFD23D'/>`,
  };
  const picture = (body) =>
    `data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${body}</svg>`
      .replace(/#/g, '%23')
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')}`;
  const drawn = {};
  const iconFor = (name) => (drawn[name] ??= picture(ICONS[name]));

  // WMO weather codes, as Open-Meteo sends them.
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
      ui[`icon${i}${part}`] = iconFor(skyOf(num(code, 3), day));
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

  // The five-day outlook for the featured city.
  const wanted = String(data.featured ?? '').toLowerCase();
  const slot = Math.max(0, SLOTS.findIndex(([name]) => name.toLowerCase() === wanted));
  const featured = cities[slot];
  const [, fx, fy] = SLOTS[slot];
  ui.city = ui[`name${slot}`];
  ui.zoom_x = Math.round(FOCUS.x - ZOOM * (fx + MARGIN));
  ui.zoom_y = Math.round(FOCUS.y - ZOOM * (fy + MARGIN));
  ui.now_icon = iconFor(skyOf(num(featured.code, 3), featured.is_day !== false));
  ui.now_temp = degrees(featured.temp);
  ui.now_sky = WORDS[num(featured.code, 3)] ?? 'Cloudy';
  ui.now_info = `Feels like ${degrees(featured.feels ?? featured.temp)} · Wind ${Math.round(num(featured.wind))} km/h · Humidity ${Math.round(num(featured.humidity))}%`;
  const days = Array.from({ length: 5 }, (_, j) => dayOf(featured, j));
  const firstDay = dateOf(days[0].date);
  const lastDay = dateOf(days[4].date);
  ui.sub_outlook = firstDay && lastDay ? `${firstDay.weekday} ${firstDay.day} to ${lastDay.weekday} ${lastDay.day}` : '';
  days.forEach((day, j) => {
    const when = dateOf(day.date);
    const rain = Math.max(0, Math.min(100, Math.round(num(day.rain))));
    ui[`day${j}`] = when ? when.weekday.slice(0, 3).toUpperCase() : '';
    ui[`date${j}`] = when ? `${when.day} ${when.month.slice(0, 3)}` : '';
    ui[`dicon${j}`] = iconFor(skyOf(num(day.code, 3), true));
    ui[`high${j}`] = degrees(day.high);
    ui[`low${j}`] = degrees(day.low);
    ui[`rain${j}`] = `${rain}%`;
    ui[`bar${j}`] = Math.max(1, Math.round((BAR_W * rain) / 100));
    ui[`strip${j}`] = chipOf(day.high);
  });

  // Rain and snow fill the close-up when it's falling there now, or forecast for today.
  const focus = kindOf(num(featured.code, 0)) || kindOf(num(days[0].code, 0));

  return {
    data: {
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
