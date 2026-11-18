// main.ts — Emberlight's entrypoint for make.fun best-game-01.
//
// This program hands the game in: it copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json there
// with buildDossier from the kit's vendored library. It runs twice in
// the grader and both runs must write the same bytes, so everything it
// does is a plain deterministic copy: no timestamps, no random data,
// no network, standard library only (Node 22).
//
// In the grader the output directory is /output. Anywhere else, set
// MAKEFUN_OUTPUT_DIR, for example:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// The scorer's own caps, from the competition's gate: only
// text_max_bytes shapes the dossier bytes; the other caps refuse an
// entry the scorer would refuse, so passing them here fails early
// instead of handing in something invalid.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy one directory tree into another, file by file. Regular files
// and directories only: a symlink or anything else is refused loudly
// instead of being silently followed, because the gate refuses those
// in game/ too.
function copyTree(source, target) {
  const stat = lstatSync(source);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) {
    throw new Error(`refusing to copy non-regular entry: ${source}`);
  }
  if (stat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const name of readdirSync(source).sort()) {
      copyTree(join(source, name), join(target, name));
    }
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source));
}

// Start from a clean output directory so a stale file from an earlier
// run can never leak into the entry (and so the two grader runs agree
// byte for byte even when the second reuses the first's directory).
// Only the directory's CONTENTS are removed, never the directory
// itself: in the grader /output is a writable mount on a read-only
// filesystem, so removing it and recreating it fails — its parent /
// is not writable — while removing its children works everywhere.
if (existsSync(outputDir)) {
  for (const name of readdirSync(outputDir)) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }
} else {
  mkdirSync(outputDir, { recursive: true });
}

copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));

console.log(`Emberlight handed in: ${outputDir}`);
