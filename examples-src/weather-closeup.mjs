/**
 * Draws the outlook's close-up map as a picture, from weather-map.svg:
 *
 *   node examples-src/weather-closeup.mjs [path to Chrome]
 *
 * The close-up pulls back, travels and pushes in when the outlook city changes. A browser redraws
 * every path of a vector map at each new size, about 30 ms a frame for this one, but scales a
 * picture almost for free. So the close-up is the map drawn once, at the scale it rests at, and
 * looks the same as the vector map when it isn't moving. Run it after weather-map.mjs. It drives a
 * headless Chrome, and you can also set CHROME to its path.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLOSE_UP } from './weather-map.mjs';

const CHROMES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];
const chrome = process.argv[2] ?? process.env.CHROME ?? CHROMES.find((path) => existsSync(path));
if (!chrome) throw new Error('Chrome not found: pass its path, or set CHROME.');

// The vector map's own frame, as weather-map.mjs writes it.
const MAP = { x: -300, y: -300, w: 2520, h: 1680 };
const { x, y, w, h, scale } = CLOSE_UP;
const width = Math.round(w * scale);
const height = Math.round(h * scale);

const profile = mkdtempSync(join(tmpdir(), 'weather-closeup-'));
const port = 9300 + Math.floor(Math.random() * 600);
const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], {
  stdio: 'ignore',
});
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
      .then((response) => response.json())
      .catch(() => undefined);
  }
  if (!target) throw new Error('Chrome did not start.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const evaluate = (expression) =>
    new Promise((resolve, reject) => {
      socket.onmessage = ({ data }) => {
        const { result } = JSON.parse(data);
        if (result?.exceptionDetails) reject(new Error(result.exceptionDetails.exception?.description));
        else resolve(result?.result?.value);
      };
      socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
    });
  const svg = `data:image/svg+xml;base64,${readFileSync(new URL('weather-map.svg', import.meta.url)).toString('base64')}`;
  const picture = await evaluate(`(async () => {
    const map = new Image();
    map.src = ${JSON.stringify(svg)};
    await map.decode();
    const canvas = document.createElement('canvas');
    canvas.width = ${width};
    canvas.height = ${height};
    canvas.getContext('2d').drawImage(map, ${(MAP.x - x) * scale}, ${(MAP.y - y) * scale}, ${MAP.w * scale}, ${MAP.h * scale});
    return canvas.toDataURL('image/webp', 0.9);
  })()`);
  // Chrome keeps its profile open until it has quit, so ask it to quit and wait.
  const quit = new Promise((resolve) => browser.once('exit', resolve));
  socket.send(JSON.stringify({ id: 2, method: 'Browser.close' }));
  await Promise.race([quit, new Promise((resolve) => setTimeout(resolve, 5000))]);
  const bytes = Buffer.from(picture.split(',')[1], 'base64');
  writeFileSync(new URL('weather-closeup.webp', import.meta.url), bytes);
  console.log(`weather-closeup.webp: ${width} x ${height}, ${(bytes.length / 1024).toFixed(0)} KB`);
} finally {
  if (browser.exitCode === null) browser.kill();
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    console.log(`Left Chrome's temporary profile at ${profile}.`);
  }
}
