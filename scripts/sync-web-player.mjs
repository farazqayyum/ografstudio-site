#!/usr/bin/env node
// Copies the OGraf web player from an OGraf Studio checkout into the site.
//
//   npm run sync:player -- --source ../ograf-studio
//
// The player is served as a static module (static/player/) so that the graphic modules it imports
// at run time are loaded by the browser, not bundled. Its type declarations go next to the React
// component that uses it.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceIndex = process.argv.indexOf('--source');
if (sourceIndex < 0 || !process.argv[sourceIndex + 1]) {
  throw new Error('Usage: npm run sync:player -- --source <OGraf Studio checkout>');
}
const playerDir = path.join(path.resolve(process.argv[sourceIndex + 1]), 'packages', 'ograf-web-player');

const copies = [
  ['ograf-player.js', path.join(siteRoot, 'static', 'player', 'ograf-player.js')],
  ['ograf-player.d.ts', path.join(siteRoot, 'src', 'components', 'OGrafExample', 'ograf-player.d.ts')],
];
for (const [file, destination] of copies) {
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(path.join(playerDir, file), destination);
}
console.log(`Copied the OGraf web player from ${playerDir}.`);
