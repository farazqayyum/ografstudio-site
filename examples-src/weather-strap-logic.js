// The Weather strap: Studio's Functions pane shows this same source.
//
// It runs in a sandbox inside the graphic. Whoever plays the graphic sends the forecast, `cities`; the
// operator picks the `city` and `when`. This writes what the strap says into one object, `ui`, and the
// weather the shader fills the icon box with.
({ data }) => {
  // WMO weather codes, as Open-Meteo sends them, to the sky the icon shows. The icon is named here,
  // not drawn: the icon layer turns the name into its picture (examples-src/weather-icons.mjs on
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
        icon: skyOf(num(code, 3), day),
        high: `H ${degrees(high)}`,
        low: `L ${degrees(low)}`,
      },
      focus: kindOf(num(code, 0)),
    },
  };
}
