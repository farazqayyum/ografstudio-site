// Saves a PNG of each slide's on-air frame: node carousel/capture.mjs <folder> [frame offset]
import { writeFile } from 'node:fs/promises';
import { call } from './mcp.mjs';

const folder = process.argv[2];
const offset = Number(process.argv[3] ?? 120);
const set = await call('ograf_get_template_set');
for (const [index, template] of set.templateSet.templates.entries()) {
  const current = await call('ograf_get_template_set');
  if (current.activeTemplateId !== template.id)
    await call('ograf_update_template_set', {
      expectedRevision: current.revision,
      operation: { type: 'activate_template', templateId: template.id },
      confirm: true,
    });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const capture = await call('ograf_capture', {
    target: 'composition',
    background: 'solid',
    solidColor: '#060913',
    ...(process.argv[3] ? { frame: offset } : {}),
  });
  const bytes = Buffer.from(await (await fetch(capture.url ?? capture.pngUrl ?? capture.captureUrl)).arrayBuffer());
  await writeFile(`${folder}/slide-${index + 1}.png`, bytes);
  console.log(template.name, bytes.length);
}
