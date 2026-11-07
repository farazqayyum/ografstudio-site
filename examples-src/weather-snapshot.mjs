/**
 * Saves a real forecast for the Weather example, so the graphic has something true to show before any
 * feed reaches it: on Studio's canvas, in thumbnails, or in a controller that sends no data.
 *
 *   node examples-src/weather-snapshot.mjs
 */
import { writeFileSync } from 'node:fs';
import { fetchForecast } from '../src/data/weatherData.mjs';

const cities = await fetchForecast();
const snapshot = { taken: new Date().toISOString(), cities };
writeFileSync(new URL('weather-snapshot.json', import.meta.url), `${JSON.stringify(snapshot, null, 1)}\n`);
for (const city of cities)
  console.log(
    `${city.name.padEnd(10)} now ${city.temp} (${city.code})  tonight ${city.night_low} (${city.night_code})  ` +
      city.days.map((day) => `${day.date.slice(5)} ${day.code} ${day.high}/${day.low} ${day.rain}%`).join(' | '),
  );
