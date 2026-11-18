// wisps.js — shadow wisps, the dark that hunts Ember's light.
// Three kinds: drifters that slide by on a sine wave, hunters that lean
// toward the firefly, and brutes that are big, slow and hard to shatter.
// A pulse shatters wisps inside its burst; a wisp that touches Ember
// drinks her light.

import { clamp, pick, range } from './rng.js';

export const WISP_KINDS = {
  drifter: { radius: 15, speed: 70, hp: 1, light: 18, score: 0 },
  hunter: { radius: 13, speed: 105, hp: 1, light: 18, score: 0 },
  brute: { radius: 26, speed: 46, hp: 2, light: 26, score: 0 },
};

export class Wisps {
  constructor() {
    this.list = [];
    this.spawnTimer = 1.2;
  }

  reset() {
    this.list = [];
    this.spawnTimer = 1.2;
  }

  // distanceM drives the difficulty ramp: faster spawns, faster wisps.
  update(dt, rng, distanceM, bounds, firefly) {
    // Spawn interval shrinks from ~1.6s to ~0.55s across the run.
    const ramp = clamp(distanceM / 1200, 0, 1);
    const interval = 1.6 - ramp * 1.05;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval * range(rng, 0.75, 1.25);
      this.spawnOne(rng, distanceM, bounds);
    }
    for (const w of this.list) {
      w.age += dt;
      w.x -= w.speed * dt;
      if (w.kind === 'drifter') {
        w.y += Math.sin(w.age * w.waveFreq + w.phase) * w.waveAmp * dt;
      } else if (w.kind === 'hunter') {
        // Lean toward the firefly, but never faster than its own drift.
        const dy = firefly.y - w.y;
        w.y += clamp(dy, -1, 1) * w.speed * 0.45 * dt;
      }
      w.wobble += dt;
    }
    // Drop wisps that drifted off the left edge.
    this.list = this.list.filter((w) => w.x > -60 && w.y > -60 && w.y < bounds.h + 60);
  }

  spawnOne(rng, distanceM, bounds) {
    const ramp = clamp(distanceM / 1200, 0, 1);
    const roll = rng();
    const kind = roll < 0.55 ? 'drifter' : roll < 0.85 ? 'hunter' : 'brute';
    const def = WISP_KINDS[kind];
    const speed = def.speed * (1 + ramp * 0.55) * range(rng, 0.9, 1.15);
    this.list.push({
      kind,
      x: bounds.w + range(rng, 20, 90),
      y: range(rng, 50, bounds.h - 50),
      radius: def.radius * range(rng, 0.9, 1.1),
      speed,
      hp: def.hp,
      light: def.light,
      age: 0,
      phase: range(rng, 0, Math.PI * 2),
      waveFreq: range(rng, 1.2, 2.4),
      waveAmp: range(rng, 30, 80),
      wobble: range(rng, 0, Math.PI * 2),
      seed: rng(),
    });
  }

  // A pulse burst centered on (x, y) with radius r. Returns how many
  // wisps it shattered (brutes take two hits).
  burst(x, y, r) {
    let shattered = 0;
    for (const w of this.list) {
      const d = Math.hypot(w.x - x, w.y - y);
      if (d < r + w.radius) {
        w.hp -= 1;
        if (w.hp <= 0) shattered += 1;
      }
    }
    this.list = this.list.filter((w) => w.hp > 0);
    return shattered;
  }

  // The first wisp touching the firefly, or null.
  touching(firefly) {
    for (const w of this.list) {
      const d = Math.hypot(w.x - firefly.x, w.y - firefly.y);
      if (d < w.radius + firefly.radius * 0.8) return w;
    }
    return null;
  }

  // Remove a wisp that just hit (it dissolves after drinking light).
  remove(wisp) {
    const i = this.list.indexOf(wisp);
    if (i >= 0) this.list.splice(i, 1);
  }

  draw(ctx) {
    for (const w of this.list) {
      const pulse = 1 + Math.sin(w.wobble * 5) * 0.08;
      const r = w.radius * pulse;
      // Smoky dark body with a violet rim.
      const grad = ctx.createRadialGradient(w.x, w.y, r * 0.1, w.x, w.y, r);
      grad.addColorStop(0, 'rgba(24, 10, 40, 0.92)');
      grad.addColorStop(0.7, 'rgba(46, 20, 80, 0.75)');
      grad.addColorStop(1, 'rgba(120, 70, 200, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Rim.
      ctx.strokeStyle = w.kind === 'brute' ? 'rgba(190, 90, 220, 0.8)' : 'rgba(150, 90, 220, 0.55)';
      ctx.lineWidth = w.kind === 'brute' ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      // Eyes: two pale slits that watch the light.
      const look = clamp((w.x - 0) / 800, 0, 1);
      ctx.fillStyle = 'rgba(230, 210, 255, 0.9)';
      const eyeY = w.y - r * 0.15;
      const eyeDX = w.kind === 'brute' ? 8 : 5.5;
      ctx.beginPath();
      ctx.ellipse(w.x - eyeDX, eyeY, 2.6, 3.6, -0.2, 0, Math.PI * 2);
      ctx.ellipse(w.x + eyeDX, eyeY, 2.6, 3.6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      // A brute shows a second ring so the player reads "two hits".
      if (w.kind === 'brute' && w.hp > 1) {
        ctx.strokeStyle = 'rgba(190, 90, 220, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w.x, w.y, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
