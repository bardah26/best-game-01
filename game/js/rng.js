// rng.js — small seeded random number generator and helpers.
// Emberlight uses this for deterministic shot scenes (?shot=...) and for
// procedural cavern shapes, so a screenshot can be reproduced exactly.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random float in [min, max) from a rng function.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Random integer in [min, max] inclusive from a rng function.
export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

// Pick one element of an array using a rng function.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Clamp a value into [min, max].
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Linear interpolation.
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
