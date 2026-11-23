// Seeded random numbers for Coral Bay Heat. Every random choice in the
// city, traffic and pedestrians flows through one of these, so a fixed
// seed always builds the same island. No network, no Date in the stream.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small helper object so callers do not repeat the same arithmetic.
export class Rng {
  constructor(seed) {
    this.next = mulberry32(seed);
  }
  // float in [0, 1)
  float() { return this.next(); }
  // float in [min, max)
  range(min, max) { return min + this.next() * (max - min); }
  // integer in [min, max] inclusive
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  // one item from an array
  pick(list) { return list[Math.floor(this.next() * list.length)]; }
  // true with probability p
  chance(p) { return this.next() < p; }
  // a shuffled copy of an array (Fisher-Yates)
  shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
}
