// embers.js — the light Ember eats: drifting embers, the rare moth,
// and the spark particles that make every pickup feel good.
// Embers come in small clusters so the player chooses a path through
// the dark; chaining pickups quickly builds a score combo.

import { clamp, range } from './rng.js';

export class Embers {
  constructor() {
    this.list = [];
    this.moths = [];
    this.particles = [];
    this.spawnTimer = 0.6;
    this.mothTimer = 18;
  }

  reset() {
    this.list = [];
    this.moths = [];
    this.particles = [];
    this.spawnTimer = 0.6;
    this.mothTimer = 18;
  }

  update(dt, rng, bounds, scrollSpeed) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = range(rng, 0.5, 0.9);
      this.spawnCluster(rng, bounds);
    }
    this.mothTimer -= dt;
    if (this.mothTimer <= 0) {
      this.mothTimer = range(rng, 20, 28);
      this.moths.push({
        x: bounds.w + 40,
        y: range(rng, 80, bounds.h - 80),
        radius: 12,
        age: 0,
        phase: range(rng, 0, Math.PI * 2),
      });
    }
    for (const e of this.list) {
      e.age += dt;
      e.x -= scrollSpeed * dt * 0.9;
      e.y += Math.sin(e.age * 2 + e.phase) * 14 * dt;
    }
    for (const m of this.moths) {
      m.age += dt;
      m.x -= scrollSpeed * dt * 0.7;
      m.y += Math.sin(m.age * 3 + m.phase) * 45 * dt;
    }
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.5 * dt;
      p.vy *= 1 - 2.5 * dt;
    }
    this.list = this.list.filter((e) => e.x > -30);
    this.moths = this.moths.filter((m) => m.x > -40);
    this.particles = this.particles.filter((p) => p.age < p.life);
  }

  // A cluster of 3-5 embers in a loose arc: a path worth flying.
  spawnCluster(rng, bounds) {
    const cx = bounds.w + range(rng, 20, 120);
    const cy = range(rng, 70, bounds.h - 70);
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: cx + i * 26 + range(rng, -8, 8),
        y: cy + Math.sin(i * 0.9) * 34 + range(rng, -10, 10),
        radius: 8,
        age: range(rng, 0, Math.PI * 2),
        phase: range(rng, 0, Math.PI * 2),
        value: 6,
      });
    }
  }

  // Burst of sparks at (x, y) in warm colours. rng defaults to
  // Math.random; pass a seeded rng for deterministic screenshots.
  burst(x, y, n, color, rng = Math.random) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const sp = 40 + rng() * 160;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: 0.4 + rng() * 0.4,
        size: 1.5 + rng() * 2.5,
        color: color || '#ffbe5a',
      });
    }
  }

  // The first ember touching the firefly, or null.
  touchingEmber(firefly) {
    for (const e of this.list) {
      const d = Math.hypot(e.x - firefly.x, e.y - firefly.y);
      if (d < e.radius + firefly.radius + 6) return e;
    }
    return null;
  }

  touchingMoth(firefly) {
    for (const m of this.moths) {
      const d = Math.hypot(m.x - firefly.x, m.y - firefly.y);
      if (d < m.radius + firefly.radius + 8) return m;
    }
    return null;
  }

  removeEmber(e) {
    const i = this.list.indexOf(e);
    if (i >= 0) this.list.splice(i, 1);
  }

  removeMoth(m) {
    const i = this.moths.indexOf(m);
    if (i >= 0) this.moths.splice(i, 1);
  }

  draw(ctx, time) {
    // Embers: warm glowing dots with a soft halo.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.list) {
      const tw = 0.75 + Math.sin(time * 4 + e.phase) * 0.25;
      const grad = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, 22);
      grad.addColorStop(0, `rgba(255, 205, 110, ${0.85 * tw})`);
      grad.addColorStop(0.4, `rgba(255, 150, 60, ${0.35 * tw})`);
      grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Moths: pale wings, a bigger prize.
    for (const m of this.moths) {
      const flap = Math.sin(time * 14 + m.phase) * 0.5;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.fillStyle = 'rgba(240, 230, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(-6, -4 - flap * 4, 8, 5, -0.6 - flap * 0.3, 0, Math.PI * 2);
      ctx.ellipse(-6, 4 + flap * 4, 8, 5, 0.6 + flap * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfc4ee';
      ctx.beginPath();
      ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Particles.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = clamp(1 - p.age / p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
