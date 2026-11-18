// main.js — Emberlight bootstrap, game loop and state machine.
// States: title -> playing <-> paused -> won / lost -> playing.
// A run lasts about three minutes: fly 1200m to the Dawn Gate while
// your light drains, feeding it with embers and shattering wisps with
// pulses that cost light. Reach the gate to win; go dark to lose.

import { Cavern } from './cavern.js';
import { Firefly, LIGHT_MAX } from './firefly.js';
import { Wisps } from './wisps.js';
import { Embers } from './embers.js';
import { Hud } from './hud.js';
import { SoundBank } from './audio.js';
import { drawTitle, drawPause, drawEnd } from './screens.js';
import { renderShot } from './shots.js';
import { clamp, mulberry32 } from './rng.js';

const W = 1280;
const H = 720;
const GATE_M = 1200;
const BEST_KEY = 'emberlight-best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---- deterministic screenshot mode ---------------------------------------
// ?shot=title|play|win|lose&seed=N renders one fixed frame and stops.
// The screenshot tool waits for window.__shotReady.
const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
if (shotScene) {
  const seed = Number(params.get('seed') || '7');
  renderShot(ctx, shotScene, seed);
  window.__shotReady = true;
} else {
  startGame();
}

function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Storage may be unavailable; the best score is a nicety, not a rule.
  }
}

