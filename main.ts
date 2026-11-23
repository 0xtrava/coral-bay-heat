// Coral Bay Heat — make.fun dossier entry. The scorer runs this same
// file on the entry directory; it must produce the dossier.json the
// scorer expects, from this repo's game/ and screenshots/.
import { buildDossier } from './vendor/makefun-game.ts';
import { writeFileSync } from 'node:fs';

const out = process.env.MAKEFUN_OUTPUT_DIR ?? '.';
const bytes = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(`${out}/dossier.json`, bytes);
console.log(`dossier written: ${out}/dossier.json (${bytes.length} bytes)`);
