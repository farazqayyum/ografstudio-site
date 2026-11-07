/**
 * Draws the Europe map for the weather example from Natural Earth's 1:50m countries (public domain):
 *
 *   node examples-src/weather-map.mjs ne_50m_admin_0_countries.geojson
 *
 * Land and borders only, so the graphic's own background is the sea. The frame is 1920 x 1080 with
 * the left third kept for the presenter; the drawing runs 300 px past every edge so the close-up
 * in the five-day outlook still has land to show.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [source] = process.argv.slice(2);
const W = 1920;
const H = 1080;
const MARGIN = 300;
const rad = Math.PI / 180;

// Lambert azimuthal equal-area, centred on Europe as ETRS89-LAEA is.
const LON0 = 10 * rad;
const LAT0 = 52 * rad;
const laea = (lon, lat) => {
  const l = lon * rad - LON0;
  const p = lat * rad;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l)));
  return [k * Math.cos(p) * Math.sin(l), k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l))];
};

// What must fit, and where on the frame.
const FIT = [[-10.5, 36], [34, 36], [-10.5, 60.5], [30, 61], [24, 34.8], [-9.5, 37]];
const BOX = { left: 640, right: 1850, top: 150, bottom: 1010 };
const pts = FIT.map(([lon, lat]) => laea(lon, lat));
const minX = Math.min(...pts.map((p) => p[0]));
const maxX = Math.max(...pts.map((p) => p[0]));
const minY = Math.min(...pts.map((p) => p[1]));
const maxY = Math.max(...pts.map((p) => p[1]));
const scale = Math.min((BOX.right - BOX.left) / (maxX - minX), (BOX.bottom - BOX.top) / (maxY - minY));
const offX = (BOX.left + BOX.right) / 2 - ((minX + maxX) / 2) * scale;
const offY = (BOX.top + BOX.bottom) / 2 + ((minY + maxY) / 2) * scale;
export const project = (lon, lat) => {
  const [x, y] = laea(lon, lat);
  return [offX + x * scale, offY - y * scale];
};

if (source) {
  // Rings to path data, a point every 1.2 px, and only rings that reach the drawing.
  const reach = MARGIN + 200;
  const near = ([x, y]) => x > -reach && x < W + reach && y > -reach && y < H + reach;
  const ringPath = (ring) => {
    const projected = ring.map(([lon, lat]) => project(lon, lat));
    if (!projected.some(near)) return '';
    const kept = [];
    for (const point of projected) {
      const last = kept[kept.length - 1];
      if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= 1.2) kept.push(point);
    }
    if (kept.length < 3) return '';
    // Each point as a short step from the last, in tenths of a pixel: half the size of whole positions.
    const tenths = kept.map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
    const num = (v) => {
      const text = (v / 10).toString();
      return text.replace(/^(-?)0\./, '$1.');
    };
    const pair = (dx, dy) => {
      const a = num(dx);
      const b = num(dy);
      return `${a}${b.startsWith('-') ? '' : ' '}${b}`;
    };
    let d = `M${pair(tenths[0][0], tenths[0][1])}l`;
    for (let i = 1; i < tenths.length; i++) {
      const step = pair(tenths[i][0] - tenths[i - 1][0], tenths[i][1] - tenths[i - 1][1]);
      d += i === 1 || step.startsWith('-') ? step : ` ${step}`;
    }
    return `${d}z`;
  };
  const { features } = JSON.parse(readFileSync(source, 'utf8'));
  const paths = [];
  for (const feature of features) {
    const { type, coordinates } = feature.geometry ?? {};
    const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : [];
    const d = polygons.flatMap((polygon) => polygon.map(ringPath)).join('');
    if (d) paths.push(d);
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-MARGIN} ${-MARGIN} ${W + 2 * MARGIN} ${H + 2 * MARGIN}">` +
    `<g fill="#21436d" stroke="#3a6296" stroke-width="1.3" stroke-linejoin="round" vector-effect="non-scaling-stroke">` +
    paths.map((d) => `<path d="${d}" vector-effect="non-scaling-stroke"/>`).join('') +
    `</g></svg>`;
  writeFileSync(new URL('weather-map.svg', import.meta.url), svg);
  console.log(`weather-map.svg: ${paths.length} countries, ${(svg.length / 1024).toFixed(0)} KB`);
}
