// VOIDLIGHT's hand-in program (Node 22, standard library only): the game
// is this directory's game/ folder — plain static files a desktop browser
// loads offline — and this program copies game/ and screenshots/ beside
// this file into /output, then writes /output/dossier.json with the
// kit's vendored library, the summary the judge reads. Outside the
// grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally with `node serve.ts`, then open
// http://localhost:8080. Screenshots live in screenshots/; the first
// by name is the cover.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps, as buildDossier takes them: the dossier text is capped
// at 160 KiB; the rest refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; game/ over 993 files, 48 MiB, or a
// path over 1000 bytes).
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
