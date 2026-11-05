// Re-exports the set already open in Studio, without authoring it again.
import { call } from './mcp.mjs';

const ready = await call('ograf_get_template_set');
const exported = await call('ograf_export_coordinated_package', {
  path: 'graphics/feature-reel.ograf.zip',
  expectedRevision: ready.revision,
  operationId: `feature-reel-${Date.now()}`,
  confirm: true,
  overwrite: true,
  profile: 'realtime',
});
console.log(JSON.stringify(exported).slice(0, 900));
