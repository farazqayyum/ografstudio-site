#!/usr/bin/env node
// Unpacks the OGraf packages in graphics/ so the site can play them with the OGraf web player.
//
//   graphics/<slug>.ograf.zip  ->  static/graphics/<slug>/            extracted package
//                                  static/graphics/<slug>.ograf.zip   download copy
//                                  src/data/graphics.json             manifest URLs for pages
//
// Runs before `npm start` and `npm run build`. Add a graphic by exporting it from Studio with
// Export .ograf.zip and saving it as graphics/<slug>.ograf.zip.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(siteRoot, 'graphics');
const outputDir = path.join(siteRoot, 'static', 'graphics');
const indexFile = path.join(siteRoot, 'src', 'data', 'graphics.json');

fs.rmSync(outputDir, {recursive: true, force: true});
fs.mkdirSync(outputDir, {recursive: true});

const index = {};
const zips = fs.existsSync(sourceDir)
  ? fs.readdirSync(sourceDir).filter((name) => name.endsWith('.ograf.zip')).sort()
  : [];

for (const zipName of zips) {
  const slug = zipName.replace(/\.ograf\.zip$/, '');
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`${zipName}: use lower-case letters, digits and hyphens.`);
  const bytes = fs.readFileSync(path.join(sourceDir, zipName));
  const packageDir = path.join(outputDir, slug);
  let manifestFile;
  for (const [entry, data] of Object.entries(unzipSync(bytes))) {
    if (entry.endsWith('/')) continue;
    const destination = path.resolve(packageDir, entry);
    // Never write outside the package folder, whatever the archive says.
    if (!destination.startsWith(packageDir + path.sep)) {
      throw new Error(`${zipName}: entry "${entry}" points outside the package.`);
    }
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, data);
    if (!entry.includes('/') && entry.endsWith('.ograf.json')) manifestFile = entry;
  }
  if (!manifestFile) throw new Error(`${zipName}: no .ograf.json manifest at the top level.`);
  const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, manifestFile), 'utf8'));
  fs.copyFileSync(path.join(sourceDir, zipName), path.join(outputDir, zipName));
  index[slug] = {
    name: manifest.name ?? slug,
    manifest: `/graphics/${slug}/${manifestFile}`,
    download: `/graphics/${zipName}`,
    bytes: bytes.length,
    // Plain values only: what OGrafExample's form can edit.
    fields: Object.values(manifest.schema?.properties ?? {}).filter((field) =>
      ['string', 'number', 'integer', 'boolean'].includes(field.type),
    ).length,
    actions: slug === 'clock' ? 0 : (manifest.customActions?.length ?? 0) + (Number(manifest.stepCount ?? 1) > 1 ? 1 : 0),
  };
}

const json = `${JSON.stringify(index, null, 2)}\n`;
if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf8') !== json) {
  fs.writeFileSync(indexFile, json);
}
console.log(`Unpacked ${zips.length} OGraf packages into static/graphics.`);
