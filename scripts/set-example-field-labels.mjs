#!/usr/bin/env node
// Sets the names and tooltips operators see on the packages that aren't built by examples-src/build.mjs.
// Those set their names in the build script, so don't add them here.
//
//   npm run labels
//
// To rename a property, edit the tables below and run it again. It rewrites graphics/<slug>.ograf.zip
// and changes only `title` and `description` in the manifest's schema. Field keys stay as they are,
// because templates and playout systems address data by key. The first run keeps the original
// packages in .cache/graphics-before-labels.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {unzipSync, zipSync} from 'fflate';

const PACKAGES = {
  'shader-background': {
    shader: {
      speed: {description: 'How fast the light streaks move.'},
      tint: {description: 'Colour of the light streaks.'},
      glow: {description: 'Turns the extra glow on or off.'},
    },
  },
};

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const graphicsDir = path.join(siteRoot, 'graphics');
const backupDir = path.join(siteRoot, '.cache', 'graphics-before-labels');
fs.mkdirSync(backupDir, {recursive: true});

/** The manifest with every title and description removed, to prove nothing else moved. */
function withoutLabels(manifest) {
  const copy = structuredClone(manifest);
  for (const field of Object.values(copy.schema?.properties ?? {})) {
    delete field.title;
    delete field.description;
  }
  return JSON.stringify(copy);
}

for (const [slug, labels] of Object.entries(PACKAGES)) {
  const zipPath = path.join(graphicsDir, `${slug}.ograf.zip`);
  const backup = path.join(backupDir, `${slug}.ograf.zip`);
  if (!fs.existsSync(backup)) fs.copyFileSync(zipPath, backup);

  const entries = unzipSync(fs.readFileSync(zipPath));
  const manifestName = Object.keys(entries).find((name) => !name.includes('/') && name.endsWith('.ograf.json'));
  if (!manifestName) throw new Error(`${slug}: no manifest at the top level.`);
  const text = new TextDecoder().decode(entries[manifestName]);
  const manifest = JSON.parse(text);
  const before = withoutLabels(manifest);
  const properties = manifest.schema?.properties ?? {};

  const applied = new Set();
  for (const [key, field] of Object.entries(properties)) {
    const shaderName = field.v_ografShaderParameter?.name;
    const label = labels.fields?.[key] ?? (shaderName ? labels.shader?.[shaderName] : undefined);
    if (!label) continue;
    Object.assign(field, label);
    applied.add(labels.fields?.[key] ? key : `shader:${shaderName}`);
  }
  // A typo in the tables above would otherwise leave the old name in place without a word.
  const expected = [
    ...Object.keys(labels.fields ?? {}),
    ...Object.keys(labels.shader ?? {}).map((name) => `shader:${name}`),
  ];
  const missing = expected.filter((name) => !applied.has(name));
  if (missing.length > 0) throw new Error(`${slug}: no field matches ${missing.join(', ')}.`);
  if (withoutLabels(manifest) !== before) throw new Error(`${slug}: more than the labels changed.`);

  entries[manifestName] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  // A fixed date, so running it again with the same tables gives the same file.
  fs.writeFileSync(zipPath, zipSync(entries, {level: 6, mtime: new Date('2026-01-01T00:00:00Z')}));

  const check = unzipSync(fs.readFileSync(zipPath));
  const original = unzipSync(fs.readFileSync(backup));
  for (const name of new Set([...Object.keys(original), ...Object.keys(check)])) {
    if (name === manifestName) continue;
    if (Buffer.compare(Buffer.from(original[name] ?? []), Buffer.from(check[name] ?? [])) !== 0 || !original[name] || !check[name]) {
      throw new Error(`${slug}: ${name} differs from the original package.`);
    }
  }
  console.log(`${slug}: ${Object.values(properties).map((field) => field.title).join(', ')}`);
}
console.log('Done. Run `npm run graphics` (or restart `npm start`) to see them on the site.');
