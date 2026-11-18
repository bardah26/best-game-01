// hud.js — everything the player reads while playing: the light meter
// (the game's heart), distance to the Dawn Gate, embers, score and
// combo. Also the banner lines ("The Gate is near!", "Wave of wisps")
// that keep the player oriented.

import { clamp } from './rng.js';

export class Hud {
  constructor() {
    this.banner = null; // { text, sub, until }
    this.flash = 0; // red flash on hit, 0..1
    this.flashColor = '255, 60, 60';
  }

  showBanner(text, sub, seconds, now) {
    this.banner = { text, sub: sub || '', until: now + seconds };
  }

  hitFlash() {
    this.flash = 0.55;
  }

  update(dt) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.4);
  }

  draw(ctx, w, h, state, now) {
    const { light, maxLight, distanceM, gateDistanceM, embers, score, combo, best } = state;
    // Top-left: light meter with a label.
    const meterW = 240;
    const meterH = 18;
    const mx = 20;
    const my = 20;
    ctx.fillStyle = 'rgba(6, 6, 18, 0.55)';
    ctx.beginPath();
    ctx.roundRect(mx - 8, my - 8, meterW + 16, meterH + 34, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('LIGHT', mx, my + 2);
    const frac = clamp(light / maxLight, 0, 1);
    const grad = ctx.createLinearGradient(mx, 0, mx + meterW, 0);
    grad.addColorStop(0, '#ff9a3d');
    grad.addColorStop(1, '#ffe296');
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(mx, my + 8, meterW, meterH, 9);
    ctx.fill();
    ctx.fillStyle = grad;
    if (frac > 0.02) {
      ctx.beginPath();
      ctx.roundRect(mx, my + 8, Math.max(10, meterW * frac), meterH, 9);
      ctx.fill();
    }
    // Low light warning.
    if (frac < 0.25 && Math.floor(now * 3) % 2 === 0) {
      ctx.fillStyle = '#ff7a5c';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('LOW LIGHT — find embers!', mx, my + 48);
    }
    // Top-right: score, embers, best.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText(String(score), w - 20, 34);
    ctx.fillStyle = 'rgba(255, 233, 168, 0.75)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`embers ${embers}   best ${best}`, w - 20, 56);
    if (combo > 1) {
      ctx.fillStyle = '#ffb347';
      ctx.font = '800 16px system-ui, sans-serif';
      ctx.fillText(`COMBO x${combo}`, w - 20, 80);
    }
    // Bottom: distance to the Dawn Gate as a progress line.
    const barW = Math.min(520, w - 200);
    const bx = (w - barW) / 2;
    const by = h - 34;
    const prog = clamp(distanceM / gateDistanceM, 0, 1);
    ctx.fillStyle = 'rgba(6, 6, 18, 0.55)';
    ctx.beginPath();
    ctx.roundRect(bx - 10, by - 20, barW + 20, 34, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.roundRect(bx, by - 6, barW, 8, 4);
    ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + barW, 0);
    pg.addColorStop(0, '#7fb2ff');
    pg.addColorStop(1, '#ffd166');
    ctx.fillStyle = pg;
    if (prog > 0.01) {
      ctx.beginPath();
      ctx.roundRect(bx, by - 6, Math.max(8, barW * prog), 8, 4);
      ctx.fill();
    }
    ctx.fillStyle = '#e8ecff';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const remaining = Math.max(0, Math.ceil(gateDistanceM - distanceM));
    ctx.fillText(
      remaining > 0 ? `DAWN GATE — ${remaining}m` : 'DAWN GATE — REACHED!',
      w / 2,
      by - 12,
    );
    // Banner, centered, fades near its end.
    if (this.banner && now < this.banner.until) {
      const left = this.banner.until - now;
      const alpha = clamp(left / 0.6, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3c4';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.fillText(this.banner.text, w / 2, h * 0.32);
      if (this.banner.sub) {
        ctx.fillStyle = 'rgba(255, 243, 196, 0.8)';
        ctx.font = '600 15px system-ui, sans-serif';
        ctx.fillText(this.banner.sub, w / 2, h * 0.32 + 26);
      }
      ctx.globalAlpha = 1;
    }
    // Hit flash.
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(${this.flashColor}, ${(this.flash * 0.5).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
