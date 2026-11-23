// CORAL BAY HEAT — the hand-in program for make.fun's gta6-01 bounty.
//
// It takes the entry apart and puts it back together in the output
// directory: the game/ folder (plain static files a desktop browser loads
// offline — game/index.html and its ES modules, three.js vendored under
// game/vendor/), the screenshots/ folder (four renders of the game itself,
// the first by name is the cover), and dossier.json, the summary the
// judge reads, written by the kit's own buildDossier library.
//
// Run it from the repository root:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader's container MAKEFUN_OUTPUT_DIR stands in for /output.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

// Start from a clean output directory so a stale screenshot or an old
// dossier can never ride along with a fresh build.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier's bytes; the others refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in
// game/ or 48 MiB of game files in all, or a path under game/ over 1000
// bytes — game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`dossier written to ${join(out, 'dossier.json')}`);
