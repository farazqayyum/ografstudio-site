/**
 * The weather icons for Europe weather and the weather strap, drawn on a 64 x 64 grid.
 *
 * Each one moves a little inside its own picture, and the browser plays that, so the graphic draws
 * nothing more for it. The functions only name the sky ('rain', 'moon' and so on), and each icon
 * layer turns the name into its picture through its binding's value map. That keeps the pictures out
 * of the functions' output, which may be at most 64 KiB.
 *
 * `lag` starts an icon part-way through its loops, so the same weather doesn't move in step from one
 * city to the next.
 */
const run = (lag, dur) => `dur='${dur}s' begin='-${(lag % dur).toFixed(2)}s' repeatCount='indefinite'`;
const SOFT = `keyTimes='0;.5;1' calcMode='spline' keySplines='.45 0 .55 1;.45 0 .55 1'`;
/** Back and forth by `dx`. */
const drift = (dx, dur, lag) =>
  `<animateTransform attributeName='transform' type='translate' values='${-dx} 0;${dx} 0;${-dx} 0' ${SOFT} ${run(lag, dur)}/>`;
/** Dims to `low` and back. */
const glow = (low, dur, lag) => `<animate attributeName='opacity' values='${low};1;${low}' ${SOFT} ${run(lag, dur)}/>`;
/** A drop or flake: it fades in, falls along `path`, fades out and starts again. */
const fall = (shape, path, dur, lag) =>
  `<g opacity='0'>${shape}<animateTransform attributeName='transform' type='translate' values='${path}' ${run(lag, dur)}/><animate attributeName='opacity' values='0;1;1;0' keyTimes='0;.2;.7;1' ${run(lag, dur)}/></g>`;
const CLOUD = (y, lag, fill = '#E8EFF8') =>
  `<g><path d='M17 ${y}h31a11 11 0 0 0 1.6-21.9A15 15 0 0 0 21 ${y - 26.5}A11.5 11.5 0 0 0 17 ${y}Z' fill='${fill}'/>${drift(1.5, 6, lag)}</g>`;
const SMALL_CLOUD = (lag) =>
  `<g><path d='M23 54h28a10 10 0 0 0 1.4-19.9A13.5 13.5 0 0 0 26.8 30A10.4 10.4 0 0 0 23 54Z' fill='#E8EFF8'/>${drift(2, 5, lag)}</g>`;
const ICONS = {
  sun: (lag) =>
    `<g stroke='#FFC53D' stroke-width='4.5' stroke-linecap='round'><path d='M32 5v8M32 51v8M5 32h8M51 32h8M12.9 12.9l5.7 5.7M45.4 45.4l5.7 5.7M12.9 51.1l5.7-5.7M45.4 18.6l5.7-5.7'/><animateTransform attributeName='transform' type='rotate' from='0 32 32' to='45 32 32' ${run(lag, 5)}/></g><circle cx='32' cy='32' r='12.5' fill='#FFC53D'/>`,
  moon: (lag) =>
    `<g><path d='M38 8A24 24 0 1 0 56 42A21 21 0 0 1 38 8Z' fill='#F3E3A2'/><animateTransform attributeName='transform' type='rotate' values='-6 32 32;6 32 32;-6 32 32' ${SOFT} ${run(lag, 7)}/></g><g><path d='M50 12.5l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3Z' fill='#F3E3A2'/>${glow(0.15, 2.6, lag)}</g>`,
  partly: (lag) =>
    `<g stroke='#FFC53D' stroke-width='3.5' stroke-linecap='round'><path d='M24 4v6M7 21h6M11.3 8.3l4.2 4.2M36.7 8.3l-4.2 4.2M11.3 33.7l4.2-4.2'/>${glow(0.4, 3.2, lag)}</g><circle cx='24' cy='21' r='9.5' fill='#FFC53D'/>${SMALL_CLOUD(lag)}`,
  'partly-night': (lag) => `<path d='M27 5A17 17 0 1 0 40 29A15 15 0 0 1 27 5Z' fill='#F3E3A2'/>${SMALL_CLOUD(lag)}`,
  cloud: (lag) => CLOUD(48, lag),
  fog: (lag) =>
    `${CLOUD(36, lag)}<g stroke='#B9C8DB' stroke-width='4.5' stroke-linecap='round'><path d='M10 44h44'>${drift(3, 4, lag)}</path><path d='M16 53h38'>${drift(3, 4, lag + 2)}</path></g>`,
  drizzle: (lag) =>
    `${CLOUD(40, lag)}<g stroke='#7FD0FF' stroke-width='3.5' stroke-linecap='round'>${[[24, 46], [34, 46], [44, 46], [29, 53], [39, 53]]
      .map(([x, y], k) => fall(`<path d='M${x} ${y}l-1.5 4'/>`, '1 -3;-1.5 4', 1.2, lag + k * 0.47))
      .join('')}</g>`,
  rain: (lag) =>
    `${CLOUD(40, lag)}<g stroke='#4FB3FF' stroke-width='4' stroke-linecap='round'>${[23, 34, 45]
      .map((x, k) => fall(`<path d='M${x} 46l-4 10'/>`, '2 -5;-2 5', 0.7, lag + k * 0.31))
      .join('')}</g>`,
  snow: (lag) =>
    `${CLOUD(40, lag)}<g fill='#FFFFFF'>${[[22, 47], [34, 50], [46, 47], [28, 55], [40, 55]]
      .map(([x, y], k) => fall(`<circle cx='${x}' cy='${y}' r='3'/>`, '0 -3;1.5 2;-1 7', 2.4, lag + k * 0.97))
      .join('')}</g>`,
  thunder: (lag) =>
    `${CLOUD(40, lag, '#C9D4E3')}<path d='M34 37l-9 13h7l-4 11 13-16h-7l4-8Z' fill='#FFD23D'><animate attributeName='opacity' values='1;1;.2;1;.35;1' keyTimes='0;.62;.66;.7;.75;1' ${run(lag, 3.2)}/></path>`,
};

export const SKIES = Object.keys(ICONS);

const picture = (svg) =>
  `data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${svg}</svg>`
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')}`;

/** Every sky's picture, starting `lag` seconds into its loops. */
export const iconsFor = (lag = 0) => Object.fromEntries(SKIES.map((sky) => [sky, picture(ICONS[sky](lag))]));
