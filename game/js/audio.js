// audio.js — all sound is synthesized with WebAudio, no audio files.
// A soft chime when an ember is collected, a low thud on a wisp hit,
// a bright arpeggio on winning, a falling tone on losing, and a quiet
// ambient pad underneath. Audio starts only after the first user gesture.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.padNodes = null;
  }

  // Call from a user gesture (keydown / pointerdown). Safe to call often.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    this.startPad();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A gentle two-oscillator drone that sits under the game.
  startPad() {
    if (!this.ctx || this.padNodes) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    gain.connect(this.master);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 110;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 164.81;
    const o3 = this.ctx.createOscillator();
    o3.type = 'triangle';
    o3.frequency.value = 220;
    const g3 = this.ctx.createGain();
    g3.gain.value = 0.25;
    o1.connect(gain);
    o2.connect(gain);
    o3.connect(g3);
    g3.connect(gain);
    o1.start();
    o2.start();
    o3.start();
    // Slow breathing on the pad.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
    this.padNodes = { gain, o1, o2, o3, lfo };
  }

  // One short tone with an exponential decay envelope.
  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Ember collected: pitch climbs with the combo (1..5).
  collect(combo) {
    const base = 520 + Math.min(combo, 5) * 60;
    this.tone(base, 0.18, 'sine', 0.22);
    this.tone(base * 1.5, 0.22, 'sine', 0.12, 0.03);
  }

  // Moth caught: a warm two-note reward.
  moth() {
    this.tone(392, 0.16, 'triangle', 0.2);
    this.tone(587.33, 0.3, 'triangle', 0.18, 0.09);
  }

  // Wisp hit: a low thud plus a descending buzz.
  hit() {
    this.tone(160, 0.25, 'sawtooth', 0.2, 0, 55);
    this.tone(90, 0.3, 'sine', 0.28, 0, 45);
  }

  // Light pulse: a bright whoosh upward.
  pulse() {
    this.tone(300, 0.35, 'sine', 0.16, 0, 900);
    this.tone(600, 0.3, 'triangle', 0.08, 0.05, 1400);
  }

  // A wisp shatters: a tiny glassy pop.
  shatter() {
    this.tone(1180, 0.12, 'square', 0.07, 0, 500);
  }

  // The Dawn Gate is near: a hopeful chime.
  gateNear() {
    this.tone(659.25, 0.4, 'sine', 0.15);
    this.tone(987.77, 0.5, 'sine', 0.1, 0.12);
  }

  // Win: a rising dawn arpeggio.
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.18, i * 0.11));
  }

  // Lose: a slow fall into the dark.
  lose() {
    this.tone(330, 0.7, 'sine', 0.2, 0, 110);
    this.tone(220, 0.9, 'sine', 0.16, 0.25, 73);
  }

  // Click on a menu: a short tick.
  click() {
    this.tone(740, 0.07, 'square', 0.08);
  }
}
