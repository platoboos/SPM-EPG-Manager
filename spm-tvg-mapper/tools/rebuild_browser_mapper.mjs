import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const aliasPath = path.join(projectRoot, 'config', 'spm_tvg_aliases_master.json');
const browserPath = path.join(projectRoot, 'browser', 'spm_auto_tvg_mapper.browser.js');

const aliasDoc = JSON.parse(await fs.readFile(aliasPath, 'utf8'));
const current = await fs.readFile(browserPath, 'utf8');
const start = current.indexOf('  const ALIASES = ');
const endMarker = ';\n  const BLOCKED_ALIASES =';
const end = current.indexOf(endMarker, start);
if (start === -1 || end === -1) {
  throw new Error('ALIASES block im Browser-Script nicht gefunden.');
}
const replacement = '  const ALIASES = ' + JSON.stringify(aliasDoc.aliases, null, 2).replace(/\n/g, '\n  ');
const next = current.slice(0, start) + replacement + current.slice(end);
await fs.writeFile(browserPath, next, 'utf8');
console.log(JSON.stringify({ browserPath, aliasCount: Object.keys(aliasDoc.aliases || {}).length }, null, 2));
