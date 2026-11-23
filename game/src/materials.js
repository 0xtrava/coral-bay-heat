// Shared look for Coral Bay Heat: one dusk palette, one material cache,
// and canvas-painted signs so the city reads at a glance.
// Everything here is deterministic and cheap — no per-frame allocation.
import * as THREE from 'three';

// The island at 17:42: a low sun over the sea, violet sky, warm streets.
export const DUSK = {
  skyTop: 0x2e1a5e,
  skyMid: 0xb34a7d,
  skyLow: 0xff9a4d,
  sun: 0xffd27a,
  sunCore: 0xfff2c0,
  fog: 0x8a4a6e,
  sea: 0x14506e,
  seaDeep: 0x0d3a52,
  sand: 0xd9b380,
  sandWet: 0xb98d5f,
  road: 0x2b2b33,
  roadLine: 0xf2c14e,
  sidewalk: 0x8d8578,
  curb: 0x6e675c,
  grass: 0x3f7a44,
  heroOrange: 0xff6a00,
  policeWhite: 0xf2f2ee,
  policeNavy: 0x1b2a4a,
  gold: 0xffc93c,
  blood: 0x7a0e0e,
};

const cache = new Map();

// A Lambert material for `color`, cached by colour + flat flag so the
// hundreds of boxes in the city share a handful of GPU programs.
export function mat(color, opts = {}) {
  const key = `${color}|${opts.flat ? 'f' : ''}|${opts.glow ? 'g' : ''}|${opts.transparent ? 't' : ''}|${opts.opacity ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    const params = { color };
    if (opts.flat) params.flatShading = true;
    if (opts.glow) params.emissive = color;
    if (opts.transparent) { params.transparent = true; params.opacity = opts.opacity ?? 0.8; }
    m = new THREE.MeshLambertMaterial(params);
    cache.set(key, m);
  }
  return m;
}

// Basic (unlit) material — for glow strips, flames and the sun disc.
export function glowMat(color, opacity = 1) {
  const key = `basic|${color}|${opacity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
    cache.set(key, m);
  }
  return m;
}

// Paint `lines` of text onto a canvas and return a texture for a sign
// board. `opts`: font px, foreground/background colours, padding.
export function signTexture(lines, opts = {}) {
  const px = opts.px ?? 44;
  const fg = opts.fg ?? '#ffffff';
  const bg = opts.bg ?? '#14213d';
  const pad = opts.pad ?? 18;
  const font = opts.font ?? `bold ${px}px Arial, sans-serif`;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  let w = 0;
  for (const line of lines) w = Math.max(w, meas.measureText(line).width);
  const c = document.createElement('canvas');
  c.width = Math.ceil(w) + pad * 2;
  c.height = lines.length * (px + 10) + pad * 2;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = opts.border ?? '#f2c14e';
  g.lineWidth = 4;
  g.strokeRect(3, 3, c.width - 6, c.height - 6);
  g.font = font;
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  lines.forEach((line, i) => {
    g.fillText(line, pad, pad + (px + 10) * i + px / 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// A building facade: a grid of lit and dark windows on a coloured wall.
// One texture per (wall, lit) pair, shared by every tower that uses it.
const facadeCache = new Map();
export function facadeTexture(wall, litRatio) {
  const key = `${wall}|${litRatio}`;
  let tex = facadeCache.get(key);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = wall;
  g.fillRect(0, 0, 128, 256);
  // Slight vertical shading so towers read as solid, not flat cards.
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.14)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  let n = 0;
  for (let y = 14; y < 244; y += 26) {
    for (let x = 12; x < 116; x += 24) {
      n++;
      const lit = ((n * 2654435761) >>> 0) % 100 < litRatio * 100;
      g.fillStyle = lit ? '#ffd98a' : '#20242e';
      g.fillRect(x, y, 14, 18);
    }
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  facadeCache.set(key, tex);
  return tex;
}

// A road surface with a dashed centre line, tiled along the road.
export function roadTexture() {
  const key = 'road';
  let tex = facadeCache.get(key);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2b33';
  g.fillRect(0, 0, 128, 128);
  // Edge wear + faint tyre lanes.
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 128, 6);
  g.fillRect(0, 122, 128, 6);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(18, 0, 26, 128);
  g.fillRect(84, 0, 26, 128);
  // Dashed centre line.
  g.fillStyle = '#f2c14e';
  g.fillRect(62, 8, 4, 44);
  g.fillRect(62, 76, 4, 44);
  tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  facadeCache.set(key, tex);
  return tex;
}

// A soft radial blob — light pools, blood, shadows. White at the centre
// fading to transparent; tint it with the material colour.
export function blobTexture() {
  const key = 'blob';
  let tex = facadeCache.get(key);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  tex = new THREE.CanvasTexture(c);
  facadeCache.set(key, tex);
  return tex;
}
