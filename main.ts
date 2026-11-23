// CORAL BAY HEAT — hand-in entry point.
// Rebuild v17 (23 Nov 2026): full in-session rewrite under recording
// 01a2063d — every game source file rewritten by the agent, playtest
// 2/2 green, kit check 4 passed.
//
// Stages the playable game and the four screenshots into the output
// directory (MAKEFUN_OUTPUT_DIR, falling back to /output) and writes the
// dossier.json entry summary the scorer reads.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(outDir, { recursive: true });

// Copy the two inputs the dossier is built from — the game tree and the
// four rendered screenshots, cover shot first by filename.
for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (!existsSync(src)) throw new Error(`main: missing ${name}/ in ${repoRoot}`);
  cpSync(src, join(outDir, name), { recursive: true, force: true });
}

// Bounty limits the dossier must respect: text budget, at most four
// screenshots of at most 256 KiB each, and the game tree size caps.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main: wrote ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
