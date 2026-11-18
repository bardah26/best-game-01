// firefly.js — Ember, the player. A firefly whose glow is its life.
// Flies with smooth acceleration, steered by keyboard or by the mouse.
// Light drains over time; a pulse bursts light outward to shatter wisps
// but spends light, so every pulse is a choice.

import { clamp } from './rng.js';

export const LIGHT_MAX = 100;

export class Firefly {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 13;
    // Light is health: 0 means the firefly goes dark.
    this.light = LIGHT_MAX;
    this.pulseCooldown = 0;
    this.invuln = 0;
    this.flicker = 0;
    this.trail = [];
    this.dead = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.light = LIGHT_MAX;
    this.pulseCooldown = 0;
    this.invuln = 0;
    this.flicker = 0;
    this.trail = [];
    this.dead = false;
  }

  // Steering: keys is {up,down,left,right}, mouse is {active,x,y} or null.
  // dt is seconds. bounds is {w,h} of the play field.
  update(dt, keys, mouse, bounds) {
    const ACCEL = 2400;
    const MAX_SPEED = 330;
    const DRAG = 3.2;
    let ax = 0;
    let ay = 0;
    if (keys.left) ax -= 1;
    if (keys.right) ax += 1;
    if (keys.up) ay -= 1;
    if (keys.down) ay += 1;
    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay);
      ax /= len;
      ay /= len;
    } else if (mouse && mouse.active) {
      // Mouse steering: glide toward the pointer.
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        ax = (dx / d) * Math.min(1, d / 120);
        ay = (dy / d) * Math.min(1, d / 120);
      }
    }
    this.vx += ax * ACCEL * dt;
    this.vy += ay * ACCEL * dt;
    const drag = Math.max(0, 1 - DRAG * dt);
    this.vx *= drag;
    this.vy *= drag;
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > MAX_SPEED) {
      this.vx = (this.vx / speed) * MAX_SPEED;
      this.vy = (this.vy / speed) * MAX_SPEED;
    }
    this.x = clamp(this.x + this.vx * dt, this.radius, bounds.w - this.radius);
    this.y = clamp(this.y + this.vy * dt, this.radius, bounds.h - this.radius);
    if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.flicker += dt;
    // A short glowing trail so motion reads at a glance.
    this.trail.push({ x: this.x, y: this.y, age: 0 });
    if (this.trail.length > 14) this.trail.shift();
    for (const p of this.trail) p.age += dt;
  }

  // Light drains over time; gloom zones drain it faster.
  drain(dt, inGloom) {
    const rate = inGloom ? 3.4 : 1.15;
    this.light -= rate * dt;
    if (this.light <= 0) {
      this.light = 0;
      this.dead = true;
    }
  }

  feed(amount) {
    this.light = clamp(this.light + amount, 0, LIGHT_MAX);
  }

  canPulse() {
    return this.pulseCooldown <= 0 && this.light > 10 && !this.dead;
  }

  // Spend light for a burst. Returns the burst radius, or 0 when refused.
  pulse() {
    if (!this.canPulse()) return 0;
    this.light -= 8;
    this.pulseCooldown = 0.9;
    return 150;
  }

  // Hit by a wisp. Returns true when the hit landed.
  hurt(amount) {
    if (this.invuln > 0 || this.dead) return false;
    this.light -= amount;
    this.invuln = 1.1;
    if (this.light <= 0) {
      this.light = 0;
      this.dead = true;
    }
    return true;
  }

  // Current glow radius: bright when full, a small ember when low.
  glowRadius() {
    const t = this.light / LIGHT_MAX;
    return 55 + t * 165 + Math.sin(this.flicker * 6) * 6;
  }

  draw(ctx) {
    const blink = this.invuln > 0 && Math.floor(this.flicker * 14) % 2 === 0;
    // Trail.
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i / this.trail.length) * 0.25 * (this.light / LIGHT_MAX);
      ctx.fillStyle = `rgba(255, 190, 90, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + (i / this.trail.length) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Glow, additive so it feels like light in the dark.
    const glow = this.glowRadius();
    const grad = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, glow);
    grad.addColorStop(0, 'rgba(255, 226, 150, 0.55)');
    grad.addColorStop(0.35, 'rgba(255, 180, 80, 0.20)');
    grad.addColorStop(1, 'rgba(255, 150, 40, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glow, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (blink) return;
    // Body: a small dark firefly with a bright abdomen and wings.
    const wobble = Math.sin(this.flicker * 9) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(clamp(this.vx / 600, -0.4, 0.4) + wobble * 0.3);
    // Wings.
    ctx.fillStyle = 'rgba(220, 235, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-3, -9, 7, 4.5, -0.7, 0, Math.PI * 2);
    ctx.ellipse(-3, 9, 7, 4.5, 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Abdomen glow.
    ctx.fillStyle = '#ffe296';
    ctx.beginPath();
    ctx.arc(-4, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
