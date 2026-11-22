// Coral Bay Heat — entry point.
//
// Copies the playable game and its screenshots into the output directory
// (MAKEFUN_OUTPUT_DIR, or /output by default) and writes the entry
// dossier (dossier.json) that describes them for the scorer.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });

// Stage the two things the dossier is built from: the game itself and
// the four rendered screenshots (cover first by name).
for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`main: missing ${name}/ in ${repoRoot}`);
  cpSync(src, join(outDir, name), { recursive: true, force: true });
}

// The bounty caps the dossier is held to: text budget, at most four
// screenshots of at most 256 KiB each, and the game tree limits.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main: wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