function startGame() {
  const rng = mulberry32((Math.random() * 0xffffffff) >>> 0);
  const sounds = new SoundBank();
  const cavern = new Cavern(W, H);
  const firefly = new Firefly(W * 0.35, H * 0.5);
  const wisps = new Wisps();
  const embers = new Embers();
  const hud = new Hud();

  let state = 'title'; // title | playing | paused | won | lost
  let distanceM = 0;
  let score = 0;
  let embersGot = 0;
  let combo = 0;
  let comboTimer = 0;
  let timeSec = 0;
  let scrollSpeed = 95;
  let shake = 0;
  let best = loadBest();
  let isBest = false;
  let gateAnnounced = false;
  let bannerAt = { 300: false, 700: false };
  let titleTime = 0;
  let endStats = null;

  const keys = { up: false, down: false, left: false, right: false };
  const mouse = { active: false, x: W / 2, y: H / 2 };

  function reset() {
    distanceM = 0;
    score = 0;
    embersGot = 0;
    combo = 0;
    comboTimer = 0;
    timeSec = 0;
    scrollSpeed = 95;
    shake = 0;
    isBest = false;
    gateAnnounced = false;
    bannerAt = { 300: false, 700: false };
    endStats = null;
    cavern.scroll = 0;
    firefly.reset(W * 0.35, H * 0.5);
    wisps.reset();
    embers.reset();
    hud.banner = null;
    hud.flash = 0;
  }

  function startRun() {
    reset();
    state = 'playing';
    sounds.ensure();
    sounds.click();
  }

  function finish(won) {
    state = won ? 'won' : 'lost';
    const finalScore = score;
    isBest = finalScore > best;
    if (isBest) {
      best = finalScore;
      saveBest(best);
    }
    endStats = {
      score: finalScore,
      embers: embersGot,
      distanceM,
      timeSec,
      best,
      isBest,
    };
    if (won) sounds.win();
    else sounds.lose();
  }

  function showBannerMilestones() {
    if (!bannerAt[300] && distanceM >= 300) {
      bannerAt[300] = true;
      hud.showBanner('The dark thickens…', 'wisps are faster now — spend light wisely', 2.6, timeSec);
    }
    if (!bannerAt[700] && distanceM >= 700) {
      bannerAt[700] = true;
      hud.showBanner('Halfway to dawn', 'hold on, Ember', 2.4, timeSec);
    }
    if (!gateAnnounced && distanceM >= GATE_M - 260) {
      gateAnnounced = true;
      hud.showBanner('The Dawn Gate is near!', 'fly into the light', 2.8, timeSec);
      sounds.gateNear();
    }
  }

  function doPulse() {
    const r = firefly.pulse();
    if (r === 0) return;
    sounds.pulse();
    const shattered = wisps.burst(firefly.x, firefly.y, r);
    if (shattered > 0) {
      score += shattered * 15;
      sounds.shatter();
      embers.burst(firefly.x, firefly.y, 10 + shattered * 6, '#c9a6ff');
    } else {
      embers.burst(firefly.x, firefly.y, 8, '#ffe296');
    }
  }

  function update(dt) {
    if (state === 'title') {
      titleTime += dt;
      cavern.update(dt, 24);
      firefly.y = H * 0.52 + Math.sin(titleTime * 1.4) * 14;
      firefly.flicker += dt;
      embers.update(dt, rng, { w: W, h: H }, 24);
      return;
    }
    if (state !== 'playing') return;
    timeSec += dt;
    // The cavern scrolls faster the further Ember flies.
    const ramp = clamp(distanceM / GATE_M, 0, 1);
    scrollSpeed = 95 + ramp * 125;
    distanceM += scrollSpeed * dt * 0.055;
    cavern.update(dt, scrollSpeed);
    firefly.update(dt, keys, mouse, { w: W, h: H });
    firefly.drain(dt, cavern.inGloom(firefly.x, firefly.y));
    wisps.update(dt, rng, distanceM, { w: W, h: H }, firefly);
    embers.update(dt, rng, { w: W, h: H }, scrollSpeed);
    hud.update(dt);
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 26);
    // Pickups.
    const ember = embers.touchingEmber(firefly);
    if (ember) {
      embers.removeEmber(ember);
      embers.burst(ember.x, ember.y, 8, '#ffbe5a');
      combo = Math.min(5, combo + 1);
      comboTimer = 2.5;
      score += 10 * combo;
      embersGot += 1;
      firefly.feed(ember.value);
      sounds.collect(combo);
    }
    const moth = embers.touchingMoth(firefly);
    if (moth) {
      embers.removeMoth(moth);
      embers.burst(moth.x, moth.y, 16, '#e8dcff');
      score += 50;
      firefly.feed(20);
      sounds.moth();
    }
    // Wisp hits.
    const hit = wisps.touching(firefly);
    if (hit) {
      if (firefly.hurt(hit.light)) {
        wisps.remove(hit);
        hud.hitFlash();
        shake = 9;
        sounds.hit();
        embers.burst(firefly.x, firefly.y, 12, '#b678e8');
      }
    }
    showBannerMilestones();
    if (firefly.dead) {
      finish(false);
      return;
    }
    if (distanceM >= GATE_M) {
      finish(true);
    }
  }

  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    if (state === 'title') {
      cavern.draw(ctx, titleTime, 0);
      embers.draw(ctx, titleTime);
      firefly.draw(ctx);
      drawTitle(ctx, W, H, best, titleTime);
    } else {
      cavern.draw(ctx, timeSec, distanceM);
      embers.draw(ctx, timeSec);
      wisps.draw(ctx);
      firefly.draw(ctx);
      hud.draw(ctx, W, H, {
        light: firefly.light,
        maxLight: LIGHT_MAX,
        distanceM,
        gateDistanceM: GATE_M,
        embers: embersGot,
        score,
        combo,
        best,
      }, timeSec);
      if (state === 'paused') drawPause(ctx, W, H);
      if ((state === 'won' || state === 'lost') && endStats) {
        drawEnd(ctx, W, H, endStats, state === 'won');
      }
    }
    ctx.restore();
  }

  // ---- input -------------------------------------------------------------
  const GAME_KEYS = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ',
    'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  ]);

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.key)) e.preventDefault();
    sounds.ensure();
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = true; break;
      case 'ArrowDown': case 's': case 'S': keys.down = true; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = true; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = true; break;
      case ' ':
        if (state === 'playing' && !e.repeat) doPulse();
        break;
      case 'Enter':
        if (state === 'title') startRun();
        break;
      case 'p': case 'P':
        if (state === 'playing') state = 'paused';
        else if (state === 'paused') state = 'playing';
        break;
      case 'r': case 'R':
        if (state !== 'title') startRun();
        break;
      case 'm': case 'M':
        sounds.setMuted(!sounds.muted);
        break;
      default: break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': keys.up = false; break;
      case 'ArrowDown': case 's': case 'S': keys.down = false; break;
      case 'ArrowLeft': case 'a': case 'A': keys.left = false; break;
      case 'ArrowRight': case 'd': case 'D': keys.right = false; break;
      default: break;
    }
  });

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    sounds.ensure();
    const p = pointerPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.active = true;
    if (state === 'title') startRun();
    else if (state === 'won' || state === 'lost') startRun();
  });
  window.addEventListener('pointermove', (e) => {
    const p = pointerPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  window.addEventListener('pointerup', () => {
    mouse.active = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') state = 'paused';
  });

  // ---- fixed-step loop ----------------------------------------------------
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
