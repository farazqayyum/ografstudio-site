// The Weather strap: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic sends the forecast, `cities`; the
// operator picks the `city` and `when`. This writes what the strap says into one object, `ui`, and the
// weather the shader fills the icon box with.
({ data }) => {
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
  const picture = (name) =>
    `data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${ICONS[name]}</svg>`
      .replace(/#/g, '%23')
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E')}`;

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
  const wordsOf = (code, day) => {
    if (code <= 1) return day ? 'Sunny' : 'Clear';
    if (code === 2) return 'Some cloud';
    if (code === 3) return 'Cloudy';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code === 65) return 'Heavy rain';
    if (code === 82) return 'Heavy showers';
    if (code === 80 || code === 81) return 'Showers';
    if (code >= 61 && code <= 67) return 'Rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
    if (code >= 95) return 'Thunderstorms';
    return 'Cloudy';
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
  const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const degrees = (value) => {
    const n = Math.round(num(value));
    return `${n < 0 ? '−' : ''}${Math.abs(n)}°`;
  };

  const cities = Array.isArray(data.cities) ? data.cities : [];
  const wanted = String(data.city ?? '').toLowerCase();
  const city = cities.find((item) => String(item?.name ?? '').toLowerCase() === wanted) ?? cities[0] ?? { days: [] };
  const days = Array.isArray(city.days) ? city.days : [];
  const today = days[0] ?? {};
  const next = days[1] ?? {};
  const when = ['now', 'tonight', 'tomorrow'].includes(data.when) ? data.when : 'today';

  // The big number, the words, the icon and the high and low for each choice.
  const shown = {
    now: [city.temp, wordsOf(num(city.code, 3), city.is_day !== false), city.code, city.is_day !== false, today.high, today.low],
    today: [city.temp, `${wordsOf(num(today.code, 3), true)} today`, today.code, true, today.high, today.low],
    tonight: [city.night_low, `${wordsOf(num(city.night_code, 3), false)} tonight`, city.night_code, false, today.high, city.night_low],
    tomorrow: [next.high, `${wordsOf(num(next.code, 3), true)} tomorrow`, next.code, true, next.high, next.low],
  }[when];
  const [temp, headline, code, day, high, low] = shown;

  return {
    data: {
      ui: {
        label: `WEATHER · ${String(city.name ?? '').toUpperCase()}`,
        headline,
        temp: degrees(temp),
        icon: picture(skyOf(num(code, 3), day)),
        high: `H ${degrees(high)}`,
        low: `L ${degrees(low)}`,
      },
      focus: kindOf(num(code, 0)),
    },
  };
}
