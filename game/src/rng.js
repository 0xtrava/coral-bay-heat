// Seeded random numbers for Coral Bay Heat.
// Everything in the city that must look the same on every load (building
// heights, traffic colours, pedestrian clothes) draws from one of these
// streams, so ?seed=1 always builds the same island.
export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  // mulberry32 — small, fast, and good enough for set dressing.
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Integer in [min, max] inclusive.
export function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One element of an array, uniformly.
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Fisher-Yates shuffle, in place, driven by the seeded stream.
export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// A cheap 1-D value-noise hash for terrain/water shimmer. Deterministic
// for a given (x, seed) pair; no tables to keep in sync.
export function hash1(x, seed) {
  let h = (x * 374761393 + seed * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}
