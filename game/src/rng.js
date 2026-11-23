// Seeded random helpers for Coral Bay Heat (rebuild v19).
// One tiny deterministic generator so every run with the same seed
// builds the same city, the same crowds and the same traffic.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function between(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function whole(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function chance(rng, p) {
  return rng() < p;
}

export function shuffle(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// Smooth wobble used for bobbing, flames and the sun halo shimmer.
export function wobble(t, speed, amp) {
  return Math.sin(t * speed) * amp;
}
