// What the Weather example shows and where it comes from. The feed on the site and the script that
// saves the graphic's sample data both read this.
export const CREDIT = 'Forecast: Open-Meteo.com';
export const API = 'https://api.open-meteo.com/v1/forecast';

/** West to east is not the order here: the graphic places each city by its slot, so keep this order. */
export const CITIES = [
  {name: 'Lisbon', lat: 38.72, lon: -9.14},
  {name: 'Madrid', lat: 40.42, lon: -3.7},
  {name: 'Dublin', lat: 53.35, lon: -6.26},
  {name: 'London', lat: 51.51, lon: -0.13},
  {name: 'Paris', lat: 48.86, lon: 2.35},
  {name: 'Berlin', lat: 52.52, lon: 13.4},
  {name: 'Rome', lat: 41.9, lon: 12.5},
  {name: 'Vienna', lat: 48.21, lon: 16.37},
  {name: 'Warsaw', lat: 52.23, lon: 21.01},
  {name: 'Stockholm', lat: 59.33, lon: 18.07},
  {name: 'Athens', lat: 37.98, lon: 23.73},
  {name: 'Istanbul', lat: 41.01, lon: 28.98},
];

/** The five days of the outlook, today first. One day more is fetched for the cities still on yesterday. */
const DAYS = 5;
/** Tonight runs from six in the evening to six in the morning, in each city's own time. */
const NIGHT_FROM = 18;
const NIGHT_TO = 6;

/** Which of two weather codes says more: thunder over snow over rain, and so on down to a clear sky. */
function severity(code) {
  if (code >= 95) return 9;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 8;
  if (code === 65 || code === 67 || code === 82) return 7;
  if ((code >= 61 && code <= 66) || code === 80 || code === 81) return 6;
  if (code >= 51 && code <= 57) return 5;
  if (code === 45 || code === 48) return 4;
  return Math.max(0, Math.min(3, code));
}

/** One city's forecast in the shape the graphic takes, from the day given. */
function cityOf({name}, f, today) {
  const first = Math.max(0, f.daily.time.indexOf(today));
  const tomorrow = f.daily.time[first + 1];
  const night = {low: Infinity, code: 0};
  f.hourly.time.forEach((time, i) => {
    const [date, clock] = time.split('T');
    const hour = Number(clock.slice(0, 2));
    const tonight =
      (date === today && hour >= NIGHT_FROM) || (date === tomorrow && hour <= NIGHT_TO);
    if (!tonight) return;
    night.low = Math.min(night.low, f.hourly.temperature_2m[i]);
    const code = f.hourly.weather_code[i];
    if (severity(code) > severity(night.code)) night.code = code;
  });
  return {
    name,
    temp: Math.round(f.current.temperature_2m),
    feels: Math.round(f.current.apparent_temperature),
    code: f.current.weather_code,
    is_day: f.current.is_day === 1,
    wind: Math.round(f.current.wind_speed_10m),
    humidity: Math.round(f.current.relative_humidity_2m),
    night_code: night.code,
    night_low: Math.round(Number.isFinite(night.low) ? night.low : f.daily.temperature_2m_min[first + 1]),
    days: f.daily.time.slice(first, first + DAYS).map((date, i) => ({
      date,
      code: f.daily.weather_code[first + i],
      high: Math.round(f.daily.temperature_2m_max[first + i]),
      low: Math.round(f.daily.temperature_2m_min[first + i]),
      rain: Math.round(f.daily.precipitation_probability_max[first + i] ?? 0),
    })),
  };
}

/** All twelve cities in one request: now, tonight hour by hour, and the next days. */
export async function fetchForecast(signal) {
  const query = new URLSearchParams({
    latitude: CITIES.map((city) => city.lat).join(','),
    longitude: CITIES.map((city) => city.lon).join(','),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(DAYS + 1),
  });
  const response = await fetch(`${API}?${query}`, {signal});
  if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
  const body = await response.json();
  const forecasts = Array.isArray(body) ? body : [body];
  // Just after midnight the east is a day ahead of the west. Everyone takes the newest day, which the
  // cities still behind have too, so the dates on screen agree.
  const today = forecasts.map((f) => f.daily.time[0]).sort().at(-1);
  return CITIES.map((city, i) => cityOf(city, forecasts[i], today));
}
