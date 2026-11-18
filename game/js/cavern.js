// cavern.js — the Hollow itself: layered parallax rock, glowing
// crystals, and the Dawn Gate at the end of the run. Gloom pockets are
// darker patches where light drains faster, so the player reads danger
// in the scenery itself.

import { clamp, range } from './rng.js';

const GATE_DISTANCE_M = 1200;

export class Cavern {
  // rng defaults to Math.random for live play; pass a seeded rng for
  // deterministic screenshots (see shots.js).
  constructor(w, h, rng = Math.random) {
    this.w = w;
    this.h = h;
    this.scroll = 0;
    this.layers = [];
    // Three parallax layers of rock teeth, far to near. Colours stay
    // clearly lighter than the sky so the rock reads as rock.
    const defs = [
      { depth: 0.25, color: '#221a44', rim: 'rgba(150, 130, 230, 0.10)', teeth: 26, minH: 40, maxH: 110 },
      { depth: 0.5, color: '#2e2360', rim: 'rgba(160, 140, 240, 0.16)', teeth: 20, minH: 70, maxH: 180 },
      { depth: 0.85, color: '#3d2c7d', rim: 'rgba(175, 155, 255, 0.28)', teeth: 14, minH: 110, maxH: 260 },
    ];
    for (const d of defs) {
      const teeth = [];
      for (let i = 0; i < d.teeth; i++) {
        teeth.push({
          x: (i / d.teeth) * w + range(rng, -20, 20),
          top: range(rng, d.minH, d.maxH),
          bottom: range(rng, d.minH, d.maxH),
          width: range(rng, 40, 90),
        });
      }
      this.layers.push({ ...d, teeth });
    }
    // Glowing crystals embedded in the rock.
    this.crystals = [];
    for (let i = 0; i < 16; i++) {
      this.crystals.push({
        x: rng() * w,
        y: rng() < 0.5 ? range(rng, 10, 90) : range(rng, h - 90, h - 10),
        size: range(rng, 5, 13),
        hue: rng() < 0.6 ? '90, 200, 255' : '150, 120, 255',
        phase: rng() * Math.PI * 2,
      });
    }
    // Gloom pockets: dark patches that drain light faster.
    this.glooms = [];
    for (let i = 0; i < 4; i++) {
      this.glooms.push({
        x: 200 + i * 320 + range(rng, -60, 60),
        y: range(rng, 120, h - 120),
        r: range(rng, 70, 120),
      });
    }
  }

  update(dt, scrollSpeed) {
    this.scroll += scrollSpeed * dt;
  }

  // Is a point inside a gloom pocket (world x already scrolled)?
  inGloom(x, y) {
    for (const g of this.glooms) {
      // Gloom patches repeat with the scroll so the cavern feels endless.
      const period = this.w + 420;
      let gx = ((g.x - this.scroll * 0.85) % period + period) % period - 210;
      const dx = x - gx;
      const dy = y - g.y;
      if (dx * dx + dy * dy < g.r * g.r) return true;
    }
    return false;
  }

  // How far along the run, 0..1, and whether the gate is on screen.
  progress(distanceM) {
    return clamp(distanceM / GATE_DISTANCE_M, 0, 1);
  }

  gateOnScreen(distanceM) {
    return distanceM > GATE_DISTANCE_M - 260;
  }

  // Gate x position on screen once it approaches (from the right edge).
  gateX(distanceM) {
    const remaining = GATE_DISTANCE_M - distanceM;
    return this.w - 90 + remaining * 2.2;
  }

  draw(ctx, time, distanceM) {
    const { w, h } = this;
    // Sky: deep indigo that warms toward dawn as the gate nears.
    const dawn = this.progress(distanceM);
    const top = `rgb(${18 + dawn * 40}, ${14 + dawn * 22}, ${44 + dawn * 10})`;
    const bottom = `rgb(${8 + dawn * 26}, ${8 + dawn * 14}, ${24 + dawn * 8})`;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, top);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Far glow of the dawn, growing as the run progresses.
    if (dawn > 0.05) {
      const gx = w - 60;
      const grad = ctx.createRadialGradient(gx, h / 2, 10, gx, h / 2, 420);
      grad.addColorStop(0, `rgba(255, 200, 110, ${(0.28 * dawn).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 180, 90, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
    // Parallax rock layers, drawn as repeating teeth top and bottom.
    for (const layer of this.layers) {
      const n = layer.teeth.length;
      const cell = w / n;
      const offset = (this.scroll * layer.depth) % cell;
      ctx.fillStyle = layer.color;
      for (let i = -1; i <= n; i++) {
        const t = layer.teeth[((i % n) + n) % n];
        const x = i * cell - offset + (t.x % cell);
        // Top stalactite.
        ctx.beginPath();
        ctx.moveTo(x - t.width / 2, 0);
        ctx.lineTo(x + t.width / 2, 0);
        ctx.lineTo(x, t.top);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = layer.rim;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Bottom stalagmite.
        ctx.beginPath();
        ctx.moveTo(x - t.width / 2, h);
        ctx.lineTo(x + t.width / 2, h);
        ctx.lineTo(x, h - t.bottom);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    // Crystals, gently pulsing.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const c of this.crystals) {
      const a = 0.35 + Math.sin(time * 2 + c.phase) * 0.15;
      const grad = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, c.size * 3);
      grad.addColorStop(0, `rgba(${c.hue}, ${a.toFixed(3)})`);
      grad.addColorStop(1, `rgba(${c.hue}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Gloom pockets: soft dark blobs.
    for (const g of this.glooms) {
      const period = w + 420;
      let gx = ((g.x - this.scroll * 0.85) % period + period) % period - 210;
      const grad = ctx.createRadialGradient(gx, g.y, 4, gx, g.y, g.r);
      grad.addColorStop(0, 'rgba(8, 4, 20, 0.55)');
      grad.addColorStop(1, 'rgba(8, 4, 20, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The Dawn Gate: a bright portal when it approaches.
    if (this.gateOnScreen(distanceM)) {
      const gx = this.gateX(distanceM);
      const flicker = 0.75 + Math.sin(time * 5) * 0.1;
      const grad = ctx.createLinearGradient(gx - 26, 0, gx + 26, 0);
      grad.addColorStop(0, 'rgba(255, 210, 130, 0)');
      grad.addColorStop(0.5, `rgba(255, 226, 160, ${flicker.toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255, 210, 130, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - 26, 0, 52, h);
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(gx - 3, 0, 6, h);
    }
    // Vignette: the dark closes in at the edges.
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(2, 2, 10, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
