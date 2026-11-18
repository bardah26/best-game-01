// shots.js — deterministic screenshot scenes for the game's own
// screenshots (?shot=title|play|win|lose&seed=N). Each scene builds a
// fixed world from the seed and draws one frame, then the page sets
// window.__shotReady so the screenshot tool knows the frame is done.
// Nothing here is random at draw time: the same seed draws the same
// pixels every run.

import { mulberry32, clamp } from './rng.js';
import { Cavern } from './cavern.js';
import { Firefly } from './firefly.js';
import { Wisps } from './wisps.js';
import { Embers } from './embers.js';
import { Hud } from './hud.js';
import { drawTitle, drawEnd } from './screens.js';

const W = 1280;
const H = 720;
const GATE_M = 1200;

function baseWorld(seed) {
  const rng = mulberry32(seed);
  // The cavern gets its own seeded stream so the same seed draws the
  // same rock, crystals and gloom every run.
  const cavern = new Cavern(W, H, mulberry32(seed * 31 + 7));
  const firefly = new Firefly(W * 0.35, H * 0.5);
  const wisps = new Wisps();
  const embers = new Embers();
  const hud = new Hud();
  return { rng, cavern, firefly, wisps, embers, hud };
}

// Simulate `seconds` of play with a scripted flight path so the play
// shot shows a real, populated moment instead of an empty cave. The
// firefly steers toward a point left of centre, so it stays in frame
// with its glow visible instead of drifting to the right edge.
function simulatePlay(world, seconds) {
  const { rng, cavern, firefly, wisps, embers } = world;
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  const keys = { up: false, down: false, left: false, right: false };
  let distanceM = 620;
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    const mouse = {
      active: true,
      x: W * 0.38,
      y: H * 0.5 + Math.sin(t * 0.9) * 70,
    };
    const scroll = 120;
    cavern.update(dt, scroll);
    firefly.update(dt, keys, mouse, { w: W, h: H });
    firefly.light = 72;
    wisps.update(dt, rng, distanceM, { w: W, h: H }, firefly);
    embers.update(dt, rng, { w: W, h: H }, scroll);
    distanceM += (scroll / 100) * dt;
  }
  return distanceM;
}

export function renderShot(ctx, scene, seed) {
  const world = baseWorld(seed);
  const { cavern, firefly, wisps, embers, hud } = world;
  const time = 6.5; // fixed simulated time: no wall clock in shots

  if (scene === 'title') {
    cavern.draw(ctx, time, 0);
    embers.spawnCluster(world.rng, { w: W, h: H });
    // Off to the left, clear of the centred text, glow showing.
    firefly.x = W * 0.16;
    firefly.y = H * 0.55;
    firefly.draw(ctx);
    embers.draw(ctx, time);
    drawTitle(ctx, W, H, 2480, time);
  } else if (scene === 'play') {
    const distanceM = simulatePlay(world, 6);
    // A lively mid-run state for the HUD.
    const state = {
      light: 72, maxLight: 100, distanceM, gateDistanceM: GATE_M,
      embers: 18, score: 1250, combo: 3, best: 2480,
    };
    cavern.draw(ctx, time, distanceM);
    embers.draw(ctx, time);
    wisps.draw(ctx);
    firefly.draw(ctx);
    hud.showBanner('The dark thickens…', 'wisps ahead — pulse with SPACE', 99, 0);
    hud.draw(ctx, W, H, state, 1);
  } else if (scene === 'win') {
    // At the gate: bright, golden, the firefly almost through.
    cavern.draw(ctx, time, GATE_M - 40);
    firefly.x = W - 260;
    firefly.y = H * 0.5;
    firefly.light = 46;
    firefly.draw(ctx);
    embers.burst(W - 260, H * 0.5, 26, '#ffd166', world.rng);
    embers.draw(ctx, time);
    drawEnd(ctx, W, H, {
      score: 3420, embers: 41, distanceM: 1200, timeSec: 214, best: 3420, isBest: true,
    }, true);
  } else if (scene === 'lose') {
    // The light has gone out: dim, wisps closing in. The spent
    // firefly sits left of the stats panel, so it stays visible.
    cavern.draw(ctx, time, 480);
    firefly.x = W * 0.2;
    firefly.y = H * 0.62;
    firefly.light = 0;
    firefly.dead = true;
    for (let i = 0; i < 3; i++) {
      wisps.spawnOne(world.rng, 480, { w: W, h: H });
      const w = wisps.list[i];
      if (w) {
        w.x = firefly.x + 70 + i * 55;
        w.y = firefly.y - 50 + i * 48;
      }
    }
    wisps.draw(ctx);
    firefly.draw(ctx);
    drawEnd(ctx, W, H, {
      score: 890, embers: 12, distanceM: 480, timeSec: 96, best: 2480, isBest: false,
    }, false);
  } else {
    throw new Error(`unknown shot scene: ${scene}`);
  }
  return { w: W, h: H };
}
