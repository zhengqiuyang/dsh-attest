/**
 * Vendor the signing core of agent-attest into src/vendor/aa-core.
 *
 * The plugin is a thin Cordis adapter; canonical-JSON determinism and the
 * ed25519 PEM helpers stay owned by the agent-attest repository. This script
 * copies the closure the session chain needs and refuses anything that grew
 * imports outside it.
 *
 * Usage: node scripts/sync-aa-core.mjs [--check]
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const sourceRoot = process.env.AA_SRC
  ? resolve(pluginRoot, process.env.AA_SRC)
  : resolve(pluginRoot, '..', 'agent-attest', 'src');
const vendorRoot = join(pluginRoot, 'src', 'vendor', 'aa-core');

/** The signing closure: canonicalJson + ed25519 PEM helpers (+ their deps). */
const FILES = ['canonical.ts', 'keys.ts', 'git.ts', 'util.ts'];
const ALLOWED_IMPORTS = new Set(['./canonical.js', './keys.js', './git.js', './util.js']);

function importsOf(source) {
  const imports = [];
  for (const line of source.split('\n')) {
    const m = /^import\s(?:type\s)?(?:[^'"]*from\s)?['"]([^'"]+)['"]/.exec(line);
    if (m) imports.push(m[1]);
  }
  return imports;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  let dirty = false;

  await mkdir(vendorRoot, { recursive: true });

  for (const file of FILES) {
    const src = join(sourceRoot, file);
    if (!existsSync(src)) {
      console.error(`sync-aa-core: missing source ${src}`);
      console.error('Is the agent-attest checkout a sibling of this plugin?');
      process.exit(1);
    }
    const source = await readFile(src, 'utf8');

    for (const spec of importsOf(source)) {
      const ok = ALLOWED_IMPORTS.has(spec) || spec.startsWith('node:');
      if (!ok) {
        console.error(`sync-aa-core: ${file} now imports "${spec}" — outside the signing closure.`);
        console.error('Extend FILES/ALLOWED_IMPORTS deliberately after reviewing that dependency.');
        process.exit(1);
      }
    }

    const dest = join(vendorRoot, file);
    const existing = existsSync(dest) ? await readFile(dest, 'utf8') : null;
    if (existing !== source) dirty = true;

    if (!checkOnly && existing !== source) {
      await copyFile(src, dest);
      console.log(`synced ${file}${existing === null ? ' (new)' : ' (updated)'}`);
    }
  }

  if (checkOnly) {
    if (dirty) {
      console.error('sync-aa-core: vendored copy is stale; run `npm run sync`.');
      process.exit(1);
    }
    console.log('sync-aa-core: vendored copy is in sync.');
  } else if (!dirty) {
    console.log('sync-aa-core: already in sync.');
  }
}

main();
