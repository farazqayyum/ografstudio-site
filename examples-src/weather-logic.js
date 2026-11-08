// The Weather example: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic sends the forecast, `cities`,
// and the operator picks the `featured` city for the five-day outlook, or turns on `tour` to visit
// every city in turn. This turns that into what the layers show: one object, `ui`, with every sky,
// number, colour and date, and the weather codes the see-through rain and snow shader reads. The map
// has all three of its days on their layers at once, today, tomorrow and the day after, and rules
// show the one the presenter picked (weather.mjs), so a change of day needs nothing from here.
//
// A new outlook city clears the outlook's weather and dips its numbers, then sends the camera gliding
// to it (rules in weather.mjs). The outlook keeps the old city while the camera moves: this wakes
// itself once the camera has stopped, changes the numbers and counts a landing, and the landing
// brings the numbers and the new city's weather back. It wakes again to move a tour on. `state`
// remembers where it is.
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
  // How long the camera takes from one city to another, in frames at 50 a second: longer trips take
  // longer, though not in proportion. Keep in step with flightFrames in weather.mjs.
  const flightFrames = (from, to) => {
    const a = SLOTS.find(([name]) => name === from);
    const b = SLOTS.find(([name]) => name === to);
    return from === to || !a || !b ? 40 : Math.round(26 + 1.8 * Math.sqrt(Math.hypot(b[1] - a[1], b[2] - a[2])));
  };
  // The camera waits this long for the weather to clear before it sets off. Keep in step with CLEAR
  // in weather.mjs.
  const CLEAR_MS = 320;
  // The numbers change this long after the camera stops. Anything that changes while the camera
  // moves would make it start its move again, from a standstill.
  const LAND_MS = 100;
  const landAt = (now, from, to) => now + CLEAR_MS + flightFrames(from, to) * 20 + LAND_MS;
  const STAY_MS = 7000; // a tour's time on each city, from the landing to the next move
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
    ui[`name${i}`] = String(city.name ?? SLOTS[i][0]).toUpperCase();
    // The map's three days, by their highs: a today, b tomorrow, c the day after.
    ['a', 'b', 'c'].forEach((part, d) => {
      const day = dayOf(city, d);
      ui[`icon${i}${part}`] = skyOf(num(day.code, 3), true);
      ui[`temp${i}${part}`] = degrees(day.high);
      ui[`chip${i}${part}`] = chipOf(day.high);
      kinds[part].push(kindOf(num(day.code, 0)));
    });
  });

  // The titles, and the day buttons: the third is named after its weekday.
  const [first, second, third] = [0, 1, 2].map((d) => dateOf(dayOf(cities[0], d).date));
  const long = (when) => `${when.weekday} ${when.day} ${when.month}`;
  ui.date = first ? long(first) : '';
  ui.sub_today = first ? `${long(first)} · highs` : 'Highs';
  ui.sub_next = second ? `${long(second)} · highs` : 'Highs';
  ui.sub_after = third ? `${long(third)} · highs` : 'Highs';
  ui.title_after = third ? third.weekday.toUpperCase() : 'LATER';

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
  let landed = typeof kept.landed === 'number' ? kept.landed : 0; // landings so far
  let moveTo = null;
  if (event?.type === 'load' || event?.type === 'play' || event?.type === 'out') {
    // Nothing moves off air, so start from the featured city.
    showing = featured;
    swapAt = null;
    nextAt = null;
  }
  if ('featured' in changed) {
    // Even back to the city it shows, the camera has a way to go and the numbers are down.
    swapAt = landAt(now, showing, featured);
    nextAt = null;
  }
  // Turned on, a tour sets off at once.
  if ('tour' in changed) nextAt = touring && swapAt === null ? now + 300 : null;
  if (swapAt !== null && now >= swapAt) {
    showing = featured;
    swapAt = null;
    landed += 1;
  }
  if (!touring) nextAt = null;
  else if (swapAt === null && nextAt === null) nextAt = now + STAY_MS;
  else if (swapAt === null && now >= nextAt) {
    // Writing `featured` moves the camera, the same as an operator's pick.
    moveTo = TOUR[(TOUR.indexOf(featured) + 1) % TOUR.length];
    swapAt = landAt(now, showing, moveTo);
    featured = moveTo;
    nextAt = null;
  }
  const due = [swapAt, nextAt].filter((at) => at !== null);

  // Where the close-up rests before any move: on the city the outlook shows. Rules move it from
  // there, so a pick changes nothing here until the landing.
  const slotOf = (name) => SLOTS.findIndex(([slotName]) => slotName === name);
  const slot = slotOf(showing);
  const [, fx, fy] = SLOTS[slot];
  ui.zoom_x = Math.round(FOCUS.x - ZOOM * (fx - CLOSE_UP.x));
  ui.zoom_y = Math.round(FOCUS.y - ZOOM * (fy - CLOSE_UP.y));
  // The rules read these: which city the camera leaves from, and when it has landed.
  ui.shown = showing;
  ui.landed = landed;

  // The five-day outlook.
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
    state: { showing, swapAt, nextAt, landed },
    wakeAt: due.length ? Math.min(...due) : null,
    data: {
      ...(moveTo ? { featured: moveTo } : {}),
      ui,
      today_a: pack(kinds.a.slice(0, 6)),
      today_b: pack(kinds.a.slice(6)),
      next_a: pack(kinds.b.slice(0, 6)),
      next_b: pack(kinds.b.slice(6)),
      after_a: pack(kinds.c.slice(0, 6)),
      after_b: pack(kinds.c.slice(6)),
      focus,
    },
  };
}
